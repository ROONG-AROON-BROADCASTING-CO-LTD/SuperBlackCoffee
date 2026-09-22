package database

import (
	"context"
	"crypto/sha256"
	"database/sql"
	"embed"
	"fmt"
	"sort"
	"strings"

	_ "github.com/jackc/pgx/v5/stdlib"
)

//go:embed migrations/*.sql
var migrationFiles embed.FS

func Open(ctx context.Context, url string) (*sql.DB, error) {
	return open(ctx, url, true)
}

// OpenWithoutMigrations connects to an existing schema without changing it.
// This is intended for local diagnostics where database writes are prohibited.
func OpenWithoutMigrations(ctx context.Context, url string) (*sql.DB, error) {
	return open(ctx, url, false)
}

func open(ctx context.Context, url string, runMigrations bool) (*sql.DB, error) {
	if strings.TrimSpace(url) == "" {
		return nil, fmt.Errorf("ไม่ได้กำหนดค่า DATABASE_URL")
	}
	db, err := sql.Open("pgx", url)
	if err != nil {
		return nil, fmt.Errorf("เปิดการเชื่อมต่อฐานข้อมูลไม่สำเร็จ: %w", err)
	}
	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, fmt.Errorf("ตรวจสอบการเชื่อมต่อฐานข้อมูลไม่สำเร็จ: %w", err)
	}
	if runMigrations {
		if err := migrate(ctx, db); err != nil {
			db.Close()
			return nil, err
		}
	}
	return db, nil
}

func migrate(ctx context.Context, db *sql.DB) error {
	if _, err := db.ExecContext(ctx, `CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, checksum TEXT NOT NULL DEFAULT '', applied_at TIMESTAMPTZ NOT NULL DEFAULT now())`); err != nil {
		return fmt.Errorf("สร้างตารางบันทึก migration ไม่สำเร็จ: %w", err)
	}
	if _, err := db.ExecContext(ctx, `ALTER TABLE schema_migrations ADD COLUMN IF NOT EXISTS checksum TEXT NOT NULL DEFAULT ''`); err != nil {
		return fmt.Errorf("เพิ่ม checksum ให้ตาราง migration ไม่สำเร็จ: %w", err)
	}
	entries, err := migrationFiles.ReadDir("migrations")
	if err != nil {
		return err
	}
	sort.Slice(entries, func(i, j int) bool { return entries[i].Name() < entries[j].Name() })
	for _, entry := range entries {
		if entry.IsDir() || !strings.HasSuffix(entry.Name(), ".sql") {
			continue
		}
		contents, readErr := migrationFiles.ReadFile("migrations/" + entry.Name())
		if readErr != nil {
			return readErr
		}
		checksum := fmt.Sprintf("%x", sha256.Sum256(contents))
		var storedChecksum string
		err := db.QueryRowContext(ctx, `SELECT checksum FROM schema_migrations WHERE name=$1`, entry.Name()).Scan(&storedChecksum)
		if err != nil && err != sql.ErrNoRows {
			return fmt.Errorf("ตรวจสอบ migration %s ไม่สำเร็จ: %w", entry.Name(), err)
		}
		if err == nil {
			if storedChecksum != "" && storedChecksum != checksum {
				return fmt.Errorf("ตรวจพบ migration %s ถูกแก้ไขหลังใช้งานแล้ว", entry.Name())
			}
			if storedChecksum == "" {
				if _, err := db.ExecContext(ctx, `UPDATE schema_migrations SET checksum=$1 WHERE name=$2`, checksum, entry.Name()); err != nil {
					return fmt.Errorf("อัปเดต checksum migration %s ไม่สำเร็จ: %w", entry.Name(), err)
				}
			}
			continue
		}
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			return fmt.Errorf("เริ่ม migration %s ไม่สำเร็จ: %w", entry.Name(), err)
		}
		if _, execErr := tx.ExecContext(ctx, string(contents)); execErr != nil {
			_ = tx.Rollback()
			return fmt.Errorf("ใช้งาน migration %s ไม่สำเร็จ: %w", entry.Name(), execErr)
		}
		if _, err := tx.ExecContext(ctx, `INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)`, entry.Name(), checksum); err != nil {
			_ = tx.Rollback()
			return fmt.Errorf("บันทึก migration %s ไม่สำเร็จ: %w", entry.Name(), err)
		}
		if err := tx.Commit(); err != nil {
			return fmt.Errorf("ยืนยัน migration %s ไม่สำเร็จ: %w", entry.Name(), err)
		}
	}
	return nil
}
