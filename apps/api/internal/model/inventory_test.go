package model

import "testing"

func TestInventoryItemIsStockTrackedPreservesLegacyAndExplicitSettings(t *testing.T) {
	enabled := true
	disabled := false

	tests := []struct {
		name       string
		trackStock *bool
		want       bool
	}{
		{name: "legacy value defaults to tracked", trackStock: nil, want: true},
		{name: "explicitly tracked", trackStock: &enabled, want: true},
		{name: "cost-only catalogue item", trackStock: &disabled, want: false},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			item := InventoryItem{TrackStock: test.trackStock}
			if got := item.IsStockTracked(); got != test.want {
				t.Fatalf("IsStockTracked() = %t, want %t", got, test.want)
			}
		})
	}
}
