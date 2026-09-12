package repository

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"testing"
	"time"

	"y/internal/database"
	"y/internal/model"
)

func openRepositoryTestDB(t *testing.T) *sql.DB {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("กำหนด TEST_DATABASE_URL เพื่อทดสอบ PostgreSQL integration")
	}
	db, err := database.Open(context.Background(), url)
	if err != nil {
		t.Fatalf("เปิดฐานข้อมูลทดสอบ: %v", err)
	}
	t.Cleanup(func() { _ = db.Close() })
	if _, err := db.Exec(`TRUNCATE TABLE users, menu_item_ingredients, menu_items, inventory_items, branches, franchisees RESTART IDENTITY CASCADE`); err != nil {
		t.Fatalf("ล้างฐานข้อมูลทดสอบ: %v", err)
	}
	return db
}

func seedTestBranch(t *testing.T, db *sql.DB) int64 {
	t.Helper()
	var id int64
	if err := db.QueryRow(`INSERT INTO branches(name,code) VALUES('สาขาทดสอบ','TEST-001') RETURNING id`).Scan(&id); err != nil {
		t.Fatalf("สร้างสาขาทดสอบ: %v", err)
	}
	return id
}

func TestPostgresAuthRepositoryFindsUsernameCaseInsensitively(t *testing.T) {
	db := openRepositoryTestDB(t)
	if _, err := db.Exec(`INSERT INTO users(name,username,email,password_hash,role) VALUES('ผู้ดูแล','Admin','admin@example.com','hash','admin')`); err != nil {
		t.Fatalf("สร้างผู้ใช้ทดสอบ: %v", err)
	}
	user, err := NewPostgresAuthRepository(db).FindByUsername(context.Background(), "admin")
	if err != nil || user.Username != "Admin" || user.Role != "admin" {
		t.Fatalf("user = %#v, err = %v", user, err)
	}
	_, err = NewPostgresAuthRepository(db).FindByUsername(context.Background(), "missing")
	if !errors.Is(err, sql.ErrNoRows) {
		t.Fatalf("error = %v, want sql.ErrNoRows", err)
	}
}

func TestPostgresInventoryRepositoryCRUDAndStatus(t *testing.T) {
	db := openRepositoryTestDB(t)
	branchID := seedTestBranch(t, db)
	repo := NewPostgresInventoryRepository(db)
	id, err := repo.Create(context.Background(), branchID, model.InventoryItem{Name: "นม", Category: "dairy", Kind: model.InventoryKindIngredient, Quantity: 2, Unit: "ลิตร", ReorderLevel: 2, UnitCost: 45})
	if err != nil || id < 1 {
		t.Fatalf("create id = %d, err = %v", id, err)
	}
	items, err := repo.List(context.Background(), branchID, "ingredient")
	if err != nil || len(items) != 1 || items[0].Status != "low" {
		t.Fatalf("items = %#v, err = %v", items, err)
	}
	updated, err := repo.Update(context.Background(), branchID, id, model.InventoryItem{Name: "นม", Category: "dairy", Kind: model.InventoryKindIngredient, Quantity: 0, Unit: "ลิตร", ReorderLevel: 2, UnitCost: 50})
	if err != nil || !updated {
		t.Fatalf("updated = %t, err = %v", updated, err)
	}
	items, err = repo.List(context.Background(), branchID, "")
	if err != nil || items[0].Status != "out" || items[0].UnitCost != 50 {
		t.Fatalf("items = %#v, err = %v", items, err)
	}
	deleted, err := repo.Delete(context.Background(), branchID, id)
	if err != nil || !deleted {
		t.Fatalf("deleted = %t, err = %v", deleted, err)
	}
	stockID, err := repo.Create(context.Background(), branchID, model.InventoryItem{Name: "กล่องพัสดุ", Category: "box", StockCategory: "postal_equipment", Kind: model.InventoryKindStock, Quantity: 2, Unit: "ใบ", ReorderLevel: 1, UnitCost: 10})
	if err != nil || stockID < 1 {
		t.Fatalf("create postal stock id = %d, err = %v", stockID, err)
	}
	items, err = repo.List(context.Background(), branchID, "stock")
	if err != nil || len(items) != 1 || items[0].StockCategory != "postal_equipment" {
		t.Fatalf("postal stock = %#v, err = %v", items, err)
	}
}

func TestPostgresInventoryRepositoryReturnsExpiryWarnings(t *testing.T) {
	db := openRepositoryTestDB(t)
	branchID := seedTestBranch(t, db)
	repo := NewPostgresInventoryRepository(db)
	expiringSoon := time.Now().UTC().AddDate(0, 0, 3)
	expired := time.Now().UTC().AddDate(0, 0, -1)
	if _, err := repo.Create(context.Background(), branchID, model.InventoryItem{Name: "นมใกล้หมดอายุ", Category: "dairy", Kind: model.InventoryKindIngredient, Quantity: 4, Unit: "ลิตร", UnitCost: 45, ExpiryDate: &expiringSoon}); err != nil {
		t.Fatalf("create expiring inventory: %v", err)
	}
	if _, err := repo.Create(context.Background(), branchID, model.InventoryItem{Name: "นมหมดอายุ", Category: "dairy", Kind: model.InventoryKindIngredient, Quantity: 4, Unit: "ลิตร", UnitCost: 45, ExpiryDate: &expired}); err != nil {
		t.Fatalf("create expired inventory: %v", err)
	}
	items, err := repo.List(context.Background(), branchID, "ingredient")
	if err != nil || len(items) != 2 {
		t.Fatalf("list = %#v, err = %v", items, err)
	}
	statuses := map[string]string{}
	for _, item := range items {
		if item.ExpiryDate == nil {
			t.Fatalf("expiry date missing for %#v", item)
		}
		statuses[item.Name] = item.ExpiryStatus
	}
	if statuses["นมใกล้หมดอายุ"] != "expiring_soon" || statuses["นมหมดอายุ"] != "expired" {
		t.Fatalf("expiry statuses = %#v", statuses)
	}
}

func TestPostgresInventoryRepositorySharesCatalogueButKeepsBranchStockSeparate(t *testing.T) {
	db := openRepositoryTestDB(t)
	firstBranchID := seedTestBranch(t, db)
	var secondBranchID int64
	if err := db.QueryRow(`INSERT INTO branches(name,code) VALUES('สาขาทดสอบสอง','TEST-002') RETURNING id`).Scan(&secondBranchID); err != nil {
		t.Fatalf("สร้างสาขาที่สอง: %v", err)
	}
	repo := NewPostgresInventoryRepository(db)
	if _, err := repo.Create(context.Background(), firstBranchID, model.InventoryItem{Name: "นมกลาง", Category: "dairy", Kind: model.InventoryKindIngredient, Quantity: 2, Unit: "ลิตร", ReorderLevel: 1, UnitCost: 45}); err != nil {
		t.Fatalf("สร้างวัตถุดิบสาขาแรก: %v", err)
	}
	if _, err := repo.Create(context.Background(), secondBranchID, model.InventoryItem{Name: "นมกลาง", Category: "milk", Kind: model.InventoryKindIngredient, Quantity: 9, Unit: "ขวด", ReorderLevel: 3, UnitCost: 55}); err != nil {
		t.Fatalf("สร้างวัตถุดิบสาขาที่สอง: %v", err)
	}
	firstItems, err := repo.List(context.Background(), firstBranchID, "ingredient")
	if err != nil || len(firstItems) != 1 {
		t.Fatalf("รายการสาขาแรก = %#v, err = %v", firstItems, err)
	}
	if firstItems[0].Category != "milk" || firstItems[0].Unit != "ขวด" || firstItems[0].UnitCost != 55 {
		t.Fatalf("ข้อมูลกลางของสาขาแรก = %#v", firstItems[0])
	}
	if firstItems[0].Quantity != 2 || firstItems[0].ReorderLevel != 1 {
		t.Fatalf("ยอดสต๊อกสาขาแรกต้องไม่ถูกเขียนทับ: %#v", firstItems[0])
	}
}

func TestPostgresMenuRepositoryReturnsIngredients(t *testing.T) {
	db := openRepositoryTestDB(t)
	branchID := seedTestBranch(t, db)
	var inventoryID, menuID int64
	if err := db.QueryRow(`INSERT INTO inventory_items(branch_id,name,category,kind,quantity,unit,reorder_level,unit_cost) VALUES($1,'เมล็ดกาแฟ','coffee','ingredient',10,'กรัม',2,1.5) RETURNING id`, branchID).Scan(&inventoryID); err != nil {
		t.Fatalf("สร้างวัตถุดิบ: %v", err)
	}
	if err := db.QueryRow(`INSERT INTO menu_items(branch_id,name,category,store_price,lineman_price,cost_price,status) VALUES($1,'อเมริกาโน่','coffee',60,70,18,'available') RETURNING id`, branchID).Scan(&menuID); err != nil {
		t.Fatalf("สร้างเมนู: %v", err)
	}
	if _, err := db.Exec(`INSERT INTO menu_item_ingredients(menu_item_id,inventory_item_id,quantity,unit,cost_amount) VALUES($1,$2,12,'กรัม',18)`, menuID, inventoryID); err != nil {
		t.Fatalf("สร้างสูตรเมนู: %v", err)
	}
	items, err := NewPostgresMenuRepository(db).List(context.Background(), branchID)
	if err != nil || len(items) != 1 || len(items[0].Ingredients) != 1 {
		t.Fatalf("items = %#v, err = %v", items, err)
	}
	if items[0].Ingredients[0].Name != "เมล็ดกาแฟ" || items[0].Ingredients[0].Quantity != 12 {
		t.Fatalf("ingredients = %#v", items[0].Ingredients)
	}
}
