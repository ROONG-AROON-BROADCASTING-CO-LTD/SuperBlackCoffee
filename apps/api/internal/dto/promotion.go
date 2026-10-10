package dto

type PromotionRequest struct {
	Name        string   `json:"name"`
	Type        string   `json:"type"`
	Benefit     string   `json:"benefit"`
	Status      string   `json:"status"`
	ImageURL    string   `json:"imageUrl"`
	Channels    []string `json:"channels"`
	Eligibility string   `json:"eligibility"`
	StartsOn    string   `json:"startsOn"`
	EndsOn      string   `json:"endsOn"`
	Terms       []string `json:"terms"`
	BranchIDs   []int64  `json:"branchIds"`
	MenuItemIDs []int64  `json:"menuItemIds"`
}
