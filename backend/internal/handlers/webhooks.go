package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"time"

	"msme-marketplace/internal/database"
	"msme-marketplace/internal/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type WebhookHandler struct{}

func NewWebhookHandler() *WebhookHandler {
	return &WebhookHandler{}
}

func (h *WebhookHandler) N8nCallback(c *gin.Context) {
	secret := c.GetHeader("X-Webhook-Secret")
	expectedSecret := "msme-webhook-secret-2024"

	if secret != expectedSecret {
		c.JSON(401, gin.H{"error": "Invalid webhook secret"})
		return
	}

	var req struct {
		Action string      `json:"action"`
		Data   interface{} `json:"data"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "Invalid request"})
		return
	}

	if req.Action == "update_order_status" {
		dataMap, ok := req.Data.(map[string]interface{})
		if !ok {
			c.JSON(400, gin.H{"error": "Invalid data"})
			return
		}

		orderIDStr, ok := dataMap["orderId"].(string)
		if !ok {
			c.JSON(400, gin.H{"error": "Invalid orderId"})
			return
		}

		status, ok := dataMap["status"].(string)
		if !ok {
			c.JSON(400, gin.H{"error": "Invalid status"})
			return
		}

		orderID, err := primitive.ObjectIDFromHex(orderIDStr)
		if err != nil {
			c.JSON(400, gin.H{"error": "Invalid order ID"})
			return
		}

		ordersCollection := database.GetDB().Collection("orders")
		_, err = ordersCollection.UpdateOne(
			context.Background(),
			bson.M{"_id": orderID},
			bson.M{"$set": bson.M{"status": status}},
		)
		if err != nil {
			c.JSON(404, gin.H{"error": "Order not found"})
			return
		}

		c.JSON(200, gin.H{"success": true})
		return
	}

	c.JSON(200, gin.H{"success": true, "message": "Callback received"})
}

func (h *WebhookHandler) TestWebhook(c *gin.Context) {
	var req struct {
		WebhookURL string `json:"webhookUrl" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": "webhookUrl is required"})
		return
	}

	payload := map[string]interface{}{
		"event":     "test",
		"timestamp": "2026-02-17T00:00:00Z",
		"data": map[string]interface{}{
			"message":     "Test webhook from MSME Marketplace",
			"orderId":     "test-123",
			"buyer":       map[string]string{"name": "Test Buyer", "email": "test@example.com"},
			"seller":      map[string]string{"name": "Test Seller", "businessName": "Test Store"},
			"totalAmount": 50000,
		},
	}

	jsonData, _ := json.Marshal(payload)

	httpClient := &http.Client{}
	resp, err := httpClient.Post(req.WebhookURL, "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	defer resp.Body.Close()

	c.JSON(200, gin.H{
		"success": resp.StatusCode >= 200 && resp.StatusCode < 300,
		"status":  resp.StatusCode,
		"message": "Webhook test completed",
	})
}

func (h *WebhookHandler) TriggerOrderConfirmation(order models.Order, sellerID primitive.ObjectID) {
	// Use centralized N8N_WEBHOOK_URL from environment
	webhookURL := os.Getenv("N8N_WEBHOOK_URL")
	if webhookURL == "" {
		fmt.Println("[Webhook] Central webhook omitted: N8N_WEBHOOK_URL not set in .env")
		return // No centralized webhook configured
	}

	// Check if the seller has opted in with an active workflow
	workflowsCollection := database.GetDB().Collection("workflows")
	var workflow models.Workflow
	err := workflowsCollection.FindOne(context.Background(), bson.M{
		"seller":   sellerID,
		"type":     "order_confirmation",
		"isActive": true,
	}).Decode(&workflow)

	if err != nil {
		fmt.Printf("[Webhook] Seller %s has not opted in for order_confirmation\n", sellerID.Hex())
		return // Seller has not opted in
	}

	fmt.Printf("[Webhook] Triggering order_confirmation to centralized URL for seller %s\n", sellerID.Hex())

	usersCollection := database.GetDB().Collection("users")
	var buyer models.User
	var seller models.User
	usersCollection.FindOne(context.Background(), bson.M{"_id": order.Buyer}).Decode(&buyer)
	usersCollection.FindOne(context.Background(), bson.M{"_id": sellerID}).Decode(&seller)

	businessName := ""
	if seller.BusinessName != nil {
		businessName = *seller.BusinessName
	}

	payload := map[string]interface{}{
		"event":     "order.created",
		"timestamp": time.Now().Format(time.RFC3339),
		"data": map[string]interface{}{
			"orderId": order.ID.Hex(),
			"buyer": map[string]string{
				"id":    buyer.ID.Hex(),
				"name":  buyer.Name,
				"email": buyer.Email,
			},
			"seller": map[string]string{
				"id":           seller.ID.Hex(),
				"name":         seller.Name,
				"email":        seller.Email,
				"businessName": businessName,
			},
			"totalAmount": order.TotalAmount,
			"status":      order.Status,
		},
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		fmt.Printf("[Webhook] JSON marshal error: %v\n", err)
		return
	}

	go func() {
		httpClient := &http.Client{}
		resp, err := httpClient.Post(webhookURL, "application/json", bytes.NewBuffer(jsonData))

		if err != nil {
			fmt.Printf("[Webhook] Post Error: %v\n", err)
			return
		}
		defer resp.Body.Close()

		if resp.StatusCode >= 400 {
			bodyBytes, _ := io.ReadAll(resp.Body)
			fmt.Printf("[Webhook] Failed with status %d: %s\n", resp.StatusCode, string(bodyBytes))
		} else {
			fmt.Printf("[Webhook] Success! Payload delivered.\n")
		}
	}()

	workflowsCollection.UpdateOne(context.Background(), bson.M{"_id": workflow.ID}, bson.M{
		"$inc": bson.M{"executionCount": 1},
		"$set": bson.M{"lastExecuted": "2026-02-17T00:00:00Z"},
	})
}
