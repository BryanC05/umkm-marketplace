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

type ReportHandler struct{}

func NewReportHandler() *ReportHandler {
	return &ReportHandler{}
}

// CreateReport creates a new report
func (h *ReportHandler) CreateReport(c *gin.Context) {
	userID := c.GetString("userID")
	userObjID, _ := primitive.ObjectIDFromHex(userID)

	var req struct {
		TargetType string `json:"targetType" binding:"required"`
		TargetID   string `json:"targetId" binding:"required"`
		Reason     string `json:"reason" binding:"required"`
		Details    string `json:"details"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	targetObjID, _ := primitive.ObjectIDFromHex(req.TargetID)
	report := models.Report{
		Reporter:   userObjID,
		TargetType: req.TargetType,
		TargetID:   targetObjID,
		Reason:     req.Reason,
		Details:    req.Details,
		Status:     "pending",
		CreatedAt:  time.Now(),
	}

	col := database.GetDB().Collection("reports")
	result, err := col.InsertOne(context.Background(), report)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create report"})
		return
	}
	report.ID = result.InsertedID.(primitive.ObjectID)
	c.JSON(http.StatusCreated, gin.H{"message": "Report submitted", "id": report.ID})
}

// GetReports returns all reports (admin only)
func (h *ReportHandler) GetReports(c *gin.Context) {
	col := database.GetDB().Collection("reports")
	opts := options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}).SetLimit(50)
	cursor, err := col.Find(context.Background(), bson.M{}, opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch reports"})
		return
	}
	defer cursor.Close(context.Background())

	var reports []models.Report
	cursor.All(context.Background(), &reports)
	if reports == nil {
		reports = []models.Report{}
	}
	c.JSON(http.StatusOK, reports)
}

// CreateDispute creates a new order dispute
func (h *ReportHandler) CreateDispute(c *gin.Context) {
	userID := c.GetString("userID")
	userObjID, _ := primitive.ObjectIDFromHex(userID)

	var req struct {
		OrderID string `json:"orderId" binding:"required"`
		Reason  string `json:"reason" binding:"required"`
		Details string `json:"details"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	orderObjID, _ := primitive.ObjectIDFromHex(req.OrderID)

	// Get order to verify buyer
	ordersCol := database.GetDB().Collection("orders")
	var order models.Order
	err := ordersCol.FindOne(context.Background(), bson.M{"_id": orderObjID}).Decode(&order)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "Order not found"})
		return
	}
	if order.Buyer != userObjID {
		c.JSON(http.StatusForbidden, gin.H{"error": "Not your order"})
		return
	}

	dispute := models.Dispute{
		Order:     orderObjID,
		Buyer:     userObjID,
		Seller:    order.Seller,
		Reason:    req.Reason,
		Details:   req.Details,
		Status:    "open",
		CreatedAt: time.Now(),
		UpdatedAt: time.Now(),
	}

	col := database.GetDB().Collection("disputes")
	result, _ := col.InsertOne(context.Background(), dispute)
	dispute.ID = result.InsertedID.(primitive.ObjectID)

	c.JSON(http.StatusCreated, gin.H{"message": "Dispute created", "id": dispute.ID})
}

// GetMyDisputes returns disputes for the current user
func (h *ReportHandler) GetMyDisputes(c *gin.Context) {
	userID := c.GetString("userID")
	userObjID, _ := primitive.ObjectIDFromHex(userID)

	col := database.GetDB().Collection("disputes")
	cursor, err := col.Find(context.Background(), bson.M{
		"$or": []bson.M{{"buyer": userObjID}, {"seller": userObjID}},
	}, options.Find().SetSort(bson.D{{Key: "createdAt", Value: -1}}))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch disputes"})
		return
	}
	defer cursor.Close(context.Background())

	var disputes []models.Dispute
	cursor.All(context.Background(), &disputes)
	if disputes == nil {
		disputes = []models.Dispute{}
	}
	c.JSON(http.StatusOK, disputes)
}

// ResolveDispute resolves a dispute (admin)
func (h *ReportHandler) ResolveDispute(c *gin.Context) {
	disputeID := c.Param("id")
	disputeObjID, _ := primitive.ObjectIDFromHex(disputeID)

	var req struct {
		Status     string `json:"status" binding:"required"`
		Resolution string `json:"resolution"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	col := database.GetDB().Collection("disputes")
	_, err := col.UpdateOne(context.Background(), bson.M{"_id": disputeObjID}, bson.M{
		"$set": bson.M{
			"status":     req.Status,
			"resolution": req.Resolution,
			"updatedAt":  time.Now(),
		},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update dispute"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Dispute updated"})
}
