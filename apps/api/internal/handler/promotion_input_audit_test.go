package handler

import (
	"testing"
	"y/internal/dto"
)

func TestPromotionInputValidatesDateBoundariesAndRequiredCampaignData(t *testing.T) {
	for _, tt := range []struct {
		name   string
		mutate func(*dto.PromotionRequest)
		valid  bool
	}{
		{"same day campaign", func(p *dto.PromotionRequest) { p.StartsOn = "2024-02-29"; p.EndsOn = "2024-02-29" }, true},
		{"invalid leap date", func(p *dto.PromotionRequest) { p.StartsOn = "2026-02-29" }, false},
		{"end before start", func(p *dto.PromotionRequest) { p.StartsOn = "2026-10-12"; p.EndsOn = "2026-10-11" }, false},
		{"invalid end date", func(p *dto.PromotionRequest) { p.EndsOn = "2026-13-01" }, false},
		{"no positive menus", func(p *dto.PromotionRequest) { p.MenuItemIDs = []int64{0, -1} }, false},
		{"empty name", func(p *dto.PromotionRequest) { p.Name = "  " }, false},
		{"unsupported status", func(p *dto.PromotionRequest) { p.Status = "deleted" }, false},
		{"open ended campaign", func(p *dto.PromotionRequest) { p.StartsOn = "2026-10-12" }, true},
	} {
		t.Run(tt.name, func(t *testing.T) {
			input := dto.PromotionRequest{Name: "Campaign", Type: "Custom", Benefit: "Free drink", Status: "draft", MenuItemIDs: []int64{1}}
			tt.mutate(&input)
			_, _, valid, message := promotionInput(&input)
			if valid != tt.valid || (!valid && message == "") {
				t.Fatalf("valid=%v message=%q, want %v", valid, message, tt.valid)
			}
		})
	}
}

func TestPromotionInputNormalizesDuplicateMenusBranchesAndEditableTerms(t *testing.T) {
	input := dto.PromotionRequest{Name: " Campaign ", Type: " Custom ", Benefit: " Free drink ", Status: " active ", BranchIDs: []int64{2, 2, 0, -1}, MenuItemIDs: []int64{3, 3, 0}, Channels: []string{" ", " delivery ", "delivery"}, Terms: []string{" one per customer ", "", "one per customer"}}
	_, _, valid, message := promotionInput(&input)
	if !valid {
		t.Fatal(message)
	}
	if input.Name != "Campaign" || input.Type != "Custom" || input.Benefit != "Free drink" || input.Status != "active" || len(input.BranchIDs) != 1 || input.BranchIDs[0] != 2 || len(input.MenuItemIDs) != 1 || input.MenuItemIDs[0] != 3 || len(input.Channels) != 1 || input.Channels[0] != "delivery" || len(input.Terms) != 1 || input.Terms[0] != "one per customer" {
		t.Fatalf("normalized input %#v", input)
	}
	input.Channels = nil
	if _, _, valid, _ := promotionInput(&input); !valid || len(input.Channels) != 1 || input.Channels[0] != "storefront" {
		t.Fatalf("missing channels must default to storefront: %#v", input)
	}
}
