package handler

import (
	"database/sql"
	"net/http"
	"sort"
	"strings"

	"github.com/gin-gonic/gin"
	"y/internal/middleware"
)

type stockConsumptionItem struct {
	MenuItemID int64   `json:"menuItemId" binding:"required,gt=0"`
	Quantity   float64 `json:"quantity" binding:"required,gt=0"`
	// Channel is optional for backwards compatibility. Excel imports send it per
	// row so storefront and LINE MAN recipes remain separate in one atomic cut.
	Channel string `json:"channel" binding:"omitempty,oneof=storefront lineman"`
}
type stockConsumptionInput struct {
	Items   []stockConsumptionItem `json:"items" binding:"required,min=1,dive"`
	Note    string                 `json:"note" binding:"required,max=500"`
	Channel string                 `json:"channel" binding:"required,oneof=storefront lineman"`
}

type stockSaleItem struct {
	menuItemID int64
	channel    string
	quantity   float64
	unitPrice  float64
}

// ConsumeStockFromMenus calculates recipe consumption server-side and records it atomically.
func (h *PlatformHandler) ConsumeStockFromMenus(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	var input stockConsumptionInput
	if c.ShouldBindJSON(&input) != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ข้อมูลเมนูที่ขายไม่ถูกต้อง"})
		return
	}
	input.Note = strings.TrimSpace(input.Note)
	if input.Note == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ต้องระบุหมายเหตุการตัดสต๊อก"})
		return
	}
	branchID, ok := h.branchScope(c)
	if !ok {
		return
	}
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถตัดสต๊อกได้"})
		return
	}
	defer tx.Rollback()
	required := map[int64]float64{}
	channels := map[string]bool{}
	saleItems := make([]stockSaleItem, 0, len(input.Items))
	for _, item := range input.Items {
		itemChannel := input.Channel
		if item.Channel != "" {
			itemChannel = item.Channel
		}
		channels[itemChannel] = true
		var name, status string
		var storePrice, linemanPrice float64
		var storeAvailable, linemanAvailable bool
		if err = tx.QueryRowContext(c.Request.Context(), `SELECT name,status,store_price,store_price_available,lineman_price,lineman_price_available FROM menu_items WHERE id=$1 AND branch_id=$2 AND template_enabled`, item.MenuItemID, branchID).Scan(&name, &status, &storePrice, &storeAvailable, &linemanPrice, &linemanAvailable); err == sql.ErrNoRows {
			c.JSON(404, gin.H{"success": false, "message": "ไม่พบเมนูที่เลือก"})
			return
		} else if err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านสูตรเมนูได้"})
			return
		}
		if status != "available" {
			c.JSON(400, gin.H{"success": false, "message": "เมนู " + name + " ไม่พร้อมขาย"})
			return
		}
		unitPrice, priceAvailable := storePrice, storeAvailable
		if itemChannel == "lineman" {
			unitPrice, priceAvailable = linemanPrice, linemanAvailable
		}
		if !priceAvailable {
			channelName := "หน้าร้าน"
			if itemChannel == "lineman" {
				channelName = "LINE MAN"
			}
			c.JSON(400, gin.H{"success": false, "message": "เมนู " + name + " ยังไม่ได้ตั้งราคาสำหรับ " + channelName})
			return
		}
		saleItems = append(saleItems, stockSaleItem{menuItemID: item.MenuItemID, channel: itemChannel, quantity: item.Quantity, unitPrice: unitPrice})
		rows, queryErr := tx.QueryContext(c.Request.Context(), `SELECT mi.inventory_item_id,mi.quantity,COALESCE(c.track_stock,true) FROM menu_item_ingredients mi JOIN inventory_items i ON i.id=mi.inventory_item_id LEFT JOIN inventory_catalog_items c ON c.id=i.catalog_item_id WHERE mi.menu_item_id=$1 AND mi.channel=$2 AND i.template_enabled`, item.MenuItemID, itemChannel)
		if queryErr != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านสูตรเมนูได้"})
			return
		}
		hasRecipe := false
		for rows.Next() {
			var inventoryID int64
			var amount float64
			var trackStock bool
			if err = rows.Scan(&inventoryID, &amount, &trackStock); err != nil {
				rows.Close()
				c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านสูตรเมนูได้"})
				return
			}
			if trackStock {
				required[inventoryID] += amount * item.Quantity
			}
			hasRecipe = true
		}
		rows.Close()
		// Legacy menus may only have a storefront recipe. LINE MAN inherits
		// that recipe until an administrator saves a channel-specific one.
		if !hasRecipe && itemChannel == "lineman" {
			fallbackRows, fallbackErr := tx.QueryContext(c.Request.Context(), `SELECT mi.inventory_item_id,mi.quantity,COALESCE(c.track_stock,true) FROM menu_item_ingredients mi JOIN inventory_items i ON i.id=mi.inventory_item_id LEFT JOIN inventory_catalog_items c ON c.id=i.catalog_item_id WHERE mi.menu_item_id=$1 AND mi.channel='storefront' AND i.template_enabled`, item.MenuItemID)
			if fallbackErr != nil {
				c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านสูตรเมนูได้"})
				return
			}
			for fallbackRows.Next() {
				var inventoryID int64
				var amount float64
				var trackStock bool
				if err = fallbackRows.Scan(&inventoryID, &amount, &trackStock); err != nil {
					fallbackRows.Close()
					c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านสูตรเมนูได้"})
					return
				}
				if trackStock {
					required[inventoryID] += amount * item.Quantity
				}
				hasRecipe = true
			}
			fallbackRows.Close()
		}
		if !hasRecipe {
			channelName := "หน้าร้าน"
			if itemChannel == "lineman" {
				channelName = "LINE MAN"
			}
			c.JSON(400, gin.H{"success": false, "message": "เมนู " + name + " ยังไม่มีสูตรวัตถุดิบสำหรับ " + channelName})
			return
		}
	}
	ids := make([]int64, 0, len(required))
	for id := range required {
		ids = append(ids, id)
	}
	sort.Slice(ids, func(i, j int) bool { return ids[i] < ids[j] })
	claims := middleware.ClaimsFrom(c)
	for _, inventoryID := range ids {
		var before float64
		var name, category string
		var expired bool
		if err = tx.QueryRowContext(c.Request.Context(), `SELECT quantity,name,category,expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE FROM inventory_items WHERE id=$1 AND branch_id=$2 FOR UPDATE`, inventoryID, branchID).Scan(&before, &name, &category, &expired); err != nil {
			c.JSON(400, gin.H{"success": false, "message": "ไม่พบวัตถุดิบในสูตร"})
			return
		}
		if category == "fresh" {
			var hasTrackedLots bool
			if err = tx.QueryRowContext(c.Request.Context(), `SELECT EXISTS(SELECT 1 FROM fresh_inventory_lots WHERE branch_id=$1 AND inventory_item_id=$2)`, branchID, inventoryID).Scan(&hasTrackedLots); err != nil {
				c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านล็อตของสดได้"})
				return
			}
			if hasTrackedLots {
				type freshLotUse struct {
					id           int64
					before, used float64
				}
				rows, queryErr := tx.QueryContext(c.Request.Context(), `SELECT id,quantity_remaining FROM fresh_inventory_lots WHERE branch_id=$1 AND inventory_item_id=$2 AND status='active' AND quantity_remaining>0 AND expiry_date >= CURRENT_DATE ORDER BY expiry_date,received_at,id FOR UPDATE`, branchID, inventoryID)
				if queryErr != nil {
					c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านล็อตของสดได้"})
					return
				}
				remaining := required[inventoryID]
				uses := make([]freshLotUse, 0)
				for rows.Next() && remaining > 0 {
					var lotID int64
					var lotBefore float64
					if err = rows.Scan(&lotID, &lotBefore); err != nil {
						rows.Close()
						c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านล็อตของสดได้"})
						return
					}
					used := lotBefore
					if used > remaining {
						used = remaining
					}
					uses = append(uses, freshLotUse{id: lotID, before: lotBefore, used: used})
					remaining -= used
				}
				if err = rows.Err(); err != nil {
					rows.Close()
					c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถอ่านล็อตของสดได้"})
					return
				}
				rows.Close()
				if remaining > 0 {
					c.JSON(400, gin.H{"success": false, "message": "วัตถุดิบของสด " + name + " ที่ยังไม่หมดอายุคงเหลือไม่พอ"})
					return
				}
				after := before - required[inventoryID]
				if after < 0 {
					c.JSON(400, gin.H{"success": false, "message": "วัตถุดิบของสด " + name + " คงเหลือไม่พอ"})
					return
				}
				for _, use := range uses {
					lotAfter := use.before - use.used
					if _, err = tx.ExecContext(c.Request.Context(), `UPDATE fresh_inventory_lots SET quantity_remaining=$1,updated_at=now() WHERE id=$2`, lotAfter, use.id); err != nil {
						c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถตัดล็อตของสดได้"})
						return
					}
					if err = recordFreshLotMovementTx(c, tx, branchID, use.id, inventoryID, "consumed", -use.used, use.before, lotAfter, input.Note, claims.UserID); err != nil {
						c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกประวัติล็อตของสดได้"})
						return
					}
				}
				if _, err = tx.ExecContext(c.Request.Context(), `UPDATE inventory_items SET quantity=$1,updated_at=now() WHERE id=$2`, after, inventoryID); err != nil {
					c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถตัดสต๊อกได้"})
					return
				}
				if err = recordStockMovementTx(c.Request.Context(), tx, branchID, inventoryID, "menu_consumption", -required[inventoryID], before, after, "stock_menu_consumption", nil, input.Note, claims.UserID); err != nil {
					c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกประวัติสต๊อกได้"})
					return
				}
				continue
			}
		}
		if expired {
			c.JSON(400, gin.H{"success": false, "message": "วัตถุดิบ " + name + " หมดอายุ จึงไม่สามารถใช้ตัดสต๊อกได้"})
			return
		}
		after := before - required[inventoryID]
		if after < 0 {
			c.JSON(400, gin.H{"success": false, "message": "วัตถุดิบ " + name + " คงเหลือไม่พอ"})
			return
		}
		if _, err = tx.ExecContext(c.Request.Context(), `UPDATE inventory_items SET quantity=$1,updated_at=now() WHERE id=$2`, after, inventoryID); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถตัดสต๊อกได้"})
			return
		}
		if err = recordStockMovementTx(c.Request.Context(), tx, branchID, inventoryID, "menu_consumption", -required[inventoryID], before, after, "stock_menu_consumption", nil, input.Note, claims.UserID); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกประวัติสต๊อกได้"})
			return
		}
	}
	menuQuantity := 0.0
	for _, item := range input.Items {
		menuQuantity += item.Quantity
	}
	auditChannel := input.Channel
	if len(channels) > 1 {
		auditChannel = "mixed"
	}
	if err = recordAuditTx(c, tx, branchID, claims.UserID, "stock_consumption", 0, "consumed", gin.H{"itemCount": len(input.Items), "menuQuantity": menuQuantity, "channel": auditChannel, "note": input.Note}); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกประวัติได้"})
		return
	}
	totalSales := 0.0
	for _, item := range saleItems {
		totalSales += item.quantity * item.unitPrice
	}
	var saleID int64
	if err = tx.QueryRowContext(c.Request.Context(), `INSERT INTO stock_sales(branch_id,recorded_by,note,total) VALUES($1,$2,$3,$4) RETURNING id`, branchID, claims.UserID, input.Note, totalSales).Scan(&saleID); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกยอดขายพร้อมการตัดสต๊อกได้"})
		return
	}
	for _, item := range saleItems {
		amount := item.quantity * item.unitPrice
		if _, err = tx.ExecContext(c.Request.Context(), `INSERT INTO stock_sale_items(stock_sale_id,menu_item_id,channel,quantity,unit_price,amount) VALUES($1,$2,$3,$4,$5,$6)`, saleID, item.menuItemID, item.channel, item.quantity, item.unitPrice, amount); err != nil {
			c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถบันทึกรายการขายพร้อมการตัดสต๊อกได้"})
			return
		}
	}
	if err = tx.Commit(); err != nil {
		c.JSON(500, gin.H{"success": false, "message": "ไม่สามารถตัดสต๊อกได้"})
		return
	}
	h.invalidateBranchCache(c, branchID)
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"menuCount": len(input.Items), "salesTotal": totalSales}})
}
