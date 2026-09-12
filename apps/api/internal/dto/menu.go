package dto

type MenuIngredientRequest struct {
	InventoryItemID int64   `json:"inventoryItemId"`
	Quantity        float64 `json:"quantity"`
	Unit            string  `json:"unit"`
}
type MenuRequest struct {
	Name             string                  `json:"name"`
	Category         string                  `json:"category"`
	StorePrice       float64                 `json:"storePrice"`
	LinemanPrice     float64                 `json:"linemanPrice"`
	LinemanCostPrice float64                 `json:"linemanCostPrice"`
	CostPrice        float64                 `json:"costPrice"`
	Ingredients      []MenuIngredientRequest `json:"ingredients"`
	PreparationSteps string                  `json:"preparationSteps"`
}
