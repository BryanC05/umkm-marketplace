package handlers

import (
	"context"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
	"msme-marketplace/internal/database"
	"msme-marketplace/internal/models"
)

type ProductHandler struct {
	MaxImageCount int
}

func NewProductHandler() *ProductHandler {
	maxImageCount := 4
	if raw := os.Getenv("PRODUCT_IMAGE_MAX_COUNT"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			maxImageCount = parsed
		}
	}
	return &ProductHandler{MaxImageCount: maxImageCount}
}

func (h *ProductHandler) GetProducts(c *gin.Context) {
	lat := c.Query("lat")
	lng := c.Query("lng")
	radiusStr := c.DefaultQuery("radius", "5000")
	category := c.Query("category")
	search := c.Query("search")
	minPrice := c.Query("minPrice")
	maxPrice := c.Query("maxPrice")
	sort := c.DefaultQuery("sort", "newest")
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "20")

	page, _ := strconv.Atoi(pageStr)
	limit, _ := strconv.Atoi(limitStr)
	skip := (page - 1) * limit

	query := bson.M{"isAvailable": true}

	if category != "" {
		query["category"] = category
	}

	if search != "" {
		query["$text"] = bson.M{"$search": search}
	}

	if minPrice != "" || maxPrice != "" {
		priceQuery := bson.M{}
		if minPrice != "" {
			priceQuery["$gte"], _ = strconv.ParseFloat(minPrice, 64)
		}
		if maxPrice != "" {
			priceQuery["$lte"], _ = strconv.ParseFloat(maxPrice, 64)
		}
		query["price"] = priceQuery
	}

	sortMap := bson.M{}
	switch sort {
	case "rating":
		sortMap = bson.M{"rating": -1, "createdAt": -1}
	case "price-low":
		sortMap = bson.M{"price": 1}
	case "price-high":
		sortMap = bson.M{"price": -1}
	case "newest":
		sortMap = bson.M{"createdAt": -1}
	default:
		sortMap = bson.M{"createdAt": -1}
	}

	collection := database.GetDB().Collection("products")

	opts := options.Find().
		SetSort(sortMap).
		SetSkip(int64(skip)).
		SetLimit(int64(limit))

	if lat != "" && lng != "" {
		query["location"] = bson.M{
			"$near": bson.M{
				"$geometry": bson.M{
					"type":        "Point",
					"coordinates": []interface{}{lng, lat},
				},
				"$maxDistance": radiusStr,
			},
		}
	}

	cursor, err := collection.Find(context.Background(), query, opts)
	if err != nil {
		c.JSON(500, gin.H{"message": err.Error()})
		return
	}
	defer cursor.Close(context.Background())

	var products []models.Product
	if err := cursor.All(context.Background(), &products); err != nil {
		c.JSON(500, gin.H{"message": err.Error()})
		return
	}

	total, _ := collection.CountDocuments(context.Background(), query)

	c.JSON(200, gin.H{
		"products": products,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
			"pages": (total + int64(limit) - 1) / int64(limit),
		},
	})
}

func (h *ProductHandler) GetProductByID(c *gin.Context) {
	productID := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(productID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid product ID"})
		return
	}

	collection := database.GetDB().Collection("products")
	var product models.Product
	err = collection.FindOne(context.Background(), bson.M{"_id": objID}).Decode(&product)
	if err != nil {
		c.JSON(404, gin.H{"message": "Product not found"})
		return
	}

	c.JSON(200, product)
}

func (h *ProductHandler) CreateProduct(c *gin.Context) {
	userID := c.GetString("userID")
	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid user ID"})
		return
	}

	var req struct {
		Name            string               `json:"name" binding:"required"`
		Description     string               `json:"description" binding:"required"`
		Price           float64              `json:"price" binding:"required"`
		Category        string               `json:"category" binding:"required"`
		Stock           int                  `json:"stock"`
		Unit            string               `json:"unit"`
		Images          []string             `json:"images"`
		Tags            []string             `json:"tags"`
		CurrentLocation models.Location      `json:"currentLocation"`
		HasVariants     bool                 `json:"hasVariants"`
		Variants        []models.Variant     `json:"variants"`
		OptionGroups    []models.OptionGroup `json:"optionGroups"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"message": err.Error()})
		return
	}

	if len(req.Images) > h.MaxImageCount {
		c.JSON(400, gin.H{
			"message":       "Too many images",
			"maxImageCount": h.MaxImageCount,
		})
		return
	}

	usersCollection := database.GetDB().Collection("users")
	var user models.User
	err = usersCollection.FindOne(context.Background(), bson.M{"_id": userObjID}).Decode(&user)
	if err != nil {
		c.JSON(404, gin.H{"message": "User not found"})
		return
	}

	hasValidProfileLocation := len(user.Location.Coordinates) == 2 &&
		(user.Location.Coordinates[0] != 0 || user.Location.Coordinates[1] != 0)
	hasValidCurrentLocation := len(req.CurrentLocation.Coordinates) == 2 &&
		(req.CurrentLocation.Coordinates[0] != 0 || req.CurrentLocation.Coordinates[1] != 0)

	var productLocation models.Location

	if hasValidProfileLocation {
		productLocation = models.Location{
			Type:        "Point",
			Coordinates: user.Location.Coordinates,
			Address:     user.Location.Address,
			City:        user.Location.City,
			State:       user.Location.State,
		}
	} else if hasValidCurrentLocation {
		productLocation = models.Location{
			Type:        "Point",
			Coordinates: req.CurrentLocation.Coordinates,
			Address:     req.CurrentLocation.Address,
			City:        req.CurrentLocation.City,
			State:       req.CurrentLocation.State,
		}
	} else {
		c.JSON(400, gin.H{
			"message": "Location required. Please enable location access or update your profile with a valid address.",
		})
		return
	}

	// Keep seller profile discoverable for nearby-seller lookups.
	// If a user creates a product, mark as seller and backfill profile location when missing.
	userUpdates := bson.M{}
	if !user.IsSeller {
		userUpdates["isSeller"] = true
	}
	if !hasValidProfileLocation && hasValidCurrentLocation {
		userUpdates["location"] = productLocation
	}
	if len(userUpdates) > 0 {
		userUpdates["updatedAt"] = time.Now()
		_, _ = usersCollection.UpdateOne(
			context.Background(),
			bson.M{"_id": userObjID},
			bson.M{"$set": userUpdates},
		)
	}

	unit := "pieces"
	if req.Unit != "" {
		unit = req.Unit
	}

	product := models.Product{
		Name:         req.Name,
		Description:  req.Description,
		Price:        req.Price,
		Category:     req.Category,
		Stock:        req.Stock,
		Unit:         unit,
		Images:       req.Images,
		Seller:       userObjID,
		Location:     productLocation,
		Tags:         req.Tags,
		HasVariants:  req.HasVariants,
		Variants:     req.Variants,
		OptionGroups: req.OptionGroups,
		IsAvailable:  true,
	}

	collection := database.GetDB().Collection("products")
	result, err := collection.InsertOne(context.Background(), product)
	if err != nil {
		c.JSON(500, gin.H{"message": "Failed to create product"})
		return
	}

	product.ID = result.InsertedID.(primitive.ObjectID)
	c.JSON(201, product)
}

func (h *ProductHandler) UpdateProduct(c *gin.Context) {
	userID := c.GetString("userID")
	productID := c.Param("id")

	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid user ID"})
		return
	}

	productObjID, err := primitive.ObjectIDFromHex(productID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid product ID"})
		return
	}

	var updates bson.M
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(400, gin.H{"message": err.Error()})
		return
	}

	if imagesRaw, ok := updates["images"]; ok {
		switch typed := imagesRaw.(type) {
		case []interface{}:
			if len(typed) > h.MaxImageCount {
				c.JSON(400, gin.H{
					"message":       "Too many images",
					"maxImageCount": h.MaxImageCount,
				})
				return
			}
		case []string:
			if len(typed) > h.MaxImageCount {
				c.JSON(400, gin.H{
					"message":       "Too many images",
					"maxImageCount": h.MaxImageCount,
				})
				return
			}
		}
	}

	collection := database.GetDB().Collection("products")
	var product models.Product
	err = collection.FindOne(context.Background(), bson.M{"_id": productObjID, "seller": userObjID}).Decode(&product)
	if err != nil {
		c.JSON(404, gin.H{"message": "Product not found or unauthorized"})
		return
	}

	_, err = collection.UpdateOne(
		context.Background(),
		bson.M{"_id": productObjID},
		bson.M{"$set": updates},
	)
	if err != nil {
		c.JSON(500, gin.H{"message": "Failed to update product"})
		return
	}

	var updatedProduct models.Product
	collection.FindOne(context.Background(), bson.M{"_id": productObjID}).Decode(&updatedProduct)

	c.JSON(200, updatedProduct)
}

func (h *ProductHandler) DeleteProduct(c *gin.Context) {
	userID := c.GetString("userID")
	productID := c.Param("id")

	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid user ID"})
		return
	}

	productObjID, err := primitive.ObjectIDFromHex(productID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid product ID"})
		return
	}

	collection := database.GetDB().Collection("products")
	result, err := collection.DeleteOne(context.Background(), bson.M{"_id": productObjID, "seller": userObjID})
	if err != nil {
		c.JSON(500, gin.H{"message": "Failed to delete product"})
		return
	}

	if result.DeletedCount == 0 {
		c.JSON(404, gin.H{"message": "Product not found or unauthorized"})
		return
	}

	c.JSON(200, gin.H{"message": "Product deleted successfully"})
}

func (h *ProductHandler) GetMyProducts(c *gin.Context) {
	userID := c.GetString("userID")
	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid user ID"})
		return
	}

	collection := database.GetDB().Collection("products")
	cursor, err := collection.Find(context.Background(), bson.M{"seller": userObjID})
	if err != nil {
		c.JSON(500, gin.H{"message": err.Error()})
		return
	}
	defer cursor.Close(context.Background())

	var products []models.Product
	if err := cursor.All(context.Background(), &products); err != nil {
		c.JSON(500, gin.H{"message": err.Error()})
		return
	}

	c.JSON(200, products)
}

func (h *ProductHandler) GetProductsBySeller(c *gin.Context) {
	sellerID := c.Param("sellerId")
	sellerObjID, err := primitive.ObjectIDFromHex(sellerID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid seller ID"})
		return
	}

	collection := database.GetDB().Collection("products")
	cursor, err := collection.Find(context.Background(), bson.M{"seller": sellerObjID})
	if err != nil {
		c.JSON(500, gin.H{"message": err.Error()})
		return
	}
	defer cursor.Close(context.Background())

	var products []models.Product
	if err := cursor.All(context.Background(), &products); err != nil {
		c.JSON(500, gin.H{"message": err.Error()})
		return
	}

	c.JSON(200, products)
}

func (h *ProductHandler) GetCategoryCounts(c *gin.Context) {
	collection := database.GetDB().Collection("products")

	pipeline := []bson.M{
		{"$match": bson.M{"isAvailable": true}},
		{"$group": bson.M{"_id": "$category", "count": bson.M{"$sum": 1}}},
		{"$sort": bson.M{"count": -1}},
	}

	cursor, err := collection.Aggregate(context.Background(), pipeline)
	if err != nil {
		c.JSON(500, gin.H{"message": err.Error()})
		return
	}
	defer cursor.Close(context.Background())

	categoryCounts := make(map[string]int)
	for cursor.Next(context.Background()) {
		var result struct {
			ID    string `bson:"_id"`
			Count int    `bson:"count"`
		}
		cursor.Decode(&result)
		categoryCounts[result.ID] = result.Count
	}

	c.JSON(200, categoryCounts)
}
