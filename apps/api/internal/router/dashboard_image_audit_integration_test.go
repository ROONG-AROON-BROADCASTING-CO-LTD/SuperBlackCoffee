package router

import (
	"encoding/json"
	"fmt"
	"os"
	"testing"
)

func TestDashboardAuditSeparatesCompanyFranchiseHeadquartersAndSignedBranch(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL required")
	}
	db := openRouterTestDB(t, url)
	company := seedBranch(t, db, "REPORT-COMPANY")
	franchise := seedBranch(t, db, "REPORT-FRANCHISE")
	hq := seedBranch(t, db, "REPORT-HQ")
	var franchiseID int64
	if err := db.QueryRow(`INSERT INTO franchisees(name,email,plan,status) VALUES('Report owner','report-owner@example.test','M','active') RETURNING id`).Scan(&franchiseID); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`UPDATE branches SET franchisee_id=$1 WHERE id=$2`, franchiseID, franchise); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`UPDATE branches SET is_headquarters=true WHERE id=$1`, hq); err != nil {
		t.Fatal(err)
	}
	seedUser(t, db, 7, "report-admin", "admin", company, nil)
	for _, fixture := range []struct {
		branch           int64
		amount, quantity float64
	}{{company, 12.5, 2}, {franchise, 45.25, 3}, {hq, 7, 4}} {
		var sale, menu int64
		if err := db.QueryRow(`INSERT INTO stock_sales(branch_id,recorded_by,total,created_at) VALUES($1,7,$2,now()) RETURNING id`, fixture.branch, fixture.amount).Scan(&sale); err != nil {
			t.Fatal(err)
		}
		if err := db.QueryRow(`INSERT INTO menu_items(branch_id,name,category,store_price,lineman_price,cost_price,status) VALUES($1,$2,'coffee',10,15,2,'available') RETURNING id`, fixture.branch, fmt.Sprintf("Report menu %d", fixture.branch)).Scan(&menu); err != nil {
			t.Fatal(err)
		}
		if _, err := db.Exec(`INSERT INTO stock_sale_items(stock_sale_id,menu_item_id,channel,quantity,unit_price,amount) VALUES($1,$2,'storefront',$3,10,$4)`, sale, menu, fixture.quantity, fixture.amount); err != nil {
			t.Fatal(err)
		}
		if _, err := db.Exec(`INSERT INTO audit_events(branch_id,actor_id,entity_type,action,metadata,created_at) VALUES($1,7,'stock_consumption','consumed',$2::jsonb,now())`, fixture.branch, fmt.Sprintf(`{"menuQuantity":%g}`, fixture.quantity)); err != nil {
			t.Fatal(err)
		}
	}
	r := New(db, nil)
	token := testToken(t, "admin")
	for _, tt := range []struct {
		scope           string
		total, quantity float64
		count           int
	}{{"sbc", 12.5, 2, 1}, {"franchise", 45.25, 3, 1}, {"all", 64.75, 9, 3}} {
		t.Run(tt.scope, func(t *testing.T) {
			res := requestJSON(r, "GET", "/api/v1/dashboard?scope="+tt.scope, "", token)
			var body struct {
				Success bool `json:"success"`
				Data    struct {
					TodaySales         float64 `json:"todaySales"`
					TodayOrders        int     `json:"todayOrders"`
					TodayMenuStockCuts float64 `json:"todayMenuStockCuts"`
				} `json:"data"`
			}
			if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil || res.Code != 200 || !body.Success || body.Data.TodaySales != tt.total || body.Data.TodayOrders != tt.count || body.Data.TodayMenuStockCuts != tt.quantity {
				t.Fatalf("wrong aggregate: %d %s %v", res.Code, res.Body.String(), err)
			}
			for _, trend := range []struct {
				path, metric string
				total        float64
			}{{"/dashboard/trend", "quantity", tt.quantity}, {"/dashboard/sales-trend", "sales", tt.total}} {
				res := requestJSON(r, "GET", "/api/v1"+trend.path+"?period=day&scope="+tt.scope, "", token)
				var series struct {
					Data []map[string]any `json:"data"`
				}
				if err := json.Unmarshal(res.Body.Bytes(), &series); err != nil || res.Code != 200 || len(series.Data) != 7 {
					t.Fatalf("trend invalid: %d %s", res.Code, res.Body.String())
				}
				var sum float64
				for _, point := range series.Data {
					value, ok := point[trend.metric].(float64)
					if !ok {
						t.Fatalf("missing metric: %v", point)
					}
					sum += value
				}
				if sum != trend.total {
					t.Fatalf("%s leaked scope: got %g want %g", trend.path, sum, trend.total)
				}
			}
			res = requestJSON(r, "GET", "/api/v1/dashboard/top-menus?period=today&scope="+tt.scope, "", token)
			var ranking struct {
				Data []struct {
					Sales    float64 `json:"sales"`
					Quantity float64 `json:"quantity"`
				} `json:"data"`
			}
			if err := json.Unmarshal(res.Body.Bytes(), &ranking); err != nil || res.Code != 200 || len(ranking.Data) != tt.count {
				t.Fatalf("ranking invalid: %d %s", res.Code, res.Body.String())
			}
			var total float64
			for _, item := range ranking.Data {
				total += item.Sales
			}
			if total != tt.total {
				t.Fatalf("ranking leaked scope: %g want %g", total, tt.total)
			}
		})
	}
	res := requestJSON(r, "GET", "/api/v1/dashboard?branchCode=REPORT-COMPANY", "", testTokenWithFranchise(t, "franchise_owner", franchise, franchiseID))
	var own struct {
		Data struct {
			TodaySales float64 `json:"todaySales"`
		} `json:"data"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &own); err != nil || res.Code != 200 || own.Data.TodaySales != 45.25 {
		t.Fatalf("forged branch report leaked: %d %s", res.Code, res.Body.String())
	}
	for _, path := range []string{"/dashboard?scope=invalid", "/dashboard/trend?period=invalid", "/dashboard/sales-trend?period=invalid", "/dashboard/top-menus?period=invalid"} {
		if res := requestJSON(r, "GET", "/api/v1"+path, "", token); res.Code != 400 {
			t.Fatalf("invalid report accepted: %s %d %s", path, res.Code, res.Body.String())
		}
	}
}

func TestMenuImageAuditEnforcesBranchPlanAndTemplateScope(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL required")
	}
	db := openRouterTestDB(t, url)
	branch := seedBranch(t, db, "IMAGE-A")
	foreign := seedBranch(t, db, "IMAGE-B")
	seedUser(t, db, 7, "image-staff", "cashier", branch, nil)
	var ownMenu, foreignMenu int64
	for _, fixture := range []struct {
		branch int64
		id     *int64
	}{{branch, &ownMenu}, {foreign, &foreignMenu}} {
		if err := db.QueryRow(`INSERT INTO menu_items(branch_id,name,category,store_price,lineman_price,cost_price,status,image_url) VALUES($1,'Image menu','coffee',10,15,2,'available','https://cdn.example.test/menu.jpg') RETURNING id`, fixture.branch).Scan(fixture.id); err != nil {
			t.Fatal(err)
		}
	}
	r := New(db, nil)
	token := testTokenWithBranch(t, "cashier", branch)
	path := fmt.Sprintf("/api/v1/menu-items/%d/image", ownMenu)
	res := requestJSON(r, "GET", path, "", token)
	if res.Code != 307 || res.Header().Get("Location") != "https://cdn.example.test/menu.jpg" {
		t.Fatalf("hosted image not safely redirected %d %s", res.Code, res.Body.String())
	}
	for _, id := range []string{"0", "invalid", fmt.Sprint(foreignMenu)} {
		res := requestJSON(r, "GET", "/api/v1/menu-items/"+id+"/image?branchId="+fmt.Sprint(foreign), "", token)
		if res.Code != 404 || res.Header().Get("Location") != "" {
			t.Fatalf("foreign or invalid image exposed %d %s", res.Code, res.Body.String())
		}
	}
	if _, err := db.Exec(`UPDATE menu_items SET template_enabled=false WHERE id=$1`, ownMenu); err != nil {
		t.Fatal(err)
	}
	if res := requestJSON(r, "GET", path, "", token); res.Code != 404 {
		t.Fatalf("disabled image exposed %d", res.Code)
	}
	if _, err := db.Exec(`UPDATE branches SET size='S' WHERE id=$1`, branch); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`UPDATE menu_items SET template_enabled=true,category='bakery' WHERE id=$1`, ownMenu); err != nil {
		t.Fatal(err)
	}
	if res := requestJSON(r, "GET", path, "", token); res.Code != 404 {
		t.Fatalf("plan S bakery image exposed %d", res.Code)
	}
	if _, err := db.Exec(`UPDATE menu_items SET category='coffee',image_url='data:image/png;base64,INVALID' WHERE id=$1`, ownMenu); err != nil {
		t.Fatal(err)
	}
	if res := requestJSON(r, "GET", path, "", token); res.Code != 415 {
		t.Fatalf("corrupt image accepted %d", res.Code)
	}
}
