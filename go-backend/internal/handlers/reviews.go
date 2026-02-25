package handlers

import (
	"context"
	"net/http"
	"time"

	"msme-marketplace/internal/database"
	"msme-marketplace/internal/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type ReviewHandler struct{}

func NewReviewHandler() *ReviewHandler {
	return &ReviewHandler{}
}

// CreateReview adds a review for a product
func (h *ReviewHandler) CreateReview(c *gin.Context) {
	userID := c.GetString("userID")
	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	var req struct {
		ProductID string   `json:"productId" binding:"required"`
		Rating    int      `json:"rating" binding:"required"`
		Comment   string   `json:"comment"`
		Images    []string `json:"images"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Rating < 1 || req.Rating > 5 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Rating must be between 1 and 5"})
		return
	}

	productObjID, err := primitive.ObjectIDFromHex(req.ProductID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
		return
	}

	// Check product exists
	productsCollection := database.GetDB().Collection("products")
	var product models.Product
	err = productsCollection.FindOne(context.Background(), bson.M{"_id": productObjID}).Decode(&product)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Product not found"})
		return
	}

	// Check user hasn't already reviewed this product
	reviewsCollection := database.GetDB().Collection("reviews")
	count, _ := reviewsCollection.CountDocuments(context.Background(), bson.M{
		"product": productObjID,
		"user":    userObjID,
	})
	if count > 0 {
		c.JSON(http.StatusConflict, gin.H{"error": "You have already reviewed this product"})
		return
	}

	// Get user name
	usersCollection := database.GetDB().Collection("users")
	var user models.User
	usersCollection.FindOne(context.Background(), bson.M{"_id": userObjID}).Decode(&user)

	review := models.Review{
		Product:   productObjID,
		User:      userObjID,
		UserName:  user.Name,
		Rating:    req.Rating,
		Comment:   req.Comment,
		Images:    req.Images,
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	result, err := reviewsCollection.InsertOne(context.Background(), review)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create review"})
		return
	}
	review.ID = result.InsertedID.(primitive.ObjectID)

	// Recalculate product rating
	go recalculateProductRating(productObjID)

	c.JSON(http.StatusCreated, review)
}

// GetProductReviews returns reviews for a product
func (h *ReviewHandler) GetProductReviews(c *gin.Context) {
	productID := c.Param("productId")
	productObjID, err := primitive.ObjectIDFromHex(productID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid product ID"})
		return
	}

	reviewsCollection := database.GetDB().Collection("reviews")
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetLimit(50)
	cursor, err := reviewsCollection.Find(context.Background(), bson.M{"product": productObjID}, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reviews"})
		return
	}
	defer cursor.Close(context.Background())

	var reviews []models.Review
	if err := cursor.All(context.Background(), &reviews); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode reviews"})
		return
	}

	if reviews == nil {
		reviews = []models.Review{}
	}

	c.JSON(http.StatusOK, reviews)
}

// GetMyReviews returns the current user's reviews
func (h *ReviewHandler) GetMyReviews(c *gin.Context) {
	userID := c.GetString("userID")
	userObjID, _ := primitive.ObjectIDFromHex(userID)

	reviewsCollection := database.GetDB().Collection("reviews")
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})
	cursor, err := reviewsCollection.Find(context.Background(), bson.M{"user": userObjID}, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reviews"})
		return
	}
	defer cursor.Close(context.Background())

	var reviews []models.Review
	if err := cursor.All(context.Background(), &reviews); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to decode reviews"})
		return
	}

	if reviews == nil {
		reviews = []models.Review{}
	}

	c.JSON(http.StatusOK, reviews)
}

// DeleteReview deletes a user's own review
func (h *ReviewHandler) DeleteReview(c *gin.Context) {
	userID := c.GetString("userID")
	userObjID, _ := primitive.ObjectIDFromHex(userID)
	reviewID := c.Param("id")
	reviewObjID, err := primitive.ObjectIDFromHex(reviewID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid review ID"})
		return
	}

	reviewsCollection := database.GetDB().Collection("reviews")
	var review models.Review
	err = reviewsCollection.FindOne(context.Background(), bson.M{"_id": reviewObjID}).Decode(&review)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Review not found"})
		return
	}

	if review.User != userObjID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not authorized to delete this review"})
		return
	}

	reviewsCollection.DeleteOne(context.Background(), bson.M{"_id": reviewObjID})

	// Recalculate product rating
	go recalculateProductRating(review.Product)

	c.JSON(http.StatusOK, gin.H{"message": "Review deleted"})
}

// recalculateProductRating updates the product's average rating and total reviews
func recalculateProductRating(productID primitive.ObjectID) {
	reviewsCollection := database.GetDB().Collection("reviews")
	cursor, err := reviewsCollection.Find(context.Background(), bson.M{"product": productID})
	if err != nil {
		return
	}
	defer cursor.Close(context.Background())

	var reviews []models.Review
	if err := cursor.All(context.Background(), &reviews); err != nil {
		return
	}

	totalReviews := len(reviews)
	avgRating := 0.0
	if totalReviews > 0 {
		sum := 0
		for _, r := range reviews {
			sum += r.Rating
		}
		avgRating = float64(sum) / float64(totalReviews)
	}

	productsCollection := database.GetDB().Collection("products")
	productsCollection.UpdateOne(context.Background(), bson.M{"_id": productID}, bson.M{
		"$set": bson.M{
			"rating":       avgRating,
			"totalReviews": totalReviews,
		},
	})
}
