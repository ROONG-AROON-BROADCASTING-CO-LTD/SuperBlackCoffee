package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestCORSOriginSecurity(t *testing.T) {
	gin.SetMode(gin.TestMode)
	tests := []struct {
		name, env, origin, configured string
		method                        string
		status                        int
		allow                         bool
	}{
		{"development localhost", "development", "http://localhost:5178", "", "GET", 200, true},
		{"production rejects localhost", "production", "http://localhost:5178", "http://localhost:5178", "OPTIONS", 403, false},
		{"configured HTTPS preflight", "production", "https://stock.example.test", " https://stock.example.test ,https://admin.example.test", "OPTIONS", 204, true},
		{"rejects lookalike tenant origin", "production", "https://stock.example.test.evil.test", "https://stock.example.test", "OPTIONS", 403, false},
		{"unconfigured request has no credentials grant", "production", "https://evil.test", "https://stock.example.test", "GET", 200, false},
		{"nonbrowser request", "production", "", "https://stock.example.test", "GET", 200, false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Setenv("APP_ENV", tt.env)
			t.Setenv("CORS_ORIGINS", tt.configured)
			called := false
			r := gin.New()
			r.Use(CORS())
			r.Any("/resource", func(c *gin.Context) { called = true; c.Status(200) })
			req := httptest.NewRequest(tt.method, "/resource", nil)
			req.Header.Set("Origin", tt.origin)
			res := httptest.NewRecorder()
			r.ServeHTTP(res, req)
			if res.Code != tt.status {
				t.Fatalf("status=%d want=%d", res.Code, tt.status)
			}
			if tt.allow {
				if res.Header().Get("Access-Control-Allow-Origin") != tt.origin || res.Header().Get("Access-Control-Allow-Credentials") != "true" {
					t.Fatalf("missing origin/credentials: %v", res.Header())
				}
			} else if res.Header().Get("Access-Control-Allow-Origin") != "" || res.Header().Get("Access-Control-Allow-Credentials") != "" {
				t.Fatalf("unauthorized CORS grant: %v", res.Header())
			}
			if called != (tt.method != http.MethodOptions) {
				t.Fatalf("preflight reached resource handler: %v", called)
			}
			if tt.origin != "" && res.Header().Get("Vary") != "Origin" {
				t.Fatal("origin-dependent response must vary by Origin")
			}
		})
	}
}
