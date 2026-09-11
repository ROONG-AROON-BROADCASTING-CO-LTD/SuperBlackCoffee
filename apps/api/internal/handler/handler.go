package handler

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"y/internal/cache"
	"y/internal/middleware"
	"y/internal/service"
)

type PlatformHandler struct {
	db        *sql.DB
	jwtSecret string
	cache     *cache.Client
	inventory *service.InventoryService
	auth      *service.AuthService
	menu      *service.MenuService
}

func (h *PlatformHandler) recordAudit(c *gin.Context, branchID int64, entityType string, entityID int64, action string, metadata any) {
	claims := middleware.ClaimsFrom(c)
	if claims == nil || h.db == nil {
		return
	}
	payload, err := json.Marshal(metadata)
	if err != nil {
		return
	}
	_, err = h.db.ExecContext(c.Request.Context(), `INSERT INTO audit_events(branch_id,actor_id,entity_type,entity_id,action,metadata) VALUES($1,$2,$3,$4,$5,$6)`, branchID, claims.UserID, entityType, entityID, action, payload)
	if err != nil {
		// Auditing must not turn a successfully committed store operation into a failure.
		return
	}
}

func recordAuditTx(c *gin.Context, tx *sql.Tx, branchID, actorID int64, entityType string, entityID int64, action string, metadata any) error {
	payload, err := json.Marshal(metadata)
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(c.Request.Context(), `INSERT INTO audit_events(branch_id,actor_id,entity_type,entity_id,action,metadata) VALUES($1,$2,$3,$4,$5,$6)`, branchID, actorID, entityType, entityID, action, payload)
	return err
}

func NewPlatformHandler(db *sql.DB, redisCache *cache.Client, inventoryService *service.InventoryService, authService *service.AuthService, menuService *service.MenuService) *PlatformHandler {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "development-only-change-me"
	}
	return &PlatformHandler{db: db, jwtSecret: secret, cache: redisCache, inventory: inventoryService, auth: authService, menu: menuService}
}

func (h *PlatformHandler) invalidateBranchCache(c *gin.Context, branchID int64) {
	if h.cache == nil {
		return
	}
	h.cache.Delete(c,
		fmt.Sprintf("sbc:inventory:%d", branchID),
		fmt.Sprintf("sbc:inventory:%d:ingredient", branchID),
		fmt.Sprintf("sbc:inventory:%d:stock", branchID),
		fmt.Sprintf("sbc:menu:%d", branchID),
		fmt.Sprintf("sbc:dashboard:%d", branchID),
		"sbc:dashboard:all",
	)
	h.cache.DeletePattern(c, fmt.Sprintf("sbc:inventory:%d:*", branchID))
	h.cache.DeletePattern(c, fmt.Sprintf("sbc:menu:%d:*", branchID))
	h.cache.DeletePattern(c, fmt.Sprintf("sbc:report:daily:*:%d", branchID))
	h.cache.DeletePattern(c, "sbc:report:daily:*:all")
}
func (h *PlatformHandler) unavailable(c *gin.Context) bool {
	if h.db == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"success": false, "message": "ยังไม่ได้ตั้งค่าฐานข้อมูล"})
		return true
	}
	return false
}
