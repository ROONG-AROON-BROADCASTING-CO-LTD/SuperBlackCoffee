// Command migrate-r2-images moves legacy image data URLs from PostgreSQL to
// Cloudflare R2. It is dry-run by default; pass --apply only after reviewing
// the printed count.
package main

import (
	"context"
	"database/sql"
	"flag"
	"fmt"
	"log/slog"
	"os"

	"y/internal/database"
	"y/internal/media"
)

type target struct {
	name        string
	selectQuery string
	updateQuery string
}

func main() {
	apply := flag.Bool("apply", false, "upload images and update database records")
	flag.Parse()
	ctx := context.Background()
	db, err := database.Open(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		slog.Error("เชื่อมฐานข้อมูลไม่สำเร็จ", "ข้อผิดพลาด", err)
		os.Exit(1)
	}
	defer db.Close()
	store, err := media.NewR2ImageStoreFromEnv(ctx)
	if err != nil {
		slog.Error("R2 ยังตั้งค่าไม่ครบ", "ข้อผิดพลาด", err)
		os.Exit(1)
	}
	targets := []target{
		{"catalog_template_menu_items", `SELECT id,image_url FROM catalog_template_menu_items WHERE image_url LIKE 'data:image/%'`, `UPDATE catalog_template_menu_items SET image_url=$2,updated_at=now() WHERE id=$1`},
		{"inventory_catalog_items", `SELECT id,image_url FROM inventory_catalog_items WHERE image_url LIKE 'data:image/%'`, `UPDATE inventory_catalog_items SET image_url=$2,updated_at=now() WHERE id=$1`},
		{"menu_items", `SELECT id,image_url FROM menu_items WHERE image_url LIKE 'data:image/%'`, `UPDATE menu_items SET image_url=$2,updated_at=now() WHERE id=$1`},
		{"inventory_items", `SELECT id,image_url FROM inventory_items WHERE image_url LIKE 'data:image/%'`, `UPDATE inventory_items SET image_url=$2,updated_at=now() WHERE id=$1`},
	}
	var total int
	for _, item := range targets {
		count, err := migrateTarget(ctx, db, store, item, *apply)
		if err != nil {
			slog.Error("ย้ายรูปไม่สำเร็จ", "table", item.name, "ข้อผิดพลาด", err)
			os.Exit(1)
		}
		total += count
	}
	mode := "dry-run"
	if *apply {
		mode = "applied"
	}
	slog.Info("สรุปการย้ายรูป", "mode", mode, "images", total)
}

func migrateTarget(ctx context.Context, db *sql.DB, store media.ImageStore, item target, apply bool) (int, error) {
	rows, err := db.QueryContext(ctx, item.selectQuery)
	if err != nil {
		return 0, err
	}
	defer rows.Close()
	count := 0
	for rows.Next() {
		var id int64
		var imageDataURL string
		if err := rows.Scan(&id, &imageDataURL); err != nil {
			return count, err
		}
		content, contentType, err := media.DecodeImageDataURL(imageDataURL)
		if err != nil {
			return count, fmt.Errorf("record %d: %w", id, err)
		}
		count++
		if !apply {
			continue
		}
		imageURL, err := store.PutCatalogImage(ctx, content, contentType)
		if err != nil {
			return count, fmt.Errorf("record %d: %w", id, err)
		}
		if _, err := db.ExecContext(ctx, item.updateQuery, id, imageURL); err != nil {
			return count, fmt.Errorf("record %d: %w", id, err)
		}
	}
	return count, rows.Err()
}
