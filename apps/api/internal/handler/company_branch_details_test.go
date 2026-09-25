package handler

import "testing"

func TestValidateCompanyBranchDetails(t *testing.T) {
	lat, lon := 16.8211, 100.2659
	for _, tc := range []struct {
		name  string
		input companyBranchInput
		want  bool
	}{
		{"empty optional fields", companyBranchInput{}, true},
		{"valid coordinates and hours", companyBranchInput{Latitude: &lat, Longitude: &lon, OpensAt: "08:00", ClosesAt: "22:30", AttendanceRadiusM: 150}, true},
		{"latitude without longitude", companyBranchInput{Latitude: &lat}, false},
		{"invalid latitude", companyBranchInput{Latitude: floatPtr(91), Longitude: &lon}, false},
		{"invalid longitude", companyBranchInput{Latitude: &lat, Longitude: floatPtr(-181)}, false},
		{"invalid radius", companyBranchInput{AttendanceRadiusM: 24}, false},
		{"invalid hours", companyBranchInput{OpensAt: "25:00"}, false},
		{"valid headquarters work days", companyBranchInput{WorkDays: []int{1, 2, 3, 4, 5, 6}}, true},
		{"empty headquarters work days", companyBranchInput{WorkDays: []int{}}, false},
		{"duplicate headquarters work days", companyBranchInput{WorkDays: []int{1, 1}}, false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if got := validateCompanyBranchDetails(tc.input); got != tc.want {
				t.Fatalf("validateCompanyBranchDetails() = %v, want %v", got, tc.want)
			}
		})
	}
}

func floatPtr(value float64) *float64 { return &value }
