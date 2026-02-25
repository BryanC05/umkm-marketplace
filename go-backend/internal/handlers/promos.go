package handlers

import (
	"context"
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

type PromoHandler struct{}

func NewPromoHandler() *PromoHandler {
	return &PromoHandler{}
}

// CreatePromo creates a new promo code for the seller
func (h *PromoHandler) CreatePromo(c *gin.Context) {
	userID := c.GetString("userID")
	userObjID, _ := primitive.ObjectIDFromHex(userID)

	var req struct {
		Code           string     `json:"code" binding:"required"`
		DiscountType   string     `json:"discountType" binding:"required"`
		DiscountValue  float64    `json:"discountValue" binding:"required"`
		MinOrderAmount float64    `json:"minOrderAmount"`
		MaxUses        int        `json:"maxUses"`
		ExpiresAt      *time.Time `json:"expiresAt"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.DiscountType != "percentage" && req.DiscountType != "fixed" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "discountType must be 'percentage' or 'fixed'"})
		return
	}

	promo := models.PromoCode{
		Seller:         userObjID,
		Code:           strings.ToUpper(strings.TrimSpace(req.Code)),
		DiscountType:   req.DiscountType,
		DiscountValue:  req.DiscountValue,
		MinOrderAmount: req.MinOrderAmount,
		MaxUses:        req.MaxUses,
		IsActive:       true,
		ExpiresAt:      req.ExpiresAt,
		CreatedAt:      time.Now(),
	}

	col := database.GetDB().Collection("promos")
	result, err := col.InsertOne(context.Background(), promo)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create promo"})
		return
	}
	promo.ID = result.InsertedID.(primitive.ObjectID)
	c.JSON(http.StatusCreated, promo)
}

// GetMyPromos returns promos created by the seller
func (h *PromoHandler) GetMyPromos(c *gin.Context) {
	userID := c.GetString("userID")
	userObjID, _ := primitive.ObjectIDFromHex(userID)

	col := database.GetDB().Collection("promos")
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}})
	cursor, err := col.Find(context.Background(), bson.M{"seller": userObjID}, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch promos"})
		return
	}
	defer cursor.Close(context.Background())

	var promos []models.PromoCode
	cursor.All(context.Background(), &promos)
	if promos == nil {
		promos = []models.PromoCode{}
	}
	c.JSON(http.StatusOK, promos)
}

// ValidatePromo validates and returns discount info for a promo code
func (h *PromoHandler) ValidatePromo(c *gin.Context) {
	var req struct {
		Code       string  `json:"code" binding:"required"`
		SellerID   string  `json:"sellerId" binding:"required"`
		OrderTotal float64 `json:"orderTotal"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	sellerObjID, _ := primitive.ObjectIDFromHex(req.SellerID)
	col := database.GetDB().Collection("promos")
	var promo models.PromoCode
	err := col.FindOne(context.Background(), bson.M{
		"code":     strings.ToUpper(req.Code),
		"seller":   sellerObjID,
		"isActive": true,
	}).Decode(&promo)

	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Invalid promo code"})
		return
	}

	if promo.ExpiresAt != nil && promo.ExpiresAt.Before(time.Now()) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Promo code has expired"})
		return
	}

	if promo.MaxUses > 0 && promo.CurrentUses >= promo.MaxUses {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Promo code has reached max uses"})
		return
	}

	if req.OrderTotal < promo.MinOrderAmount {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Order total below minimum amount"})
		return
	}

	discount := promo.DiscountValue
	if promo.DiscountType == "percentage" {
		discount = req.OrderTotal * promo.DiscountValue / 100
	}

	c.JSON(http.StatusOK, gin.H{
		"valid":         true,
		"discountType":  promo.DiscountType,
		"discountValue": promo.DiscountValue,
		"discount":      discount,
		"promoId":       promo.ID,
	})
}

// DeletePromo deletes a promo code
func (h *PromoHandler) DeletePromo(c *gin.Context) {
	userID := c.GetString("userID")
	userObjID, _ := primitive.ObjectIDFromHex(userID)
	promoID := c.Param("id")
	promoObjID, _ := primitive.ObjectIDFromHex(promoID)

	col := database.GetDB().Collection("promos")
	result, err := col.DeleteOne(context.Background(), bson.M{"_id": promoObjID, "seller": userObjID})
	if err != nil || result.DeletedCount == 0 {
		c.JSON(http.StatusNotFound, gin.H{"error": "Promo not found"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Promo deleted"})
}
