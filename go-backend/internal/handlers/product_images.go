package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"io"
	"log"
	"mime/multipart"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"msme-marketplace/internal/config"
	"msme-marketplace/internal/database"
	"msme-marketplace/internal/models"
	"msme-marketplace/internal/services"
)

type ProductImageHandler struct {
	Config *config.Config
	Claid  *services.ClaidService
}

func NewProductImageHandler(cfg *config.Config) *ProductImageHandler {
	return &ProductImageHandler{
		Config: cfg,
		Claid:  services.NewClaidService(cfg),
	}
}

func (h *ProductImageHandler) ProcessImage(c *gin.Context) {
	userID := c.GetString("userID")
	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid user ID"})
		return
	}

	fileHeader, err := c.FormFile("image")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Image file is required"})
		return
	}

	maxBytes := int64(h.Config.ProductImageMaxSize) * 1024 * 1024
	if maxBytes <= 0 {
		maxBytes = 5 * 1024 * 1024
	}
	if fileHeader.Size > maxBytes {
		c.JSON(http.StatusBadRequest, gin.H{
			"message": "Image exceeds maximum allowed size",
			"limitMB": h.Config.ProductImageMaxSize,
		})
		return
	}

	fileBytes, detectedMime, err := readAndValidateImage(fileHeader)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": err.Error()})
		return
	}

	shouldEnhance := strings.EqualFold(c.DefaultPostForm("enhance", "false"), "true")
	requestID := randomID(8)
	enhanced := false
	var warning *gin.H

	usersCollection := database.GetDB().Collection("users")
	var user models.User
	if err := usersCollection.FindOne(context.Background(), bson.M{"_id": userObjID}).Decode(&user); err != nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "User not found"})
		return
	}

	now := time.Now()
	quotaChanged := false
	if !isSameDay(user.ImageEnhancementCount.LastResetDate, now) {
		user.ImageEnhancementCount.Count = 0
		user.ImageEnhancementCount.LastResetDate = now
		quotaChanged = true
	}

	if shouldEnhance {
		switch {
		case user.ImageEnhancementCount.Count >= h.Config.ProductEnhanceLimit:
			warning = &gin.H{
				"code":    "quota_exceeded",
				"message": "Enhancement quota reached; original image uploaded",
			}
			log.Printf("[product-images] request=%s user=%s fallback=quota_exceeded used=%d limit=%d", requestID, userID, user.ImageEnhancementCount.Count, h.Config.ProductEnhanceLimit)
		case !h.Claid.IsConfigured():
			warning = &gin.H{
				"code":    "enhancement_unavailable",
				"message": "Enhancement unavailable; original image uploaded",
			}
			log.Printf("[product-images] request=%s user=%s fallback=claid_unconfigured", requestID, userID)
		default:
			enhancedBytes, enhancedType, enhanceErr := h.Claid.EnhanceImage(c.Request.Context(), fileBytes, fileHeader.Filename, detectedMime)
			if enhanceErr != nil {
				code := "enhancement_failed"
				if claidErr, ok := enhanceErr.(*services.ClaidError); ok && claidErr.Code != "" {
					code = claidErr.Code
				}
				warning = &gin.H{
					"code":    code,
					"message": "Enhancement failed; original image uploaded",
				}
				log.Printf("[product-images] request=%s user=%s fallback=%s err=%v", requestID, userID, code, enhanceErr)
			} else {
				fileBytes = enhancedBytes
				detectedMime = enhancedType
				enhanced = true
				user.ImageEnhancementCount.Count++
				quotaChanged = true
				log.Printf("[product-images] request=%s user=%s enhanced=true used=%d", requestID, userID, user.ImageEnhancementCount.Count)
			}
		}
	}

	if quotaChanged {
		_, updateErr := usersCollection.UpdateOne(context.Background(), bson.M{"_id": userObjID}, bson.M{
			"$set": bson.M{"imageEnhancementCount": user.ImageEnhancementCount},
		})
		if updateErr != nil {
			log.Printf("[product-images] request=%s user=%s warning=quota_update_failed err=%v", requestID, userID, updateErr)
		}
	}

	ext := services.ExtensionForContentType(detectedMime)
	filename := userID + "-" + time.Now().Format("20060102-150405") + "-" + randomID(12) + ext
	relativePath := filepath.Join("uploads", "products", filename)
	filePath := filepath.Join(".", relativePath)

	if err := os.MkdirAll(filepath.Dir(filePath), 0755); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to prepare upload directory"})
		return
	}

	if err := os.WriteFile(filePath, fileBytes, 0644); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to save image"})
		return
	}

	response := gin.H{
		"success": true,
		"image": gin.H{
			"url":       "/uploads/products/" + filename,
			"enhanced":  enhanced,
			"mimeType":  detectedMime,
			"sizeBytes": len(fileBytes),
		},
	}

	if shouldEnhance {
		response["quota"] = buildQuotaResponse(user.ImageEnhancementCount.Count, h.Config.ProductEnhanceLimit, now)
	}
	if warning != nil {
		response["warning"] = *warning
	}

	c.JSON(http.StatusOK, response)
}

func (h *ProductImageHandler) Cleanup(c *gin.Context) {
	var req struct {
		URLs []string `json:"urls"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid cleanup payload"})
		return
	}

	deleted := 0
	for _, rawURL := range req.URLs {
		cleanPath, ok := sanitizeUploadURL(rawURL)
		if !ok {
			continue
		}

		filePath := filepath.Join(".", cleanPath)
		if _, err := os.Stat(filePath); err != nil {
			continue
		}
		if err := os.Remove(filePath); err == nil {
			deleted++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"deleted": deleted,
	})
}

func readAndValidateImage(fileHeader *multipart.FileHeader) ([]byte, string, error) {
	file, err := fileHeader.Open()
	if err != nil {
		return nil, "", err
	}
	defer file.Close()

	fileBytes, err := io.ReadAll(file)
	if err != nil {
		return nil, "", err
	}
	if len(fileBytes) == 0 {
		return nil, "", errors.New("Uploaded image is empty")
	}

	detected := http.DetectContentType(fileBytes)
	if !isAllowedImageMime(detected) {
		return nil, "", errInvalidMime
	}

	return fileBytes, detected, nil
}

var errInvalidMime = errors.New("Unsupported image format. Allowed: JPEG, PNG, WEBP")

func isAllowedImageMime(mime string) bool {
	switch strings.ToLower(strings.TrimSpace(mime)) {
	case "image/jpeg", "image/png", "image/webp":
		return true
	default:
		return false
	}
}

func sanitizeUploadURL(rawURL string) (string, bool) {
	trimmed := strings.TrimSpace(rawURL)
	if trimmed == "" || !strings.HasPrefix(trimmed, "/uploads/products/") {
		return "", false
	}

	trimmed = strings.TrimPrefix(trimmed, "/")
	cleaned := filepath.Clean(trimmed)
	slashed := filepath.ToSlash(cleaned)
	if !strings.HasPrefix(slashed, "uploads/products/") {
		return "", false
	}
	return cleaned, true
}

func randomID(size int) string {
	if size <= 0 {
		size = 8
	}

	byteLen := (size + 1) / 2
	buff := make([]byte, byteLen)
	if _, err := rand.Read(buff); err != nil {
		return "fallbackid"
	}
	encoded := hex.EncodeToString(buff)
	if len(encoded) < size {
		return encoded
	}
	return encoded[:size]
}

func isSameDay(a, b time.Time) bool {
	return a.Day() == b.Day() && a.Month() == b.Month() && a.Year() == b.Year()
}

func buildQuotaResponse(used, limit int, now time.Time) gin.H {
	if limit <= 0 {
		limit = 20
	}
	remaining := limit - used
	if remaining < 0 {
		remaining = 0
	}

	tomorrow := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())
	return gin.H{
		"limit":     limit,
		"used":      used,
		"remaining": remaining,
		"resetTime": tomorrow.Format(time.RFC3339),
	}
}
