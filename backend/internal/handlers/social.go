package handlers

import (
	"context"
	"net/http"
	"regexp"
	"strings"
	"time"

	"msme-marketplace/internal/database"
	"msme-marketplace/internal/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

const maxSocialLinks = 5

// SocialLinksRequest represents the request body for updating social links
type SocialLinksRequest struct {
	ProfileLinks []SocialLinkInput `json:"profileLinks"`
	StoreLinks   []SocialLinkInput `json:"storeLinks"`
}

// SocialLinkInput represents a single social link input
type SocialLinkInput struct {
	Platform string `json:"platform"`
	URL      string `json:"url"`
}

// UpdateSocialLinks updates user's social links
func UpdateSocialLinks(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req SocialLinksRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Validate profile links
	profileLinks, err := validateSocialLinks(req.ProfileLinks)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate store links
	storeLinks, err := validateSocialLinks(req.StoreLinks)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userIDObj, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	collection := database.GetDB().Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Build update
	update := bson.M{
		"socialLinks":      profileLinks,
		"storeSocialLinks": storeLinks,
		"updatedAt":        time.Now(),
	}

	_, err = collection.UpdateOne(
		ctx,
		bson.M{"_id": userIDObj},
		bson.M{"$set": update},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update social links"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":      true,
		"message":      "Social links updated successfully",
		"profileLinks": profileLinks,
		"storeLinks":   storeLinks,
	})
}

// GetSocialLinks returns user's social links
func GetSocialLinks(c *gin.Context) {
	userIDParam := c.Param("id")

	var userIDObj primitive.ObjectID
	var err error

	if userIDParam != "" {
		// Get another user's social links (public)
		userIDObj, err = primitive.ObjectIDFromHex(userIDParam)
	} else {
		// Get current user's social links
		userID := c.GetString("userID")
		if userID == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
			return
		}
		userIDObj, err = primitive.ObjectIDFromHex(userID)
	}

	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	collection := database.GetDB().Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var user models.User
	err = collection.FindOne(ctx, bson.M{"_id": userIDObj}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Return profile links (always public)
	// Store links fallback to profile if empty
	storeLinks := user.StoreSocialLinks
	if len(storeLinks) == 0 {
		storeLinks = user.SocialLinks
	}

	c.JSON(http.StatusOK, gin.H{
		"profileLinks": user.SocialLinks,
		"storeLinks":   storeLinks,
	})
}

// AddSocialLink adds a single social link
func AddSocialLink(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var link SocialLinkInput
	if err := c.ShouldBindJSON(&link); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Validate the link
	validatedLink, err := validateSingleSocialLink(link)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	linkType := c.Query("type") // "profile" or "store"
	if linkType == "" {
		linkType = "profile"
	}

	userIDObj, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	collection := database.GetDB().Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var user models.User
	err = collection.FindOne(ctx, bson.M{"_id": userIDObj}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Determine which links to update
	var links *[]models.SocialLink
	if linkType == "store" {
		links = &user.StoreSocialLinks
	} else {
		links = &user.SocialLinks
	}

	// Check max limit
	if len(*links) >= maxSocialLinks {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Maximum social links limit reached"})
		return
	}

	// Check if platform already exists, update URL instead
	updated := false
	for i, existing := range *links {
		if existing.Platform == validatedLink.Platform {
			(*links)[i].URL = validatedLink.URL
			updated = true
			break
		}
	}

	if !updated {
		*links = append(*links, *validatedLink)
	}

	// Build update
	updateField := "socialLinks"
	if linkType == "store" {
		updateField = "storeSocialLinks"
	}

	_, err = collection.UpdateOne(
		ctx,
		bson.M{"_id": userIDObj},
		bson.M{"$set": bson.M{
			updateField: *links,
			"updatedAt": time.Now(),
		}},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to add social link"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Social link added successfully",
		"link":    validatedLink,
	})
}

// RemoveSocialLink removes a social link
func RemoveSocialLink(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	platform := c.Query("platform")
	if platform == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Platform required"})
		return
	}

	linkType := c.Query("type") // "profile" or "store"
	if linkType == "" {
		linkType = "profile"
	}

	userIDObj, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	collection := database.GetDB().Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var user models.User
	err = collection.FindOne(ctx, bson.M{"_id": userIDObj}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Determine which links to update
	var links []models.SocialLink
	updateField := "socialLinks"
	if linkType == "store" {
		links = user.StoreSocialLinks
		updateField = "storeSocialLinks"
	} else {
		links = user.SocialLinks
	}

	// Remove the link
	newLinks := make([]models.SocialLink, 0)
	for _, link := range links {
		if link.Platform != platform {
			newLinks = append(newLinks, link)
		}
	}

	_, err = collection.UpdateOne(
		ctx,
		bson.M{"_id": userIDObj},
		bson.M{"$set": bson.M{
			updateField: newLinks,
			"updatedAt": time.Now(),
		}},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to remove social link"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Social link removed successfully",
	})
}

// Validation functions

func validateSocialLinks(links []SocialLinkInput) ([]models.SocialLink, error) {
	if len(links) > maxSocialLinks {
		return nil, nil // Allow partial update
	}

	result := make([]models.SocialLink, 0, len(links))
	platforms := make(map[string]bool)

	for _, link := range links {
		validated, err := validateSingleSocialLink(link)
		if err != nil {
			return nil, err
		}

		// Check for duplicate platforms
		if platforms[validated.Platform] {
			return nil, nil // Allow partial update
		}
		platforms[validated.Platform] = true

		result = append(result, *validated)
	}

	return result, nil
}

func validateSingleSocialLink(link SocialLinkInput) (*models.SocialLink, error) {
	// Validate URL format
	if link.URL == "" {
		return nil, &ValidationError{Field: "url", Message: "URL is required"}
	}

	// Check URL format
	if !isValidURL(link.URL) {
		return nil, &ValidationError{Field: "url", Message: "Please enter a valid URL (starting with http:// or https://)"}
	}

	// Detect and validate platform
	platform := DetectPlatform(link.URL)
	if link.Platform != "" && link.Platform != platform {
		// Platform was specified but doesn't match URL
		// Still accept it as user might know better
		platform = link.Platform
	}

	if platform == "" {
		platform = "website"
	}

	return &models.SocialLink{
		Platform: platform,
		URL:      link.URL,
	}, nil
}

func isValidURL(str string) bool {
	// Check if starts with http:// or https://
	if !strings.HasPrefix(str, "http://") && !strings.HasPrefix(str, "https://") {
		return false
	}

	// Basic URL validation regex
	urlRegex := regexp.MustCompile(`^https?://[^\s/$.?#].[^\s]*$`)
	return urlRegex.MatchString(str)
}

// ValidationError represents a validation error
type ValidationError struct {
	Field   string
	Message string
}

func (e *ValidationError) Error() string {
	return e.Message
}
