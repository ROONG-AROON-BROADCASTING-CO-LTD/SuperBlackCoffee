// Command sync-catalog-images copies R2 image URLs from the central menu
// catalog to linked branch menus. It is dry-run by default.
package main

import (
	"context"
	"flag"
	"fmt"
	"log/slog"
	"os"

	"y/internal/database"
)

const countQuery = `
	SELECT count(*)
	FROM menu_items branch_menu
	JOIN branch_catalog_template_assignments assignment
	  ON assignment.branch_id=branch_menu.branch_id
	JOIN catalog_template_menu_items template_menu
	  ON template_menu.id=branch_menu.catalog_template_menu_item_id
	 AND template_menu.template_id=assignment.template_id
	WHERE branch_menu.template_enabled
	  AND template_menu.image_url <> ''
	  AND branch_menu.image_url IS DISTINCT FROM template_menu.image_url
	  AND NOT EXISTS (
		SELECT 1 FROM branch_catalog_template_exceptions exception
		WHERE exception.branch_id=branch_menu.branch_id
		  AND exception.entity_type='menu'
		  AND exception.source_key=template_menu.id
	  )`

const updateQuery = `
	UPDATE menu_items branch_menu
	SET image_url=template_menu.image_url,updated_at=now()
	FROM branch_catalog_template_assignments assignment
	JOIN catalog_template_menu_items template_menu
	  ON template_menu.template_id=assignment.template_id
	WHERE assignment.branch_id=branch_menu.branch_id
	  AND branch_menu.catalog_template_menu_item_id=template_menu.id
	  AND branch_menu.template_enabled
	  AND template_menu.image_url <> ''
	  AND branch_menu.image_url IS DISTINCT FROM template_menu.image_url
	  AND NOT EXISTS (
		SELECT 1 FROM branch_catalog_template_exceptions exception
		WHERE exception.branch_id=branch_menu.branch_id
		  AND exception.entity_type='menu'
		  AND exception.source_key=template_menu.id
	  )`

func main() {
	apply := flag.Bool("apply", false, "update linked branch menu image URLs")
	flag.Parse()
	ctx := context.Background()
	db, err := database.Open(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		slog.Error("เชื่อมฐานข้อมูลไม่สำเร็จ", "ข้อผิดพลาด", err)
		os.Exit(1)
	}
	defer db.Close()

	var pending int
	if err := db.QueryRowContext(ctx, countQuery).Scan(&pending); err != nil {
		slog.Error("ตรวจรายการรูปเมนูที่ต้องซิงก์ไม่สำเร็จ", "ข้อผิดพลาด", err)
		os.Exit(1)
	}
	mode := "dry-run"
	updated := 0
	if *apply && pending > 0 {
		result, err := db.ExecContext(ctx, updateQuery)
		if err != nil {
			slog.Error("ซิงก์รูปเมนูไปยังสาขาไม่สำเร็จ", "ข้อผิดพลาด", err)
			os.Exit(1)
		}
		updated64, err := result.RowsAffected()
		if err != nil {
			slog.Error("อ่านจำนวนรายการที่ซิงก์ไม่สำเร็จ", "ข้อผิดพลาด", err)
			os.Exit(1)
		}
		updated = int(updated64)
		mode = "applied"
	}
	fmt.Printf("mode=%s pending=%d updated=%d\n", mode, pending, updated)
}
