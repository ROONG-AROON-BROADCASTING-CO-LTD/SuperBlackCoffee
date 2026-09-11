package handler

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"y/internal/middleware"
	"y/internal/model"
)

const (
	franchisePlanS = "S"
	franchisePlanM = "M"
	franchisePlanL = "L"
)

// ensureCatalogWriteAllowed keeps franchise catalogues centrally managed by Admin.
func (h *PlatformHandler) ensureCatalogWriteAllowed(c *gin.Context) bool {
	if middleware.ClaimsFrom(c).Role != "franchise_owner" {
		return true
	}
	c.JSON(http.StatusForbidden, gin.H{
		"success": false,
		"message": "บัญชีแฟรนไชส์ดูข้อมูลสินค้าได้เท่านั้น",
	})
	return false
}

// requestPlan resolves the size for the branch selected by the current request.
// Admins may select any branch, while other accounts remain constrained by
// branchScope before reaching this function.
func (h *PlatformHandler) requestPlan(c *gin.Context, branchID int64) (string, bool) {
	claims := middleware.ClaimsFrom(c)
	var plan string
	query := `SELECT size FROM branches WHERE id=$1`
	args := []any{branchID}
	if claims.Role == "franchise_owner" {
		if claims.FranchiseeID == nil {
			c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "บัญชีแฟรนไชส์ไม่มีขนาดสาขาที่ใช้งานได้"})
			return "", false
		}
		query += ` AND franchisee_id=$2`
		args = append(args, *claims.FranchiseeID)
	}
	if err := h.db.QueryRowContext(c.Request.Context(), query, args...).Scan(&plan); err != nil || (plan != franchisePlanS && plan != franchisePlanM && plan != franchisePlanL) {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "ไม่พบขนาดสาขา"})
		return "", false
	}
	return plan, true
}

func normalizedCategory(category string) string {
	return strings.ToLower(strings.TrimSpace(category))
}

func menuAllowedForPlan(plan, category string) bool {
	category = normalizedCategory(category)
	if plan != franchisePlanS {
		return true
	}
	return category != "อาหาร" && category != "food" && category != "เบเกอรี่" && category != "bakery"
}

func (h *PlatformHandler) filterMenuForPlan(plan string, items []model.MenuItem) []model.MenuItem {
	if plan == franchisePlanL {
		return items
	}
	filtered := make([]model.MenuItem, 0, len(items))
	for _, item := range items {
		if menuAllowedForPlan(plan, item.Category) {
			filtered = append(filtered, item)
		}
	}
	return filtered
}

func (h *PlatformHandler) filterInventoryForPlan(c *gin.Context, plan string, branchID int64, items []model.InventoryItem) ([]model.InventoryItem, error) {
	if plan != franchisePlanS {
		return items, nil
	}
	rows, err := h.db.QueryContext(c.Request.Context(), `
		SELECT DISTINCT mii.inventory_item_id
		FROM menu_item_ingredients mii
		JOIN menu_items m ON m.id=mii.menu_item_id
		WHERE m.branch_id=$1
		AND lower(m.category) NOT IN ('อาหาร','food','เบเกอรี่','bakery')`, branchID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	allowed := map[int64]struct{}{}
	for rows.Next() {
		var id int64
		if err := rows.Scan(&id); err != nil {
			return nil, err
		}
		allowed[id] = struct{}{}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	filtered := make([]model.InventoryItem, 0, len(items))
	for _, item := range items {
		if item.Kind == model.InventoryKindStock {
			filtered = append(filtered, item)
			continue
		}
		if item.Kind == model.InventoryKindIngredient {
			if _, ok := allowed[item.ID]; ok {
				filtered = append(filtered, item)
			}
		}
	}
	return filtered, nil
}

func (h *PlatformHandler) ensureInventoryWriteAllowed(c *gin.Context, plan string, branchID, inventoryID int64) bool {
	if plan != franchisePlanS || inventoryID == 0 {
		return true
	}
	var kind model.InventoryKind
	if err := h.db.QueryRowContext(c.Request.Context(), `SELECT kind FROM inventory_items WHERE id=$1 AND branch_id=$2`, inventoryID, branchID).Scan(&kind); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบรายการสต็อก"})
		return false
	}
	return true
}

func (h *PlatformHandler) ensureMenuDeleteAllowed(c *gin.Context, plan string, branchID, menuID int64) bool {
	if plan != franchisePlanS {
		return true
	}
	var category string
	if err := h.db.QueryRowContext(c.Request.Context(), `SELECT category FROM menu_items WHERE id=$1 AND branch_id=$2`, menuID, branchID).Scan(&category); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบเมนู"})
		return false
	}
	if !menuAllowedForPlan(plan, category) {
		c.JSON(http.StatusForbidden, gin.H{"success": false, "message": "ขนาดสาขานี้ไม่รองรับหมวดหมู่เมนูดังกล่าว"})
		return false
	}
	return true
}
