package handler

import (
	"math"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"y/internal/middleware"
)

func TestAttendanceLocationValidationBoundaries(t *testing.T) {
	for _, tt := range []struct {
		name               string
		lat, lon, accuracy float64
		want               bool
	}{
		{"north east boundary", 90, 180, 0, true},
		{"south west boundary", -90, -180, 0, true},
		{"latitude beyond boundary", -90.0001, 0, 0, false},
		{"longitude beyond boundary", 0, 180.0001, 0, false},
		{"NaN latitude", math.NaN(), 0, 0, false},
		{"infinite longitude", 0, math.Inf(1), 0, false},
		{"NaN accuracy", 0, 0, math.NaN(), false},
		{"infinite accuracy", 0, 0, math.Inf(1), false},
	} {
		t.Run(tt.name, func(t *testing.T) {
			input := attendanceLocationInput{Latitude: &tt.lat, Longitude: &tt.lon, AccuracyM: &tt.accuracy}
			if got := input.valid(); got != tt.want {
				t.Fatalf("valid() = %v, want %v", got, tt.want)
			}
		})
	}
	zero := 0.0
	for _, input := range []attendanceLocationInput{{}, {Latitude: &zero}, {Longitude: &zero}} {
		if input.valid() {
			t.Fatal("missing coordinates accepted")
		}
	}
	if !(attendanceLocationInput{Latitude: &zero, Longitude: &zero}).valid() {
		t.Fatal("optional accuracy rejected")
	}
}

func TestCanRecordAttendanceAllowsOnlyWorkingShiftStatuses(t *testing.T) {
	tests := []struct {
		status string
		want   bool
	}{
		{status: "scheduled", want: true},
		{status: "compensatory_work", want: true},
		{status: "leave", want: false},
		{status: "sick_leave", want: false},
		{status: "off", want: false},
		{status: "", want: false},
	}
	for _, test := range tests {
		t.Run(test.status, func(t *testing.T) {
			if got := canRecordAttendance(test.status); got != test.want {
				t.Fatalf("canRecordAttendance(%q) = %t, want %t", test.status, got, test.want)
			}
		})
	}
}

func TestAttendanceLocationValidationAndDistance(t *testing.T) {
	latitude, longitude, accuracy := 16.821085, 100.2694448, 8.0
	valid := attendanceLocationInput{Latitude: &latitude, Longitude: &longitude, AccuracyM: &accuracy}
	if !valid.valid() {
		t.Fatal("valid location was rejected")
	}
	if distance := distanceMeters(latitude, longitude, latitude, longitude); distance != 0 {
		t.Fatalf("same location distance = %f, want 0", distance)
	}
	if distance := distanceMeters(latitude, longitude, 16.822085, longitude); distance < 100 || distance > 120 {
		t.Fatalf("one-thousandth latitude distance = %f, want about 111 m", distance)
	}
	invalidLatitude := 91.0
	if (attendanceLocationInput{Latitude: &invalidLatitude, Longitude: &longitude}).valid() {
		t.Fatal("out-of-range latitude was accepted")
	}
	negativeAccuracy := -1.0
	if (attendanceLocationInput{Latitude: &latitude, Longitude: &longitude, AccuracyM: &negativeAccuracy}).valid() {
		t.Fatal("negative accuracy was accepted")
	}
}

func TestAttendanceClaimsRejectsMissingOrUnauthorizedRole(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, test := range []struct {
		name   string
		claims *middleware.Claims
	}{
		{name: "missing claims"},
		{name: "admin role", claims: &middleware.Claims{Role: "admin"}},
		{name: "franchise role", claims: &middleware.Claims{Role: "franchise_owner"}},
	} {
		t.Run(test.name, func(t *testing.T) {
			response := httptest.NewRecorder()
			context, _ := gin.CreateTestContext(response)
			context.Request = httptest.NewRequest(http.MethodGet, "/attendance/today", nil)
			if test.claims != nil {
				context.Set("claims", test.claims)
			}
			if claims, ok := attendanceClaims(context); ok || claims != nil {
				t.Fatal("attendance claims unexpectedly authorized an invalid session")
			}
			if response.Code != http.StatusForbidden {
				t.Fatalf("status = %d, want %d", response.Code, http.StatusForbidden)
			}
		})
	}
}

func TestAttendanceClaimsAllowsScopedStaffRoles(t *testing.T) {
	gin.SetMode(gin.TestMode)
	for _, role := range []string{"cashier", "branch_manager"} {
		t.Run(role, func(t *testing.T) {
			response := httptest.NewRecorder()
			context, _ := gin.CreateTestContext(response)
			context.Request = httptest.NewRequest(http.MethodGet, "/attendance/today", nil)
			context.Set("claims", &middleware.Claims{Role: role})
			claims, ok := attendanceClaims(context)
			if !ok || claims == nil || claims.Role != role {
				t.Fatalf("role %q should be allowed", role)
			}
		})
	}
}
