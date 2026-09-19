package handler

import (
	"testing"

	"y/internal/model"
)

func TestNormalizedCategory(t *testing.T) {
	if got := normalizedCategory("  FoOd\t"); got != "food" {
		t.Fatalf("normalized category = %q, want food", got)
	}
}

func TestMenuAllowedForPlanFiltersFoodOnlyForSmallBranches(t *testing.T) {
	for _, test := range []struct {
		name, plan, category string
		want                 bool
	}{
		{name: "small branch coffee", plan: "S", category: "กาแฟ", want: true},
		{name: "small branch Thai food", plan: "S", category: " อาหาร ", want: false},
		{name: "small branch English food", plan: "S", category: "FoOd", want: false},
		{name: "small branch Thai bakery", plan: "S", category: "เบเกอรี่", want: false},
		{name: "small branch English bakery", plan: "S", category: "BAKERY", want: false},
		{name: "medium branch food", plan: "M", category: "อาหาร", want: true},
		{name: "large branch bakery", plan: "L", category: "bakery", want: true},
	} {
		t.Run(test.name, func(t *testing.T) {
			if got := menuAllowedForPlan(test.plan, test.category); got != test.want {
				t.Fatalf("menuAllowedForPlan(%q, %q) = %t, want %t", test.plan, test.category, got, test.want)
			}
		})
	}
}

func TestFilterMenuForSmallBranchDoesNotMutateSharedCatalog(t *testing.T) {
	items := []model.MenuItem{
		{ID: 1, Category: "กาแฟ"},
		{ID: 2, Category: "อาหาร"},
		{ID: 3, Category: "เบเกอรี่"},
	}
	filtered := (&PlatformHandler{}).filterMenuForPlan("S", items)
	if len(filtered) != 1 || filtered[0].ID != 1 {
		t.Fatalf("small branch menus = %+v; want only coffee", filtered)
	}
	if len(items) != 3 {
		t.Fatalf("shared catalog was modified: %+v", items)
	}
	if got := (&PlatformHandler{}).filterMenuForPlan("M", items); len(got) != 3 {
		t.Fatalf("medium branch should keep all menus, got %+v", got)
	}
}
