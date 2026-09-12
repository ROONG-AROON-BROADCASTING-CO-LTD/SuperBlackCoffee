package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestCORSAllowsLocalDevelopmentOriginAndCredentials(t *testing.T) {
	t.Setenv("APP_ENV", "development")
	t.Setenv("CORS_ORIGINS", "")

	router := gin.New()
	router.Use(CORS())
	router.GET("/protected", func(c *gin.Context) { c.Status(http.StatusNoContent) })

	request := httptest.NewRequest(http.MethodGet, "/protected", nil)
	request.Header.Set("Origin", "http://localhost:5174")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusNoContent)
	}
	if got := response.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:5174" {
		t.Fatalf("allow origin = %q", got)
	}
	if got := response.Header().Get("Access-Control-Allow-Credentials"); got != "true" {
		t.Fatalf("allow credentials = %q", got)
	}
	if got := response.Header().Get("Vary"); got != "Origin" {
		t.Fatalf("vary = %q", got)
	}
}

func TestCORSRejectsUntrustedPreflight(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("CORS_ORIGINS", "https://admin.superblackcoffee.example")

	router := gin.New()
	router.Use(CORS())
	router.OPTIONS("/protected", func(c *gin.Context) { c.Status(http.StatusNoContent) })

	request := httptest.NewRequest(http.MethodOptions, "/protected", nil)
	request.Header.Set("Origin", "https://attacker.example")
	response := httptest.NewRecorder()
	router.ServeHTTP(response, request)

	if response.Code != http.StatusForbidden {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusForbidden)
	}
	if got := response.Header().Get("Access-Control-Allow-Origin"); got != "" {
		t.Fatalf("untrusted origin unexpectedly allowed: %q", got)
	}
}

func TestSecurityHeadersProtectProductionResponses(t *testing.T) {
	t.Setenv("APP_ENV", "production")

	router := gin.New()
	router.Use(SecurityHeaders())
	router.GET("/health", func(c *gin.Context) { c.Status(http.StatusNoContent) })

	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/health", nil))

	for header, want := range map[string]string{
		"Content-Security-Policy":   "default-src 'none'; frame-ancestors 'none'",
		"Permissions-Policy":        "camera=(), geolocation=(), microphone=()",
		"Referrer-Policy":           "no-referrer",
		"X-Content-Type-Options":    "nosniff",
		"X-Frame-Options":           "DENY",
		"Strict-Transport-Security": "max-age=31536000; includeSubDomains",
	} {
		if got := response.Header().Get(header); got != want {
			t.Fatalf("%s = %q, want %q", header, got, want)
		}
	}
}
