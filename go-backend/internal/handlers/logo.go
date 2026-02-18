package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"msme-marketplace/internal/database"
	"msme-marketplace/internal/models"
)

type LogoHandler struct {
	DailyLimit int
}

func NewLogoHandler() *LogoHandler {
	return &LogoHandler{DailyLimit: 5}
}

func (h *LogoHandler) GenerateLogo(c *gin.Context) {
	userID := c.GetString("userID")
	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid user ID"})
		return
	}

	var req struct {
		Prompt string `json:"prompt" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"message": "Prompt is required"})
		return
	}

	if len(req.Prompt) > 500 {
		c.JSON(400, gin.H{"message": "Prompt must be less than 500 characters"})
		return
	}

	usersCollection := database.GetDB().Collection("users")
	var user models.User
	err = usersCollection.FindOne(context.Background(), bson.M{"_id": userObjID}).Decode(&user)
	if err != nil {
		c.JSON(404, gin.H{"message": "User not found"})
		return
	}

	now := time.Now()
	lastReset := user.LogoGenerationCount.LastResetDate
	if now.Day() != lastReset.Day() || now.Month() != lastReset.Month() || now.Year() != lastReset.Year() {
		user.LogoGenerationCount.Count = 0
		user.LogoGenerationCount.LastResetDate = now
	}

	if user.LogoGenerationCount.Count >= h.DailyLimit {
		tomorrow := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())
		c.JSON(429, gin.H{
			"success":      false,
			"error":        "Daily limit reached",
			"message":      "You have reached your daily limit of logo generations",
			"limit":        h.DailyLimit,
			"used":         user.LogoGenerationCount.Count,
			"resetTime":    tomorrow.Format(time.RFC3339),
			"resetInHours": int(tomorrow.Sub(now).Hours()),
		})
		return
	}

	logoID := generateUUID()
	baseFilename := fmt.Sprintf("%s-%d-%s", userID, time.Now().Unix(), logoID)
	logosDir := filepath.Join(".", "uploads", "logos")
	os.MkdirAll(logosDir, 0755)
	filename := baseFilename + ".png"
	outputPath := filepath.Join(logosDir, filename)
	generationSource := "pollinations"

	pollinationsKey := strings.TrimSpace(os.Getenv("POLLINATIONS_API_KEY"))
	if pollinationsKey != "" {
		err = generateWithPollinations(req.Prompt, outputPath, pollinationsKey)
		if err != nil {
			log.Printf("Pollinations failed, falling back to SVG: %v", err)
			filename = baseFilename + ".svg"
			outputPath = filepath.Join(logosDir, filename)
			generationSource = "svg-fallback"
			err = generateSvgLogo(req.Prompt, outputPath)
		}
	} else {
		filename = baseFilename + ".svg"
		outputPath = filepath.Join(logosDir, filename)
		generationSource = "svg-fallback"
		err = generateSvgLogo(req.Prompt, outputPath)
	}
	if err != nil {
		c.JSON(500, gin.H{
			"success": false,
			"error":   "Generation failed",
			"message": err.Error(),
		})
		return
	}

	urlPath := "/uploads/logos/" + filename

	logoEntry := models.GeneratedLogo{
		LogoID:    logoID,
		URL:       urlPath,
		Prompt:    req.Prompt,
		FilePath:  filepath.Join("uploads", "logos", filename),
		CreatedAt: now,
		ExpiresAt: now.Add(7 * 24 * time.Hour),
	}

	user.LogoGenerationCount.Count++
	if len(user.GeneratedLogos) >= 20 {
		user.GeneratedLogos = user.GeneratedLogos[1:]
	}
	user.GeneratedLogos = append(user.GeneratedLogos, logoEntry)

	usersCollection.UpdateOne(context.Background(), bson.M{"_id": userObjID}, bson.M{
		"$set": bson.M{
			"generatedLogos":      user.GeneratedLogos,
			"logoGenerationCount": user.LogoGenerationCount,
		},
	})

	c.JSON(200, gin.H{
		"success":              true,
		"logo":                 logoEntry,
		"remainingGenerations": h.DailyLimit - user.LogoGenerationCount.Count,
		"source":               generationSource,
		"message":              "Logo generated successfully",
	})
}

func (h *LogoHandler) GetLogoHistory(c *gin.Context) {
	userID := c.GetString("userID")
	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid user ID"})
		return
	}

	usersCollection := database.GetDB().Collection("users")
	var user models.User
	err = usersCollection.FindOne(context.Background(), bson.M{"_id": userObjID}).Decode(&user)
	if err != nil {
		c.JSON(404, gin.H{"message": "User not found"})
		return
	}

	now := time.Now()
	var validLogos []models.GeneratedLogo
	for _, logo := range user.GeneratedLogos {
		if logo.ExpiresAt.After(now) {
			validLogos = append(validLogos, logo)
		}
	}

	for i, j := 0, len(validLogos)-1; i < j; i, j = i+1, j-1 {
		validLogos[i], validLogos[j] = validLogos[j], validLogos[i]
	}

	c.JSON(200, gin.H{
		"success":        true,
		"logos":          validLogos,
		"businessLogo":   user.BusinessLogo,
		"hasCustomLogo":  user.HasCustomLogo,
		"totalGenerated": len(user.GeneratedLogos),
	})
}

func (h *LogoHandler) GetLogoStatus(c *gin.Context) {
	userID := c.GetString("userID")
	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid user ID"})
		return
	}

	usersCollection := database.GetDB().Collection("users")
	var user models.User
	err = usersCollection.FindOne(context.Background(), bson.M{"_id": userObjID}).Decode(&user)
	if err != nil {
		c.JSON(404, gin.H{"message": "User not found"})
		return
	}

	now := time.Now()
	lastReset := user.LogoGenerationCount.LastResetDate
	if now.Day() != lastReset.Day() || now.Month() != lastReset.Month() || now.Year() != lastReset.Year() {
		user.LogoGenerationCount.Count = 0
	}

	tomorrow := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, now.Location())

	c.JSON(200, gin.H{
		"success": true,
		"status": gin.H{
			"limit":        h.DailyLimit,
			"used":         user.LogoGenerationCount.Count,
			"remaining":    h.DailyLimit - user.LogoGenerationCount.Count,
			"resetTime":    tomorrow.Format(time.RFC3339),
			"resetInHours": int(tomorrow.Sub(now).Hours()),
		},
	})
}

func (h *LogoHandler) SelectLogo(c *gin.Context) {
	userID := c.GetString("userID")
	logoID := c.Param("logoId")

	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid user ID"})
		return
	}

	usersCollection := database.GetDB().Collection("users")
	var user models.User
	err = usersCollection.FindOne(context.Background(), bson.M{"_id": userObjID}).Decode(&user)
	if err != nil {
		c.JSON(404, gin.H{"message": "User not found"})
		return
	}

	var selectedLogo *models.GeneratedLogo
	for i, logo := range user.GeneratedLogos {
		if logo.LogoID == logoID || logo.ID.Hex() == logoID {
			if logo.ExpiresAt.After(time.Now()) {
				selectedLogo = &user.GeneratedLogos[i]
			} else {
				c.JSON(400, gin.H{
					"success": false,
					"error":   "Logo expired",
					"message": "This logo has expired. Please generate a new one.",
				})
				return
			}
			break
		}
	}

	if selectedLogo == nil {
		c.JSON(404, gin.H{
			"success": false,
			"error":   "Logo not found",
			"message": "The requested logo was not found in your history",
		})
		return
	}

	_, err = usersCollection.UpdateOne(context.Background(), bson.M{"_id": userObjID}, bson.M{
		"$set": bson.M{"businessLogo": selectedLogo.URL},
	})
	if err != nil {
		c.JSON(500, gin.H{"message": "Failed to select logo"})
		return
	}

	c.JSON(200, gin.H{
		"success":      true,
		"message":      "Logo selected as business logo",
		"businessLogo": selectedLogo.URL,
	})
}

func (h *LogoHandler) DeleteLogo(c *gin.Context) {
	userID := c.GetString("userID")
	logoID := c.Param("logoId")

	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid user ID"})
		return
	}

	usersCollection := database.GetDB().Collection("users")
	var user models.User
	err = usersCollection.FindOne(context.Background(), bson.M{"_id": userObjID}).Decode(&user)
	if err != nil {
		c.JSON(404, gin.H{"message": "User not found"})
		return
	}

	logoIndex := -1
	for i, logo := range user.GeneratedLogos {
		if logo.LogoID == logoID || logo.ID.Hex() == logoID {
			logoIndex = i
			break
		}
	}

	if logoIndex == -1 {
		c.JSON(404, gin.H{"message": "Logo not found"})
		return
	}

	logo := user.GeneratedLogos[logoIndex]
	if user.BusinessLogo != nil && *user.BusinessLogo == logo.URL {
		usersCollection.UpdateOne(context.Background(), bson.M{"_id": userObjID}, bson.M{
			"$set": bson.M{"businessLogo": nil},
		})
	}

	user.GeneratedLogos = append(user.GeneratedLogos[:logoIndex], user.GeneratedLogos[logoIndex+1:]...)
	usersCollection.UpdateOne(context.Background(), bson.M{"_id": userObjID}, bson.M{
		"$set": bson.M{"generatedLogos": user.GeneratedLogos},
	})

	os.Remove(logo.FilePath)

	c.JSON(200, gin.H{
		"success": true,
		"message": "Logo deleted successfully",
	})
}

func (h *LogoHandler) UploadCustomLogo(c *gin.Context) {
	userID := c.GetString("userID")
	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid user ID"})
		return
	}

	file, err := c.FormFile("logo")
	if err != nil {
		c.JSON(400, gin.H{"message": "No file uploaded"})
		return
	}

	if file.Size > 2*1024*1024 {
		c.JSON(400, gin.H{"message": "Logo must be less than 2MB"})
		return
	}

	logosDir := filepath.Join(".", "uploads", "logos")
	os.MkdirAll(logosDir, 0755)

	filename := fmt.Sprintf("%s-custom-%d%s", userID, time.Now().Unix(), filepath.Ext(file.Filename))
	filePath := filepath.Join(logosDir, filename)

	err = c.SaveUploadedFile(file, filePath)
	if err != nil {
		c.JSON(500, gin.H{"message": "Failed to save file"})
		return
	}

	usersCollection := database.GetDB().Collection("users")
	_, err = usersCollection.UpdateOne(context.Background(), bson.M{"_id": userObjID}, bson.M{
		"$set": bson.M{
			"businessLogo":  "/uploads/logos/" + filename,
			"hasCustomLogo": true,
		},
	})
	if err != nil {
		c.JSON(500, gin.H{"message": "Failed to update user"})
		return
	}

	c.JSON(200, gin.H{
		"success":      true,
		"message":      "Logo uploaded successfully",
		"businessLogo": "/uploads/logos/" + filename,
	})
}

func generateUUID() string {
	b := make([]byte, 16)
	rand.Read(b)
	return hex.EncodeToString(b)
}

func generateWithPollinations(prompt, outputPath, apiKey string) error {
	enhancedPrompt := fmt.Sprintf(
		"Professional minimalist logo design: %s, vector style, clean, modern, white background, suitable for business branding, high quality, no text",
		prompt,
	)
	seed := time.Now().UnixNano() % 1000000
	imageURL := fmt.Sprintf(
		"https://gen.pollinations.ai/image/%s?seed=%d&width=1024&height=1024&nologo=true&model=flux&negative_prompt=text,words,letters,watermark,signature,typography&key=%s",
		url.PathEscape(enhancedPrompt),
		seed,
		url.QueryEscape(apiKey),
	)

	client := &http.Client{Timeout: 120 * time.Second}
	req, err := http.NewRequest(http.MethodGet, imageURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "image/*,*/*")
	req.Header.Set("User-Agent", "Mozilla/5.0 (compatible; MSMELogoBot/1.0)")

	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("pollinations request failed with status %d", resp.StatusCode)
	}

	contentType := strings.ToLower(resp.Header.Get("Content-Type"))
	if strings.HasPrefix(contentType, "text/") || strings.Contains(contentType, "json") {
		bodyPreview, _ := io.ReadAll(io.LimitReader(resp.Body, 512))
		return fmt.Errorf("pollinations returned non-image response (%s): %s", contentType, string(bodyPreview))
	}

	file, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer file.Close()

	if _, err := io.Copy(file, resp.Body); err != nil {
		_ = os.Remove(outputPath)
		return err
	}

	return nil
}

func generateSvgLogo(prompt, outputPath string) error {
	colors := []struct{ bg, text, accent string }{
		{"#3B82F6", "#FFFFFF", "#1D4ED8"},
		{"#EF4444", "#FFFFFF", "#B91C1C"},
		{"#10B981", "#FFFFFF", "#047857"},
		{"#F59E0B", "#FFFFFF", "#D97706"},
		{"#8B5CF6", "#FFFFFF", "#6D28D9"},
	}

	palette := colors[0]

	stopWords := map[string]bool{
		"logo": true, "design": true, "for": true, "the": true, "and": true, "with": true,
		"a": true, "an": true, "of": true, "business": true,
	}
	parts := strings.Fields(strings.ToLower(prompt))
	words := make([]string, 0, len(parts))
	for _, part := range parts {
		clean := strings.Trim(part, ".,:;!?-_()[]{}\"'")
		if len(clean) > 1 && !stopWords[clean] {
			words = append(words, clean)
		}
	}

	initials := "LG"
	if len(words) >= 2 {
		initials = strings.ToUpper(string(words[0][0]) + string(words[1][0]))
	} else if len(words) == 1 {
		if len(words[0]) >= 2 {
			initials = strings.ToUpper(words[0][:2])
		} else {
			initials = strings.ToUpper(words[0])
		}
	}

	svg := `<?xml version="1.0" encoding="UTF-8"?>
<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:` + palette.bg + `;stop-opacity:1" />
      <stop offset="100%" style="stop-color:` + palette.accent + `;stop-opacity:1" />
    </linearGradient>
  </defs>
  <rect width="512" height="512" fill="url(#bgGrad)" rx="64" ry="64"/>
  <circle cx="256" cy="200" r="80" fill="` + palette.text + `"/>
  <text x="256" y="225" font-family="Arial, sans-serif" font-size="72" font-weight="bold" fill="` + palette.bg + `" text-anchor="middle" dominant-baseline="middle">` + initials + `</text>
  <text x="256" y="400" font-family="Arial, sans-serif" font-size="24" fill="` + palette.text + `" text-anchor="middle" fill-opacity="0.9">Business</text>
</svg>`

	f, err := os.Create(outputPath)
	if err != nil {
		return err
	}
	defer f.Close()

	_, err = f.WriteString(svg)
	return err
}
