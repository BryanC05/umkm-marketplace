package handlers

import (
	"context"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"strconv"
	"time"

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

func hasValidCoordinates(coords []float64) bool {
	return len(coords) == 2 && (coords[0] != 0 || coords[1] != 0)
}

func hasValidLocation(location models.Location) bool {
	return hasValidCoordinates(location.Coordinates)
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

	seenSellers := make(map[primitive.ObjectID]struct{}, len(sellers))
	for _, seller := range sellers {
		seenSellers[seller.ID] = struct{}{}
	}

	// Fallback: also discover sellers from nearby products.
	// This handles cases where a seller has product coordinates but no profile coordinates yet.
	type productSellerLocation struct {
		Seller   primitive.ObjectID `bson:"seller"`
		Location models.Location    `bson:"location"`
	}

	productsCollection := database.GetDB().Collection("products")
	productFilter := bson.M{
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
	productOpts := options.Find().
		SetProjection(bson.D{
			{Key: "seller", Value: 1},
			{Key: "location", Value: 1},
		}).
		SetLimit(250)

	fallbackLocationBySeller := make(map[primitive.ObjectID]models.Location)
	var fallbackSellerOrder []primitive.ObjectID

	if productCursor, err := productsCollection.Find(context.Background(), productFilter, productOpts); err == nil {
		defer productCursor.Close(context.Background())

		var nearbyProducts []productSellerLocation
		if err := productCursor.All(context.Background(), &nearbyProducts); err == nil {
			for _, product := range nearbyProducts {
				if product.Seller.IsZero() {
					continue
				}
				if _, alreadyIncluded := seenSellers[product.Seller]; alreadyIncluded {
					continue
				}
				if _, captured := fallbackLocationBySeller[product.Seller]; captured {
					continue
				}
				if !hasValidLocation(product.Location) {
					continue
				}
				if product.Location.Type == "" {
					product.Location.Type = "Point"
				}
				fallbackLocationBySeller[product.Seller] = product.Location
				fallbackSellerOrder = append(fallbackSellerOrder, product.Seller)
			}
		}
	}

	if len(fallbackSellerOrder) > 0 {
		fallbackFilter := bson.M{
			"_id": bson.M{"$in": fallbackSellerOrder},
		}
		fallbackOpts := options.Find().
			SetProjection(bson.D{
				{Key: "name", Value: 1},
				{Key: "businessName", Value: 1},
				{Key: "rating", Value: 1},
				{Key: "location", Value: 1},
				{Key: "businessType", Value: 1},
				{Key: "profileImage", Value: 1},
				{Key: "isSeller", Value: 1},
			}).
			SetLimit(int64(len(fallbackSellerOrder)))

		if fallbackCursor, err := collection.Find(context.Background(), fallbackFilter, fallbackOpts); err == nil {
			defer fallbackCursor.Close(context.Background())

			var fallbackUsers []models.User
			if err := fallbackCursor.All(context.Background(), &fallbackUsers); err == nil {
				userByID := make(map[primitive.ObjectID]models.User, len(fallbackUsers))
				for _, user := range fallbackUsers {
					if !hasValidLocation(user.Location) {
						if fallbackLocation, ok := fallbackLocationBySeller[user.ID]; ok {
							user.Location = fallbackLocation
						}
					}
					if !hasValidLocation(user.Location) {
						continue
					}
					userByID[user.ID] = user
				}

				for _, sellerID := range fallbackSellerOrder {
					if _, alreadyIncluded := seenSellers[sellerID]; alreadyIncluded {
						continue
					}
					if user, ok := userByID[sellerID]; ok {
						sellers = append(sellers, user)
						seenSellers[sellerID] = struct{}{}
					}
				}
			}
		}
	}

	if len(sellers) > 50 {
		sellers = sellers[:50]
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

const MembershipFee = 10000 // Rp 10,000 per month

// SubmitMembershipPayment allows sellers to submit payment proof
func (h *UserHandler) SubmitMembershipPayment(c *gin.Context) {
	userID := c.GetString("userID")
	objID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid user ID"})
		return
	}

	// Check if user is a seller
	collection := database.GetDB().Collection("users")
	var user models.User
	err = collection.FindOne(context.Background(), bson.M{"_id": objID}).Decode(&user)
	if err != nil {
		c.JSON(404, gin.H{"error": "User not found"})
		return
	}

	if !user.IsSeller {
		c.JSON(403, gin.H{"error": "Only sellers can submit membership payment"})
		return
	}

	// Parse multipart form
	err = c.Request.ParseMultipartForm(10 << 20) // 10MB max
	if err != nil {
		c.JSON(400, gin.H{"error": "Failed to parse form data"})
		return
	}

	file, header, err := c.Request.FormFile("paymentProof")
	if err != nil {
		c.JSON(400, gin.H{"error": "Payment proof is required"})
		return
	}
	defer file.Close()

	// Save file locally
	uploadDir := "./uploads/membership/" + userID
	if err := os.MkdirAll(uploadDir, 0755); err != nil {
		c.JSON(500, gin.H{"error": "Failed to create upload directory"})
		return
	}

	// Generate unique filename
	ext := filepath.Ext(header.Filename)
	filename := fmt.Sprintf("payment_%d%s", time.Now().Unix(), ext)
	filepath := uploadDir + "/" + filename

	out, err := os.Create(filepath)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to save file"})
		return
	}
	defer out.Close()

	if _, err := io.Copy(out, file); err != nil {
		c.JSON(500, gin.H{"error": "Failed to save file"})
		return
	}

	// URL to serve the file
	url := fmt.Sprintf("/uploads/membership/%s/%s", userID, filename)

	// Update user with payment info
	now := time.Now()
	update := bson.M{
		"$set": bson.M{
			"paymentProof":       url,
			"paymentSubmittedAt": now,
			"membershipStatus":   "pending",
			"updatedAt":          now,
		},
	}

	_, err = collection.UpdateOne(context.Background(), bson.M{"_id": objID}, update)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to update membership status"})
		return
	}

	c.JSON(200, gin.H{
		"message":      "Payment submitted successfully. Please wait for admin approval.",
		"paymentProof": url,
		"amount":       MembershipFee,
		"submittedAt":  now,
		"status":       "pending",
	})
}

// GetMembershipStatus returns the current user's membership status
func (h *UserHandler) GetMembershipStatus(c *gin.Context) {
	userID := c.GetString("userID")
	objID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid user ID"})
		return
	}

	collection := database.GetDB().Collection("users")
	var user models.User
	err = collection.FindOne(context.Background(), bson.M{"_id": objID}).Decode(&user)
	if err != nil {
		c.JSON(404, gin.H{"error": "User not found"})
		return
	}

	// Check if membership has expired
	if user.IsMember && user.MemberExpiry != nil && time.Now().After(*user.MemberExpiry) {
		// Auto-expire membership
		collection.UpdateOne(context.Background(), bson.M{"_id": objID}, bson.M{
			"$set": bson.M{
				"isMember":         false,
				"membershipStatus": "expired",
				"updatedAt":        time.Now(),
			},
		})
		user.IsMember = false
		user.MembershipStatus = "expired"
	}

	c.JSON(200, gin.H{
		"isMember":         user.IsMember,
		"membershipStatus": user.MembershipStatus,
		"memberSince":      user.MemberSince,
		"memberExpiry":     user.MemberExpiry,
		"paymentProof":     user.PaymentProof,
		"monthlyFee":       MembershipFee,
		"isSeller":         user.IsSeller,
	})
}

// GetPendingMemberships returns all pending membership requests (for admin)
func (h *UserHandler) GetPendingMemberships(c *gin.Context) {
	collection := database.GetDB().Collection("users")

	cur, err := collection.Find(context.Background(), bson.M{
		"isSeller":         true,
		"membershipStatus": "pending",
	})
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to fetch pending memberships"})
		return
	}
	defer cur.Close(context.Background())

	var users []models.User
	if err := cur.All(context.Background(), &users); err != nil {
		c.JSON(500, gin.H{"error": "Failed to decode users"})
		return
	}

	// Return minimal info
	type PendingMember struct {
		ID                 primitive.ObjectID `json:"_id"`
		Name               string             `json:"name"`
		Email              string             `json:"email"`
		BusinessName       *string            `json:"businessName"`
		PaymentProof       *string            `json:"paymentProof"`
		PaymentSubmittedAt *time.Time         `json:"paymentSubmittedAt"`
		CreatedAt          time.Time          `json:"createdAt"`
	}

	pending := make([]PendingMember, 0)
	for _, u := range users {
		pending = append(pending, PendingMember{
			ID:                 u.ID,
			Name:               u.Name,
			Email:              u.Email,
			BusinessName:       u.BusinessName,
			PaymentProof:       u.PaymentProof,
			PaymentSubmittedAt: u.PaymentSubmittedAt,
			CreatedAt:          u.CreatedAt,
		})
	}

	c.JSON(200, pending)
}

// ApproveMembership approves a seller's membership (for admin)
func (h *UserHandler) ApproveMembership(c *gin.Context) {
	memberID := c.Param("memberId")
	objID, err := primitive.ObjectIDFromHex(memberID)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid member ID"})
		return
	}

	collection := database.GetDB().Collection("users")

	now := time.Now()
	expiry := now.AddDate(0, 1, 0) // 1 month from now

	update := bson.M{
		"$set": bson.M{
			"isMember":           true,
			"membershipStatus":   "active",
			"memberSince":        now,
			"memberExpiry":       expiry,
			"paymentProof":       nil, // Clear after approval
			"paymentSubmittedAt": nil,
			"updatedAt":          now,
		},
	}

	result, err := collection.UpdateOne(context.Background(), bson.M{"_id": objID}, update)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to approve membership"})
		return
	}

	if result.MatchedCount == 0 {
		c.JSON(404, gin.H{"error": "User not found"})
		return
	}

	c.JSON(200, gin.H{
		"message":      "Membership approved successfully",
		"memberSince":  now,
		"memberExpiry": expiry,
	})
}

// RejectMembership rejects a seller's membership (for admin)
func (h *UserHandler) RejectMembership(c *gin.Context) {
	memberID := c.Param("memberId")
	objID, err := primitive.ObjectIDFromHex(memberID)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid member ID"})
		return
	}

	collection := database.GetDB().Collection("users")

	now := time.Now()
	update := bson.M{
		"$set": bson.M{
			"membershipStatus":   "rejected",
			"paymentProof":       nil,
			"paymentSubmittedAt": nil,
			"updatedAt":          now,
		},
	}

	result, err := collection.UpdateOne(context.Background(), bson.M{"_id": objID}, update)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to reject membership"})
		return
	}

	if result.MatchedCount == 0 {
		c.JSON(404, gin.H{"error": "User not found"})
		return
	}

	c.JSON(200, gin.H{"message": "Membership rejected"})
}

// ExtendMembership extends a seller's membership by 1 month (for admin)
func (h *UserHandler) ExtendMembership(c *gin.Context) {
	memberID := c.Param("memberId")
	objID, err := primitive.ObjectIDFromHex(memberID)
	if err != nil {
		c.JSON(400, gin.H{"error": "Invalid member ID"})
		return
	}

	collection := database.GetDB().Collection("users")
	var user models.User
	err = collection.FindOne(context.Background(), bson.M{"_id": objID}).Decode(&user)
	if err != nil {
		c.JSON(404, gin.H{"error": "User not found"})
		return
	}

	now := time.Now()
	var newExpiry time.Time
	if user.IsMember && user.MemberExpiry != nil && user.MemberExpiry.After(now) {
		// Extend from current expiry
		newExpiry = user.MemberExpiry.AddDate(0, 1, 0)
	} else {
		// Start new membership from now
		newExpiry = now.AddDate(0, 1, 0)
	}

	update := bson.M{
		"$set": bson.M{
			"isMember":         true,
			"membershipStatus": "active",
			"memberSince":      now,
			"memberExpiry":     newExpiry,
			"updatedAt":        now,
		},
	}

	_, err = collection.UpdateOne(context.Background(), bson.M{"_id": objID}, update)
	if err != nil {
		c.JSON(500, gin.H{"error": "Failed to extend membership"})
		return
	}

	c.JSON(200, gin.H{
		"message":      "Membership extended successfully",
		"memberSince":  now,
		"memberExpiry": newExpiry,
	})
}
