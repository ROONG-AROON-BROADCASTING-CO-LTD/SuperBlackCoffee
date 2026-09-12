package model

import "time"

type MenuStatus string
type MenuRecipeStatus string

const (
	MenuStatusAvailable MenuStatus = "available"
	MenuStatusSoldOut   MenuStatus = "soldout"

	MenuRecipeReady             MenuRecipeStatus = "ready"
	MenuRecipeMissing           MenuRecipeStatus = "missing_recipe"
	MenuRecipeInsufficientStock MenuRecipeStatus = "insufficient_stock"
)

type MenuItem struct {
	ID                    int64            `json:"id"`
	BranchID              int64            `json:"branchId"`
	Name                  string           `json:"name"`
	Category              string           `json:"category"`
	StorePrice            float64          `json:"storePrice"`
	StorePriceAvailable   bool             `json:"storePriceAvailable"`
	LinemanPrice          float64          `json:"linemanPrice"`
	LinemanPriceAvailable bool             `json:"linemanPriceAvailable"`
	LinemanCostPrice      float64          `json:"linemanCostPrice"`
	CostPrice             float64          `json:"costPrice"`
	Status                MenuStatus       `json:"status"`
	ImageURL              string           `json:"imageUrl"`
	Ingredients           []MenuIngredient `json:"ingredients,omitempty"`
	LinemanIngredients    []MenuIngredient `json:"linemanIngredients,omitempty"`
	PreparationSteps      string           `json:"preparationSteps"`
	RecipeStatus          MenuRecipeStatus `json:"recipeStatus"`
	Sellable              bool             `json:"sellable"`
	LinemanRecipeStatus   MenuRecipeStatus `json:"linemanRecipeStatus"`
	LinemanSellable       bool             `json:"linemanSellable"`
	CreatedAt             time.Time        `json:"createdAt,omitempty"`
	UpdatedAt             time.Time        `json:"updatedAt,omitempty"`
}
