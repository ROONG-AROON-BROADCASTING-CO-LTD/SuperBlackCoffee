package handler

import (
	"context"
	"database/sql"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"y/internal/middleware"
)

type catalogTemplateSummary struct {
	ID             int64  `json:"id"`
	Scope          string `json:"scope"`
	Size           string `json:"size"`
	Name           string `json:"name"`
	Description    string `json:"description"`
	InventoryCount int64  `json:"inventoryCount"`
	MenuCount      int64  `json:"menuCount"`
	BranchCount    int64  `json:"branchCount"`
}

type catalogTemplateInventoryItem struct {
	ID             int64    `json:"id"`
	Name           string   `json:"name"`
	ImageURL       string   `json:"imageUrl"`
	Category       string   `json:"category"`
	StockCategory  string   `json:"stockCategory,omitempty"`
	Kind           string   `json:"kind"`
	Unit           string   `json:"unit"`
	UnitCost       float64  `json:"unitCost"`
	ReorderLevel   float64  `json:"reorderLevel"`
	TrackStock     bool     `json:"trackStock"`
	AvailableSizes []string `json:"availableSizes"`
}

type catalogTemplateMenuItem struct {
	ID               int64                   `json:"id"`
	Name             string                  `json:"name"`
	ImageURL         string                  `json:"imageUrl"`
	Category         string                  `json:"category"`
	StorePrice       float64                 `json:"storePrice"`
	LinemanPrice     float64                 `json:"linemanPrice"`
	CostPrice        float64                 `json:"costPrice"`
	LinemanCostPrice float64                 `json:"linemanCostPrice"`
	Status           string                  `json:"status"`
	Recipes          []catalogTemplateRecipe `json:"recipes"`
	AvailableSizes   []string                `json:"availableSizes"`
}

type catalogTemplateRecipe struct {
	CatalogItemID int64   `json:"catalogItemId"`
	Name          string  `json:"name"`
	Channel       string  `json:"channel"`
	Quantity      float64 `json:"quantity"`
	Unit          string  `json:"unit"`
	CostAmount    float64 `json:"costAmount"`
}

type catalogTemplateRecipeInput struct {
	CatalogItemID int64   `json:"catalogItemId" binding:"required,min=1"`
	Channel       string  `json:"channel" binding:"required,oneof=storefront lineman"`
	Quantity      float64 `json:"quantity" binding:"required,gt=0"`
	Unit          string  `json:"unit" binding:"required"`
	CostAmount    float64 `json:"costAmount" binding:"min=0"`
}

type catalogTemplateRecipesInput struct {
	// A present-but-empty array deliberately clears the recipe for menu items
	// that do not need ingredients. A pointer still rejects a missing recipes
	// field, while allowing [] as a valid explicit value.
	Recipes *[]catalogTemplateRecipeInput `json:"recipes" binding:"required,dive"`
}

type catalogTemplateSyncInput struct {
	BranchIDs []int64 `json:"branchIds"`
}

type catalogTemplateExceptionInput struct {
	EntityType string `json:"entityType" binding:"required,oneof=inventory menu"`
	SourceKey  int64  `json:"sourceKey" binding:"required,min=1"`
	Reason     string `json:"reason"`
}

type branchCatalogSelectionInput struct {
	Enabled *bool `json:"enabled" binding:"required"`
}

type catalogTemplateInventoryUpdateInput struct {
	Name           *string   `json:"name"`
	Category       *string   `json:"category"`
	ImageURL       *string   `json:"imageUrl"`
	StockCategory  *string   `json:"stockCategory"`
	Kind           *string   `json:"kind"`
	Unit           *string   `json:"unit"`
	UnitCost       *float64  `json:"unitCost"`
	ReorderLevel   *float64  `json:"reorderLevel"`
	TrackStock     *bool     `json:"trackStock"`
	AvailableSizes *[]string `json:"availableSizes"`
}

type catalogTemplateInventoryCreateInput struct {
	Name           string   `json:"name" binding:"required"`
	Category       string   `json:"category" binding:"required"`
	ImageURL       string   `json:"imageUrl"`
	StockCategory  string   `json:"stockCategory"`
	Kind           string   `json:"kind" binding:"required,oneof=ingredient stock"`
	Unit           string   `json:"unit" binding:"required"`
	UnitCost       float64  `json:"unitCost" binding:"min=0"`
	ReorderLevel   float64  `json:"reorderLevel" binding:"min=0"`
	TrackStock     *bool    `json:"trackStock"`
	AvailableSizes []string `json:"availableSizes" binding:"required"`
}

type catalogTemplateMenuUpdateInput struct {
	Name                  *string   `json:"name"`
	Category              *string   `json:"category"`
	StorePrice            *float64  `json:"storePrice"`
	StorePriceAvailable   *bool     `json:"storePriceAvailable"`
	LinemanPrice          *float64  `json:"linemanPrice"`
	LinemanPriceAvailable *bool     `json:"linemanPriceAvailable"`
	CostPrice             *float64  `json:"costPrice"`
	LinemanCostPrice      *float64  `json:"linemanCostPrice"`
	Status                *string   `json:"status"`
	ImageURL              *string   `json:"imageUrl"`
	PreparationSteps      *string   `json:"preparationSteps"`
	AvailableSizes        *[]string `json:"availableSizes"`
}

type catalogTemplateMenuCreateInput struct {
	Name             string   `json:"name" binding:"required"`
	Category         string   `json:"category" binding:"required"`
	StorePrice       float64  `json:"storePrice" binding:"min=0"`
	LinemanPrice     float64  `json:"linemanPrice" binding:"min=0"`
	CostPrice        float64  `json:"costPrice" binding:"min=0"`
	LinemanCostPrice float64  `json:"linemanCostPrice" binding:"min=0"`
	ImageURL         string   `json:"imageUrl"`
	Status           string   `json:"status" binding:"required,oneof=available soldout"`
	AvailableSizes   []string `json:"availableSizes" binding:"required"`
}

func validatedCatalogSizes(sizes []string) ([]string, bool) {
	seen := make(map[string]bool, len(sizes))
	for _, size := range sizes {
		if size != "S" && size != "M" && size != "L" || seen[size] {
			return nil, false
		}
		seen[size] = true
	}
	if len(seen) == 0 {
		return nil, false
	}
	ordered := make([]string, 0, len(seen))
	for _, size := range []string{"S", "M", "L"} {
		if seen[size] {
			ordered = append(ordered, size)
		}
	}
	return ordered, true
}

func catalogSizesCSV(sizes []string) string {
	return strings.Join(sizes, ",")
}

func catalogSizesFromCSV(value string) []string {
	if value == "" {
		return []string{}
	}
	return strings.Split(value, ",")
}

func (h *PlatformHandler) catalogTemplateID(c *gin.Context) (int64, bool) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสข้อมูลกลางไม่ถูกต้อง"})
		return 0, false
	}
	var exists bool
	if err := h.db.QueryRowContext(c.Request.Context(), `SELECT EXISTS(SELECT 1 FROM catalog_templates WHERE id=$1 AND scope='central' AND active)`, id).Scan(&exists); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถตรวจสอบข้อมูลกลางได้"})
		return 0, false
	}
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบข้อมูลกลาง"})
		return 0, false
	}
	return id, true
}

func catalogTemplateSummaryTx(ctx context.Context, queryer interface {
	QueryRowContext(context.Context, string, ...any) *sql.Row
}, templateID int64) (catalogTemplateSummary, error) {
	var item catalogTemplateSummary
	err := queryer.QueryRowContext(ctx, `
		SELECT t.id,t.scope,t.branch_size,t.name,t.description,
			COALESCE((SELECT COUNT(*) FROM catalog_template_inventory_items i WHERE i.template_id=t.id AND i.active),0),
			COALESCE((SELECT COUNT(*) FROM catalog_template_menu_items m WHERE m.template_id=t.id AND m.active),0),
			COALESCE((SELECT COUNT(*) FROM branch_catalog_template_assignments a WHERE a.template_id=t.id),0)
		FROM catalog_templates t
		WHERE t.id=$1 AND t.scope='central' AND t.active`, templateID).Scan(
		&item.ID, &item.Scope, &item.Size, &item.Name, &item.Description,
		&item.InventoryCount, &item.MenuCount, &item.BranchCount,
	)
	return item, err
}

func (h *PlatformHandler) ListCatalogTemplates(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	rows, err := h.db.QueryContext(c.Request.Context(), `
		SELECT t.id,t.scope,t.branch_size,t.name,t.description,
			COALESCE((SELECT COUNT(*) FROM catalog_template_inventory_items i WHERE i.template_id=t.id AND i.active),0),
			COALESCE((SELECT COUNT(*) FROM catalog_template_menu_items m WHERE m.template_id=t.id AND m.active),0),
			COALESCE((SELECT COUNT(*) FROM branch_catalog_template_assignments a WHERE a.template_id=t.id),0)
		FROM catalog_templates t
		WHERE t.scope='central' AND t.branch_size='ALL' AND t.active
		ORDER BY t.id`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถโหลดแม่แบบกลางได้"})
		return
	}
	defer rows.Close()
	result := make([]catalogTemplateSummary, 0)
	for rows.Next() {
		var item catalogTemplateSummary
		if err := rows.Scan(&item.ID, &item.Scope, &item.Size, &item.Name, &item.Description, &item.InventoryCount, &item.MenuCount, &item.BranchCount); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านแม่แบบกลางได้"})
			return
		}
		result = append(result, item)
	}
	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านแม่แบบกลางได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

func (h *PlatformHandler) GetCatalogTemplate(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	templateID, ok := h.catalogTemplateID(c)
	if !ok {
		return
	}
	summary, err := catalogTemplateSummaryTx(c.Request.Context(), h.db, templateID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบแม่แบบกลาง"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถโหลดแม่แบบกลางได้"})
		return
	}

	inventoryRows, err := h.db.QueryContext(c.Request.Context(), `
		SELECT i.catalog_item_id,c.name,COALESCE(NULLIF(i.image_url,''),c.image_url,''),i.category,COALESCE(i.stock_category,''),i.kind,i.unit,i.unit_cost,i.reorder_level,i.track_stock,array_to_string(i.available_sizes,',')
		FROM catalog_template_inventory_items i
		JOIN inventory_catalog_items c ON c.id=i.catalog_item_id
		WHERE i.template_id=$1 AND i.active
		ORDER BY c.name`, templateID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถโหลดรายการคลังของแม่แบบได้"})
		return
	}
	defer inventoryRows.Close()
	inventoryItems := make([]catalogTemplateInventoryItem, 0)
	for inventoryRows.Next() {
		var item catalogTemplateInventoryItem
		var sizesCSV string
		if err := inventoryRows.Scan(&item.ID, &item.Name, &item.ImageURL, &item.Category, &item.StockCategory, &item.Kind, &item.Unit, &item.UnitCost, &item.ReorderLevel, &item.TrackStock, &sizesCSV); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านรายการคลังของแม่แบบได้"})
			return
		}
		item.AvailableSizes = catalogSizesFromCSV(sizesCSV)
		inventoryItems = append(inventoryItems, item)
	}
	if err := inventoryRows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านรายการคลังของแม่แบบได้"})
		return
	}

	menuRows, err := h.db.QueryContext(c.Request.Context(), `
		SELECT id,name,COALESCE(image_url,''),category,store_price,lineman_price,cost_price,lineman_cost_price,status,array_to_string(available_sizes,',')
		FROM catalog_template_menu_items
		WHERE template_id=$1 AND active
		ORDER BY category,name`, templateID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถโหลดเมนูของแม่แบบได้"})
		return
	}
	defer menuRows.Close()
	menuItems := make([]catalogTemplateMenuItem, 0)
	for menuRows.Next() {
		var item catalogTemplateMenuItem
		var sizesCSV string
		if err := menuRows.Scan(&item.ID, &item.Name, &item.ImageURL, &item.Category, &item.StorePrice, &item.LinemanPrice, &item.CostPrice, &item.LinemanCostPrice, &item.Status, &sizesCSV); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านเมนูของแม่แบบได้"})
			return
		}
		item.Recipes = make([]catalogTemplateRecipe, 0)
		item.AvailableSizes = catalogSizesFromCSV(sizesCSV)
		menuItems = append(menuItems, item)
	}
	if err := menuRows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านเมนูของแม่แบบได้"})
		return
	}
	menuIndex := make(map[int64]int, len(menuItems))
	for index := range menuItems {
		menuIndex[menuItems[index].ID] = index
	}
	recipeRows, err := h.db.QueryContext(c.Request.Context(), `
		SELECT recipe.template_menu_item_id,recipe.catalog_item_id,catalog.name,
			recipe.channel,recipe.quantity,recipe.unit,recipe.cost_amount
		FROM catalog_template_menu_ingredients recipe
		JOIN catalog_template_menu_items menu ON menu.id=recipe.template_menu_item_id
		JOIN inventory_catalog_items catalog ON catalog.id=recipe.catalog_item_id
		WHERE menu.template_id=$1 AND menu.active
		ORDER BY menu.name,recipe.channel,catalog.name`, templateID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถโหลดสูตรในแม่แบบได้"})
		return
	}
	defer recipeRows.Close()
	for recipeRows.Next() {
		var menuID int64
		var recipe catalogTemplateRecipe
		if err := recipeRows.Scan(&menuID, &recipe.CatalogItemID, &recipe.Name, &recipe.Channel, &recipe.Quantity, &recipe.Unit, &recipe.CostAmount); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านสูตรในแม่แบบได้"})
			return
		}
		if index, exists := menuIndex[menuID]; exists {
			menuItems[index].Recipes = append(menuItems[index].Recipes, recipe)
		}
	}
	if err := recipeRows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านสูตรในแม่แบบได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{
		"id":             summary.ID,
		"scope":          summary.Scope,
		"size":           summary.Size,
		"name":           summary.Name,
		"description":    summary.Description,
		"inventoryCount": summary.InventoryCount,
		"menuCount":      summary.MenuCount,
		"branchCount":    summary.BranchCount,
		"inventoryItems": inventoryItems,
		"menuItems":      menuItems,
	}})
}

func (h *PlatformHandler) GetCatalogTemplateImpact(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	templateID, ok := h.catalogTemplateID(c)
	if !ok {
		return
	}
	summary, err := catalogTemplateSummaryTx(c.Request.Context(), h.db, templateID)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบแม่แบบกลาง"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถคำนวณผลกระทบของแม่แบบได้"})
		return
	}
	rows, err := h.db.QueryContext(c.Request.Context(), `
		SELECT b.id,b.name,b.code,b.size
		FROM branch_catalog_template_assignments a
		JOIN branches b ON b.id=a.branch_id
		WHERE a.template_id=$1
		ORDER BY b.name,b.id`, templateID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถคำนวณผลกระทบของแม่แบบได้"})
		return
	}
	defer rows.Close()
	branches := make([]gin.H, 0)
	for rows.Next() {
		var id int64
		var name, code, size string
		if err := rows.Scan(&id, &name, &code, &size); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านสาขาที่ได้รับผลกระทบได้"})
			return
		}
		branches = append(branches, gin.H{"id": id, "name": name, "code": code, "size": size})
	}
	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านสาขาที่ได้รับผลกระทบได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"template": summary, "branches": branches, "count": len(branches)}})
}

// assignBranchCatalogTemplateTx changes only the configuration relationship.
// syncCatalogTemplateToBranchTx is deliberately separate so callers can keep
// the relationship and its safe metadata propagation in one transaction.
func assignBranchCatalogTemplateTx(ctx context.Context, tx *sql.Tx, branchID int64, size string) (int64, error) {
	if size != "S" && size != "M" && size != "L" {
		return 0, sql.ErrNoRows
	}
	var templateID int64
	err := tx.QueryRowContext(ctx, `SELECT id FROM catalog_templates WHERE scope='central' AND branch_size='ALL' AND active`).Scan(&templateID)
	if err != nil {
		return 0, err
	}
	_, err = tx.ExecContext(ctx, `
		INSERT INTO branch_catalog_template_assignments(branch_id,template_id,assigned_at)
		VALUES($1,$2,now())
		ON CONFLICT (branch_id) DO UPDATE
		SET template_id=EXCLUDED.template_id,assigned_at=EXCLUDED.assigned_at`, branchID, templateID)
	return templateID, err
}

// syncCatalogTemplateToBranchTx copies only template-managed commercial data.
// It never selects, writes, or deletes quantities, expiry dates, fresh lots,
// stock movements, sales, purchase orders, or branch-local menu exceptions.
func syncCatalogTemplateToBranchTx(ctx context.Context, tx *sql.Tx, templateID, branchID int64) error {
	// Rows from a previously assigned size remain in place for audit/history,
	// but are no longer operationally visible after the branch changes template.
	if _, err := tx.ExecContext(ctx, `
		UPDATE inventory_items
		SET template_enabled=false,updated_at=now()
		WHERE branch_id=$2
		  AND catalog_template_id IS NOT NULL
		  AND (
			catalog_template_id<>$1
			OR NOT EXISTS (
			  SELECT 1 FROM catalog_template_inventory_items active_item
			  JOIN branches branch ON branch.id=$2
			  WHERE active_item.template_id=$1
			    AND active_item.catalog_item_id=inventory_items.catalog_item_id
			    AND active_item.active
			    AND COALESCE(branch.size,'S')=ANY(active_item.available_sizes)
			    AND NOT EXISTS (
			      SELECT 1 FROM branch_catalog_item_selections selection
			      WHERE selection.branch_id=$2 AND selection.entity_type='inventory'
			        AND selection.source_key=active_item.catalog_item_id AND NOT selection.enabled
			    )
			)
		  )`, templateID, branchID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE menu_items
		SET template_enabled=false,updated_at=now()
		WHERE branch_id=$2
		  AND catalog_template_menu_item_id IS NOT NULL
		  AND NOT EXISTS (
			SELECT 1 FROM catalog_template_menu_items active_menu
			JOIN branches branch ON branch.id=$2
			WHERE active_menu.id=menu_items.catalog_template_menu_item_id
			  AND active_menu.template_id=$1 AND active_menu.active
			  AND COALESCE(branch.size,'S')=ANY(active_menu.available_sizes)
			  AND NOT EXISTS (
			    SELECT 1 FROM branch_catalog_item_selections selection
			    WHERE selection.branch_id=$2 AND selection.entity_type='menu'
			      AND selection.source_key=active_menu.id AND NOT selection.enabled
			  )
		  )`, templateID, branchID); err != nil {
		return err
	}

	// Update template-owned inventory metadata while keeping branch quantity and
	// expiry columns intact. An explicit branch exception opts the row out.
	if _, err := tx.ExecContext(ctx, `
		UPDATE inventory_items target
		SET name=catalog.name,
			category=template_item.category,
			stock_category=NULLIF(template_item.stock_category,''),
			kind=template_item.kind,
			unit=template_item.unit,
			reorder_level=CASE WHEN template_item.track_stock THEN template_item.reorder_level ELSE 0 END,
			unit_cost=template_item.unit_cost,
			image_url=template_item.image_url,
			catalog_template_id=template_item.template_id,
			template_enabled=true,
			updated_at=now()
		FROM catalog_template_inventory_items template_item
		JOIN inventory_catalog_items catalog ON catalog.id=template_item.catalog_item_id
		LEFT JOIN branch_catalog_template_exceptions exception
		  ON exception.branch_id=$2
		 AND exception.entity_type='inventory'
		 AND exception.source_key=template_item.catalog_item_id
		WHERE target.branch_id=$2
		  AND target.catalog_item_id=template_item.catalog_item_id
		  AND template_item.template_id=$1
		  AND template_item.active
		  AND EXISTS (SELECT 1 FROM branches branch WHERE branch.id=$2 AND COALESCE(branch.size,'S')=ANY(template_item.available_sizes))
		  AND NOT EXISTS (
		    SELECT 1 FROM branch_catalog_item_selections selection
		    WHERE selection.branch_id=$2 AND selection.entity_type='inventory'
		      AND selection.source_key=template_item.catalog_item_id AND NOT selection.enabled
		  )
		  AND exception.branch_id IS NULL`, templateID, branchID); err != nil {
		return err
	}

	// New stock records always start at zero and without an expiry date. Opening
	// stock and lots must be received through the normal branch workflow.
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO inventory_items(
			branch_id,catalog_item_id,name,category,stock_category,kind,
			quantity,unit,reorder_level,unit_cost,image_url,expiry_date,
			catalog_template_id,template_enabled
		)
		SELECT $2,template_item.catalog_item_id,catalog.name,template_item.category,
			NULLIF(template_item.stock_category,''),template_item.kind,0,
			template_item.unit,
			CASE WHEN template_item.track_stock THEN template_item.reorder_level ELSE 0 END,
			template_item.unit_cost,template_item.image_url,NULL,$1,true
		FROM catalog_template_inventory_items template_item
		JOIN inventory_catalog_items catalog ON catalog.id=template_item.catalog_item_id
		LEFT JOIN branch_catalog_template_exceptions exception
		  ON exception.branch_id=$2
		 AND exception.entity_type='inventory'
		 AND exception.source_key=template_item.catalog_item_id
		WHERE template_item.template_id=$1
		  AND template_item.active
		  AND EXISTS (SELECT 1 FROM branches branch WHERE branch.id=$2 AND COALESCE(branch.size,'S')=ANY(template_item.available_sizes))
		  AND NOT EXISTS (
		    SELECT 1 FROM branch_catalog_item_selections selection
		    WHERE selection.branch_id=$2 AND selection.entity_type='inventory'
		      AND selection.source_key=template_item.catalog_item_id AND NOT selection.enabled
		  )
		  AND exception.branch_id IS NULL
		  AND NOT EXISTS (
			SELECT 1 FROM inventory_items existing
			WHERE existing.branch_id=$2 AND existing.catalog_item_id=template_item.catalog_item_id
		  )
		ON CONFLICT (branch_id,name) DO NOTHING`, templateID, branchID); err != nil {
		return err
	}

	// A menu is commercial data, so prices, availability, status and recipes
	// are synchronized. Existing records with a matching template menu can be
	// opted out through a branch exception; no menu is deleted by synchronization.
	if _, err := tx.ExecContext(ctx, `
		UPDATE menu_items target
		SET name=template_menu.name,
			category=template_menu.category,
			store_price=template_menu.store_price,
			store_price_available=template_menu.store_price_available,
			lineman_price=template_menu.lineman_price,
			lineman_price_available=template_menu.lineman_price_available,
			cost_price=template_menu.cost_price,
			lineman_cost_price=template_menu.lineman_cost_price,
			status=template_menu.status,
			image_url=template_menu.image_url,
			preparation_steps=template_menu.preparation_steps,
			catalog_template_menu_item_id=template_menu.id,
			template_enabled=true,
			updated_at=now()
		FROM catalog_template_menu_items template_menu
		LEFT JOIN branch_catalog_template_exceptions exception
		  ON exception.branch_id=$2
		 AND exception.entity_type='menu'
		 AND exception.source_key=template_menu.id
		WHERE target.branch_id=$2
		  AND (target.catalog_template_menu_item_id=template_menu.id OR target.name=template_menu.name)
		  AND template_menu.template_id=$1
		  AND template_menu.active
		  AND EXISTS (SELECT 1 FROM branches branch WHERE branch.id=$2 AND COALESCE(branch.size,'S')=ANY(template_menu.available_sizes))
		  AND NOT EXISTS (
		    SELECT 1 FROM branch_catalog_item_selections selection
		    WHERE selection.branch_id=$2 AND selection.entity_type='menu'
		      AND selection.source_key=template_menu.id AND NOT selection.enabled
		  )
		  AND exception.branch_id IS NULL`, templateID, branchID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `
		INSERT INTO menu_items(
			branch_id,name,category,store_price,store_price_available,
			lineman_price,lineman_price_available,cost_price,lineman_cost_price,
			status,image_url,preparation_steps,catalog_template_menu_item_id,template_enabled
		)
		SELECT $2,name,category,store_price,store_price_available,
			lineman_price,lineman_price_available,cost_price,lineman_cost_price,
			status,image_url,preparation_steps,id,true
		FROM catalog_template_menu_items template_menu
		LEFT JOIN branch_catalog_template_exceptions exception
		  ON exception.branch_id=$2
		 AND exception.entity_type='menu'
		 AND exception.source_key=template_menu.id
		WHERE template_menu.template_id=$1
		  AND template_menu.active
		  AND EXISTS (SELECT 1 FROM branches branch WHERE branch.id=$2 AND COALESCE(branch.size,'S')=ANY(template_menu.available_sizes))
		  AND NOT EXISTS (
		    SELECT 1 FROM branch_catalog_item_selections selection
		    WHERE selection.branch_id=$2 AND selection.entity_type='menu'
		      AND selection.source_key=template_menu.id AND NOT selection.enabled
		  )
		  AND exception.branch_id IS NULL
		  AND NOT EXISTS (
			SELECT 1 FROM menu_items existing WHERE existing.branch_id=$2 AND existing.name=template_menu.name
		  )
		ON CONFLICT (branch_id,name) DO NOTHING`, templateID, branchID); err != nil {
		return err
	}

	// A branch can opt an ingredient out, or change size after a previous
	// selection. Never leave an enabled menu with an incomplete active recipe.
	if _, err := tx.ExecContext(ctx, `
		UPDATE menu_items branch_menu
		SET template_enabled=false,updated_at=now()
		WHERE branch_menu.branch_id=$2
		  AND branch_menu.template_enabled
		  AND branch_menu.catalog_template_menu_item_id IN (
		    SELECT menu.id FROM catalog_template_menu_items menu
		    WHERE menu.template_id=$1
		  )
		  AND EXISTS (
		    SELECT 1
		    FROM catalog_template_menu_ingredients recipe
		    WHERE recipe.template_menu_item_id=branch_menu.catalog_template_menu_item_id
		      AND NOT EXISTS (
		        SELECT 1 FROM inventory_items inventory
		        WHERE inventory.branch_id=$2
		          AND inventory.catalog_item_id=recipe.catalog_item_id
		          AND inventory.template_enabled
		      )
		  )`, templateID, branchID); err != nil {
		return err
	}

	// Replace recipes for managed menus so removing a line from the central
	// template cannot keep deducting an obsolete ingredient at a branch.
	if _, err := tx.ExecContext(ctx, `
		DELETE FROM menu_item_ingredients recipe
		USING menu_items branch_menu,catalog_template_menu_items template_menu
		WHERE recipe.menu_item_id=branch_menu.id
		  AND branch_menu.branch_id=$2
		  AND branch_menu.catalog_template_menu_item_id=template_menu.id
		  AND branch_menu.template_enabled
		  AND template_menu.template_id=$1
		  AND NOT EXISTS (
			SELECT 1 FROM branch_catalog_template_exceptions exception
			WHERE exception.branch_id=$2
			  AND exception.entity_type='menu'
			  AND exception.source_key=template_menu.id
		  )`, templateID, branchID); err != nil {
		return err
	}

	if _, err := tx.ExecContext(ctx, `
		INSERT INTO menu_item_ingredients(menu_item_id,inventory_item_id,quantity,unit,cost_amount,channel)
		SELECT branch_menu.id,branch_inventory.id,recipe.quantity,recipe.unit,recipe.cost_amount,recipe.channel
		FROM catalog_template_menu_ingredients recipe
		JOIN catalog_template_menu_items template_menu ON template_menu.id=recipe.template_menu_item_id
		JOIN menu_items branch_menu ON branch_menu.branch_id=$2 AND branch_menu.catalog_template_menu_item_id=template_menu.id AND branch_menu.template_enabled
		JOIN inventory_items branch_inventory ON branch_inventory.branch_id=$2 AND branch_inventory.catalog_item_id=recipe.catalog_item_id AND branch_inventory.template_enabled
		LEFT JOIN branch_catalog_template_exceptions exception
		  ON exception.branch_id=$2
		 AND exception.entity_type='menu'
		 AND exception.source_key=template_menu.id
		WHERE template_menu.template_id=$1
		  AND template_menu.active
		  AND exception.branch_id IS NULL
		ON CONFLICT (menu_item_id,inventory_item_id,channel) DO UPDATE
		SET quantity=EXCLUDED.quantity,unit=EXCLUDED.unit,cost_amount=EXCLUDED.cost_amount`, templateID, branchID); err != nil {
		return err
	}
	if _, err := tx.ExecContext(ctx, `
		UPDATE branch_catalog_template_assignments
		SET last_synced_at=now()
		WHERE branch_id=$1 AND template_id=$2`, branchID, templateID); err != nil {
		return err
	}
	return nil
}

func (h *PlatformHandler) SyncCatalogTemplate(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	templateID, ok := h.catalogTemplateID(c)
	if !ok {
		return
	}
	var input catalogTemplateSyncInput
	if c.Request.Body != nil && c.Request.ContentLength != 0 {
		if err := c.ShouldBindJSON(&input); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ข้อมูลสาขาที่ต้องกระจายแม่แบบไม่ถูกต้อง"})
			return
		}
	}
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถเริ่มกระจายแม่แบบกลางได้"})
		return
	}
	defer tx.Rollback()
	if _, err := catalogTemplateSummaryTx(c.Request.Context(), tx, templateID); err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบแม่แบบกลาง"})
		return
	} else if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านแม่แบบกลางได้"})
		return
	}

	branchIDs := make([]int64, 0)
	if len(input.BranchIDs) == 0 {
		rows, err := tx.QueryContext(c.Request.Context(), `SELECT branch_id FROM branch_catalog_template_assignments WHERE template_id=$1 ORDER BY branch_id`, templateID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านสาขาที่ต้องกระจายแม่แบบได้"})
			return
		}
		for rows.Next() {
			var branchID int64
			if err := rows.Scan(&branchID); err != nil {
				rows.Close()
				c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านสาขาที่ต้องกระจายแม่แบบได้"})
				return
			}
			branchIDs = append(branchIDs, branchID)
		}
		if err := rows.Err(); err != nil {
			rows.Close()
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านสาขาที่ต้องกระจายแม่แบบได้"})
			return
		}
		rows.Close()
	} else {
		seen := make(map[int64]struct{}, len(input.BranchIDs))
		for _, branchID := range input.BranchIDs {
			if branchID < 1 {
				c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสสาขาที่ต้องกระจายแม่แบบไม่ถูกต้อง"})
				return
			}
			if _, exists := seen[branchID]; exists {
				continue
			}
			seen[branchID] = struct{}{}
			var assigned bool
			if err := tx.QueryRowContext(c.Request.Context(), `SELECT EXISTS(SELECT 1 FROM branch_catalog_template_assignments WHERE branch_id=$1 AND template_id=$2)`, branchID, templateID).Scan(&assigned); err != nil || !assigned {
				c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "พบสาขาที่ไม่ได้ใช้แม่แบบที่เลือก"})
				return
			}
			branchIDs = append(branchIDs, branchID)
		}
	}

	actorID := middleware.ClaimsFrom(c).UserID
	for _, branchID := range branchIDs {
		if err := syncCatalogTemplateToBranchTx(c.Request.Context(), tx, templateID, branchID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถกระจายแม่แบบกลางได้"})
			return
		}
		if _, err := tx.ExecContext(c.Request.Context(), `INSERT INTO catalog_template_sync_events(template_id,branch_id,actor_id,reason) VALUES($1,$2,$3,'manual')`, templateID, branchID, actorID); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถบันทึกประวัติการกระจายแม่แบบได้"})
			return
		}
	}
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถยืนยันการกระจายแม่แบบกลางได้"})
		return
	}
	for _, branchID := range branchIDs {
		h.invalidateBranchCache(c, branchID)
	}
	summary, err := catalogTemplateSummaryTx(c.Request.Context(), h.db, templateID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "กระจายแม่แบบแล้ว แต่ไม่สามารถอ่านผลลัพธ์ได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"syncedBranches": len(branchIDs), "template": summary}})
}

// SetCatalogTemplateException provides a deliberate escape hatch for a
// branch-local commercial exception. The central template remains unchanged
// and subsequent synchronizations leave this single item untouched.
func (h *PlatformHandler) SetCatalogTemplateException(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	branchID, err := strconv.ParseInt(c.Param("branchId"), 10, 64)
	if err != nil || branchID < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสสาขาไม่ถูกต้อง"})
		return
	}
	var input catalogTemplateExceptionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ข้อมูลข้อยกเว้นของสาขาไม่ถูกต้อง"})
		return
	}
	if _, err := h.db.ExecContext(c.Request.Context(), `
		INSERT INTO branch_catalog_template_exceptions(branch_id,entity_type,source_key,reason)
		VALUES($1,$2,$3,$4)
		ON CONFLICT (branch_id,entity_type,source_key) DO UPDATE SET reason=EXCLUDED.reason`,
		branchID, input.EntityType, input.SourceKey, strings.TrimSpace(input.Reason)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถบันทึกข้อยกเว้นของสาขาได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"branchId": branchID, "entityType": input.EntityType, "sourceKey": input.SourceKey}})
}

func (h *PlatformHandler) ListCatalogTemplateExceptions(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	branchID, err := strconv.ParseInt(c.Param("branchId"), 10, 64)
	if err != nil || branchID < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสสาขาไม่ถูกต้อง"})
		return
	}
	rows, err := h.db.QueryContext(c.Request.Context(), `
		SELECT entity_type,source_key,reason,created_at
		FROM branch_catalog_template_exceptions
		WHERE branch_id=$1
		ORDER BY entity_type,source_key`, branchID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถโหลดข้อยกเว้นของสาขาได้"})
		return
	}
	defer rows.Close()
	items := make([]gin.H, 0)
	for rows.Next() {
		var entityType, reason string
		var sourceKey int64
		var createdAt any
		if err = rows.Scan(&entityType, &sourceKey, &reason, &createdAt); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านข้อยกเว้นของสาขาได้"})
			return
		}
		items = append(items, gin.H{"entityType": entityType, "sourceKey": sourceKey, "reason": reason, "createdAt": createdAt})
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": items})
}

func (h *PlatformHandler) DeleteCatalogTemplateException(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	branchID, err := strconv.ParseInt(c.Param("branchId"), 10, 64)
	if err != nil || branchID < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสสาขาไม่ถูกต้อง"})
		return
	}
	entityType := c.Param("entityType")
	if entityType != "inventory" && entityType != "menu" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ประเภทข้อยกเว้นไม่ถูกต้อง"})
		return
	}
	sourceKey, err := strconv.ParseInt(c.Param("sourceKey"), 10, 64)
	if err != nil || sourceKey < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสรายการข้อยกเว้นไม่ถูกต้อง"})
		return
	}
	result, err := h.db.ExecContext(c.Request.Context(), `DELETE FROM branch_catalog_template_exceptions WHERE branch_id=$1 AND entity_type=$2 AND source_key=$3`, branchID, entityType, sourceKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถลบข้อยกเว้นของสาขาได้"})
		return
	}
	deleted, _ := result.RowsAffected()
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"deleted": deleted > 0}})
}

func (h *PlatformHandler) ListBranchCatalogSelections(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	branchID, err := strconv.ParseInt(c.Param("branchId"), 10, 64)
	if err != nil || branchID < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสสาขาไม่ถูกต้อง"})
		return
	}
	rows, err := h.db.QueryContext(c.Request.Context(), `
		SELECT entity_type,source_key,enabled
		FROM branch_catalog_item_selections WHERE branch_id=$1
		ORDER BY entity_type,source_key`, branchID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถโหลดการเลือกใช้สินค้าได้"})
		return
	}
	defer rows.Close()
	selections := make([]gin.H, 0)
	for rows.Next() {
		var entityType string
		var sourceKey int64
		var enabled bool
		if err := rows.Scan(&entityType, &sourceKey, &enabled); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านการเลือกใช้สินค้าได้"})
			return
		}
		selections = append(selections, gin.H{"entityType": entityType, "sourceKey": sourceKey, "enabled": enabled})
	}
	if err := rows.Err(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านการเลือกใช้สินค้าได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": selections})
}

func (h *PlatformHandler) SetBranchCatalogSelection(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	branchID, err := strconv.ParseInt(c.Param("branchId"), 10, 64)
	if err != nil || branchID < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสสาขาไม่ถูกต้อง"})
		return
	}
	entityType := c.Param("entityType")
	if entityType != "inventory" && entityType != "menu" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ประเภทสินค้าไม่ถูกต้อง"})
		return
	}
	sourceKey, err := strconv.ParseInt(c.Param("sourceKey"), 10, 64)
	if err != nil || sourceKey < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสสินค้าไม่ถูกต้อง"})
		return
	}
	var input branchCatalogSelectionInput
	if err := c.ShouldBindJSON(&input); err != nil || input.Enabled == nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "กรุณาระบุสถานะการเลือกใช้"})
		return
	}
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถเลือกใช้สินค้าได้"})
		return
	}
	defer tx.Rollback()
	var templateID int64
	var size string
	if err := tx.QueryRowContext(c.Request.Context(), `
		SELECT assignment.template_id,COALESCE(branch.size,'S')
		FROM branch_catalog_template_assignments assignment
		JOIN branches branch ON branch.id=assignment.branch_id
		JOIN catalog_templates catalog ON catalog.id=assignment.template_id AND catalog.scope='central' AND catalog.active
		WHERE assignment.branch_id=$1 FOR UPDATE OF assignment`, branchID).Scan(&templateID, &size); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบสาขาที่ใช้ข้อมูลกลาง"})
		return
	}
	var exists bool
	if entityType == "inventory" {
		err = tx.QueryRowContext(c.Request.Context(), `
			SELECT EXISTS(SELECT 1 FROM catalog_template_inventory_items
			WHERE template_id=$1 AND catalog_item_id=$2 AND active AND $3=ANY(available_sizes))`, templateID, sourceKey, size).Scan(&exists)
	} else {
		err = tx.QueryRowContext(c.Request.Context(), `
			SELECT EXISTS(SELECT 1 FROM catalog_template_menu_items
			WHERE template_id=$1 AND id=$2 AND active AND $3=ANY(available_sizes))`, templateID, sourceKey, size).Scan(&exists)
	}
	if err != nil || !exists {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบรายการที่ใช้ได้กับขนาดสาขานี้"})
		return
	}
	if entityType == "inventory" && !*input.Enabled {
		var dependentMenus int
		if err := tx.QueryRowContext(c.Request.Context(), `
			SELECT COUNT(DISTINCT menu.id)
			FROM menu_items menu
			JOIN menu_item_ingredients recipe ON recipe.menu_item_id=menu.id
			JOIN inventory_items inventory ON inventory.id=recipe.inventory_item_id
			WHERE menu.branch_id=$1 AND menu.template_enabled
			  AND inventory.catalog_item_id=$2`, branchID, sourceKey).Scan(&dependentMenus); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถตรวจสอบสูตรที่ใช้วัตถุดิบนี้ได้"})
			return
		}
		if dependentMenus > 0 {
			c.JSON(http.StatusConflict, gin.H{"success": false, "message": "เมนูที่เปิดใช้งานยังใช้วัตถุดิบนี้ กรุณาปิดเมนูก่อน"})
			return
		}
	}
	if entityType == "menu" && *input.Enabled {
		var missingIngredients int
		if err := tx.QueryRowContext(c.Request.Context(), `
			SELECT COUNT(*)
			FROM catalog_template_menu_ingredients recipe
			JOIN catalog_template_inventory_items inventory
			  ON inventory.template_id=$1 AND inventory.catalog_item_id=recipe.catalog_item_id
			WHERE recipe.template_menu_item_id=$2
			  AND (NOT inventory.active OR NOT ($3=ANY(inventory.available_sizes))
		    OR EXISTS (
		      SELECT 1 FROM branch_catalog_item_selections selection
		      WHERE selection.branch_id=$4 AND selection.entity_type='inventory'
		        AND selection.source_key=recipe.catalog_item_id AND NOT selection.enabled
		    ))`, templateID, sourceKey, size, branchID).Scan(&missingIngredients); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถตรวจสอบวัตถุดิบของเมนูได้"})
			return
		}
		if missingIngredients > 0 {
			c.JSON(http.StatusConflict, gin.H{"success": false, "message": "ต้องเปิดใช้วัตถุดิบในสูตรก่อนเปิดเมนูนี้"})
			return
		}
	}
	if _, err := tx.ExecContext(c.Request.Context(), `
		INSERT INTO branch_catalog_item_selections(branch_id,entity_type,source_key,enabled)
		VALUES($1,$2,$3,$4)
		ON CONFLICT (branch_id,entity_type,source_key)
		DO UPDATE SET enabled=EXCLUDED.enabled,updated_at=now()`, branchID, entityType, sourceKey, *input.Enabled); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถบันทึกการเลือกใช้สินค้าได้"})
		return
	}
	if err := syncCatalogTemplateToBranchTx(c.Request.Context(), tx, templateID, branchID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอัปเดตรายการของสาขาได้"})
		return
	}
	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถยืนยันการเลือกใช้สินค้าได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"branchId": branchID, "entityType": entityType, "sourceKey": sourceKey, "enabled": *input.Enabled}})
}

func catalogTemplateCatalogItemID(c *gin.Context) (int64, bool) {
	id, err := strconv.ParseInt(c.Param("catalogItemId"), 10, 64)
	if err != nil || id < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสรายการคลังกลางไม่ถูกต้อง"})
		return 0, false
	}
	return id, true
}

func catalogTemplateMenuItemID(c *gin.Context) (int64, bool) {
	id, err := strconv.ParseInt(c.Param("menuId"), 10, 64)
	if err != nil || id < 1 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รหัสเมนูในแม่แบบไม่ถูกต้อง"})
		return 0, false
	}
	return id, true
}

func nonEmptyTemplateString(value *string, field string) (string, bool) {
	if value == nil {
		return "", true
	}
	trimmed := strings.TrimSpace(*value)
	return trimmed, trimmed != ""
}

// CreateCatalogTemplateInventory adds metadata to one central template only.
// Branch balances are created later by explicit sync and always start at zero.
func (h *PlatformHandler) CreateCatalogTemplateInventory(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	templateID, ok := h.catalogTemplateID(c)
	if !ok {
		return
	}
	var input catalogTemplateInventoryCreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ข้อมูลรายการคลังกลางไม่ถูกต้อง"})
		return
	}
	input.Name = strings.TrimSpace(input.Name)
	input.Category = strings.TrimSpace(input.Category)
	input.StockCategory = strings.TrimSpace(input.StockCategory)
	input.Unit = strings.TrimSpace(input.Unit)
	if input.Name == "" || input.Category == "" || input.Unit == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "กรุณาระบุชื่อ หมวดหมู่ และหน่วย"})
		return
	}
	sizes, valid := validatedCatalogSizes(input.AvailableSizes)
	if !valid {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "เลือกขนาด S, M หรือ L อย่างน้อยหนึ่งขนาดและไม่ซ้ำกัน"})
		return
	}
	if input.Kind != "stock" {
		input.StockCategory = ""
	} else if input.StockCategory != "" && input.StockCategory != "drink_equipment" && input.StockCategory != "postal_equipment" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "หมวดอุปกรณ์ไม่ถูกต้อง"})
		return
	}
	trackStock := true
	if input.TrackStock != nil {
		trackStock = *input.TrackStock
	}
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถเพิ่มรายการคลังกลางได้"})
		return
	}
	defer tx.Rollback()
	var templateExists bool
	if err = tx.QueryRowContext(c.Request.Context(), `SELECT EXISTS(SELECT 1 FROM catalog_templates WHERE id=$1 AND active)`, templateID).Scan(&templateExists); err != nil || !templateExists {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบแม่แบบกลาง"})
		return
	}
	var catalogItemID int64
	var canonicalTrackStock bool
	var canonicalKind, canonicalUnit string
	err = tx.QueryRowContext(c.Request.Context(), `
		INSERT INTO inventory_catalog_items(name,category,stock_category,kind,unit,unit_cost,image_url,track_stock)
		VALUES($1,$2,NULLIF($3,''),$4,$5,$6,$7,$8)
		ON CONFLICT (name) DO UPDATE SET name=EXCLUDED.name
		RETURNING id,track_stock,kind,unit`, input.Name, input.Category, input.StockCategory, input.Kind, input.Unit, input.UnitCost, input.ImageURL, trackStock).Scan(&catalogItemID, &canonicalTrackStock, &canonicalKind, &canonicalUnit)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "ไม่สามารถสร้างหรือใช้รายการกลางชื่อนี้ได้"})
		return
	}
	if canonicalKind != input.Kind || normalizeInventoryUnit(canonicalUnit) != normalizeInventoryUnit(input.Unit) || input.TrackStock != nil && canonicalTrackStock != *input.TrackStock {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "ชื่อรายการนี้มีอยู่แล้ว แต่ชนิด หน่วย หรือวิธีติดตามสต๊อกไม่ตรงกับข้อมูลกลาง"})
		return
	}
	if _, err = tx.ExecContext(c.Request.Context(), `
		INSERT INTO catalog_template_inventory_items(template_id,catalog_item_id,category,stock_category,kind,unit,unit_cost,reorder_level,track_stock,image_url,available_sizes,active)
		VALUES($1,$2,$3,NULLIF($4,''),$5,$6,$7,$8,$9,$10,string_to_array($11,','),true)
		ON CONFLICT (template_id,catalog_item_id) DO UPDATE SET category=EXCLUDED.category,stock_category=EXCLUDED.stock_category,kind=EXCLUDED.kind,unit=EXCLUDED.unit,unit_cost=EXCLUDED.unit_cost,reorder_level=EXCLUDED.reorder_level,track_stock=EXCLUDED.track_stock,image_url=EXCLUDED.image_url,available_sizes=EXCLUDED.available_sizes,active=true,updated_at=now()`, templateID, catalogItemID, input.Category, input.StockCategory, input.Kind, input.Unit, input.UnitCost, input.ReorderLevel, canonicalTrackStock, input.ImageURL, catalogSizesCSV(sizes)); err != nil {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "รายการนี้ไม่สอดคล้องกับข้อมูลกลางเดิม"})
		return
	}
	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถยืนยันรายการคลังกลางได้"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": catalogItemID}})
}

func (h *PlatformHandler) CreateCatalogTemplateMenu(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	templateID, ok := h.catalogTemplateID(c)
	if !ok {
		return
	}
	var input catalogTemplateMenuCreateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ข้อมูลเมนูกลางไม่ถูกต้อง"})
		return
	}
	input.Name = strings.TrimSpace(input.Name)
	input.Category = strings.TrimSpace(input.Category)
	if input.Name == "" || input.Category == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "กรุณาระบุชื่อและหมวดหมู่เมนู"})
		return
	}
	sizes, valid := validatedCatalogSizes(input.AvailableSizes)
	if !valid {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "เลือกขนาด S, M หรือ L อย่างน้อยหนึ่งขนาดและไม่ซ้ำกัน"})
		return
	}
	var id int64
	err := h.db.QueryRowContext(c.Request.Context(), `
		INSERT INTO catalog_template_menu_items(template_id,name,category,store_price,lineman_price,cost_price,lineman_cost_price,image_url,status,available_sizes,active)
		VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,string_to_array($10,','),true)
		ON CONFLICT (template_id,name) DO UPDATE SET category=EXCLUDED.category,store_price=EXCLUDED.store_price,lineman_price=EXCLUDED.lineman_price,cost_price=EXCLUDED.cost_price,lineman_cost_price=EXCLUDED.lineman_cost_price,image_url=EXCLUDED.image_url,status=EXCLUDED.status,available_sizes=EXCLUDED.available_sizes,active=true,updated_at=now()
		RETURNING id`, templateID, input.Name, input.Category, input.StorePrice, input.LinemanPrice, input.CostPrice, input.LinemanCostPrice, input.ImageURL, input.Status, catalogSizesCSV(sizes)).Scan(&id)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "ไม่สามารถเพิ่มเมนูในแม่แบบกลางได้"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"id": id}})
}

// UpdateCatalogTemplateInventory changes the central defaults only. The
// branch-facing copy is intentionally updated later through explicit sync,
// after the admin has reviewed the impact list.
func (h *PlatformHandler) UpdateCatalogTemplateInventory(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	templateID, ok := h.catalogTemplateID(c)
	if !ok {
		return
	}
	catalogItemID, ok := catalogTemplateCatalogItemID(c)
	if !ok {
		return
	}
	var input catalogTemplateInventoryUpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ข้อมูลรายการคลังกลางไม่ถูกต้อง"})
		return
	}
	if input.UnitCost != nil && *input.UnitCost < 0 || input.ReorderLevel != nil && *input.ReorderLevel < 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ต้นทุนและจุดแจ้งเตือนต้องไม่ติดลบ"})
		return
	}
	if input.Kind != nil && *input.Kind != "ingredient" && *input.Kind != "stock" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ชนิดรายการต้องเป็น ingredient หรือ stock"})
		return
	}
	if input.StockCategory != nil && *input.StockCategory != "" && *input.StockCategory != "drink_equipment" && *input.StockCategory != "postal_equipment" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "หมวดอุปกรณ์ไม่ถูกต้อง"})
		return
	}
	if _, valid := nonEmptyTemplateString(input.Category, "category"); !valid {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "กรุณาระบุหมวดหมู่"})
		return
	}
	if _, valid := nonEmptyTemplateString(input.Name, "name"); !valid {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "กรุณาระบุชื่อรายการ"})
		return
	}
	if _, valid := nonEmptyTemplateString(input.Unit, "unit"); !valid {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "กรุณาระบุหน่วย"})
		return
	}
	if input.AvailableSizes != nil {
		if _, valid := validatedCatalogSizes(*input.AvailableSizes); !valid {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ขนาดที่ใช้ได้ต้องเป็น S, M หรือ L อย่างน้อยหนึ่งขนาด"})
			return
		}
	}

	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถแก้ไขรายการคลังกลางได้"})
		return
	}
	defer tx.Rollback()
	var current catalogTemplateInventoryItem
	var sizesCSV string
	err = tx.QueryRowContext(c.Request.Context(), `
		SELECT i.catalog_item_id,c.name,COALESCE(i.image_url,''),i.category,COALESCE(i.stock_category,''),i.kind,i.unit,i.unit_cost,i.reorder_level,i.track_stock,array_to_string(i.available_sizes,',')
		FROM catalog_template_inventory_items i
		JOIN inventory_catalog_items c ON c.id=i.catalog_item_id
		WHERE i.template_id=$1 AND i.catalog_item_id=$2 AND i.active
	FOR UPDATE`, templateID, catalogItemID).Scan(
		&current.ID, &current.Name, &current.ImageURL, &current.Category, &current.StockCategory,
		&current.Kind, &current.Unit, &current.UnitCost, &current.ReorderLevel, &current.TrackStock, &sizesCSV,
	)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบรายการในแม่แบบกลาง"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านรายการคลังกลางได้"})
		return
	}
	current.AvailableSizes = catalogSizesFromCSV(sizesCSV)
	if input.Name != nil {
		current.Name = strings.TrimSpace(*input.Name)
	}
	originalCategory := current.Category
	originalKind := current.Kind
	originalUnit := current.Unit
	if input.Category != nil {
		current.Category = strings.TrimSpace(*input.Category)
	}
	if input.ImageURL != nil {
		current.ImageURL = strings.TrimSpace(*input.ImageURL)
	}
	if input.StockCategory != nil {
		current.StockCategory = strings.TrimSpace(*input.StockCategory)
	}
	if input.Kind != nil {
		current.Kind = *input.Kind
	}
	if input.Unit != nil {
		current.Unit = strings.TrimSpace(*input.Unit)
	}
	if input.UnitCost != nil {
		current.UnitCost = *input.UnitCost
	}
	if input.ReorderLevel != nil {
		current.ReorderLevel = *input.ReorderLevel
	}
	if input.TrackStock != nil {
		current.TrackStock = *input.TrackStock
	}
	if input.AvailableSizes != nil {
		current.AvailableSizes, _ = validatedCatalogSizes(*input.AvailableSizes)
	}
	if current.Kind != "stock" {
		current.StockCategory = ""
	}
	if current.Category == "" || current.Unit == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "หมวดหมู่และหน่วยต้องไม่ว่าง"})
		return
	}
	if input.Name != nil {
		var duplicate bool
		if err = tx.QueryRowContext(c.Request.Context(), `SELECT EXISTS(SELECT 1 FROM inventory_catalog_items WHERE name=$1 AND id<>$2)`, current.Name, catalogItemID).Scan(&duplicate); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถตรวจสอบชื่อรายการคลังกลางได้"})
			return
		}
		if duplicate {
			c.JSON(http.StatusConflict, gin.H{"success": false, "message": "มีรายการคลังกลางชื่อนี้อยู่แล้ว"})
			return
		}
	}
	if current.Unit != originalUnit || current.Kind != originalKind {
		var recipeUses int
		if err = tx.QueryRowContext(c.Request.Context(), `
			SELECT COUNT(*) FROM catalog_template_menu_ingredients
			WHERE catalog_item_id=$1`, catalogItemID).Scan(&recipeUses); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถตรวจสอบสูตรที่ใช้รายการนี้ได้"})
			return
		}
		if recipeUses > 0 {
			c.JSON(http.StatusConflict, gin.H{"success": false, "message": "เปลี่ยนชนิดหรือหน่วยไม่ได้ เพราะรายการนี้ถูกใช้ในสูตรกลาง กรุณาแก้สูตรก่อน"})
			return
		}
	}
	var incompatibleMenus int
	if err = tx.QueryRowContext(c.Request.Context(), `
		SELECT COUNT(*)
		FROM catalog_template_menu_ingredients recipe
		JOIN catalog_template_menu_items menu ON menu.id=recipe.template_menu_item_id
		WHERE recipe.catalog_item_id=$1 AND menu.template_id=$2 AND menu.active
		  AND NOT (menu.available_sizes <@ string_to_array($3,','))`, catalogItemID, templateID, catalogSizesCSV(current.AvailableSizes)).Scan(&incompatibleMenus); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถตรวจสอบขนาดของสูตรได้"})
		return
	}
	if incompatibleMenus > 0 {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "วัตถุดิบนี้ยังอยู่ในสูตรของเมนูขนาดที่กำลังนำออก"})
		return
	}
	if (current.Category == "fresh") != (originalCategory == "fresh") {
		var lotUses int
		if err = tx.QueryRowContext(c.Request.Context(), `
			SELECT COUNT(*)
			FROM fresh_inventory_lots lot
			JOIN inventory_items item ON item.id=lot.inventory_item_id
			WHERE item.catalog_item_id=$1`, catalogItemID).Scan(&lotUses); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถตรวจสอบล็อตของรายการนี้ได้"})
			return
		}
		if lotUses > 0 {
			c.JSON(http.StatusConflict, gin.H{"success": false, "message": "เปลี่ยนเข้า/ออกจากวัตถุดิบของสดไม่ได้ เพราะมีประวัติลอตอยู่"})
			return
		}
	}
	if _, err = tx.ExecContext(c.Request.Context(), `
		UPDATE catalog_template_inventory_items
		SET category=$3,stock_category=NULLIF($4,''),kind=$5,unit=$6,unit_cost=$7,reorder_level=$8,track_stock=$9,image_url=$10,available_sizes=string_to_array($11,','),updated_at=now()
		WHERE template_id=$1 AND catalog_item_id=$2`,
		templateID, catalogItemID, current.Category, current.StockCategory, current.Kind,
		current.Unit, current.UnitCost, current.ReorderLevel, current.TrackStock, current.ImageURL, catalogSizesCSV(current.AvailableSizes)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถแก้ไขรายการคลังกลางได้"})
		return
	}
	if input.Name != nil {
		if _, err = tx.ExecContext(c.Request.Context(), `UPDATE inventory_catalog_items SET name=$2,updated_at=now() WHERE id=$1`, catalogItemID, current.Name); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถเปลี่ยนชื่อรายการคลังกลางได้"})
			return
		}
	}
	// Tracking is an intrinsic property of a measurable item, not a branch
	// balance. Keeping it canonical protects stock consumption and procurement
	// flows in every application.
	if _, err = tx.ExecContext(c.Request.Context(), `UPDATE inventory_catalog_items SET track_stock=$2,updated_at=now() WHERE id=$1`, catalogItemID, current.TrackStock); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถบันทึกการตั้งค่าการติดตามสต๊อกได้"})
		return
	}
	if input.TrackStock != nil {
		if _, err = tx.ExecContext(c.Request.Context(), `
			UPDATE catalog_template_inventory_items
			SET track_stock=$2,updated_at=now()
			WHERE catalog_item_id=$1`, catalogItemID, current.TrackStock); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถกระจายการตั้งค่าติดตามสต๊อกไปยังแม่แบบอื่นได้"})
			return
		}
	}
	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถบันทึกรายการคลังกลางได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": current})
}

// UpdateCatalogTemplateMenu supports a deliberately partial payload so a
// price change cannot accidentally erase recipe instructions or channel flags.
func (h *PlatformHandler) UpdateCatalogTemplateMenu(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	templateID, ok := h.catalogTemplateID(c)
	if !ok {
		return
	}
	menuID, ok := catalogTemplateMenuItemID(c)
	if !ok {
		return
	}
	var input catalogTemplateMenuUpdateInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ข้อมูลเมนูในแม่แบบไม่ถูกต้อง"})
		return
	}
	for _, value := range []*float64{input.StorePrice, input.LinemanPrice, input.CostPrice, input.LinemanCostPrice} {
		if value != nil && *value < 0 {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ราคาและต้นทุนต้องไม่ติดลบ"})
			return
		}
	}
	if input.Status != nil && *input.Status != "available" && *input.Status != "soldout" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "สถานะเมนูไม่ถูกต้อง"})
		return
	}
	if _, valid := nonEmptyTemplateString(input.Name, "name"); !valid {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "กรุณาระบุชื่อเมนู"})
		return
	}
	if input.AvailableSizes != nil {
		if _, valid := validatedCatalogSizes(*input.AvailableSizes); !valid {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ขนาดที่ใช้ได้ต้องเป็น S, M หรือ L อย่างน้อยหนึ่งขนาด"})
			return
		}
	}
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถแก้ไขเมนูในแม่แบบได้"})
		return
	}
	defer tx.Rollback()
	var current struct {
		ID                    int64
		Name, Category        string
		StorePrice            float64
		StorePriceAvailable   bool
		LinemanPrice          float64
		LinemanPriceAvailable bool
		CostPrice             float64
		LinemanCostPrice      float64
		Status, ImageURL      string
		PreparationSteps      string
		AvailableSizes        []string
	}
	var sizesCSV string
	err = tx.QueryRowContext(c.Request.Context(), `
		SELECT id,name,category,store_price,store_price_available,lineman_price,lineman_price_available,cost_price,lineman_cost_price,status,image_url,preparation_steps,array_to_string(available_sizes,',')
		FROM catalog_template_menu_items
		WHERE template_id=$1 AND id=$2 AND active
		FOR UPDATE`, templateID, menuID).Scan(
		&current.ID, &current.Name, &current.Category, &current.StorePrice, &current.StorePriceAvailable,
		&current.LinemanPrice, &current.LinemanPriceAvailable, &current.CostPrice, &current.LinemanCostPrice,
		&current.Status, &current.ImageURL, &current.PreparationSteps, &sizesCSV,
	)
	if err == sql.ErrNoRows {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบเมนูในแม่แบบกลาง"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านเมนูในแม่แบบกลางได้"})
		return
	}
	current.AvailableSizes = catalogSizesFromCSV(sizesCSV)
	if input.Name != nil {
		current.Name = strings.TrimSpace(*input.Name)
	}
	if input.Category != nil {
		current.Category = strings.TrimSpace(*input.Category)
	}
	if input.StorePrice != nil {
		current.StorePrice = *input.StorePrice
	}
	if input.StorePriceAvailable != nil {
		current.StorePriceAvailable = *input.StorePriceAvailable
	}
	if input.LinemanPrice != nil {
		current.LinemanPrice = *input.LinemanPrice
	}
	if input.LinemanPriceAvailable != nil {
		current.LinemanPriceAvailable = *input.LinemanPriceAvailable
	}
	if input.CostPrice != nil {
		current.CostPrice = *input.CostPrice
	}
	if input.LinemanCostPrice != nil {
		current.LinemanCostPrice = *input.LinemanCostPrice
	}
	if input.Status != nil {
		current.Status = *input.Status
	}
	if input.ImageURL != nil {
		current.ImageURL = strings.TrimSpace(*input.ImageURL)
	}
	if input.PreparationSteps != nil {
		current.PreparationSteps = strings.TrimSpace(*input.PreparationSteps)
	}
	if input.AvailableSizes != nil {
		current.AvailableSizes, _ = validatedCatalogSizes(*input.AvailableSizes)
	}
	if current.Category == "" {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "กรุณาระบุหมวดหมู่เมนู"})
		return
	}
	if input.Name != nil {
		var duplicate bool
		if err = tx.QueryRowContext(c.Request.Context(), `SELECT EXISTS(SELECT 1 FROM catalog_template_menu_items WHERE template_id=$1 AND name=$2 AND id<>$3)`, templateID, current.Name, menuID).Scan(&duplicate); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถตรวจสอบชื่อเมนูในแม่แบบได้"})
			return
		}
		if duplicate {
			c.JSON(http.StatusConflict, gin.H{"success": false, "message": "มีเมนูชื่อนี้อยู่แล้วในข้อมูลกลาง"})
			return
		}
	}
	var unavailableIngredients int
	if err = tx.QueryRowContext(c.Request.Context(), `
		SELECT COUNT(*)
		FROM catalog_template_menu_ingredients recipe
		JOIN catalog_template_inventory_items inventory
		  ON inventory.template_id=$1 AND inventory.catalog_item_id=recipe.catalog_item_id
		WHERE recipe.template_menu_item_id=$2
		  AND (NOT inventory.active OR NOT (string_to_array($3,',') <@ inventory.available_sizes))`, templateID, menuID, catalogSizesCSV(current.AvailableSizes)).Scan(&unavailableIngredients); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถตรวจสอบขนาดของวัตถุดิบในสูตรได้"})
		return
	}
	if unavailableIngredients > 0 {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "สูตรมีวัตถุดิบที่ใช้ไม่ได้กับขนาดเมนูที่เลือก"})
		return
	}
	if _, err = tx.ExecContext(c.Request.Context(), `
		UPDATE catalog_template_menu_items
		SET name=$3,category=$4,store_price=$5,store_price_available=$6,lineman_price=$7,lineman_price_available=$8,
			cost_price=$9,lineman_cost_price=$10,status=$11,image_url=$12,preparation_steps=$13,available_sizes=string_to_array($14,','),updated_at=now()
		WHERE template_id=$1 AND id=$2`,
		templateID, menuID, current.Name, current.Category, current.StorePrice, current.StorePriceAvailable,
		current.LinemanPrice, current.LinemanPriceAvailable, current.CostPrice, current.LinemanCostPrice,
		current.Status, current.ImageURL, current.PreparationSteps, catalogSizesCSV(current.AvailableSizes)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถแก้ไขเมนูในแม่แบบได้"})
		return
	}
	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถบันทึกเมนูในแม่แบบได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": current.ID}})
}

func (h *PlatformHandler) ReplaceCatalogTemplateMenuRecipes(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	templateID, ok := h.catalogTemplateID(c)
	if !ok {
		return
	}
	menuID, ok := catalogTemplateMenuItemID(c)
	if !ok {
		return
	}
	var input catalogTemplateRecipesInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ข้อมูลสูตรกลางไม่ถูกต้อง"})
		return
	}
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถแก้ไขสูตรกลางได้"})
		return
	}
	defer tx.Rollback()
	var menuSizesCSV string
	if err = tx.QueryRowContext(c.Request.Context(), `SELECT array_to_string(available_sizes,',') FROM catalog_template_menu_items WHERE id=$1 AND template_id=$2 AND active FOR UPDATE`, menuID, templateID).Scan(&menuSizesCSV); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบเมนูในแม่แบบกลาง"})
		return
	}
	seen := make(map[string]struct{}, len(*input.Recipes))
	for index := range *input.Recipes {
		recipe := &(*input.Recipes)[index]
		recipe.Unit = strings.TrimSpace(recipe.Unit)
		key := strconv.FormatInt(recipe.CatalogItemID, 10) + ":" + recipe.Channel
		if recipe.Unit == "" {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "กรุณาระบุหน่วยของสูตร"})
			return
		}
		if _, duplicate := seen[key]; duplicate {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "วัตถุดิบและช่องทางในสูตรต้องไม่ซ้ำกัน"})
			return
		}
		seen[key] = struct{}{}
		var templateUnit, inventorySizesCSV string
		if err = tx.QueryRowContext(c.Request.Context(), `SELECT unit,array_to_string(available_sizes,',') FROM catalog_template_inventory_items WHERE template_id=$1 AND catalog_item_id=$2 AND active`, templateID, recipe.CatalogItemID).Scan(&templateUnit, &inventorySizesCSV); err == sql.ErrNoRows {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "พบวัตถุดิบที่ไม่ได้อยู่ในแม่แบบนี้"})
			return
		} else if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถตรวจสอบวัตถุดิบในสูตรได้"})
			return
		}
		if normalizeInventoryUnit(templateUnit) != normalizeInventoryUnit(recipe.Unit) {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "หน่วยในสูตรต้องตรงกับหน่วยของวัตถุดิบกลาง"})
			return
		}
		inventorySizes := catalogSizesFromCSV(inventorySizesCSV)
		for _, menuSize := range catalogSizesFromCSV(menuSizesCSV) {
			found := false
			for _, inventorySize := range inventorySizes {
				if menuSize == inventorySize {
					found = true
					break
				}
			}
			if !found {
				c.JSON(http.StatusConflict, gin.H{"success": false, "message": "วัตถุดิบในสูตรต้องใช้ได้กับทุกขนาดที่เปิดเมนู"})
				return
			}
		}
	}
	if _, err = tx.ExecContext(c.Request.Context(), `DELETE FROM catalog_template_menu_ingredients WHERE template_menu_item_id=$1`, menuID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถล้างสูตรเดิมได้"})
		return
	}
	for _, recipe := range *input.Recipes {
		if _, err = tx.ExecContext(c.Request.Context(), `
			INSERT INTO catalog_template_menu_ingredients(template_menu_item_id,catalog_item_id,channel,quantity,unit,cost_amount)
			VALUES($1,$2,$3,$4,$5,$6)`, menuID, recipe.CatalogItemID, recipe.Channel, recipe.Quantity, recipe.Unit, recipe.CostAmount); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถบันทึกสูตรกลางได้"})
			return
		}
	}
	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถยืนยันสูตรกลางได้"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": menuID, "recipeCount": len(*input.Recipes)}})
}

// RetireCatalogTemplateInventory removes an item from future syncs without
// deleting branch balances, lots, movements, orders, or historical recipes.
func (h *PlatformHandler) RetireCatalogTemplateInventory(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	templateID, ok := h.catalogTemplateID(c)
	if !ok {
		return
	}
	catalogItemID, ok := catalogTemplateCatalogItemID(c)
	if !ok {
		return
	}
	var activeRecipeUses int
	if err := h.db.QueryRowContext(c.Request.Context(), `
		SELECT COUNT(*)
		FROM catalog_template_menu_ingredients recipe
		JOIN catalog_template_menu_items menu ON menu.id=recipe.template_menu_item_id
		WHERE menu.template_id=$1 AND menu.active AND recipe.catalog_item_id=$2`, templateID, catalogItemID).Scan(&activeRecipeUses); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถตรวจสอบสูตรที่ใช้รายการนี้ได้"})
		return
	}
	if activeRecipeUses > 0 {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "นำรายการออกไม่ได้ เพราะยังถูกใช้ในสูตรกลางที่เปิดใช้งานอยู่"})
		return
	}
	result, err := h.db.ExecContext(c.Request.Context(), `
		UPDATE catalog_template_inventory_items
		SET active=false,updated_at=now()
		WHERE template_id=$1 AND catalog_item_id=$2 AND active`, templateID, catalogItemID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถนำรายการออกจากแม่แบบได้"})
		return
	}
	if rowsAffected(result) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบรายการในแม่แบบกลาง"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": catalogItemID, "retired": true}})
}

// RetireCatalogTemplateMenu is a soft removal. A later explicit sync hides
// the managed branch menu but preserves sales and audit history.
func (h *PlatformHandler) RetireCatalogTemplateMenu(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	templateID, ok := h.catalogTemplateID(c)
	if !ok {
		return
	}
	menuID, ok := catalogTemplateMenuItemID(c)
	if !ok {
		return
	}
	result, err := h.db.ExecContext(c.Request.Context(), `
		UPDATE catalog_template_menu_items
		SET active=false,updated_at=now()
		WHERE template_id=$1 AND id=$2 AND active`, templateID, menuID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถนำเมนูออกจากแม่แบบได้"})
		return
	}
	if rowsAffected(result) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบเมนูในแม่แบบกลาง"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": gin.H{"id": menuID, "retired": true}})
}
