package handler

import "testing"

func TestOperationStatusValidatorsAcceptOnlySupportedTransitions(t *testing.T) {
	tests := []struct {
		name  string
		check func(string) bool
		value string
		want  bool
	}{
		{"inspection passed", isInspectionStatus, "passed", true},
		{"inspection rejects arbitrary status", isInspectionStatus, "approved", false},
		{"asset repairing", isAssetStatus, "repairing", true},
		{"asset rejects empty status", isAssetStatus, "", false},
		{"invoice paid", isInvoiceStatus, "paid", true},
		{"invoice rejects maintenance status", isInvoiceStatus, "completed", false},
		{"maintenance waiting for parts", isMaintenanceStatus, "waiting_parts", true},
		{"maintenance rejects paid status", isMaintenanceStatus, "paid", false},
		{"service parts", isServiceType, "parts", true},
		{"service rejects unknown type", isServiceType, "refund", false},
		{"template accepts all branch sizes", isInspectionTemplateSize, "all", true},
		{"template rejects unsupported branch size", isInspectionTemplateSize, "XL", false},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := test.check(test.value); got != test.want {
				t.Fatalf("validator(%q) = %t, want %t", test.value, got, test.want)
			}
		})
	}
}

func TestDefaultStringUsesFallbackOnlyForWhitespace(t *testing.T) {
	if got := defaultString("  custom  ", "fallback"); got != "  custom  " {
		t.Fatalf("nonblank value = %q", got)
	}
	if got := defaultString(" \t", "fallback"); got != "fallback" {
		t.Fatalf("blank value = %q, want fallback", got)
	}
}
