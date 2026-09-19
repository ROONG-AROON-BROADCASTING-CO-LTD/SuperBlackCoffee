package handler

import (
	"net/http/httptest"
	"reflect"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestValidatedCatalogSizes(t *testing.T) {
	for _, test := range []struct {
		name  string
		input []string
		want  []string
		valid bool
	}{
		{name: "one size", input: []string{"S"}, want: []string{"S"}, valid: true},
		{name: "canonical order", input: []string{"L", "S", "M"}, want: []string{"S", "M", "L"}, valid: true},
		{name: "empty", input: []string{}, valid: false},
		{name: "duplicate", input: []string{"S", "S"}, valid: false},
		{name: "unknown", input: []string{"XL"}, valid: false},
	} {
		t.Run(test.name, func(t *testing.T) {
			got, valid := validatedCatalogSizes(test.input)
			if valid != test.valid || !reflect.DeepEqual(got, test.want) {
				t.Fatalf("validatedCatalogSizes(%v) = %v, %v; want %v, %v", test.input, got, valid, test.want, test.valid)
			}
		})
	}
}

func TestCatalogSizesCSVRoundTrip(t *testing.T) {
	want := []string{"S", "M", "L"}
	if got := catalogSizesFromCSV(catalogSizesCSV(want)); !reflect.DeepEqual(got, want) {
		t.Fatalf("size round trip = %v, want %v", got, want)
	}
}

func TestCatalogTemplateRecipesInputAcceptsExplicitEmptyRecipeList(t *testing.T) {
	gin.SetMode(gin.TestMode)
	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest("PUT", "/", strings.NewReader(`{"recipes":[]}`))
	context.Request.Header.Set("Content-Type", "application/json")

	var input catalogTemplateRecipesInput
	if err := context.ShouldBindJSON(&input); err != nil {
		t.Fatalf("bind explicit empty recipes: %v", err)
	}
	if input.Recipes == nil || len(*input.Recipes) != 0 {
		t.Fatalf("recipes = %#v, want a present empty list", input.Recipes)
	}
}
