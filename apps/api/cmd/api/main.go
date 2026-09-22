package main

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
	"y/internal/cache"
	"y/internal/config"
	"y/internal/database"
	"y/internal/router"
)

func main() {
	if err := config.ValidateRuntime(); err != nil {
		slog.Error("การตั้งค่าสำหรับการทำงานไม่ถูกต้อง", "ข้อผิดพลาด", err)
		os.Exit(1)
	}
	port := os.Getenv("API_PORT")
	if port == "" {
		port = "8080"
	}
	openDatabase := database.Open
	if os.Getenv("APP_ENV") != "production" && os.Getenv("API_SKIP_MIGRATIONS") == "1" {
		openDatabase = database.OpenWithoutMigrations
	}
	db, err := openDatabase(context.Background(), os.Getenv("DATABASE_URL"))
	if err != nil {
		slog.Error("เริ่มต้นฐานข้อมูลไม่สำเร็จ", "ข้อผิดพลาด", err)
		os.Exit(1)
	}
	if db != nil {
		defer db.Close()
	}
	redisCache, redisErr := cache.New(context.Background(), os.Getenv("REDIS_URL"))
	if redisErr != nil {
		slog.Warn("ไม่สามารถใช้ Redis ได้ ระบบจะทำงานโดยไม่ใช้แคช", "ข้อผิดพลาด", redisErr)
	}
	if redisCache != nil {
		defer redisCache.Close()
	}
	r := router.New(db, redisCache)
	server := &http.Server{Addr: ":" + port, Handler: r}
	go func() {
		slog.Info("API เริ่มรับคำขอแล้ว", "พอร์ต", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			slog.Error("เซิร์ฟเวอร์ทำงานผิดพลาด", "ข้อผิดพลาด", err)
			os.Exit(1)
		}
	}()
	signals := make(chan os.Signal, 1)
	signal.Notify(signals, syscall.SIGINT, syscall.SIGTERM)
	<-signals
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	_ = server.Shutdown(ctx)
}
