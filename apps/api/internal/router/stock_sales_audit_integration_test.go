package router

import (
	"fmt"
	"net/http"
	"os"
	"testing"
)

func TestStockSalesAuditChannelFallbackAndDisabledMenus(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL required for isolated PostgreSQL integration")
	}
	for _, tc := range []struct {
		name, update string
		wantStatus   int
	}{
		{"LINE MAN inherits storefront recipe", "", http.StatusOK},
		{"disabled delivery price", "UPDATE menu_items SET lineman_price_available=false", http.StatusBadRequest},
		{"disabled template", "UPDATE menu_items SET template_enabled=false", http.StatusNotFound},
		{"sold out menu", "UPDATE menu_items SET status='soldout'", http.StatusBadRequest},
		{"missing recipe", "DELETE FROM menu_item_ingredients", http.StatusBadRequest},
	} {
		t.Run(tc.name, func(t *testing.T) {
			db := openRouterTestDB(t, url)
			branch := seedBranch(t, db, "SALES-AUDIT")
			seedUser(t, db, 7, "sales-audit", "cashier", branch, nil)
			ingredient := seedInventory(t, db, branch, "Audit ingredient", 10)
			seedMenu(t, db, branch, "Audit menu", ingredient, 2)
			var menu int64
			if err := db.QueryRow(`UPDATE menu_items SET store_price_available=true,lineman_price_available=true RETURNING id`).Scan(&menu); err != nil {
				t.Fatal(err)
			}
			if tc.update != "" {
				if _, err := db.Exec(tc.update); err != nil {
					t.Fatal(err)
				}
			}
			cookie := &http.Cookie{Name: "sbc_stock_session", Value: testTokenWithBranch(t, "cashier", branch)}
			res := requestJSONWithCookie(New(db, nil), http.MethodPost, "/api/v1/stock/consume", fmt.Sprintf(`{"items":[{"menuItemId":%d,"quantity":2}],"channel":"lineman","note":"audit sale"}`, menu), cookie)
			if res.Code != tc.wantStatus {
				t.Fatalf("status=%d: %s", res.Code, res.Body.String())
			}
			wantStock, wantSales := 10.0, 0
			if tc.wantStatus == http.StatusOK {
				wantStock, wantSales = 6, 1
			}
			assertInventoryQuantity(t, db, ingredient, wantStock)
			var count int
			if err := db.QueryRow(`SELECT COUNT(*) FROM stock_sales`).Scan(&count); err != nil || count != wantSales {
				t.Fatalf("sales=%d want=%d err=%v", count, wantSales, err)
			}
			if wantSales == 1 {
				var channel string
				var quantity, price float64
				if err := db.QueryRow(`SELECT channel,quantity,unit_price FROM stock_sale_items`).Scan(&channel, &quantity, &price); err != nil || channel != "lineman" || quantity != 2 || price != 70 {
					t.Fatalf("sale channel=%s qty=%v price=%v err=%v", channel, quantity, price, err)
				}
			}
		})
	}
}

func TestStockSalesAuditConcurrentSalesCannotOversellLastIngredient(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL required for isolated PostgreSQL integration")
	}
	db := openRouterTestDB(t, url)
	branch := seedBranch(t, db, "CONCURRENT-SALES")
	seedUser(t, db, 7, "concurrent-sales", "cashier", branch, nil)
	ingredient := seedInventory(t, db, branch, "Last ingredient", 2)
	seedMenu(t, db, branch, "Last menu", ingredient, 2)
	var menu int64
	if err := db.QueryRow(`UPDATE menu_items SET store_price_available=true RETURNING id`).Scan(&menu); err != nil {
		t.Fatal(err)
	}
	r := New(db, nil)
	cookie := &http.Cookie{Name: "sbc_stock_session", Value: testTokenWithBranch(t, "cashier", branch)}
	body := fmt.Sprintf(`{"items":[{"menuItemId":%d,"quantity":1}],"channel":"storefront","note":"concurrent audit"}`, menu)
	start, results := make(chan struct{}), make(chan int, 2)
	for range 2 {
		go func() {
			<-start
			results <- requestJSONWithCookie(r, http.MethodPost, "/api/v1/stock/consume", body, cookie).Code
		}()
	}
	close(start)
	statuses := map[int]int{}
	for range 2 {
		statuses[<-results]++
	}
	if statuses[http.StatusOK] != 1 || statuses[http.StatusBadRequest] != 1 {
		t.Fatalf("concurrent statuses=%v, want one success and one stock rejection", statuses)
	}
	assertInventoryQuantity(t, db, ingredient, 0)
	for _, table := range []string{"stock_sales", "stock_sale_items", "stock_movements", "audit_events"} {
		var count int
		if err := db.QueryRow("SELECT COUNT(*) FROM " + table).Scan(&count); err != nil || count != 1 {
			t.Fatalf("%s count=%d want=1 err=%v", table, count, err)
		}
	}
}
