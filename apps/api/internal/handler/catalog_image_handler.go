package handler

import (
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
)

const maxCatalogImageSize = 5 * 1024 * 1024

// UploadCatalogImage stores a catalog image outside PostgreSQL and returns a
// public R2 URL. Keeping image bytes out of the catalog JSON keeps the editor
// response small and fast to parse.
func (h *PlatformHandler) UploadCatalogImage(c *gin.Context) {
	if h.images == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"success": false, "message": "ระบบเก็บรูปภาพยังไม่ได้ตั้งค่า"})
		return
	}
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, maxCatalogImageSize+1024*1024)
	fileHeader, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "กรุณาเลือกรูปภาพ"})
		return
	}
	if fileHeader.Size > maxCatalogImageSize {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"success": false, "message": "รูปภาพต้องมีขนาดไม่เกิน 5 MB"})
		return
	}
	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ไม่สามารถอ่านรูปภาพได้"})
		return
	}
	defer file.Close()
	content, err := io.ReadAll(io.LimitReader(file, maxCatalogImageSize+1))
	if err != nil || len(content) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"success": false, "message": "ไม่สามารถอ่านรูปภาพได้"})
		return
	}
	if len(content) > maxCatalogImageSize {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"success": false, "message": "รูปภาพต้องมีขนาดไม่เกิน 5 MB"})
		return
	}
	contentType := http.DetectContentType(content)
	if contentType != "image/jpeg" && contentType != "image/png" && contentType != "image/webp" {
		c.JSON(http.StatusUnsupportedMediaType, gin.H{"success": false, "message": "รองรับเฉพาะ JPG, PNG หรือ WebP"})
		return
	}
	imageURL, err := h.images.PutCatalogImage(c.Request.Context(), content, contentType)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"success": false, "message": "ไม่สามารถอัปโหลดรูปภาพได้"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"success": true, "data": gin.H{"url": imageURL}})
}
