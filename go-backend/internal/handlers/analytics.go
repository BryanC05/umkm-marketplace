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

type AnalyticsHandler struct{}

func NewAnalyticsHandler() *AnalyticsHandler {
	return &AnalyticsHandler{}
}

// GetSalesAnalytics returns sales data for the seller
func (h *AnalyticsHandler) GetSalesAnalytics(c *gin.Context) {
	userID := c.GetString("userID")
	userObjID, _ := primitive.ObjectIDFromHex(userID)

	ordersCol := database.GetDB().Collection("orders")

	// Total stats
	totalFilter := bson.M{"seller": userObjID}
	totalOrders, _ := ordersCol.CountDocuments(context.Background(), totalFilter)

	// Revenue (from completed/delivered orders)
	completedFilter := bson.M{
		"seller": userObjID,
		"status": bson.M{"$in": []string{"completed", "delivered", "confirmed"}},
	}
	cursor, err := ordersCol.Find(context.Background(), completedFilter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch analytics"})
		return
	}
	defer cursor.Close(context.Background())

	var totalRevenue float64
	var completedOrders int
	var dailyRevenue = map[string]float64{}

	for cursor.Next(context.Background()) {
		var order models.Order
		cursor.Decode(&order)
		totalRevenue += order.TotalAmount
		completedOrders++

		day := order.CreatedAt.Format("2006-01-02")
		dailyRevenue[day] += order.TotalAmount
	}

	// Recent 7 days revenue
	recentDays := []gin.H{}
	for i := 6; i >= 0; i-- {
		d := time.Now().AddDate(0, 0, -i)
		key := d.Format("2006-01-02")
		recentDays = append(recentDays, gin.H{
			"date":    key,
			"label":   d.Format("Jan 02"),
			"revenue": dailyRevenue[key],
		})
	}

	// Top products
	topProducts := []gin.H{}
	pipeline := []bson.M{
		{"$match": bson.M{"seller": userObjID, "status": bson.M{"$in": []string{"completed", "delivered", "confirmed"}}}},
		{"$unwind": "$products"},
		{"$group": bson.M{
			"_id":       "$products.product",
			"totalSold": bson.M{"$sum": "$products.quantity"},
			"revenue":   bson.M{"$sum": bson.M{"$multiply": []string{"$products.price", "$products.quantity"}}},
		}},
		{"$sort": bson.M{"totalSold": -1}},
		{"$limit": 5},
	}
	aggCursor, err := ordersCol.Aggregate(context.Background(), pipeline)
	if err == nil {
		defer aggCursor.Close(context.Background())
		productsCol := database.GetDB().Collection("products")
		for aggCursor.Next(context.Background()) {
			var result struct {
				ID        primitive.ObjectID `bson:"_id"`
				TotalSold int                `bson:"totalSold"`
				Revenue   float64            `bson:"revenue"`
			}
			aggCursor.Decode(&result)
			var product models.Product
			productsCol.FindOne(context.Background(), bson.M{"_id": result.ID}).Decode(&product)
			topProducts = append(topProducts, gin.H{
				"name":      product.Name,
				"totalSold": result.TotalSold,
				"revenue":   result.Revenue,
			})
		}
	}

	// Pending orders
	pendingOrders, _ := ordersCol.CountDocuments(context.Background(), bson.M{
		"seller": userObjID,
		"status": bson.M{"$in": []string{"pending", "confirmed"}},
	})

	c.JSON(http.StatusOK, gin.H{
		"totalOrders":     totalOrders,
		"completedOrders": completedOrders,
		"pendingOrders":   pendingOrders,
		"totalRevenue":    totalRevenue,
		"recentDays":      recentDays,
		"topProducts":     topProducts,
	})
}

// GetRecommended returns recommended products based on user's order history
func (h *AnalyticsHandler) GetRecommended(c *gin.Context) {
	userID := c.GetString("userID")
	userObjID, _ := primitive.ObjectIDFromHex(userID)

	ordersCol := database.GetDB().Collection("orders")

	// Get categories from user's past orders
	pipeline := []bson.M{
		{"$match": bson.M{"buyer": userObjID}},
		{"$unwind": "$products"},
		{"$lookup": bson.M{
			"from":         "products",
			"localField":   "products.product",
			"foreignField": "_id",
			"as":           "productInfo",
		}},
		{"$unwind": "$productInfo"},
		{"$group": bson.M{
			"_id":   "$productInfo.category",
			"count": bson.M{"$sum": 1},
		}},
		{"$sort": bson.M{"count": -1}},
		{"$limit": 3},
	}

	aggCursor, err := ordersCol.Aggregate(context.Background(), pipeline)
	categories := []string{}
	if err == nil {
		defer aggCursor.Close(context.Background())
		for aggCursor.Next(context.Background()) {
			var result struct {
				ID string `bson:"_id"`
			}
			aggCursor.Decode(&result)
			if result.ID != "" {
				categories = append(categories, result.ID)
			}
		}
	}

	// If no categories found, return popular products
	productsCol := database.GetDB().Collection("products")
	var filter bson.M
	if len(categories) > 0 {
		filter = bson.M{"category": bson.M{"$in": categories}, "isAvailable": true}
	} else {
		filter = bson.M{"isAvailable": true}
	}

	opts := options.Find().SetSort(bson.D{{Key: "rating", Value: -1}}).SetLimit(10)
	cursor, err := productsCol.Find(context.Background(), filter, opts)
	if err != nil {
		c.JSON(http.StatusOK, []interface{}{})
		return
	}
	defer cursor.Close(context.Background())

	var products []models.Product
	cursor.All(context.Background(), &products)
	if products == nil {
		products = []models.Product{}
	}
	c.JSON(http.StatusOK, products)
}
