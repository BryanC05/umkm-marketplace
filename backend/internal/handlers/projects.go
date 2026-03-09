package handlers

import (
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"

	"msme-marketplace/internal/database"
	"msme-marketplace/internal/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type ProjectHandler struct{}

// NewProjectHandler creates a new ProjectHandler
func NewProjectHandler() *ProjectHandler {
	return &ProjectHandler{}
}

// GetProjects retrieves all projects with optional search
func (h *ProjectHandler) GetProjects(c *gin.Context) {
	search := c.Query("search")
	category := c.Query("category")
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "20")

	page := 1
	limit := 20

	if p, err := parseInt(pageStr); err == nil && p > 0 {
		page = p
	}
	if l, err := parseInt(limitStr); err == nil && l > 0 && l <= 50 {
		limit = l
	}

	filter := bson.M{}

	// Search by name or description
	if search != "" {
		filter["$or"] = []bson.M{
			{"name": bson.M{"$regex": search, "$options": "i"}},
			{"description": bson.M{"$regex": search, "$options": "i"}},
		}
	}

	// Filter by category
	if category != "" {
		filter["category"] = category
	}

	skip := (page - 1) * limit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	opts := options.Find().
		SetSort(bson.D{{Key: "createdAt", Value: -1}}).
		SetSkip(int64(skip)).
		SetLimit(int64(limit))

	collection := database.GetDB().Collection("projects")
	cursor, err := collection.Find(ctx, filter, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch projects"})
		return
	}
	defer cursor.Close(ctx)

	var projects []models.Project
	if err := cursor.All(ctx, &projects); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode projects"})
		return
	}

	// Get total count
	total, _ := collection.CountDocuments(ctx, filter)

	c.JSON(http.StatusOK, gin.H{
		"projects": projects,
		"total":    total,
		"page":     page,
		"limit":    limit,
	})
}

// GetProjectByID retrieves a single project by ID
func (h *ProjectHandler) GetProjectByID(c *gin.Context) {
	id := c.Param("id")

	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := database.GetDB().Collection("projects")
	var project models.Project
	err = collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&project)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	c.JSON(http.StatusOK, project)
}

// CreateProject creates a new project
func (h *ProjectHandler) CreateProject(c *gin.Context) {
	// Get user from context (set by auth middleware) - optional now
	userID, exists := c.Get("userId")

	var username, avatar string
	var userIDObj primitive.ObjectID

	if exists {
		userIDObj = userID.(primitive.ObjectID)
		if u, ok := c.Get("username"); ok {
			username = u.(string)
		}
		if a, ok := c.Get("avatar"); ok {
			avatar = a.(string)
		}
	} else {
		// Generate anonymous user ID for guest projects
		userIDObj = primitive.NewObjectID()
		username = "Anonymous"
	}

	var input models.ProjectInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate and normalize link
	if !strings.HasPrefix(input.Link, "http://") && !strings.HasPrefix(input.Link, "https://") {
		input.Link = "https://" + input.Link
	}

	// Use provided username if available, otherwise use anonymous
	if input.Username != "" && username == "Anonymous" {
		username = input.Username
	}

	project := models.Project{
		Name:        input.Name,
		Description: input.Description,
		Link:        input.Link,
		Image:       input.Image,
		Images:      input.Images,
		Category:    input.Category,
		UserID:      userIDObj,
		Username:    username,
		UserAvatar:  avatar,
		Tags:        input.Tags,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := database.GetDB().Collection("projects")
	result, err := collection.InsertOne(ctx, project)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create project"})
		return
	}

	project.ID = result.InsertedID.(primitive.ObjectID)

	c.JSON(http.StatusCreated, project)
}

// UpdateProject updates an existing project
func (h *ProjectHandler) UpdateProject(c *gin.Context) {
	// Get user from context
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	id := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	var input models.ProjectInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Validate and normalize link
	if !strings.HasPrefix(input.Link, "http://") && !strings.HasPrefix(input.Link, "https://") {
		input.Link = "https://" + input.Link
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := database.GetDB().Collection("projects")

	// Check ownership
	var project models.Project
	err = collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&project)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	if project.UserID != userID.(primitive.ObjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only update your own projects"})
		return
	}

	update := bson.M{
		"$set": bson.M{
			"name":        input.Name,
			"description": input.Description,
			"link":        input.Link,
			"image":       input.Image,
			"images":      input.Images,
			"category":    input.Category,
			"tags":        input.Tags,
			"updatedAt":   time.Now(),
		},
	}

	_, err = collection.UpdateOne(ctx, bson.M{"_id": objID}, update)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update project"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Project updated successfully"})
}

// DeleteProject deletes a project
func (h *ProjectHandler) DeleteProject(c *gin.Context) {
	// Get user from context
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	id := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(id)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid project ID"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := database.GetDB().Collection("projects")

	// Check ownership
	var project models.Project
	err = collection.FindOne(ctx, bson.M{"_id": objID}).Decode(&project)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Project not found"})
		return
	}

	if project.UserID != userID.(primitive.ObjectID) {
		c.JSON(http.StatusForbidden, gin.H{"error": "You can only delete your own projects"})
		return
	}

	_, err = collection.DeleteOne(ctx, bson.M{"_id": objID})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete project"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Project deleted successfully"})
}

// GetMyProjects retrieves projects created by the authenticated user
func (h *ProjectHandler) GetMyProjects(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	collection := database.GetDB().Collection("projects")
	cursor, err := collection.Find(ctx, bson.M{"userId": userID.(primitive.ObjectID)})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch projects"})
		return
	}
	defer cursor.Close(ctx)

	var projects []models.Project
	if err := cursor.All(ctx, &projects); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode projects"})
		return
	}

	c.JSON(http.StatusOK, projects)
}

// Helper function to parse int
func parseInt(s string) (int, error) {
	var n int
	_, err := fmt.Sscanf(s, "%d", &n)
	return n, err
}
