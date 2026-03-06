package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"msme-marketplace/internal/database"
	"msme-marketplace/internal/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Instagram OAuth Configuration
var (
	InstagramAppID       = os.Getenv("INSTAGRAM_APP_ID")
	InstagramAppSecret   = os.Getenv("INSTAGRAM_APP_SECRET")
	InstagramRedirectURI = os.Getenv("INSTAGRAM_REDIRECT_URI")
)

// InstagramConnect initiates the OAuth flow
func InstagramConnect(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	// Generate state for CSRF protection
	state := primitive.NewObjectID().Hex()

	// Build OAuth URL
	oauthURL := fmt.Sprintf(
		"https://api.instagram.com/oauth/authorize?client_id=%s&redirect_uri=%s&scope=user_profile,user_media&response_type=code&state=%s",
		InstagramAppID,
		InstagramRedirectURI,
		state,
	)

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"authURL": oauthURL,
		"state":   state,
	})
}

// InstagramCallback handles the OAuth callback
func InstagramCallback(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	code := c.Query("code")
	if code == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Authorization code not provided"})
		return
	}

	// Exchange code for access token
	tokenURL := "https://api.instagram.com/oauth/access_token"
	tokenPayload := map[string]string{
		"client_id":     InstagramAppID,
		"client_secret": InstagramAppSecret,
		"grant_type":    "authorization_code",
		"redirect_uri":  InstagramRedirectURI,
		"code":          code,
	}

	// Make request to exchange code for token
	tokenResponse, err := makeHTTPRequest("POST", tokenURL, tokenPayload)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to exchange code for token"})
		return
	}

	// Parse token response
	var tokenData map[string]interface{}
	if err := json.Unmarshal(tokenResponse, &tokenData); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse token response"})
		return
	}

	// Check for errors
	if _, ok := tokenData["error_message"]; ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": tokenData["error_message"]})
		return
	}

	accessToken, ok := tokenData["access_token"].(string)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Invalid access token"})
		return
	}

	userIDObj, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// Get long-lived access token
	longLivedToken, err := getLongLivedToken(accessToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get long-lived token"})
		return
	}

	// Get Instagram user info
	igUserID, username, err := getInstagramUserInfo(longLivedToken)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to get Instagram user info"})
		return
	}

	// Check if this account is already connected
	collection := database.GetDB().Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	var user models.User
	err = collection.FindOne(ctx, bson.M{"_id": userIDObj}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Check if already connected
	for _, acc := range user.InstagramAccounts {
		if acc.InstagramUserID == igUserID {
			c.JSON(http.StatusOK, gin.H{
				"success":  true,
				"message":  "Instagram account already connected",
				"username": username,
			})
			return
		}

		// Remove old connection if exists (reconnecting)
		if acc.Username == username {
			user.InstagramAccounts = removeInstagramAccount(user.InstagramAccounts, username)
		}
	}

	// Add new Instagram account
	newAccount := models.InstagramAccount{
		InstagramUserID: igUserID,
		Username:        username,
		AccessToken:     longLivedToken,
		IsDefault:       len(user.InstagramAccounts) == 0, // First account is default
		ConnectedAt:     time.Now(),
	}

	// If first account, set as default
	if len(user.InstagramAccounts) == 0 {
		newAccount.IsDefault = true
	} else {
		// Make sure at least one account is default
		hasDefault := false
		for _, acc := range user.InstagramAccounts {
			if acc.IsDefault {
				hasDefault = true
				break
			}
		}
		if !hasDefault {
			newAccount.IsDefault = true
		}
	}

	user.InstagramAccounts = append(user.InstagramAccounts, newAccount)

	// Update user in database
	_, err = collection.UpdateOne(
		ctx,
		bson.M{"_id": userIDObj},
		bson.M{"$set": bson.M{"instagramAccounts": user.InstagramAccounts, "updatedAt": time.Now()}},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save Instagram account"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":         true,
		"message":         "Instagram connected successfully",
		"instagramUserID": igUserID,
		"username":        username,
		"isDefault":       newAccount.IsDefault,
	})
}

// InstagramDisconnect removes an Instagram account
func InstagramDisconnect(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	username := c.Query("username")
	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username required"})
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

	var user models.User
	err = collection.FindOne(ctx, bson.M{"_id": userIDObj}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Remove the account
	user.InstagramAccounts = removeInstagramAccount(user.InstagramAccounts, username)

	// If we removed the default, set another as default
	if len(user.InstagramAccounts) > 0 {
		hasDefault := false
		for _, acc := range user.InstagramAccounts {
			if acc.IsDefault {
				hasDefault = true
				break
			}
		}
		if !hasDefault {
			user.InstagramAccounts[0].IsDefault = true
		}
	}

	_, err = collection.UpdateOne(
		ctx,
		bson.M{"_id": userIDObj},
		bson.M{"$set": bson.M{"instagramAccounts": user.InstagramAccounts, "updatedAt": time.Now()}},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to disconnect Instagram"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Instagram disconnected successfully",
	})
}

// InstagramStatus returns connected Instagram accounts
func InstagramStatus(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
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

	var user models.User
	err = collection.FindOne(ctx, bson.M{"_id": userIDObj}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Return accounts without access tokens
	accounts := make([]gin.H, 0)
	for _, acc := range user.InstagramAccounts {
		accounts = append(accounts, gin.H{
			"instagramUserID": acc.InstagramUserID,
			"username":        acc.Username,
			"isDefault":       acc.IsDefault,
			"connectedAt":     acc.ConnectedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  len(accounts) > 0,
		"accounts": accounts,
	})
}

// InstagramSetDefault sets the default Instagram account
func InstagramSetDefault(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	username := c.Query("username")
	if username == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Username required"})
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

	var user models.User
	err = collection.FindOne(ctx, bson.M{"_id": userIDObj}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Update default status
	for i := range user.InstagramAccounts {
		user.InstagramAccounts[i].IsDefault = (user.InstagramAccounts[i].Username == username)
	}

	_, err = collection.UpdateOne(
		ctx,
		bson.M{"_id": userIDObj},
		bson.M{"$set": bson.M{"instagramAccounts": user.InstagramAccounts, "updatedAt": time.Now()}},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to set default"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"message":  "Default account updated",
		"username": username,
	})
}

// InstagramSetPostPreference sets whether to use TroliToko account or user's own account
func InstagramSetPostPreference(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	var req struct {
		Preference string `json:"preference"` // "trolitoko" or "own"
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid request body"})
		return
	}

	// Validate preference
	if req.Preference != "trolitoko" && req.Preference != "own" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid preference. Must be 'trolitoko' or 'own'"})
		return
	}

	// If choosing "own", verify user has connected an account
	if req.Preference == "own" {
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

		if len(user.InstagramAccounts) == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "No Instagram account connected. Please connect your Instagram account first."})
			return
		}
	}

	userIDObj, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	collection := database.GetDB().Collection("users")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	_, err = collection.UpdateOne(
		ctx,
		bson.M{"_id": userIDObj},
		bson.M{"$set": bson.M{
			"instagramPostPreference": req.Preference,
			"updatedAt":               time.Now(),
		}},
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update preference"})
		return
	}

	preferenceLabel := "TroliToko Account"
	if req.Preference == "own" {
		preferenceLabel = "Your Instagram Account"
	}

	c.JSON(http.StatusOK, gin.H{
		"success":    true,
		"message":    "Post preference updated",
		"preference": req.Preference,
		"label":      preferenceLabel,
	})
}

// GetInstagramPostPreference returns the user's Instagram post preference
func GetInstagramPostPreference(c *gin.Context) {
	userID := c.GetString("userID")
	if userID == "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
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

	var user models.User
	err = collection.FindOne(ctx, bson.M{"_id": userIDObj}).Decode(&user)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "User not found"})
		return
	}

	// Default to "trolitoko"
	preference := user.InstagramPostPreference
	if preference == "" {
		preference = "trolitoko"
	}

	hasOwnAccount := len(user.InstagramAccounts) > 0

	c.JSON(http.StatusOK, gin.H{
		"preference":     preference,
		"hasOwnAccount":  hasOwnAccount,
		"troliTokoLabel": "TroliToko Official Account",
		"ownLabel":       "Your Connected Instagram",
	})
}

// Helper functions

func getLongLivedToken(shortLivedToken string) (string, error) {
	url := fmt.Sprintf(
		"https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=%s&access_token=%s",
		InstagramAppSecret,
		shortLivedToken,
	)

	response, err := makeHTTPRequest("GET", url, nil)
	if err != nil {
		return "", err
	}

	var data map[string]interface{}
	if err := json.Unmarshal(response, &data); err != nil {
		return "", err
	}

	if token, ok := data["access_token"].(string); ok {
		return token, nil
	}

	return "", fmt.Errorf("failed to get long-lived token")
}

func getInstagramUserInfo(accessToken string) (string, string, error) {
	url := fmt.Sprintf(
		"https://graph.instagram.com/me?fields=id,username&access_token=%s",
		accessToken,
	)

	response, err := makeHTTPRequest("GET", url, nil)
	if err != nil {
		return "", "", err
	}

	var data map[string]interface{}
	if err := json.Unmarshal(response, &data); err != nil {
		return "", "", err
	}

	igUserID, ok1 := data["id"].(string)
	username, ok2 := data["username"].(string)

	if !ok1 || !ok2 {
		return "", "", fmt.Errorf("invalid user info response")
	}

	return igUserID, username, nil
}

func removeInstagramAccount(accounts []models.InstagramAccount, username string) []models.InstagramAccount {
	result := make([]models.InstagramAccount, 0)
	for _, acc := range accounts {
		if acc.Username != username {
			result = append(result, acc)
		}
	}
	return result
}

// DetectPlatform detects social media platform from URL
func DetectPlatform(url string) string {
	lowerURL := strings.ToLower(url)

	if strings.Contains(lowerURL, "instagram.com") {
		return "instagram"
	}
	if strings.Contains(lowerURL, "tiktok.com") {
		return "tiktok"
	}
	if strings.Contains(lowerURL, "facebook.com") || strings.Contains(lowerURL, "fb.com") {
		return "facebook"
	}
	if strings.Contains(lowerURL, "twitter.com") || strings.Contains(lowerURL, "x.com") {
		return "twitter"
	}
	if strings.Contains(lowerURL, "youtube.com") {
		return "youtube"
	}
	if strings.Contains(lowerURL, "wa.me") || strings.Contains(lowerURL, "whatsapp.com") {
		return "whatsapp"
	}

	return "website"
}

// makeHTTPRequest is a helper function to make HTTP requests
func makeHTTPRequest(method, url string, payload map[string]string) ([]byte, error) {
	var reqBody io.Reader
	if payload != nil {
		formData := ""
		for key, value := range payload {
			if formData != "" {
				formData += "&"
			}
			formData += key + "=" + value
		}
		reqBody = strings.NewReader(formData)
	}

	req, err := http.NewRequest(method, url, reqBody)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	client := &http.Client{Timeout: 30 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	return body, nil
}
