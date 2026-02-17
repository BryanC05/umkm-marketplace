package handlers

import (
	"context"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo/options"
	"msme-marketplace/internal/database"
	"msme-marketplace/internal/models"
)

type UserHandler struct{}

func NewUserHandler() *UserHandler {
	return &UserHandler{}
}

func (h *UserHandler) GetProfile(c *gin.Context) {
	userID := c.GetString("userID")
	objID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid user ID"})
		return
	}

	collection := database.GetDB().Collection("users")
	var user models.User
	err = collection.FindOne(context.Background(), bson.M{"_id": objID}).Decode(&user)
	if err != nil {
		c.JSON(404, gin.H{"message": "User not found"})
		return
	}

	c.JSON(200, user)
}

func (h *UserHandler) UpdateProfile(c *gin.Context) {
	userID := c.GetString("userID")
	objID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid user ID"})
		return
	}

	var updates bson.M
	if err := c.ShouldBindJSON(&updates); err != nil {
		c.JSON(400, gin.H{"message": err.Error()})
		return
	}

	delete(updates, "password")
	delete(updates, "role")

	if len(updates) == 0 {
		c.JSON(400, gin.H{"message": "No updates provided"})
		return
	}

	collection := database.GetDB().Collection("users")
	_, err = collection.UpdateOne(
		context.Background(),
		bson.M{"_id": objID},
		bson.M{"$set": updates},
	)
	if err != nil {
		c.JSON(500, gin.H{"message": "Failed to update profile"})
		return
	}

	var user models.User
	err = collection.FindOne(context.Background(), bson.M{"_id": objID}).Decode(&user)
	if err != nil {
		c.JSON(500, gin.H{"message": "Failed to get updated user"})
		return
	}

	c.JSON(200, user)
}

func (h *UserHandler) GetSellersCount(c *gin.Context) {
	collection := database.GetDB().Collection("users")
	count, err := collection.CountDocuments(context.Background(), bson.M{
		"isSeller":   true,
		"isVerified": true,
	})
	if err != nil {
		c.JSON(500, gin.H{"message": err.Error()})
		return
	}

	c.JSON(200, gin.H{"count": count})
}

func (h *UserHandler) GetNearbySellers(c *gin.Context) {
	lat := c.Query("lat")
	lng := c.Query("lng")
	radiusStr := c.DefaultQuery("radius", "10000")

	if lat == "" || lng == "" {
		c.JSON(400, gin.H{"message": "Latitude and longitude are required"})
		return
	}

	latFloat, err := strconv.ParseFloat(lat, 64)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid latitude"})
		return
	}
	lngFloat, err := strconv.ParseFloat(lng, 64)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid longitude"})
		return
	}

	radius, err := strconv.Atoi(radiusStr)
	if err != nil {
		radius = 10000
	}

	collection := database.GetDB().Collection("users")

	filter := bson.M{
		"isSeller": true,
		"location": bson.M{
			"$near": bson.M{
				"$geometry": bson.M{
					"type":        "Point",
					"coordinates": []float64{lngFloat, latFloat},
				},
				"$maxDistance": radius,
			},
		},
	}

	opts := options.Find().SetProjection(bson.D{
		{Key: "name", Value: 1},
		{Key: "businessName", Value: 1},
		{Key: "rating", Value: 1},
		{Key: "location", Value: 1},
		{Key: "businessType", Value: 1},
		{Key: "profileImage", Value: 1},
	}).SetLimit(50)

	cursor, err := collection.Find(context.Background(), filter, opts)
	if err != nil {
		c.JSON(500, gin.H{"message": err.Error()})
		return
	}
	defer cursor.Close(context.Background())

	var sellers []models.User
	if err := cursor.All(context.Background(), &sellers); err != nil {
		c.JSON(500, gin.H{"message": err.Error()})
		return
	}

	c.JSON(200, sellers)
}

func (h *UserHandler) GetSellerByID(c *gin.Context) {
	sellerID := c.Param("id")
	objID, err := primitive.ObjectIDFromHex(sellerID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid seller ID"})
		return
	}

	collection := database.GetDB().Collection("users")
	var seller models.User
	err = collection.FindOne(context.Background(), bson.M{"_id": objID}).Decode(&seller)
	if err != nil {
		c.JSON(404, gin.H{"message": "User not found"})
		return
	}

	c.JSON(200, gin.H{
		"_id":          seller.ID.Hex(),
		"name":         seller.Name,
		"businessName": seller.BusinessName,
		"businessType": seller.BusinessType,
		"rating":       seller.Rating,
		"location":     seller.Location,
		"profileImage": seller.ProfileImage,
		"isVerified":   seller.IsVerified,
		"isSeller":     seller.IsSeller,
		"email":        seller.Email,
		"phone":        seller.Phone,
		"createdAt":    seller.CreatedAt,
	})
}

func (h *UserHandler) GetSavedProducts(c *gin.Context) {
	userID := c.GetString("userID")
	objID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid user ID"})
		return
	}

	collection := database.GetDB().Collection("users")
	var user models.User
	err = collection.FindOne(context.Background(), bson.M{"_id": objID}).Decode(&user)
	if err != nil {
		c.JSON(404, gin.H{"message": "User not found"})
		return
	}

	if len(user.SavedProducts) == 0 {
		c.JSON(200, []models.Product{})
		return
	}

	productsCollection := database.GetDB().Collection("products")
	cursor, err := productsCollection.Find(context.Background(), bson.M{
		"_id": bson.M{"$in": user.SavedProducts},
	})
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

func (h *UserHandler) SaveProduct(c *gin.Context) {
	userID := c.GetString("userID")
	productID := c.Param("productId")

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

	productsCollection := database.GetDB().Collection("products")
	var product models.Product
	err = productsCollection.FindOne(context.Background(), bson.M{"_id": productObjID}).Decode(&product)
	if err != nil {
		c.JSON(404, gin.H{"message": "Product not found"})
		return
	}

	usersCollection := database.GetDB().Collection("users")
	var user models.User
	err = usersCollection.FindOne(context.Background(), bson.M{"_id": userObjID}).Decode(&user)
	if err != nil {
		c.JSON(404, gin.H{"message": "User not found"})
		return
	}

	for _, id := range user.SavedProducts {
		if id == productObjID {
			c.JSON(400, gin.H{"message": "Product already saved"})
			return
		}
	}

	_, err = usersCollection.UpdateOne(
		context.Background(),
		bson.M{"_id": userObjID},
		bson.M{"$push": bson.M{"savedProducts": productObjID}},
	)
	if err != nil {
		c.JSON(500, gin.H{"message": "Failed to save product"})
		return
	}

	c.JSON(200, gin.H{"message": "Product saved successfully"})
}

func (h *UserHandler) UnsaveProduct(c *gin.Context) {
	userID := c.GetString("userID")
	productID := c.Param("productId")

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

	usersCollection := database.GetDB().Collection("users")
	_, err = usersCollection.UpdateOne(
		context.Background(),
		bson.M{"_id": userObjID},
		bson.M{"$pull": bson.M{"savedProducts": productObjID}},
	)
	if err != nil {
		c.JSON(500, gin.H{"message": "Failed to unsave product"})
		return
	}

	c.JSON(200, gin.H{"message": "Product removed from saved list"})
}

func (h *UserHandler) CheckSavedProduct(c *gin.Context) {
	userID := c.GetString("userID")
	productID := c.Param("productId")

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

	usersCollection := database.GetDB().Collection("users")
	var user models.User
	err = usersCollection.FindOne(context.Background(), bson.M{"_id": userObjID}).Decode(&user)
	if err != nil {
		c.JSON(404, gin.H{"message": "User not found"})
		return
	}

	isSaved := false
	for _, id := range user.SavedProducts {
		if id == productObjID {
			isSaved = true
			break
		}
	}

	c.JSON(200, gin.H{"isSaved": isSaved})
}
