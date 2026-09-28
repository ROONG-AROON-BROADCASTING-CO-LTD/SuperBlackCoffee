package handler

import (
	"testing"
	"time"
)

func TestParseWorkbookSaleTimeUsesBangkokAndRejectsInvalidDates(t *testing.T) {
	got, err := parseWorkbookSaleTime("29/02/2024", "00:05")
	if err != nil {
		t.Fatalf("valid leap day: %v", err)
	}
	if got.Format(time.RFC3339) != "2024-02-29T00:05:00+07:00" {
		t.Fatalf("sale time = %s, want Bangkok leap day", got.Format(time.RFC3339))
	}
	for _, input := range []struct{ date, clock string }{
		{"29/02/2025", "00:05"},
		{"31/04/2026", "12:00"},
		{"01/01/2026", "24:00"},
	} {
		if _, err := parseWorkbookSaleTime(input.date, input.clock); err == nil {
			t.Errorf("accepted invalid date/time %q %q", input.date, input.clock)
		}
	}
}

func TestSalesImportParsingKeepsFinancialInputDeterministic(t *testing.T) {
	tests := []struct {
		name       string
		numberText string
		wantNumber float64
		wantErr    bool
	}{
		{name: "accepts formatted currency value", numberText: " 1,250.50 ", wantNumber: 1250.5},
		{name: "accepts an empty optional value as zero", numberText: "", wantNumber: 0},
		{name: "rejects non numeric financial value", numberText: "one hundred", wantErr: true},
		{name: "rejects non finite NaN", numberText: "NaN", wantErr: true},
		{name: "rejects non finite infinity", numberText: "+Inf", wantErr: true},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := parseWorkbookNumber(tt.numberText)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("parseWorkbookNumber(%q) succeeded, want an error", tt.numberText)
				}
				return
			}
			if err != nil || got != tt.wantNumber {
				t.Fatalf("parseWorkbookNumber(%q) = %v, %v; want %v, nil", tt.numberText, got, err, tt.wantNumber)
			}
		})
	}
}

func TestFindSalesImportMenuRejectsAmbiguousMatches(t *testing.T) {
	menus := []salesImportMenu{
		{id: 1, name: "อเมริกาโน่เย็น", storePrice: 60, storeAvailable: true},
		{id: 2, name: "อเมริกาโน่เย็นพิเศษ", storePrice: 70, storeAvailable: true},
	}

	if menu, ok := findSalesImportMenu(menus, "อเมริกาโน่เย็น - หวานน้อย"); !ok || menu.id != 1 {
		t.Fatalf("exact menu match = %#v, %t; want menu 1", menu, ok)
	}
	if _, ok := findSalesImportMenu(menus, "อเมริกาโน่"); ok {
		t.Fatal("ambiguous menu name must not select a menu for import")
	}
}

func TestSalesImportPeriodAndChannelOnlyAllowKnownValues(t *testing.T) {
	for _, tt := range []struct {
		name         string
		period       string
		wantPeriodOK bool
		channel      string
		wantChannel  string
	}{
		{name: "line man is normalized", period: "today", wantPeriodOK: true, channel: " LINE MAN ", wantChannel: "lineman"},
		{name: "other channels stay storefront", period: "month", wantPeriodOK: true, channel: "หน้าร้าน", wantChannel: "storefront"},
		{name: "unknown period is rejected", period: "week", wantPeriodOK: false, channel: "delivery", wantChannel: "storefront"},
	} {
		t.Run(tt.name, func(t *testing.T) {
			_, _, ok := salesPeriodBounds(tt.period)
			if ok != tt.wantPeriodOK {
				t.Fatalf("salesPeriodBounds(%q) ok = %t, want %t", tt.period, ok, tt.wantPeriodOK)
			}
			if got := importChannel(tt.channel); got != tt.wantChannel {
				t.Fatalf("importChannel(%q) = %q, want %q", tt.channel, got, tt.wantChannel)
			}
		})
	}
}
