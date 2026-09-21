package config

import "testing"

func TestJWTSecretUsesConfiguredValueAndDevelopmentFallback(t *testing.T) {
	t.Setenv("JWT_SECRET", "")
	if got := JWTSecret(); got != "development-only-change-me" {
		t.Fatalf("development JWT secret = %q", got)
	}

	t.Setenv("JWT_SECRET", "configured-secret")
	if got := JWTSecret(); got != "configured-secret" {
		t.Fatalf("configured JWT secret = %q", got)
	}
}

func TestValidateRuntimeRequiresProductionSecrets(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("JWT_SECRET", "")
	t.Setenv("CORS_ORIGINS", "https://admin.example.com")
	if err := ValidateRuntime(); err == nil {
		t.Fatal("expected missing JWT_SECRET to fail")
	}

	t.Setenv("JWT_SECRET", "a-long-production-secret")
	t.Setenv("CORS_ORIGINS", "")
	if err := ValidateRuntime(); err == nil {
		t.Fatal("expected missing CORS_ORIGINS to fail")
	}
}

func TestValidateRuntimeAllowsDevelopmentDefaults(t *testing.T) {
	t.Setenv("APP_ENV", "development")
	t.Setenv("JWT_SECRET", "")
	t.Setenv("CORS_ORIGINS", "")
	if err := ValidateRuntime(); err != nil {
		t.Fatalf("development config should be valid: %v", err)
	}
}

func TestValidateRuntimeRejectsUnsafeProductionOrigins(t *testing.T) {
	tests := []string{
		"*",
		"http://admin.example.com",
		"https://admin.example.com/with-a-path",
		"https://localhost:5174",
	}
	for _, origin := range tests {
		t.Run(origin, func(t *testing.T) {
			t.Setenv("APP_ENV", "production")
			t.Setenv("JWT_SECRET", "a-long-production-secret")
			t.Setenv("CORS_ORIGINS", origin)
			if err := ValidateRuntime(); err == nil {
				t.Fatalf("expected %q to be rejected", origin)
			}
		})
	}
}

func TestValidateRuntimeAllowsSecureProductionOrigins(t *testing.T) {
	t.Setenv("APP_ENV", "production")
	t.Setenv("JWT_SECRET", "a-long-production-secret")
	t.Setenv("CORS_ORIGINS", "https://admin.example.com,https://franchise.example.com")
	if err := ValidateRuntime(); err != nil {
		t.Fatalf("expected secure origins to be valid: %v", err)
	}
}
