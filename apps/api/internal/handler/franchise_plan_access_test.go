package handler

import "testing"

func TestNormalizedCategory(t *testing.T) {
	if got := normalizedCategory("  FoOd\t"); got != "food" {
		t.Fatalf("normalized category = %q, want food", got)
	}
}
