package router

import (
	"bytes"
	"database/sql"
	"fmt"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"net/textproto"
	"os"
	"strings"
	"testing"
	"time"

	"golang.org/x/crypto/bcrypt"
)

func TestAuditFranchiseProfileUpdateIsAtomicAndSynchronizesOwnerAndBranch(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL required")
	}
	db := openRouterTestDB(t, url)
	company := seedBranch(t, db, "AUDIT-PROFILE-COLLISION")
	seedUser(t, db, 7, "profile-admin", "admin", company, nil)
	var franchise, branch int64
	if err := db.QueryRow(`INSERT INTO franchisees(name,email,plan,status) VALUES('Original franchise','original-profile@example.test','S','active') RETURNING id`).Scan(&franchise); err != nil {
		t.Fatal(err)
	}
	if err := db.QueryRow(`INSERT INTO branches(name,code,size,status,franchisee_id) VALUES('Original branch','AUDIT-PROFILE-OLD','S','active',$1) RETURNING id`, franchise).Scan(&branch); err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`INSERT INTO users(id,name,username,email,password_hash,role,branch_id,franchisee_id) VALUES(8,'Original owner','profile-owner','original-owner@example.test','original-hash','franchise_owner',$1,$2)`, branch, franchise); err != nil {
		t.Fatal(err)
	}
	r := New(db, nil)
	token := testToken(t, "admin")
	path := fmt.Sprintf("/api/v1/franchisees/%d", franchise)
	body := `{"name":"New owner","email":"new-profile@example.test","plan":"M","branchName":"New branch","branchCode":"AUDIT-PROFILE-COLLISION","password":"NewPassword123!"}`
	if res := requestJSON(r, "PATCH", path, body, testTokenWithFranchise(t, "franchise_owner", branch, franchise)); res.Code != 403 {
		t.Fatalf("owner mutated admin profile %d", res.Code)
	}
	res := requestJSON(r, "PATCH", path, body, token)
	if res.Code != 409 {
		t.Fatalf("duplicate branch %d %s", res.Code, res.Body.String())
	}
	var name, plan, code, hash string
	if err := db.QueryRow(`SELECT f.name,f.plan,b.code,u.password_hash FROM franchisees f JOIN branches b ON b.franchisee_id=f.id JOIN users u ON u.franchisee_id=f.id WHERE f.id=$1`, franchise).Scan(&name, &plan, &code, &hash); err != nil || name != "Original franchise" || plan != "S" || code != "AUDIT-PROFILE-OLD" || hash != "original-hash" {
		t.Fatalf("profile rollback %s %s %s %s %v", name, plan, code, hash, err)
	}
	body = strings.ReplaceAll(body, "AUDIT-PROFILE-COLLISION", "AUDIT-PROFILE-NEW")
	res = requestJSON(r, "PATCH", path, body, token)
	if res.Code != 200 {
		t.Fatalf("update %d %s", res.Code, res.Body.String())
	}
	var branchSize, ownerName, email string
	if err := db.QueryRow(`SELECT f.name,f.plan,b.code,b.size,u.name,u.email,u.password_hash FROM franchisees f JOIN branches b ON b.franchisee_id=f.id JOIN users u ON u.franchisee_id=f.id WHERE f.id=$1`, franchise).Scan(&name, &plan, &code, &branchSize, &ownerName, &email, &hash); err != nil || name != "New owner" || plan != "M" || code != "AUDIT-PROFILE-NEW" || branchSize != "M" || ownerName != "New owner" || email != "new-profile@example.test" {
		t.Fatalf("profile synchronization %s %s %s %s %s %s %v", name, plan, code, branchSize, ownerName, email, err)
	}
	if bcrypt.CompareHashAndPassword([]byte(hash), []byte("NewPassword123!")) != nil {
		t.Fatal("new password was not securely hashed")
	}
	if res := requestJSON(r, "PATCH", path+"/status", `{"status":"inactive"}`, token); res.Code != 200 {
		t.Fatalf("deactivate %d %s", res.Code, res.Body.String())
	}
	var branchStatus string
	if err := db.QueryRow(`SELECT status FROM branches WHERE id=$1`, branch).Scan(&branchStatus); err != nil || branchStatus != "inactive" {
		t.Fatalf("branch not deactivated %s %v", branchStatus, err)
	}
	if res := requestJSON(r, "GET", "/api/v1/auth/session", "", testTokenWithFranchise(t, "franchise_owner", branch, franchise)); res.Code != 401 {
		t.Fatalf("inactive franchise session accepted %d", res.Code)
	}
}

func TestAuditCompanyBranchDetailsPersistWorkdaysAndGeofenceOnlyForCompanyBranches(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL required")
	}
	db := openRouterTestDB(t, url)
	branch := seedBranch(t, db, "AUDIT-BRANCH-DETAILS")
	seedUser(t, db, 7, "branch-detail-admin", "admin", branch, nil)
	r := New(db, nil)
	token := testToken(t, "admin")
	path := fmt.Sprintf("/api/v1/branches/%d/details", branch)
	invalid := `{"name":"Changed","code":"AUDIT-BRANCH-DETAILS","size":"S","latitude":16,"longitude":100,"attendanceRadiusM":24,"workDays":[1,1]}`
	if res := requestJSON(r, "PATCH", path, invalid, token); res.Code != 400 {
		t.Fatalf("invalid geofence accepted %d", res.Code)
	}
	body := `{"name":" Changed branch ","code":" audit-branch-details-new ","size":"S","latitude":16,"longitude":100,"attendanceRadiusM":150,"workDays":[1,2,3,4,5],"opensAt":"09:00","closesAt":"18:00"}`
	res := requestJSON(r, "PATCH", path, body, token)
	if res.Code != 200 {
		t.Fatalf("branch update %d %s", res.Code, res.Body.String())
	}
	var name, code, days string
	var radius int
	if err := db.QueryRow(`SELECT name,code,attendance_radius_m,array_to_string(work_days,',') FROM branches WHERE id=$1`, branch).Scan(&name, &code, &radius, &days); err != nil || name != "Changed branch" || code != "AUDIT-BRANCH-DETAILS-NEW" || radius != 150 || days != "1,2,3,4,5" {
		t.Fatalf("branch details %s %s %d %s %v", name, code, radius, days, err)
	}
}

func TestAuditSupplierAndPurchaseOrderRejectInvalidTransitionsWithoutChangingStock(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL required")
	}
	db := openRouterTestDB(t, url)
	branch := seedBranch(t, db, "AUDIT-PURCHASE")
	seedUser(t, db, 7, "purchase-admin", "admin", branch, nil)
	item := seedInventory(t, db, branch, "Audit order inventory", 10)
	r := New(db, nil)
	token := testToken(t, "admin")
	res := requestJSON(r, "POST", "/api/v1/suppliers", `{"name":"Audit supplier","status":"active"}`, token)
	if res.Code != 201 {
		t.Fatalf("supplier create %d %s", res.Code, res.Body.String())
	}
	supplier := responseID(t, res)
	if res := requestJSON(r, "POST", "/api/v1/suppliers", `{"name":"Audit supplier"}`, token); res.Code != 409 {
		t.Fatalf("duplicate supplier %d", res.Code)
	}
	if res := requestJSON(r, "GET", "/api/v1/suppliers", "", token); res.Code != 200 || !strings.Contains(res.Body.String(), "Audit supplier") {
		t.Fatalf("supplier list %d %s", res.Code, res.Body.String())
	}
	body := fmt.Sprintf(`{"branchId":%d,"supplierId":%d,"items":[{"inventoryItemId":%d,"quantity":2,"unitCost":3}]}`, branch, supplier, item)
	res = requestJSON(r, "POST", "/api/v1/purchase-orders", body, token)
	if res.Code != 201 {
		t.Fatalf("order create %d %s", res.Code, res.Body.String())
	}
	order := responseID(t, res)
	path := fmt.Sprintf("/api/v1/purchase-orders/%d/status", order)
	if res := requestJSON(r, "PATCH", path, `{"status":"ordered"}`, token); res.Code != 409 {
		t.Fatalf("draft skipped approval %d", res.Code)
	}
	if res := requestJSON(r, "PATCH", path, `{"status":"submitted"}`, testTokenWithBranch(t, "cashier", branch)); res.Code != 403 {
		t.Fatalf("cashier approval %d", res.Code)
	}
	for _, status := range []string{"submitted", "approved", "cancelled"} {
		res := requestJSON(r, "PATCH", path, fmt.Sprintf(`{"status":"%s"}`, status), token)
		if res.Code != 200 {
			t.Fatalf("transition %s %d %s", status, res.Code, res.Body.String())
		}
	}
	if res := requestJSON(r, "PATCH", path, `{"status":"ordered"}`, token); res.Code != 409 {
		t.Fatalf("cancelled order reopened %d", res.Code)
	}
	assertInventoryQuantity(t, db, item, 10)
	if res := requestJSON(r, "PATCH", fmt.Sprintf("/api/v1/suppliers/%d", supplier), `{"name":"Audit supplier","status":"inactive"}`, token); res.Code != 200 {
		t.Fatalf("supplier deactivate %d", res.Code)
	}
	if res := requestJSON(r, "POST", "/api/v1/purchase-orders", body, token); res.Code != 400 {
		t.Fatalf("inactive supplier order accepted %d", res.Code)
	}
	var count int
	if err := db.QueryRow(`SELECT COUNT(*) FROM purchase_orders`).Scan(&count); err != nil || count != 1 {
		t.Fatalf("failed order left data count=%d %v", count, err)
	}
}

func TestAuditInvoiceMoneyValidationAndPaymentTimestamp(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL required")
	}
	db := openRouterTestDB(t, url)
	branch := seedBranch(t, db, "AUDIT-INVOICE")
	seedUser(t, db, 7, "invoice-admin", "admin", branch, nil)
	r := New(db, nil)
	token := testToken(t, "admin")
	for _, body := range []string{
		`{"branchCode":"AUDIT-INVOICE","invoiceNumber":"BAD","serviceType":"maintenance","amount":-0.01}`,
		`{"branchCode":"AUDIT-INVOICE","invoiceNumber":"BAD","serviceType":"unknown","amount":10}`,
	} {
		if res := requestJSON(r, "POST", "/api/v1/service-invoices", body, token); res.Code != 400 {
			t.Fatalf("invalid invoice %d %s", res.Code, res.Body.String())
		}
	}
	res := requestJSON(r, "POST", "/api/v1/service-invoices", `{"branchCode":"AUDIT-INVOICE","invoiceNumber":"AUDIT-INV-1","serviceType":"maintenance","amount":123.45,"dueAt":"2099-11-30"}`, token)
	if res.Code != 201 {
		t.Fatalf("invoice create %d %s", res.Code, res.Body.String())
	}
	id := responseID(t, res)
	path := fmt.Sprintf("/api/v1/service-invoices/%d/status", id)
	if res := requestJSON(r, "PATCH", path, `{"status":"paid"}`, testTokenWithBranch(t, "cashier", branch)); res.Code != 403 {
		t.Fatalf("unauthorized paid %d", res.Code)
	}
	if res := requestJSON(r, "PATCH", path, `{"status":"bogus"}`, token); res.Code != 400 {
		t.Fatalf("invalid paid status %d", res.Code)
	}
	var amount float64
	var paidAt sql.NullTime
	if err := db.QueryRow(`SELECT amount,paid_at FROM service_invoices WHERE id=$1`, id).Scan(&amount, &paidAt); err != nil || amount != 123.45 || paidAt.Valid {
		t.Fatalf("unpaid invoice mutated: %v %v %v", amount, paidAt, err)
	}
	if res := requestJSON(r, "PATCH", path, `{"status":"paid"}`, token); res.Code != 200 {
		t.Fatalf("payment %d %s", res.Code, res.Body.String())
	}
	if err := db.QueryRow(`SELECT amount,paid_at FROM service_invoices WHERE id=$1`, id).Scan(&amount, &paidAt); err != nil || amount != 123.45 || !paidAt.Valid {
		t.Fatalf("payment not persisted %v %v %v", amount, paidAt, err)
	}
}

func TestAuditCompanyDocumentsValidateUploadsAndKeepMutationsAdminOnly(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL required")
	}
	db := openRouterTestDB(t, url)
	branch := seedBranch(t, db, "AUDIT-COMPANY-DOC")
	seedUser(t, db, 7, "document-admin", "admin", branch, nil)
	r := New(db, nil)
	token := testToken(t, "admin")
	upload := func(title, contentType string) *httptest.ResponseRecorder {
		var body bytes.Buffer
		writer := multipart.NewWriter(&body)
		_ = writer.WriteField("title", title)
		_ = writer.WriteField("category", "company_policy")
		header := textproto.MIMEHeader{}
		header.Set("Content-Disposition", `form-data; name="file"; filename="policy.pdf"`)
		header.Set("Content-Type", contentType)
		part, err := writer.CreatePart(header)
		if err != nil {
			t.Fatal(err)
		}
		_, _ = part.Write([]byte("%PDF-audit-policy"))
		_ = writer.Close()
		req := httptest.NewRequest("POST", "/api/v1/company-documents", &body)
		req.Header.Set("Content-Type", writer.FormDataContentType())
		req.Header.Set("Authorization", "Bearer "+token)
		res := httptest.NewRecorder()
		r.ServeHTTP(res, req)
		return res
	}
	for _, tc := range []struct{ title, contentType string }{{"   ", "application/pdf"}, {"Policy", "text/html"}} {
		res := upload(tc.title, tc.contentType)
		if res.Code != 400 {
			t.Fatalf("invalid upload %d %s", res.Code, res.Body.String())
		}
	}
	res := upload("Audit policy", "application/pdf")
	if res.Code != 201 {
		t.Fatalf("upload %d %s", res.Code, res.Body.String())
	}
	id := responseID(t, res)
	t.Cleanup(func() { _, _ = db.Exec(`DELETE FROM company_documents WHERE id=$1`, id) })
	list := requestJSON(r, "GET", "/api/v1/company-documents", "", token)
	if list.Code != 200 || !strings.Contains(list.Body.String(), "Audit policy") {
		t.Fatalf("list %d %s", list.Code, list.Body.String())
	}
	path := fmt.Sprintf("/api/v1/company-documents/%d/download", id)
	download := requestJSON(r, "GET", path, "", token)
	if download.Code != 200 || download.Body.String() != "%PDF-audit-policy" || !strings.Contains(download.Header().Get("Content-Disposition"), "policy.pdf") {
		t.Fatalf("download %d %s", download.Code, download.Body.String())
	}
	deletePath := fmt.Sprintf("/api/v1/company-documents/%d", id)
	denied := requestJSON(r, "DELETE", deletePath, "", testTokenWithBranch(t, "cashier", branch))
	if denied.Code != 403 {
		t.Fatalf("staff document delete %d", denied.Code)
	}
	deleted := requestJSON(r, "DELETE", deletePath, "", token)
	if deleted.Code != 204 {
		t.Fatalf("delete %d %s", deleted.Code, deleted.Body.String())
	}
	if res := requestJSON(r, "GET", path, "", token); res.Code != 404 {
		t.Fatalf("deleted doc still visible %d", res.Code)
	}
}

func TestAuditExpirySettingsAndSuggestionsRespectBoundariesAndBranch(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL required")
	}
	db := openRouterTestDB(t, url)
	branch := seedBranch(t, db, "AUDIT-EXPIRY")
	other := seedBranch(t, db, "AUDIT-EXPIRY-OTHER")
	seedUser(t, db, 7, "expiry-manager", "branch_manager", branch, nil)
	r := New(db, nil)
	token := testTokenWithBranch(t, "branch_manager", branch)
	for _, days := range []int{0, 1, 365, 366} {
		want := 200
		if days < 1 || days > 365 {
			want = 400
		}
		res := requestJSON(r, "PATCH", fmt.Sprintf("/api/v1/inventory/expiry-settings?branchId=%d", other), fmt.Sprintf(`{"warningDays":%d}`, days), token)
		if res.Code != want {
			t.Fatalf("warning days %d: %d %s", days, res.Code, res.Body.String())
		}
	}
	var foreignDays int
	if err := db.QueryRow(`SELECT expiry_warning_days FROM branches WHERE id=$1`, other).Scan(&foreignDays); err != nil || foreignDays != 60 {
		t.Fatalf("foreign settings mutated: %d %v", foreignDays, err)
	}
	if res := requestJSON(r, "PATCH", "/api/v1/inventory/expiry-settings", `{"warningDays":7}`, token); res.Code != 200 {
		t.Fatal(res.Body.String())
	}
	for _, tc := range []struct {
		name   string
		offset int
		branch int64
	}{
		{"Audit expired", -1, branch}, {"Audit today", 0, branch}, {"Audit threshold", 7, branch}, {"Audit after threshold", 8, branch}, {"Audit foreign expiry", 0, other},
	} {
		item := seedInventory(t, db, tc.branch, tc.name, 10)
		if _, err := db.Exec(`UPDATE inventory_items SET category='fresh',expiry_date=CURRENT_DATE+$1::integer WHERE id=$2`, tc.offset, item); err != nil {
			t.Fatal(err)
		}
		seedMenu(t, db, tc.branch, tc.name+" menu", item, 1)
	}
	alerts := requestJSON(r, "GET", fmt.Sprintf("/api/v1/inventory/expiry-alerts?branchId=%d", other), "", token)
	if alerts.Code != 200 {
		t.Fatalf("alerts %d %s", alerts.Code, alerts.Body.String())
	}
	for _, name := range []string{"Audit expired", "Audit today", "Audit threshold"} {
		if !strings.Contains(alerts.Body.String(), name) {
			t.Fatalf("missing boundary alert %s", name)
		}
	}
	for _, name := range []string{"Audit after threshold", "Audit foreign expiry"} {
		if strings.Contains(alerts.Body.String(), name) {
			t.Fatalf("unexpected alert %s", name)
		}
	}
	suggestions := requestJSON(r, "GET", "/api/v1/inventory/expiry-promotion-suggestions", "", token)
	if suggestions.Code != 200 {
		t.Fatalf("suggestions %d %s", suggestions.Code, suggestions.Body.String())
	}
	if strings.Contains(suggestions.Body.String(), "Audit expired") || strings.Contains(suggestions.Body.String(), "Audit foreign expiry") || !strings.Contains(suggestions.Body.String(), "Audit threshold menu") {
		t.Fatalf("invalid suggestions %s", suggestions.Body.String())
	}
}

func TestAuditLeaveDocumentsAndHistoryStayWithinEmployeeOwnership(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL required")
	}
	db := openRouterTestDB(t, url)
	branch := seedBranch(t, db, "AUDIT-LEAVE-DOCS")
	seedUser(t, db, 7, "document-owner", "cashier", branch, nil)
	seedUser(t, db, 8, "other-document-owner", "cashier", branch, nil)
	var leaveIDs, attachmentIDs [2]int64
	for i := range leaveIDs {
		if err := db.QueryRow(`INSERT INTO staff_leave_requests(user_id,branch_id,leave_date,leave_type,reason,status) VALUES($1,$2,'2099-11-03','sick',$3,'pending') RETURNING id`, 7+i, branch, fmt.Sprintf("private-reason-%d", i)).Scan(&leaveIDs[i]); err != nil {
			t.Fatal(err)
		}
		if err := db.QueryRow(`INSERT INTO staff_leave_request_attachments(leave_request_id,original_name,content_type,size_bytes,content) VALUES($1,'evidence.pdf','application/pdf',8,$2) RETURNING id`, leaveIDs[i], []byte("%PDF-own")).Scan(&attachmentIDs[i]); err != nil {
			t.Fatal(err)
		}
		if _, err := db.Exec(`INSERT INTO staff_attendance(user_id,branch_id,work_date,check_in_at) VALUES($1,$2,'2099-11-03','2099-11-03T09:00:00+07:00')`, 7+i, branch); err != nil {
			t.Fatal(err)
		}
	}
	r := New(db, nil)
	cookie := &http.Cookie{Name: "sbc_attendance_session", Value: testTokenWithBranch(t, "cashier", branch)}
	list := requestJSONWithCookie(r, http.MethodGet, "/api/v1/attendance/leave-requests/mine", "", cookie)
	if list.Code != 200 || !strings.Contains(list.Body.String(), "private-reason-0") || strings.Contains(list.Body.String(), "private-reason-1") {
		t.Fatalf("request list: %d %s", list.Code, list.Body.String())
	}
	history := requestJSONWithCookie(r, http.MethodGet, "/api/v1/attendance/history", "", cookie)
	if history.Code != 200 || strings.Count(history.Body.String(), `"date":`) != 1 {
		t.Fatalf("history: %d %s", history.Code, history.Body.String())
	}
	for _, tc := range []struct {
		name, path string
		want       int
	}{
		{"own attachment", fmt.Sprintf("/api/v1/attendance/leave-requests/%d/attachments/%d", leaveIDs[0], attachmentIDs[0]), 200},
		{"another employee attachment", fmt.Sprintf("/api/v1/attendance/leave-requests/%d/attachments/%d", leaveIDs[1], attachmentIDs[1]), 404},
		{"attachment from wrong request", fmt.Sprintf("/api/v1/attendance/leave-requests/%d/attachments/%d", leaveIDs[0], attachmentIDs[1]), 404},
		{"invalid attachment id", "/api/v1/attendance/leave-requests/bad/attachments/bad", 400},
		{"own PDF", fmt.Sprintf("/api/v1/attendance/leave-requests/%d/pdf", leaveIDs[0]), 200},
		{"other employee PDF", fmt.Sprintf("/api/v1/attendance/leave-requests/%d/pdf", leaveIDs[1]), 404},
		{"invalid PDF id", "/api/v1/attendance/leave-requests/bad/pdf", 400},
	} {
		t.Run(tc.name, func(t *testing.T) {
			res := requestJSONWithCookie(r, http.MethodGet, tc.path, "", cookie)
			if res.Code != tc.want {
				t.Fatalf("got %d want %d: %s", res.Code, tc.want, res.Body.String())
			}
			if tc.want == 200 && (!strings.HasPrefix(res.Header().Get("Content-Type"), "application/pdf") || !bytes.HasPrefix(res.Body.Bytes(), []byte("%PDF"))) {
				t.Fatal("expected actual PDF bytes")
			}
		})
	}
}

func TestAuditFreshLotReceiptDiscardAndBranchIsolation(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL required")
	}
	db := openRouterTestDB(t, url)
	branch := seedBranch(t, db, "AUDIT-FRESH")
	other := seedBranch(t, db, "AUDIT-FRESH-OTHER")
	seedUser(t, db, 7, "fresh-manager", "branch_manager", branch, nil)
	item := seedInventory(t, db, branch, "Audit fresh milk", 0)
	foreign := seedInventory(t, db, other, "Other fresh milk", 0)
	if _, err := db.Exec(`UPDATE inventory_items SET category='fresh' WHERE id IN ($1,$2)`, item, foreign); err != nil {
		t.Fatal(err)
	}
	r := New(db, nil)
	token := testTokenWithBranch(t, "branch_manager", branch)
	body := `{"lotNumber":"AUDIT-LOT","manufacturedAt":"2099-11-01","receivedAt":"2099-11-02","expiryDate":"2099-11-30","quantity":10,"unitCost":2}`
	foreignResult := requestJSON(r, "POST", fmt.Sprintf("/api/v1/inventory/%d/fresh-lots?branchId=%d", foreign, other), body, token)
	if foreignResult.Code != 404 {
		t.Fatalf("foreign receipt accepted: %d %s", foreignResult.Code, foreignResult.Body.String())
	}
	res := requestJSON(r, "POST", fmt.Sprintf("/api/v1/inventory/%d/fresh-lots", item), body, token)
	if res.Code != 201 {
		t.Fatalf("receipt %d %s", res.Code, res.Body.String())
	}
	lot := responseID(t, res)
	assertInventoryQuantity(t, db, item, 10)
	list := requestJSON(r, "GET", fmt.Sprintf("/api/v1/inventory/%d/fresh-lots", item), "", token)
	if list.Code != 200 || !strings.Contains(list.Body.String(), "AUDIT-LOT") {
		t.Fatalf("lot read: %d %s", list.Code, list.Body.String())
	}
	for _, tc := range []struct {
		name, body string
		want       int
	}{
		{"reject overdraw", `{"quantity":11}`, 400},
		{"partial discard", `{"quantity":4.5,"note":"เสียหาย"}`, 200},
		{"discard remaining", `{"quantity":5.5,"note":"เสียหาย"}`, 200},
		{"reject repeat discard", `{"quantity":1}`, 400},
	} {
		res := requestJSON(r, "POST", fmt.Sprintf("/api/v1/fresh-inventory-lots/%d/discard", lot), tc.body, token)
		if res.Code != tc.want {
			t.Fatalf("%s: discard %d want %d: %s", tc.name, res.Code, tc.want, res.Body.String())
		}
	}
	assertInventoryQuantity(t, db, item, 0)
	assertInventoryQuantity(t, db, foreign, 0)
	var remaining float64
	var status string
	var movements int
	if err := db.QueryRow(`SELECT quantity_remaining,status FROM fresh_inventory_lots WHERE id=$1`, lot).Scan(&remaining, &status); err != nil || remaining != 0 || status != "discarded" {
		t.Fatalf("lot balance %v %s %v", remaining, status, err)
	}
	if err := db.QueryRow(`SELECT COUNT(*) FROM fresh_inventory_lot_movements WHERE lot_id=$1`, lot).Scan(&movements); err != nil || movements != 3 {
		t.Fatalf("movement audit %d %v", movements, err)
	}
}

func TestAuditCentralCatalogCRUDProtectsRecipeDependencies(t *testing.T) {
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL required")
	}
	db := openRouterTestDB(t, url)
	branch := seedBranch(t, db, "AUDIT-CENTRAL")
	seedUser(t, db, 7, "central-admin", "admin", branch, nil)
	var template int64
	if err := db.QueryRow(`SELECT id FROM catalog_templates WHERE active ORDER BY id LIMIT 1`).Scan(&template); err != nil {
		t.Fatal(err)
	}
	r := New(db, nil)
	token := testToken(t, "admin")
	base := fmt.Sprintf("/api/v1/catalog-templates/%d", template)
	fixture := time.Now().UnixNano()
	res := requestJSON(r, "POST", base+"/inventory", fmt.Sprintf(`{"name":"Audit beans %d","category":"coffee","kind":"ingredient","unit":"กรัม","unitCost":2,"availableSizes":["S","M"]}`, fixture), token)
	if res.Code != 201 {
		t.Fatalf("inventory create %d %s", res.Code, res.Body.String())
	}
	item := responseID(t, res)
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM catalog_template_inventory_items WHERE template_id=$1 AND catalog_item_id=$2`, template, item)
		_, _ = db.Exec(`DELETE FROM inventory_catalog_items WHERE id=$1`, item)
	})
	res = requestJSON(r, "POST", base+"/menu-items", fmt.Sprintf(`{"name":"Audit espresso %d","category":"coffee","storePrice":80,"linemanPrice":90,"status":"available","availableSizes":["S","M"]}`, fixture), token)
	if res.Code != 201 {
		t.Fatalf("menu create %d %s", res.Code, res.Body.String())
	}
	menu := responseID(t, res)
	t.Cleanup(func() {
		_, _ = db.Exec(`DELETE FROM catalog_template_menu_ingredients WHERE template_menu_item_id=$1`, menu)
		_, _ = db.Exec(`DELETE FROM catalog_template_menu_items WHERE id=$1`, menu)
	})
	if _, err := db.Exec(`INSERT INTO catalog_template_menu_ingredients(template_menu_item_id,catalog_item_id,quantity,unit,cost_amount,channel) VALUES($1,$2,18,'กรัม',36,'storefront')`, menu, item); err != nil {
		t.Fatal(err)
	}
	res = requestJSON(r, "DELETE", fmt.Sprintf("%s/inventory/%d", base, item), "", token)
	if res.Code != 409 {
		t.Fatalf("recipe dependency bypassed: %d %s", res.Code, res.Body.String())
	}
	res = requestJSON(r, "GET", base, "", token)
	if res.Code != 200 || !strings.Contains(res.Body.String(), "Audit espresso") || !strings.Contains(res.Body.String(), "Audit beans") {
		t.Fatalf("read catalog %d %s", res.Code, res.Body.String())
	}
	res = requestJSON(r, "PATCH", fmt.Sprintf("%s/menu-items/%d", base, menu), `{"storePrice":85}`, token)
	if res.Code != 200 {
		t.Fatalf("update menu %d %s", res.Code, res.Body.String())
	}
	var price float64
	if err := db.QueryRow(`SELECT store_price FROM catalog_template_menu_items WHERE id=$1`, menu).Scan(&price); err != nil || price != 85 {
		t.Fatalf("price %v %v", price, err)
	}
	res = requestJSON(r, "DELETE", fmt.Sprintf("%s/menu-items/%d", base, menu), "", token)
	if res.Code != 200 {
		t.Fatalf("retire menu %d %s", res.Code, res.Body.String())
	}
	res = requestJSON(r, "DELETE", fmt.Sprintf("%s/inventory/%d", base, item), "", token)
	if res.Code != 200 {
		t.Fatalf("retire unused inventory %d %s", res.Code, res.Body.String())
	}
	var active bool
	if err := db.QueryRow(`SELECT active FROM catalog_template_inventory_items WHERE template_id=$1 AND catalog_item_id=$2`, template, item).Scan(&active); err != nil || active {
		t.Fatalf("soft retirement %v %v", active, err)
	}
	res = requestJSON(r, "DELETE", fmt.Sprintf("%s/inventory/%d", base, item), "", token)
	if res.Code != 404 {
		t.Fatalf("repeated retirement %d", res.Code)
	}
}
