package router

import (
	"fmt"
	"net/http"
	"os"
	"strings"
	"testing"
)

func TestStockConsumptionAtomicityAndBranchOwnership(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL is required for isolated PostgreSQL integration")
	}
	for _, tc := range []struct {
		name           string
		secondQuantity float64
		foreign        bool
		status         int
	}{
		{"mixed channel sale commits calculated stock and revenue", 20, false, http.StatusOK},
		{"insufficient second ingredient rolls back the first deduction", 1, false, http.StatusBadRequest},
		{"another branch menu cannot be consumed", 20, true, http.StatusNotFound},
	} {
		t.Run(tc.name, func(t *testing.T) {
			db := openRouterTestDB(t, url)
			branch := seedBranch(t, db, "CONSUME-A")
			other := seedBranch(t, db, "CONSUME-B")
			seedUser(t, db, 7, "consume-staff", "cashier", branch, nil)
			first := seedInventory(t, db, branch, "First ingredient", 20)
			second := seedInventory(t, db, branch, "Second ingredient", tc.secondQuantity)
			menuBranch := branch
			if tc.foreign {
				menuBranch = other
			}
			var menu int64
			if err := db.QueryRow(`INSERT INTO menu_items(branch_id,name,category,store_price,lineman_price,cost_price,status,store_price_available,lineman_price_available) VALUES($1,'Atomic menu','coffee',60,80,20,'available',true,true) RETURNING id`, menuBranch).Scan(&menu); err != nil {
				t.Fatal(err)
			}
			for _, ingredient := range []int64{first, second} {
				for _, channel := range []string{"storefront", "lineman"} {
					amount := 2
					if channel == "lineman" {
						amount = 3
					}
					if _, err := db.Exec(`INSERT INTO menu_item_ingredients(menu_item_id,inventory_item_id,quantity,unit,cost_amount,channel) VALUES($1,$2,$3,'กรัม',1,$4)`, menu, ingredient, amount, channel); err != nil {
						t.Fatal(err)
					}
				}
			}
			r := New(db, nil)
			body := fmt.Sprintf(`{"items":[{"menuItemId":%d,"quantity":2,"channel":"storefront"},{"menuItemId":%d,"quantity":1,"channel":"lineman"}],"channel":"storefront","note":"atomic audit"}`, menu, menu)
			cookie := &http.Cookie{Name: "sbc_stock_session", Value: testTokenWithBranch(t, "cashier", branch)}
			response := requestJSONWithCookie(r, http.MethodPost, "/api/v1/stock/consume?branchId="+fmt.Sprint(other), body, cookie)
			if response.Code != tc.status {
				t.Fatalf("response = %d: %s", response.Code, response.Body.String())
			}
			deduction := 0.0
			if tc.status == http.StatusOK {
				deduction = 7
			}
			assertInventoryQuantity(t, db, first, 20-deduction)
			assertInventoryQuantity(t, db, second, tc.secondQuantity-deduction)
			for table, want := range map[string]int{"stock_movements": 0, "stock_sales": 0, "stock_sale_items": 0, "audit_events": 0} {
				if tc.status == http.StatusOK {
					want = 1
					if table == "stock_movements" || table == "stock_sale_items" {
						want = 2
					}
				}
				var count int
				if err := db.QueryRow("SELECT COUNT(*) FROM " + table).Scan(&count); err != nil || count != want {
					t.Fatalf("%s count=%d want=%d err=%v", table, count, want, err)
				}
			}
			if tc.status == http.StatusOK {
				var total float64
				var savedBranch int64
				if err := db.QueryRow(`SELECT total,branch_id FROM stock_sales`).Scan(&total, &savedBranch); err != nil || total != 200 || savedBranch != branch {
					t.Fatalf("sale total=%v branch=%d err=%v", total, savedBranch, err)
				}
				var details string
				if err := db.QueryRow(`SELECT metadata::text FROM audit_events`).Scan(&details); err != nil || !strings.Contains(details, `"mixed"`) {
					t.Fatalf("mixed channel audit=%s err=%v", details, err)
				}
			}
		})
	}
}

func TestStockConsumptionFreshLotsUseFEFOAndExcludeExpiredStock(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL is required for isolated PostgreSQL integration")
	}
	for _, enough := range []bool{true, false} {
		t.Run(fmt.Sprintf("enough usable stock %t", enough), func(t *testing.T) {
			db := openRouterTestDB(t, url)
			branch := seedBranch(t, db, "FRESH-CONSUME")
			seedUser(t, db, 7, "fresh-consume", "cashier", branch, nil)
			inventory := seedInventory(t, db, branch, "Fresh milk", 20)
			if _, err := db.Exec(`UPDATE inventory_items SET category='fresh' WHERE id=$1`, inventory); err != nil {
				t.Fatal(err)
			}
			seedMenu(t, db, branch, "Milk menu", inventory, 4)
			var menu int64
			if err := db.QueryRow(`SELECT id FROM menu_items WHERE branch_id=$1`, branch).Scan(&menu); err != nil {
				t.Fatal(err)
			}
			if _, err := db.Exec(`UPDATE menu_items SET store_price_available=true WHERE id=$1`, menu); err != nil {
				t.Fatal(err)
			}
			var expired, today, later int64
			for _, lot := range []struct {
				id       *int64
				days     int
				quantity float64
			}{
				{&expired, -1, 12}, {&today, 0, 3}, {&later, 2, 5},
			} {
				quantity := lot.quantity
				if !enough && lot.days == 2 {
					quantity = 1
				}
				if err := db.QueryRow(`INSERT INTO fresh_inventory_lots(branch_id,inventory_item_id,manufactured_at,expiry_date,quantity_received,quantity_remaining,unit_cost) VALUES($1,$2,CURRENT_DATE-5,CURRENT_DATE+$3::integer,$4,$4,1) RETURNING id`, branch, inventory, lot.days, quantity).Scan(lot.id); err != nil {
					t.Fatal(err)
				}
			}
			r := New(db, nil)
			cookie := &http.Cookie{Name: "sbc_stock_session", Value: testTokenWithBranch(t, "cashier", branch)}
			response := requestJSONWithCookie(r, http.MethodPost, "/api/v1/stock/consume", fmt.Sprintf(`{"items":[{"menuItemId":%d,"quantity":1.5}],"channel":"storefront","note":"FEFO audit"}`, menu), cookie)
			wantStatus, wantStock := http.StatusOK, 14.0
			wantToday, wantLater, wantMovements := 0.0, 2.0, 2
			if !enough {
				wantStatus, wantStock = http.StatusBadRequest, 20
				wantToday, wantLater, wantMovements = 3, 1, 0
			}
			if response.Code != wantStatus {
				t.Fatalf("response=%d: %s", response.Code, response.Body.String())
			}
			assertInventoryQuantity(t, db, inventory, wantStock)
			for id, want := range map[int64]float64{expired: 12, today: wantToday, later: wantLater} {
				var remaining float64
				if err := db.QueryRow(`SELECT quantity_remaining FROM fresh_inventory_lots WHERE id=$1`, id).Scan(&remaining); err != nil || remaining != want {
					t.Fatalf("lot %d remaining=%v want=%v err=%v", id, remaining, want, err)
				}
			}
			var count int
			if err := db.QueryRow(`SELECT COUNT(*) FROM fresh_inventory_lot_movements WHERE movement_type='consumed'`).Scan(&count); err != nil || count != wantMovements {
				t.Fatalf("lot movements=%d want=%d err=%v", count, wantMovements, err)
			}
		})
	}
}
