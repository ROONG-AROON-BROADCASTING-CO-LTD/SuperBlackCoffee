package handler

import (
	"bytes"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/xuri/excelize/v2"
	"y/internal/middleware"
)

const maxSalesWorkbookSize = 12 << 20

type importedSale struct {
	branchID         int64
	menuItemID       int64
	receiptNumber    string
	soldAt           time.Time
	channel          string
	externalMenuName string
	quantity         float64
	unitPrice        float64
}

type salesImportSkippedRow struct {
	Row      int    `json:"row"`
	MenuName string `json:"menuName"`
	Reason   string `json:"reason"`
}

type salesImportBranch struct {
	id   int64
	name string
	code string
}

type salesImportMenu struct {
	id               int64
	name             string
	storePrice       float64
	storeAvailable   bool
	linemanPrice     float64
	linemanAvailable bool
}

func normalizeSalesText(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	value = strings.NewReplacer(" ", "", "\t", "", "\n", "", "\r", "", ".", "", "-", "", "_", "", "/", "", "(", "", ")", "", "[", "", "]", "", ",", "", ":", "").Replace(value)
	return value
}

func baseExternalMenuName(value string) string {
	value = strings.TrimSpace(value)
	if index := strings.Index(value, " - "); index >= 0 {
		value = value[:index]
	}
	if index := strings.Index(value, " x "); index >= 0 {
		value = value[:index]
	}
	return strings.TrimSpace(value)
}

func spreadsheetValue(row []string, columns map[string]int, key string) string {
	index, ok := columns[key]
	if !ok || index >= len(row) {
		return ""
	}
	return strings.TrimSpace(row[index])
}

func workbookColumns(header []string) map[string]int {
	columns := make(map[string]int, len(header))
	for index, value := range header {
		columns[strings.TrimSpace(value)] = index
	}
	return columns
}

func parseWorkbookNumber(value string) (float64, error) {
	value = strings.ReplaceAll(strings.TrimSpace(value), ",", "")
	if value == "" {
		return 0, nil
	}
	return strconv.ParseFloat(value, 64)
}

func parseWorkbookSaleTime(dateValue, timeValue string) (time.Time, error) {
	location, err := time.LoadLocation("Asia/Bangkok")
	if err != nil {
		location = time.Local
	}
	return time.ParseInLocation("02/01/2006 15:04", dateValue+" "+timeValue, location)
}

func importChannel(value string) string {
	if strings.Contains(strings.ToLower(value), "line man") {
		return "lineman"
	}
	return "storefront"
}

func findSalesImportBranch(branches []salesImportBranch, externalName string) (salesImportBranch, bool) {
	externalKey := normalizeSalesText(externalName)
	for _, branch := range branches {
		nameKey := normalizeSalesText(branch.name)
		if nameKey != "" && strings.Contains(externalKey, nameKey) {
			return branch, true
		}
	}
	return salesImportBranch{}, false
}

func findSalesImportMenu(menus []salesImportMenu, externalName string) (salesImportMenu, bool) {
	key := normalizeSalesText(baseExternalMenuName(externalName))
	if key == "" {
		return salesImportMenu{}, false
	}
	for _, menu := range menus {
		if normalizeSalesText(menu.name) == key {
			return menu, true
		}
	}

	var candidate salesImportMenu
	bestScore := 0
	tied := false
	for _, menu := range menus {
		menuKey := normalizeSalesText(menu.name)
		if !strings.Contains(menuKey, key) && !strings.Contains(key, menuKey) {
			continue
		}
		score := min(len(menuKey), len(key))
		if score > bestScore {
			candidate, bestScore, tied = menu, score, false
		} else if score == bestScore {
			tied = true
		}
	}
	return candidate, bestScore > 0 && !tied
}

func (h *PlatformHandler) salesImportBranches(c *gin.Context) ([]salesImportBranch, error) {
	rows, err := h.db.QueryContext(c.Request.Context(), `SELECT id,name,code FROM branches WHERE franchisee_id IS NULL ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	branches := []salesImportBranch{}
	for rows.Next() {
		var branch salesImportBranch
		if err := rows.Scan(&branch.id, &branch.name, &branch.code); err != nil {
			return nil, err
		}
		branches = append(branches, branch)
	}
	return branches, rows.Err()
}

func (h *PlatformHandler) salesImportMenus(c *gin.Context, branchID int64) ([]salesImportMenu, error) {
	rows, err := h.db.QueryContext(c.Request.Context(), `SELECT id,name,store_price,store_price_available,lineman_price,lineman_price_available FROM menu_items WHERE branch_id=$1`, branchID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	menus := []salesImportMenu{}
	for rows.Next() {
		var menu salesImportMenu
		if err := rows.Scan(&menu.id, &menu.name, &menu.storePrice, &menu.storeAvailable, &menu.linemanPrice, &menu.linemanAvailable); err != nil {
			return nil, err
		}
		menus = append(menus, menu)
	}
	return menus, rows.Err()
}

// ImportSalesWorkbook reads the FoodStory sale-by-bill-detail export. The workbook
// supplies what was sold; revenue is always calculated from the matching menu's
// current channel price in this system.
func (h *PlatformHandler) ImportSalesWorkbook(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "กรุณาเลือกไฟล์ Excel ยอดขาย"})
		return
	}
	if strings.ToLower(filepath.Ext(fileHeader.Filename)) != ".xlsx" || fileHeader.Size > maxSalesWorkbookSize {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "รองรับเฉพาะไฟล์ .xlsx ขนาดไม่เกิน 12 MB"})
		return
	}
	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ไม่สามารถเปิดไฟล์ที่อัปโหลด"})
		return
	}
	defer file.Close()
	data, err := io.ReadAll(io.LimitReader(file, maxSalesWorkbookSize+1))
	if err != nil || len(data) > maxSalesWorkbookSize {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ไม่สามารถอ่านไฟล์ หรือไฟล์มีขนาดเกินกำหนด"})
		return
	}
	checksumBytes := sha256.Sum256(data)
	checksum := hex.EncodeToString(checksumBytes[:])
	var existingID int64
	if err = h.db.QueryRowContext(c.Request.Context(), `SELECT id FROM sales_imports WHERE checksum=$1`, checksum).Scan(&existingID); err == nil {
		c.JSON(http.StatusConflict, gin.H{"success": false, "message": "ไฟล์นี้ถูกนำเข้าแล้ว เพื่อป้องกันยอดขายซ้ำ"})
		return
	} else if err != sql.ErrNoRows {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถตรวจสอบไฟล์ที่นำเข้า"})
		return
	}
	workbook, err := excelize.OpenReader(bytes.NewReader(data))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ไฟล์ Excel ไม่ถูกต้อง"})
		return
	}
	defer workbook.Close()
	sheets := workbook.GetSheetList()
	if len(sheets) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ไม่พบข้อมูลในไฟล์ Excel"})
		return
	}
	rows, err := workbook.GetRows(sheets[0])
	if err != nil || len(rows) < 2 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ไม่พบรายการขายในไฟล์ Excel"})
		return
	}
	columns := workbookColumns(rows[0])
	for _, required := range []string{"Payment Date", "Payment Time", "Receipt Number / ID", "Menu Name", "Quantity", "Net Price", "Channel", "Branch"} {
		if _, ok := columns[required]; !ok {
			c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ไม่พบคอลัมน์ " + required + " ในไฟล์ Excel"})
			return
		}
	}
	branches, err := h.salesImportBranches(c)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านข้อมูลสาขา"})
		return
	}
	menusByBranch := map[int64][]salesImportMenu{}
	validRows := []importedSale{}
	skipped := []salesImportSkippedRow{}
	for rowIndex, row := range rows[1:] {
		rowNumber := rowIndex + 2
		menuName := spreadsheetValue(row, columns, "Menu Name")
		netPrice, numberErr := parseWorkbookNumber(spreadsheetValue(row, columns, "Net Price"))
		if numberErr != nil || netPrice <= 0 || menuName == "" {
			continue
		}
		branch, ok := findSalesImportBranch(branches, spreadsheetValue(row, columns, "Branch"))
		if !ok {
			skipped = append(skipped, salesImportSkippedRow{Row: rowNumber, MenuName: menuName, Reason: "ไม่พบสาขาในระบบ"})
			continue
		}
		if _, exists := menusByBranch[branch.id]; !exists {
			menusByBranch[branch.id], err = h.salesImportMenus(c, branch.id)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านเมนูในระบบ"})
				return
			}
		}
		menu, ok := findSalesImportMenu(menusByBranch[branch.id], menuName)
		if !ok {
			skipped = append(skipped, salesImportSkippedRow{Row: rowNumber, MenuName: menuName, Reason: "ไม่พบเมนูที่ตรงกันในระบบ"})
			continue
		}
		quantity, numberErr := parseWorkbookNumber(spreadsheetValue(row, columns, "Quantity"))
		if numberErr != nil || quantity <= 0 {
			skipped = append(skipped, salesImportSkippedRow{Row: rowNumber, MenuName: menuName, Reason: "จำนวนขายไม่ถูกต้อง"})
			continue
		}
		soldAt, dateErr := parseWorkbookSaleTime(spreadsheetValue(row, columns, "Payment Date"), spreadsheetValue(row, columns, "Payment Time"))
		if dateErr != nil {
			skipped = append(skipped, salesImportSkippedRow{Row: rowNumber, MenuName: menuName, Reason: "วันที่หรือเวลาไม่ถูกต้อง"})
			continue
		}
		channel := importChannel(spreadsheetValue(row, columns, "Channel"))
		unitPrice, available := menu.storePrice, menu.storeAvailable
		if channel == "lineman" {
			unitPrice, available = menu.linemanPrice, menu.linemanAvailable
		}
		if !available {
			skipped = append(skipped, salesImportSkippedRow{Row: rowNumber, MenuName: menuName, Reason: "เมนูยังไม่ได้ตั้งราคาสำหรับช่องทางนี้"})
			continue
		}
		validRows = append(validRows, importedSale{
			branchID: branch.id, menuItemID: menu.id, receiptNumber: spreadsheetValue(row, columns, "Receipt Number / ID"), soldAt: soldAt, channel: channel, externalMenuName: menuName, quantity: quantity, unitPrice: unitPrice,
		})
	}
	if len(validRows) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ไม่พบรายการขายที่จับคู่กับเมนูในระบบได้", "data": gin.H{"skipped": skipped}})
		return
	}
	tx, err := h.db.BeginTx(c.Request.Context(), nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถบันทึกยอดขาย"})
		return
	}
	defer tx.Rollback()
	claims := middleware.ClaimsFrom(c)
	var importID int64
	if err = tx.QueryRowContext(c.Request.Context(), `INSERT INTO sales_imports(filename,checksum,imported_by) VALUES($1,$2,$3) RETURNING id`, fileHeader.Filename, checksum, claims.UserID).Scan(&importID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถบันทึกไฟล์ยอดขาย"})
		return
	}
	statement, err := tx.PrepareContext(c.Request.Context(), `INSERT INTO sales_import_lines(import_id,branch_id,menu_item_id,receipt_number,sold_at,channel,external_menu_name,quantity,unit_price,amount) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถเตรียมบันทึกรายการขาย"})
		return
	}
	defer statement.Close()
	total := 0.0
	branchIDs := map[int64]bool{}
	for _, sale := range validRows {
		amount := sale.quantity * sale.unitPrice
		if _, err = statement.ExecContext(c.Request.Context(), importID, sale.branchID, sale.menuItemID, sale.receiptNumber, sale.soldAt, sale.channel, sale.externalMenuName, sale.quantity, sale.unitPrice, amount); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถบันทึกรายการขาย"})
			return
		}
		total += amount
		branchIDs[sale.branchID] = true
	}
	if err = tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถยืนยันการนำเข้ายอดขาย"})
		return
	}
	for branchID := range branchIDs {
		h.invalidateBranchCache(c, branchID)
	}
	sort.Slice(skipped, func(left, right int) bool { return skipped[left].Row < skipped[right].Row })
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"importId": importID, "importedRows": len(validRows), "skippedRows": len(skipped), "totalSales": total, "skipped": skipped}})
}

func salesPeriodBounds(period string) (string, string, bool) {
	switch period {
	case "today":
		return "date_trunc('day', now())", "date_trunc('day', now()) + interval '1 day'", true
	case "month":
		return "date_trunc('month', now())", "date_trunc('month', now()) + interval '1 month'", true
	case "year":
		return "date_trunc('year', now())", "date_trunc('year', now()) + interval '1 year'", true
	default:
		return "", "", false
	}
}

func (h *PlatformHandler) salesTrend(c *gin.Context, period string, branchID any) ([]gin.H, error) {
	config, ok := dashboardTrendConfig(period)
	if !ok {
		return nil, fmt.Errorf("invalid period")
	}
	start := fmt.Sprintf("date_trunc('%s', now()) - interval '%s'", config.unit, config.interval)
	end := fmt.Sprintf("date_trunc('%s', now())", config.unit)
	if config.start != "" {
		start, end = config.start, config.end
	}
	query := fmt.Sprintf(`WITH buckets AS (
		SELECT generate_series(%[1]s,%[2]s,interval '%[3]s') AS bucket
	)
	SELECT to_char(b.bucket, '%[4]s'),COALESCE(SUM(s.total),0)
	FROM buckets b
	LEFT JOIN stock_sales s ON s.created_at >= b.bucket
		AND s.created_at < b.bucket + interval '%[3]s'
		AND ($1::bigint IS NULL OR s.branch_id=$1)
	GROUP BY b.bucket ORDER BY b.bucket`, start, end, config.step, config.format)
	rows, err := h.db.QueryContext(c.Request.Context(), query, branchID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make([]gin.H, 0, config.buckets)
	for rows.Next() {
		var label string
		var sales float64
		if err := rows.Scan(&label, &sales); err != nil {
			return nil, err
		}
		result = append(result, gin.H{"label": label, "sales": sales})
	}
	return result, rows.Err()
}

func (h *PlatformHandler) SalesTrend(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	period := strings.TrimSpace(c.DefaultQuery("period", "day"))
	branchID, ok := h.salesBranchID(c)
	if !ok {
		return
	}
	result, err := h.salesTrend(c, period, branchID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ช่วงเวลาที่เลือกไม่ถูกต้อง"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}

func (h *PlatformHandler) salesBranchID(c *gin.Context) (any, bool) {
	branchCode := strings.TrimSpace(c.Query("branchCode"))
	if branchCode == "" {
		return nil, true
	}
	var branchID int64
	if err := h.db.QueryRowContext(c.Request.Context(), `SELECT id FROM branches WHERE code=$1`, branchCode).Scan(&branchID); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"success": false, "message": "ไม่พบสาขาที่เลือก"})
		return nil, false
	}
	return branchID, true
}

func (h *PlatformHandler) TopSellingMenus(c *gin.Context) {
	if h.unavailable(c) {
		return
	}
	period := strings.TrimSpace(c.DefaultQuery("period", "today"))
	start, end, ok := salesPeriodBounds(period)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ช่วงเวลาที่เลือกไม่ถูกต้อง"})
		return
	}
	branchID, ok := h.salesBranchID(c)
	if !ok {
		return
	}
	rows, err := h.db.QueryContext(c.Request.Context(), fmt.Sprintf(`SELECT m.id,m.name,SUM(i.quantity),SUM(i.amount)
		FROM stock_sale_items i
		JOIN stock_sales s ON s.id=i.stock_sale_id
		JOIN menu_items m ON m.id=i.menu_item_id
		WHERE s.created_at >= %s AND s.created_at < %s AND ($1::bigint IS NULL OR s.branch_id=$1)
		GROUP BY m.id,m.name ORDER BY SUM(i.quantity) DESC,SUM(i.amount) DESC,m.name LIMIT 5`, start, end), branchID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถจัดอันดับเมนูขายดี"})
		return
	}
	defer rows.Close()
	result := []gin.H{}
	for rows.Next() {
		var id int64
		var name string
		var quantity, sales float64
		if err := rows.Scan(&id, &name, &quantity, &sales); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"success": false, "message": "ไม่สามารถอ่านข้อมูลเมนูขายดี"})
			return
		}
		result = append(result, gin.H{"id": id, "name": name, "quantity": quantity, "sales": sales})
	}
	c.JSON(http.StatusOK, gin.H{"success": true, "data": result})
}
