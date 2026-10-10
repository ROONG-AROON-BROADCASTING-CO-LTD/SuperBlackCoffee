package router

import (
	"fmt"
	"net/http"
	"os"
	"strings"
	"testing"
)

func TestPromotionsPersistEditableCampaignData(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL required")
	}
	db := openRouterTestDB(t, url)
	branchID := seedBranch(t, db, "PROMOTION-TEST")
	seedUser(t, db, 7, "promotion-admin", "admin", branchID, nil)
	var menuID int64
	if err := db.QueryRow(`INSERT INTO menu_items(branch_id,name,category,store_price,lineman_price,cost_price,status,template_enabled) VALUES($1,'ชาเขียวโปรโมชัน','beverage',55,60,20,'available',true) RETURNING id`, branchID).Scan(&menuID); err != nil {
		t.Fatal(err)
	}

	r := New(db, nil)
	token := testToken(t, "admin")
	body := fmt.Sprintf(`{"name":"ส่วนลดวันเกิด","type":"แคมเปญสมาชิกระดับ Gold","benefit":"ลด 15%% เมื่อซื้อ 2 แก้ว","status":"draft","channels":["หน้าร้าน","แอป"],"eligibility":"สมาชิก Gold","startsOn":"2026-10-10","endsOn":"2026-12-31","terms":["แสดงบัตรสมาชิก","ใช้ร่วมกับส่วนลดอื่นไม่ได้"],"branchIds":[%d],"menuItemIds":[%d]}`, branchID, menuID)
	created := requestJSON(r, http.MethodPost, "/api/v1/promotions", body, token)
	if created.Code != http.StatusCreated {
		t.Fatalf("create promotion = %d: %s", created.Code, created.Body.String())
	}
	createdBody := created.Body.String()
	id := responseID(t, created)
	if !strings.Contains(createdBody, "ส่วนลดวันเกิด") || !strings.Contains(createdBody, "ชาเขียวโปรโมชัน") {
		t.Fatalf("create response missing persisted detail: %s", createdBody)
	}

	updatedBody := fmt.Sprintf(`{"name":"รับสิทธิ์วันเกิด 2026","type":"สิทธิ์เฉพาะสมาชิก","benefit":"รับเครื่องดื่มฟรี 1 แก้ว","status":"active","channels":["หน้าร้าน"],"eligibility":"สมาชิกที่เกิดเดือนนี้","startsOn":"2026-10-15","endsOn":"","terms":["ยืนยันวันเกิด"],"branchIds":[],"menuItemIds":[%d]}`, menuID)
	updated := requestJSON(r, http.MethodPatch, fmt.Sprintf("/api/v1/promotions/%d", id), updatedBody, token)
	if updated.Code != http.StatusOK {
		t.Fatalf("update promotion = %d: %s", updated.Code, updated.Body.String())
	}
	if !strings.Contains(updated.Body.String(), "รับสิทธิ์วันเกิด 2026") || !strings.Contains(updated.Body.String(), `"branches":null`) {
		t.Fatalf("update response did not preserve dynamic fields: %s", updated.Body.String())
	}

	listed := requestJSON(r, http.MethodGet, "/api/v1/promotions", "", token)
	if listed.Code != http.StatusOK || !strings.Contains(listed.Body.String(), "รับสิทธิ์วันเกิด 2026") {
		t.Fatalf("list promotions = %d: %s", listed.Code, listed.Body.String())
	}
	deleted := requestJSON(r, http.MethodDelete, fmt.Sprintf("/api/v1/promotions/%d", id), "", token)
	if deleted.Code != http.StatusNoContent {
		t.Fatalf("delete promotion = %d: %s", deleted.Code, deleted.Body.String())
	}
	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM promotions WHERE id=$1`, id).Scan(&count); err != nil || count != 0 {
		t.Fatalf("promotion was not deleted: count=%d err=%v", count, err)
	}
}
