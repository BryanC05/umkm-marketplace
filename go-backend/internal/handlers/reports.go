package handlers

import (
	"context"
	"fmt"
	"net/http"
	"net/smtp"
	"os"
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

// FraudReportRequest represents a fraud report request
type FraudReportRequest struct {
	OrderID       string `json:"orderId" binding:"required"`
	ReportType    string `json:"reportType"`
	ReporterID    string `json:"reporterId"`
	ReporterRole  string `json:"reporterRole"`
	ReporterName  string `json:"reporterName"`
	ReporterEmail string `json:"reporterEmail"`
	FraudDetails  string `json:"fraudDetails" binding:"required"`
	OrderDetails  struct {
		OrderDate  string  `json:"orderDate"`
		Amount     float64 `json:"amount"`
		Products   string  `json:"products"`
		OtherParty string  `json:"otherParty"`
	} `json:"orderDetails"`
	ToEmail string `json:"toEmail"`
}

// CreateFraudReport creates a fraud report and sends email to creator
func (h *ReportHandler) CreateFraudReport(c *gin.Context) {
	var req FraudReportRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Store fraud report in database
	fraudReport := bson.M{
		"orderId":       req.OrderID,
		"reportType":    req.ReportType,
		"reporterId":    req.ReporterID,
		"reporterRole":  req.ReporterRole,
		"reporterName":  req.ReporterName,
		"reporterEmail": req.ReporterEmail,
		"fraudDetails":  req.FraudDetails,
		"orderDetails":  req.OrderDetails,
		"status":        "pending_review",
		"createdAt":     time.Now(),
	}

	col := database.GetDB().Collection("fraud_reports")
	result, err := col.InsertOne(context.Background(), fraudReport)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save fraud report"})
		return
	}

	// Try to send email notification
	creatorEmail := req.ToEmail
	if creatorEmail == "" {
		creatorEmail = os.Getenv("CREATOR_EMAIL")
	}
	if creatorEmail == "" {
		creatorEmail = "admin@umkm-marketplace.com"
	}

	emailSent := false
	if smtpHost := os.Getenv("SMTP_HOST"); smtpHost != "" {
		emailSent = sendFraudReportEmail(creatorEmail, req)
	}

	c.JSON(http.StatusCreated, gin.H{
		"message":   "Fraud report submitted successfully",
		"id":        result.InsertedID,
		"emailSent": emailSent,
	})
}

// sendFraudReportEmail sends email notification about fraud report
func sendFraudReportEmail(toEmail string, req FraudReportRequest) bool {
	smtpHost := os.Getenv("SMTP_HOST")
	smtpPort := os.Getenv("SMTP_PORT")
	smtpUser := os.Getenv("SMTP_USER")
	smtpPass := os.Getenv("SMTP_PASS")
	fromEmail := os.Getenv("FROM_EMAIL")

	if smtpHost == "" || smtpPort == "" || smtpUser == "" || smtpPass == "" {
		return false
	}

	subject := fmt.Sprintf("URGENT: Fraud Report - Order #%s", req.OrderID)
	body := fmt.Sprintf(`FRAUD REPORT NOTIFICATION

Order ID: %s
Reported By: %s (%s)
Reporter Email: %s
Reported At: %s

FRAUD DETAILS:
%s

ORDER INFORMATION:
- Order Date: %s
- Amount: Rp %.2f
- Products: %s
- Other Party: %s

Please investigate this matter immediately.

---
This is an automated message from UMKM Marketplace.
`,
		req.OrderID,
		req.ReporterName,
		req.ReporterRole,
		req.ReporterEmail,
		time.Now().Format("2006-01-02 15:04:05"),
		req.FraudDetails,
		req.OrderDetails.OrderDate,
		req.OrderDetails.Amount,
		req.OrderDetails.Products,
		req.OrderDetails.OtherParty,
	)

	msg := []byte(fmt.Sprintf("To: %s\r\nSubject: %s\r\n\r\n%s", toEmail, subject, body))
	auth := smtp.PlainAuth("", smtpUser, smtpPass, smtpHost)

	err := smtp.SendMail(smtpHost+":"+smtpPort, auth, fromEmail, []string{toEmail}, msg)
	return err == nil
}
