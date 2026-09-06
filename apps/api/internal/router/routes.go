package router

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"y/internal/handler"
	"y/internal/middleware"
)

type routeDependencies struct {
	users    *handler.UserHandler
	platform *handler.PlatformHandler
	secret   string
}

func registerPublicRoutes(r *gin.Engine, deps routeDependencies) {
	r.GET("/health", health)
	v1 := r.Group("/api/v1")
	v1.GET("/status", health)
	v1.POST("/website/leads", deps.platform.CreateWebsiteLead)
	v1.POST("/auth/login", deps.platform.Login)
	v1.POST("/attendance/login", deps.platform.AttendanceLogin)
	v1.POST("/attendance/setup-pin", deps.platform.SetupAttendancePIN)
}

func registerProtectedRoutes(r *gin.Engine, deps routeDependencies) {
	protected := r.Group("/api/v1")
	protected.Use(middleware.RequireAuth(deps.secret))
	protected.GET("/dashboard", deps.platform.Dashboard)
	protected.GET("/attendance/today", deps.platform.AttendanceToday)
	protected.GET("/attendance/history", deps.platform.AttendanceHistory)
	protected.POST("/attendance/check-in", deps.platform.CheckIn)
	protected.POST("/attendance/check-out", deps.platform.CheckOut)
	protected.POST("/attendance/leave-requests", deps.platform.CreateLeaveRequest)
	protected.GET("/attendance/management", middleware.RequireAuth(deps.secret, "admin", "franchise_owner"), deps.platform.ListAttendanceManagement)
	protected.GET("/attendance/leave-requests", middleware.RequireAuth(deps.secret, "admin", "franchise_owner"), deps.platform.ListLeaveRequests)
	protected.PATCH("/attendance/leave-requests/:id", middleware.RequireAuth(deps.secret, "admin", "franchise_owner"), deps.platform.UpdateLeaveRequestStatus)
	protected.GET("/metrics", middleware.RequireAuth(deps.secret, "admin"), middleware.Metrics)
	protected.GET("/branches", deps.platform.ListBranches)
	protected.GET("/users", middleware.RequireAuth(deps.secret, "admin", "franchise_owner"), deps.platform.ListStaffUsers)
	protected.GET("/branches/sales", middleware.RequireAuth(deps.secret, "admin"), deps.platform.BranchSales)
	protected.GET("/staff-schedules", middleware.RequireAuth(deps.secret, "admin", "franchise_owner"), deps.platform.ListStaffSchedules)
	protected.GET("/public-holidays", middleware.RequireAuth(deps.secret, "admin", "franchise_owner"), deps.platform.ListPublicHolidays)
	protected.POST("/users", middleware.RequireAuth(deps.secret, "admin", "franchise_owner"), deps.platform.CreateStaffMember)
	protected.PATCH("/users/:id", middleware.RequireAuth(deps.secret, "admin", "franchise_owner"), deps.platform.UpdateStaffMember)
	protected.DELETE("/users/:id", middleware.RequireAuth(deps.secret, "admin", "franchise_owner"), deps.platform.DeleteStaffMember)
	protected.POST("/staff-schedules/generate", middleware.RequireAuth(deps.secret, "admin", "franchise_owner"), deps.platform.GenerateStaffSchedules)
	protected.PATCH("/staff-schedules/:id", middleware.RequireAuth(deps.secret, "admin", "franchise_owner"), deps.platform.UpdateStaffShift)
	protected.POST("/staff-schedules/:id/replace", middleware.RequireAuth(deps.secret, "admin", "franchise_owner"), deps.platform.ReplaceStaffShift)
	protected.GET("/inventory", deps.platform.ListInventory)
	protected.GET("/menu-items", deps.platform.ListMenuItems)
	protected.POST("/menu-items", middleware.RequireAuth(deps.secret, "admin", "franchise_owner", "branch_manager"), deps.platform.CreateMenuItem)
	protected.PATCH("/menu-items/:id", middleware.RequireAuth(deps.secret, "admin", "franchise_owner", "branch_manager"), deps.platform.UpdateMenuItem)
	protected.DELETE("/menu-items/:id", middleware.RequireAuth(deps.secret, "admin", "franchise_owner", "branch_manager"), deps.platform.DeleteMenuItem)
	protected.POST("/inventory", middleware.RequireAuth(deps.secret, "admin", "franchise_owner", "branch_manager"), deps.platform.CreateInventory)
	protected.PATCH("/inventory/:id", middleware.RequireAuth(deps.secret, "admin", "franchise_owner", "branch_manager"), deps.platform.UpdateInventory)
	protected.POST("/inventory/:id/adjust", middleware.RequireAuth(deps.secret, "admin", "franchise_owner", "branch_manager"), deps.platform.AdjustInventory)
	protected.DELETE("/inventory/:id", middleware.RequireAuth(deps.secret, "admin", "franchise_owner", "branch_manager"), deps.platform.DeleteInventory)
	protected.GET("/stock-movements", middleware.RequireAuth(deps.secret, "admin", "franchise_owner", "branch_manager"), deps.platform.ListStockMovements)
	protected.POST("/stock-requests", middleware.RequireAuth(deps.secret, "admin", "franchise_owner", "branch_manager"), deps.platform.CreateStockRequest)
	protected.GET("/stock-requests", middleware.RequireAuth(deps.secret, "admin", "franchise_owner", "branch_manager"), deps.platform.ListStockRequests)
	protected.GET("/audit-events", middleware.RequireAuth(deps.secret, "admin"), deps.platform.ListAuditEvents)
	protected.GET("/website/leads", middleware.RequireAuth(deps.secret, "admin"), deps.platform.ListWebsiteLeads)
	protected.PATCH("/website/leads/:id/status", middleware.RequireAuth(deps.secret, "admin"), deps.platform.UpdateWebsiteLeadStatus)
	protected.PATCH("/stock-requests/:id/status", middleware.RequireAuth(deps.secret, "admin"), deps.platform.UpdateStockRequestStatus)
	registerAdminRoutes(protected, deps)
}

func registerAdminRoutes(protected *gin.RouterGroup, deps routeDependencies) {
	protected.GET("/suppliers", middleware.RequireAuth(deps.secret, "admin"), deps.platform.ListSuppliers)
	protected.POST("/suppliers", middleware.RequireAuth(deps.secret, "admin"), deps.platform.CreateSupplier)
	protected.PATCH("/suppliers/:id", middleware.RequireAuth(deps.secret, "admin"), deps.platform.UpdateSupplier)
	protected.GET("/purchase-orders", middleware.RequireAuth(deps.secret, "admin"), deps.platform.ListPurchaseOrders)
	protected.POST("/purchase-orders", middleware.RequireAuth(deps.secret, "admin"), deps.platform.CreatePurchaseOrder)
	protected.PATCH("/purchase-orders/:id/status", middleware.RequireAuth(deps.secret, "admin"), deps.platform.UpdatePurchaseOrderStatus)
	protected.POST("/purchase-orders/:id/receive", middleware.RequireAuth(deps.secret, "admin"), deps.platform.ReceivePurchaseOrder)
	admin := protected.Group("/franchisees")
	admin.Use(middleware.RequireAuth(deps.secret, "admin"))
	admin.GET("", deps.platform.ListFranchisees)
	admin.POST("", deps.platform.CreateFranchisee)
	admin.PATCH("/:id/status", deps.platform.UpdateFranchiseeStatus)
}

func health(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"success": true, "message": "API ทำงานปกติ", "data": gin.H{"status": "พร้อมใช้งาน"}})
}
