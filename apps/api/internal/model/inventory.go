package model

import "time"

type InventoryKind string

const (
	InventoryKindIngredient InventoryKind = "ingredient"
	InventoryKindStock      InventoryKind = "stock"
)

type InventoryItem struct {
	ID            int64         `json:"id"`
	BranchID      int64         `json:"branchId"`
	Name          string        `json:"name"`
	Category      string        `json:"category"`
	StockCategory string        `json:"stockCategory,omitempty"`
	Kind          InventoryKind `json:"kind"`
	Quantity      float64       `json:"quantity"`
	Unit          string        `json:"unit"`
	ReorderLevel  float64       `json:"reorderLevel"`
	UnitCost      float64       `json:"unitCost"`
	ImageURL      string        `json:"imageUrl"`
	Status        string        `json:"status,omitempty"`
	ExpiryDate    *time.Time    `json:"expiryDate,omitempty"`
	ExpiryStatus  string        `json:"expiryStatus,omitempty"`
	CreatedAt     time.Time     `json:"createdAt,omitempty"`
	UpdatedAt     time.Time     `json:"updatedAt"`
}

type MenuIngredient struct {
	InventoryItemID   int64   `json:"inventoryItemId"`
	Name              string  `json:"name"`
	Quantity          float64 `json:"quantity"`
	Unit              string  `json:"unit"`
	InventoryQuantity float64 `json:"inventoryQuantity"`
	InventoryUnit     string  `json:"inventoryUnit"`
	CostAmount        float64 `json:"costAmount"`
}
