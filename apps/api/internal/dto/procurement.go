package dto

type SupplierRequest struct {
	Name        string `json:"name" binding:"required"`
	ContactName string `json:"contactName"`
	Phone       string `json:"phone"`
	Email       string `json:"email"`
	Address     string `json:"address"`
	Status      string `json:"status" binding:"omitempty,oneof=active inactive"`
}

type PurchaseOrderItemRequest struct {
	InventoryItemID int64   `json:"inventoryItemId" binding:"required,gt=0"`
	Quantity        float64 `json:"quantity" binding:"required,gt=0"`
	UnitCost        float64 `json:"unitCost" binding:"gte=0"`
}

type PurchaseOrderRequest struct {
	BranchID   *int64                     `json:"branchId"`
	SupplierID int64                      `json:"supplierId" binding:"required,gt=0"`
	Note       string                     `json:"note"`
	Items      []PurchaseOrderItemRequest `json:"items" binding:"required,min=1,dive"`
}

type PurchaseOrderStatusRequest struct {
	Status string `json:"status" binding:"required,oneof=submitted approved ordered cancelled"`
}

type PurchaseOrderReceiptItemRequest struct {
	ItemID   int64   `json:"itemId" binding:"required,gt=0"`
	Quantity float64 `json:"quantity" binding:"required,gt=0"`
}

type PurchaseOrderReceiptRequest struct {
	Note  string                            `json:"note"`
	Items []PurchaseOrderReceiptItemRequest `json:"items" binding:"required,min=1,dive"`
}

type StockAdjustmentRequest struct {
	Quantity       float64 `json:"quantity" binding:"required,gte=0"`
	Note           string  `json:"note" binding:"required,max=500"`
	ManufacturedAt *string `json:"manufacturedAt"`
	ExpiryDate     *string `json:"expiryDate"`
}
