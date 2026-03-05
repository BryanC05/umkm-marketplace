package handlers

import (
	"context"
	"fmt"
	"math"
	"time"

	"msme-marketplace/internal/database"
	"msme-marketplace/internal/models"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type OrderHandler struct{}

func NewOrderHandler() *OrderHandler {
	return &OrderHandler{}
}

// calculateDistance calculates distance between two coordinates in kilometers using Haversine formula
func calculateDistance(lat1, lng1, lat2, lng2 float64) float64 {
	const R = 6371 // Earth radius in kilometers

	lat1Rad := lat1 * math.Pi / 180
	lat2Rad := lat2 * math.Pi / 180
	deltaLat := (lat2 - lat1) * math.Pi / 180
	deltaLng := (lng2 - lng1) * math.Pi / 180

	a := math.Sin(deltaLat/2)*math.Sin(deltaLat/2) +
		math.Cos(lat1Rad)*math.Cos(lat2Rad)*
			math.Sin(deltaLng/2)*math.Sin(deltaLng/2)
	c := 2 * math.Atan2(math.Sqrt(a), math.Sqrt(1-a))

	return R * c
}

// formatCurrency formats a float as Indonesian Rupiah string
func formatCurrency(amount float64) string {
	whole := int64(amount)
	s := fmt.Sprintf("%d", whole)
	// Add thousand separators
	if len(s) <= 3 {
		return s
	}
	var result []byte
	for i, c := range s {
		if i > 0 && (len(s)-i)%3 == 0 {
			result = append(result, '.')
		}
		result = append(result, byte(c))
	}
	return string(result)
}

func (h *OrderHandler) CreateOrder(c *gin.Context) {
	userID := c.GetString("userID")
	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid user ID"})
		return
	}

	var req struct {
		Products []struct {
			ProductID       string `json:"productId"`
			Quantity        int    `json:"quantity"`
			VariantName     string `json:"variantName"`
			SelectedOptions []struct {
				GroupName string   `json:"groupName"`
				Chosen    []string `json:"chosen"`
			} `json:"selectedOptions"`
		} `json:"products" binding:"required"`
		DeliveryAddress models.DeliveryAddress `json:"deliveryAddress"`
		Notes           string                 `json:"notes"`
		PaymentMethod   string                 `json:"paymentMethod" binding:"required"`

		// Delivery options
		DeliveryType string `json:"deliveryType"` // "delivery" or "pickup"

		// Preorder / Scheduled delivery
		IsPreorder     bool   `json:"isPreorder"`
		PreorderTime   string `json:"preorderTime"`   // delivery time "19:00"
		DeliveryDate   string `json:"deliveryDate"`   // "2026-02-25"
		ScheduledNotes string `json:"scheduledNotes"` // buyer notes for scheduled delivery

		PaymentDetails struct {
			EwalletProvider *string `json:"ewalletProvider"`
			EwalletPhone    *string `json:"ewalletPhone"`
			BankName        *string `json:"bankName"`
			AccountNumber   *string `json:"accountNumber"`
			AccountHolder   *string `json:"accountHolder"`
		} `json:"paymentDetails"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"message": err.Error()})
		return
	}

	validMethods := map[string]bool{
		"cash": true, "qris": true,
	}
	if !validMethods[req.PaymentMethod] {
		c.JSON(400, gin.H{"message": "Invalid payment method"})
		return
	}

	// Set initial status based on payment method
	// QRIS and COD require payment confirmation, so start with payment_pending
	initialStatus := "pending"
	if req.PaymentMethod == "qris" || req.PaymentMethod == "cash" {
		initialStatus = "payment_pending"
	}

	// Validate delivery type
	validDeliveryTypes := map[string]bool{"delivery": true, "pickup": true}
	if req.DeliveryType == "" {
		req.DeliveryType = "delivery" // Default to delivery
	}
	if !validDeliveryTypes[req.DeliveryType] {
		c.JSON(400, gin.H{"message": "Invalid delivery type. Must be 'delivery' or 'pickup'"})
		return
	}

	// Validate scheduled delivery
	isScheduled := req.DeliveryDate != "" && req.PreorderTime != ""
	if isScheduled {
		parsedDate, err := time.Parse("2006-01-02", req.DeliveryDate)
		if err != nil {
			c.JSON(400, gin.H{"message": "Invalid delivery date format. Use YYYY-MM-DD"})
			return
		}

		today := time.Now().Truncate(24 * time.Hour)
		maxDate := today.AddDate(0, 0, 30) // Max 30 days ahead

		if parsedDate.Before(today) {
			c.JSON(400, gin.H{"message": "Delivery date cannot be in the past"})
			return
		}
		if parsedDate.After(maxDate) {
			c.JSON(400, gin.H{"message": "Delivery date cannot be more than 30 days ahead"})
			return
		}

		// Validate time format
		_, err = time.Parse("15:04", req.PreorderTime)
		if err != nil {
			c.JSON(400, gin.H{"message": "Invalid delivery time format. Use HH:MM (24-hour)"})
			return
		}
	}

	productsCollection := database.GetDB().Collection("products")
	ordersCollection := database.GetDB().Collection("orders")

	var orderProducts []models.OrderProduct
	var totalAmount float64
	var sellerID primitive.ObjectID

	for _, item := range req.Products {
		productObjID, err := primitive.ObjectIDFromHex(item.ProductID)
		if err != nil {
			c.JSON(400, gin.H{"message": "Invalid product ID"})
			return
		}

		var product models.Product
		err = productsCollection.FindOne(context.Background(), bson.M{"_id": productObjID}).Decode(&product)
		if err != nil {
			c.JSON(404, gin.H{"message": "Product not found"})
			return
		}

		itemPrice := product.Price
		var variantName *string
		var selectedOptions []models.SelectedOption

		if product.HasVariants && item.VariantName != "" {
			for _, v := range product.Variants {
				if v.Name == item.VariantName {
					if v.Stock < item.Quantity {
						c.JSON(400, gin.H{"message": "Insufficient stock"})
						return
					}
					itemPrice = v.Price
					variantName = &item.VariantName

					_, err = productsCollection.UpdateOne(
						context.Background(),
						bson.M{"_id": productObjID, "variants.name": v.Name},
						bson.M{"$inc": bson.M{"variants.$.stock": -item.Quantity}},
					)
					if err != nil {
						c.JSON(500, gin.H{"message": "Failed to update stock"})
						return
					}
					break
				}
			}
		} else {
			if product.Stock < item.Quantity {
				c.JSON(400, gin.H{"message": "Insufficient stock"})
				return
			}
			_, err = productsCollection.UpdateOne(
				context.Background(),
				bson.M{"_id": productObjID},
				bson.M{"$inc": bson.M{"stock": -item.Quantity}},
			)
			if err != nil {
				c.JSON(500, gin.H{"message": "Failed to update stock"})
				return
			}
		}

		for _, sel := range item.SelectedOptions {
			var priceAdjust float64
			for _, g := range product.OptionGroups {
				if g.Name == sel.GroupName {
					for _, opt := range g.Options {
						for _, chosen := range sel.Chosen {
							if opt.Name == chosen {
								priceAdjust += opt.PriceAdjust
							}
						}
					}
				}
			}
			selectedOptions = append(selectedOptions, models.SelectedOption{
				GroupName:   sel.GroupName,
				Chosen:      sel.Chosen,
				PriceAdjust: priceAdjust,
			})
			itemPrice += priceAdjust
		}

		if sellerID.IsZero() {
			sellerID = product.Seller
		} else if sellerID != product.Seller {
			c.JSON(400, gin.H{"message": "Cannot order from multiple sellers at once"})
			return
		}

		orderProducts = append(orderProducts, models.OrderProduct{
			Product:         productObjID,
			Quantity:        item.Quantity,
			Price:           itemPrice,
			VariantName:     variantName,
			SelectedOptions: selectedOptions,
		})
		totalAmount += itemPrice * float64(item.Quantity)
	}

	coords := req.DeliveryAddress.Coordinates
	if coords == nil {
		coords = []float64{0, 0}
	}

	// Validate 5km radius for delivery orders
	if req.DeliveryType == "delivery" {
		// Get seller location
		usersCollection := database.GetDB().Collection("users")
		var seller models.User
		err := usersCollection.FindOne(context.Background(), bson.M{"_id": sellerID}).Decode(&seller)
		if err != nil {
			c.JSON(500, gin.H{"message": "Failed to fetch seller information"})
			return
		}

		// Check if seller has location
		if seller.Location.Coordinates != nil && len(seller.Location.Coordinates) >= 2 {
			sellerLng := seller.Location.Coordinates[0]
			sellerLat := seller.Location.Coordinates[1]
			deliveryLng := coords[0]
			deliveryLat := coords[1]

			// Skip validation if coordinates are 0,0 (default/not set)
			if deliveryLat != 0 || deliveryLng != 0 {
				distance := calculateDistance(sellerLat, sellerLng, deliveryLat, deliveryLng)
				if distance > 5 {
					c.JSON(400, gin.H{
						"message":  "Delivery location is too far",
						"error":    "Distance exceeds 5km limit",
						"distance": distance,
					})
					return
				}
			}
		}
	}

	order := models.Order{
		Buyer:       userObjID,
		Seller:      sellerID,
		Products:    orderProducts,
		TotalAmount: totalAmount,
		Status:      initialStatus,
		DeliveryAddress: models.DeliveryAddress{
			Address:     req.DeliveryAddress.Address,
			City:        req.DeliveryAddress.City,
			State:       req.DeliveryAddress.State,
			Pincode:     req.DeliveryAddress.Pincode,
			Coordinates: coords,
		},
		PaymentStatus: "pending",
		PaymentMethod: req.PaymentMethod,
		PaymentDetails: models.PaymentDetails{
			EwalletProvider: req.PaymentDetails.EwalletProvider,
			EwalletPhone:    req.PaymentDetails.EwalletPhone,
			BankName:        req.PaymentDetails.BankName,
			AccountNumber:   req.PaymentDetails.AccountNumber,
			AccountHolder:   req.PaymentDetails.AccountHolder,
		},
		Notes:        req.Notes,
		DeliveryType: req.DeliveryType,
		IsPreorder:   isScheduled,
		PreorderTime: req.PreorderTime,
		DeliveryDate: req.DeliveryDate,
		CreatedAt:    time.Now(),
		UpdatedAt:    time.Now(),
	}

	// Handle scheduled delivery flow
	if isScheduled {
		order.RequestStatus = "pending_seller_review"
		order.RequestDeadline = time.Now().Add(24 * time.Hour)
		order.ScheduledNotes = req.ScheduledNotes
		order.Status = "pending_seller_review"
	}

	result, err := ordersCollection.InsertOne(context.Background(), order)
	if err != nil {
		c.JSON(500, gin.H{"message": "Failed to create order"})
		return
	}

	order.ID = result.InsertedID.(primitive.ObjectID)

	// Notify seller about the new order
	usersCollection := database.GetDB().Collection("users")
	var buyer models.User
	usersCollection.FindOne(context.Background(), bson.M{"_id": userObjID}).Decode(&buyer)

	go CreateAndSend(sellerID, "new_order", "New Order Received",
		fmt.Sprintf("New order from %s - Rp %s", buyer.Name, formatCurrency(totalAmount)),
		map[string]interface{}{"orderId": order.ID.Hex()},
	)

	// Trigger the n8n webhook automation
	webhookHandler := NewWebhookHandler()
	go webhookHandler.TriggerOrderConfirmation(order, sellerID)

	c.JSON(201, order)
}

func (h *OrderHandler) GetMyOrders(c *gin.Context) {
	userID := c.GetString("userID")
	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid user ID"})
		return
	}

	ordersCollection := database.GetDB().Collection("orders")
	productsCollection := database.GetDB().Collection("products")

	pipeline := []bson.M{
		{
			"$match": bson.M{
				"$or": []bson.M{
					{"buyer": userObjID},
					{"seller": userObjID},
				},
			},
		},
		{
			"$sort": bson.M{"createdAt": -1},
		},
		{
			"$lookup": bson.M{
				"from":         "users",
				"localField":   "seller",
				"foreignField": "_id",
				"as":           "sellerInfo",
			},
		},
		{
			"$lookup": bson.M{
				"from":         "users",
				"localField":   "buyer",
				"foreignField": "_id",
				"as":           "buyerInfo",
			},
		},
		{
			"$addFields": bson.M{
				"seller": bson.M{"$arrayElemAt": []interface{}{"$sellerInfo", 0}},
				"buyer":  bson.M{"$arrayElemAt": []interface{}{"$buyerInfo", 0}},
			},
		},
		{
			"$project": bson.M{
				"sellerInfo":      0,
				"buyerInfo":       0,
				"seller.password": 0,
				"buyer.password":  0,
				"buyer.email":     0,
			},
		},
	}

	cursor, err := ordersCollection.Aggregate(context.Background(), pipeline)
	if err != nil {
		c.JSON(500, gin.H{"message": err.Error()})
		return
	}
	defer cursor.Close(context.Background())

	var orders []bson.M
	if err := cursor.All(context.Background(), &orders); err != nil {
		c.JSON(500, gin.H{"message": err.Error()})
		return
	}

	// Populate product info and pickup address for each order
	usersCollection := database.GetDB().Collection("users")
	for i, order := range orders {
		// Calculate total items count
		if products, ok := order["products"].(primitive.A); ok {
			totalItems := 0
			populatedProducts := make([]bson.M, 0)
			for _, p := range products {
				if productMap, ok := p.(primitive.M); ok {
					// Count quantity
					if qty, ok := productMap["quantity"].(int64); ok {
						totalItems += int(qty)
					} else if qty, ok := productMap["quantity"].(int); ok {
						totalItems += qty
					}

					if productID, ok := productMap["product"].(primitive.ObjectID); ok {
						var product models.Product
						productsCollection.FindOne(context.Background(), bson.M{"_id": productID}).Decode(&product)
						productMap["product"] = bson.M{
							"_id":      product.ID,
							"name":     product.Name,
							"images":   product.Images,
							"price":    product.Price,
							"category": product.Category,
							"seller":   product.Seller,
						}
					}
					populatedProducts = append(populatedProducts, productMap)
				}
			}
			orders[i]["products"] = populatedProducts
			orders[i]["itemsCount"] = totalItems
		}

		// Add pickup address for pickup orders
		if deliveryType, ok := order["deliveryType"].(string); ok && deliveryType == "pickup" {
			// Get seller info to get their location
			if seller, ok := order["seller"].(bson.M); ok {
				if sellerID, ok := seller["_id"].(primitive.ObjectID); ok {
					var sellerUser models.User
					err := usersCollection.FindOne(context.Background(), bson.M{"_id": sellerID}).Decode(&sellerUser)
					if err == nil && sellerUser.Location.Address != "" {
						pickupAddress := fmt.Sprintf("%s, %s, %s %s",
							sellerUser.Location.Address,
							sellerUser.Location.City,
							sellerUser.Location.State,
							sellerUser.Location.Pincode)
						orders[i]["pickupAddress"] = pickupAddress
						orders[i]["pickupLocation"] = sellerUser.Location
					}
				}
			}
		}
	}

	c.JSON(200, orders)
}

func (h *OrderHandler) GetOrderByID(c *gin.Context) {
	userID := c.GetString("userID")
	orderID := c.Param("id")

	orderObjID, err := primitive.ObjectIDFromHex(orderID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid order ID"})
		return
	}
	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid user ID"})
		return
	}

	ordersCollection := database.GetDB().Collection("orders")
	var order models.Order
	err = ordersCollection.FindOne(context.Background(), bson.M{
		"_id": orderObjID,
		"$or": []bson.M{
			{"buyer": userObjID},
			{"seller": userObjID},
		},
	}).Decode(&order)
	if err != nil {
		c.JSON(404, gin.H{"message": "Order not found"})
		return
	}

	c.JSON(200, order)
}

func (h *OrderHandler) UpdateOrderStatus(c *gin.Context) {
	userID := c.GetString("userID")
	orderID := c.Param("id")

	var req struct {
		Status string `json:"status" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"message": err.Error()})
		return
	}

	orderObjID, err := primitive.ObjectIDFromHex(orderID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid order ID"})
		return
	}

	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid user ID"})
		return
	}

	ordersCollection := database.GetDB().Collection("orders")
	var order models.Order
	err = ordersCollection.FindOne(context.Background(), bson.M{
		"_id":    orderObjID,
		"seller": userObjID,
	}).Decode(&order)
	if err != nil {
		c.JSON(404, gin.H{"message": "Order not found or unauthorized"})
		return
	}

	validStatuses := map[string]bool{
		"pending": true, "payment_pending": true, "confirmed": true, "preparing": true,
		"ready": true, "delivered": true, "cancelled": true,
	}
	if !validStatuses[req.Status] {
		c.JSON(400, gin.H{"message": "Invalid status"})
		return
	}

	// Prevent status update while pending seller review
	if order.RequestStatus == "pending_seller_review" {
		c.JSON(400, gin.H{"message": "Please respond to the scheduled delivery request first"})
		return
	}

	_, err = ordersCollection.UpdateOne(
		context.Background(),
		bson.M{"_id": orderObjID},
		bson.M{"$set": bson.M{"status": req.Status, "updatedAt": time.Now()}},
	)
	if err != nil {
		c.JSON(500, gin.H{"message": "Failed to update status"})
		return
	}

	var updatedOrder models.Order
	ordersCollection.FindOne(context.Background(), bson.M{"_id": orderObjID}).Decode(&updatedOrder)

	// Notify buyer about order status change
	statusLabels := map[string]string{
		"payment_pending": "Awaiting Payment", "confirmed": "Paid", "preparing": "Being Prepared",
		"ready": "Ready", "delivered": "Delivered", "cancelled": "Cancelled",
	}
	label := statusLabels[req.Status]
	if label == "" {
		label = req.Status
	}
	go CreateAndSend(order.Buyer, "order_status", "Order Update",
		fmt.Sprintf("Your order is now: %s", label),
		map[string]interface{}{"orderId": orderID, "status": req.Status},
	)

	c.JSON(200, updatedOrder)
}

func (h *OrderHandler) UpdatePayment(c *gin.Context) {
	userID := c.GetString("userID")
	orderID := c.Param("id")

	var req struct {
		PaymentStatus  string `json:"paymentStatus"`
		PaymentDetails struct {
			QRISURL         *string  `json:"qrisUrl"`
			QRISCode        *string  `json:"qrisCode"`
			TransferProof   *string  `json:"transferProof"`
			TransactionID   *string  `json:"transactionId"`
			EwalletProvider *string  `json:"ewalletProvider"`
			EwalletPhone    *string  `json:"ewalletPhone"`
			BankName        *string  `json:"bankName"`
			AccountNumber   *string  `json:"accountNumber"`
			AccountHolder   *string  `json:"accountHolder"`
			CashReceived    *float64 `json:"cashReceived"`
		} `json:"paymentDetails"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"message": err.Error()})
		return
	}

	orderObjID, err := primitive.ObjectIDFromHex(orderID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid order ID"})
		return
	}

	ordersCollection := database.GetDB().Collection("orders")
	var order models.Order
	err = ordersCollection.FindOne(context.Background(), bson.M{"_id": orderObjID}).Decode(&order)
	if err != nil {
		c.JSON(404, gin.H{"message": "Order not found"})
		return
	}

	userObjID, _ := primitive.ObjectIDFromHex(userID)
	isBuyer := order.Buyer == userObjID
	isSeller := order.Seller == userObjID

	if !isBuyer && !isSeller {
		c.JSON(403, gin.H{"message": "Not authorized"})
		return
	}

	// Validate buyer confirmation for scheduled delivery orders
	if order.RequestStatus != "" && !order.BuyerConfirmed {
		if isBuyer {
			c.JSON(400, gin.H{
				"message":         "Please confirm the order after seller accepted",
				"requiresConfirm": true,
			})
			return
		}
	}

	update := bson.M{}

	if req.PaymentStatus != "" {
		if req.PaymentStatus == "completed" && !isSeller {
			c.JSON(403, gin.H{"message": "Only sellers can mark payment as completed"})
			return
		}
		update["paymentStatus"] = req.PaymentStatus
		if req.PaymentStatus == "completed" {
			now := time.Now()
			update["paymentDetails.paidAt"] = now
		}
	}

	if req.PaymentDetails.QRISURL != nil {
		update["paymentDetails.qrisUrl"] = req.PaymentDetails.QRISURL
	}
	if req.PaymentDetails.QRISCode != nil {
		update["paymentDetails.qrisCode"] = req.PaymentDetails.QRISCode
	}
	if req.PaymentDetails.TransferProof != nil {
		update["paymentDetails.transferProof"] = req.PaymentDetails.TransferProof
	}
	if req.PaymentDetails.EwalletProvider != nil {
		update["paymentDetails.ewalletProvider"] = req.PaymentDetails.EwalletProvider
	}
	if req.PaymentDetails.EwalletPhone != nil {
		update["paymentDetails.ewalletPhone"] = req.PaymentDetails.EwalletPhone
	}
	if req.PaymentDetails.BankName != nil {
		update["paymentDetails.bankName"] = req.PaymentDetails.BankName
	}
	if req.PaymentDetails.AccountNumber != nil {
		update["paymentDetails.accountNumber"] = req.PaymentDetails.AccountNumber
	}
	if req.PaymentDetails.AccountHolder != nil {
		update["paymentDetails.accountHolder"] = req.PaymentDetails.AccountHolder
	}
	if req.PaymentDetails.CashReceived != nil && isSeller && order.PaymentMethod == "cash" {
		update["paymentDetails.cashReceived"] = *req.PaymentDetails.CashReceived
		update["paymentDetails.cashChange"] = *req.PaymentDetails.CashReceived - order.TotalAmount
	}

	update["updatedAt"] = time.Now()

	_, err = ordersCollection.UpdateOne(context.Background(), bson.M{"_id": orderObjID}, bson.M{"$set": update})
	if err != nil {
		c.JSON(500, gin.H{"message": "Failed to update payment"})
		return
	}

	var updatedOrder models.Order
	ordersCollection.FindOne(context.Background(), bson.M{"_id": orderObjID}).Decode(&updatedOrder)

	c.JSON(200, updatedOrder)
}

func (h *OrderHandler) GetOrderChatRoom(c *gin.Context) {
	userID := c.GetString("userID")
	orderID := c.Param("id")

	orderObjID, err := primitive.ObjectIDFromHex(orderID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid order ID"})
		return
	}

	ordersCollection := database.GetDB().Collection("orders")
	var order models.Order
	err = ordersCollection.FindOne(context.Background(), bson.M{"_id": orderObjID}).Decode(&order)
	if err != nil {
		c.JSON(404, gin.H{"message": "Order not found"})
		return
	}

	userObjID, _ := primitive.ObjectIDFromHex(userID)
	if order.Buyer != userObjID && order.Seller != userObjID {
		c.JSON(403, gin.H{"message": "Not authorized"})
		return
	}

	chatRoomsCollection := database.GetDB().Collection("chatrooms")
	var chatRoom models.ChatRoom
	err = chatRoomsCollection.FindOne(context.Background(), bson.M{"order": orderObjID}).Decode(&chatRoom)
	if err != nil {
		chatRoom = models.ChatRoom{
			Order:    &orderObjID,
			Buyer:    order.Buyer,
			Seller:   order.Seller,
			ChatType: "order",
		}
		result, err := chatRoomsCollection.InsertOne(context.Background(), chatRoom)
		if err != nil {
			c.JSON(500, gin.H{"message": "Failed to create chat room"})
			return
		}
		chatRoom.ID = result.InsertedID.(primitive.ObjectID)
	}

	c.JSON(200, chatRoom)
}

func (h *OrderHandler) GetProductTracking(c *gin.Context) {
	userID := c.GetString("userID")
	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid user ID"})
		return
	}

	ordersCollection := database.GetDB().Collection("orders")
	cursor, err := ordersCollection.Find(context.Background(), bson.M{"seller": userObjID})
	if err != nil {
		c.JSON(500, gin.H{"message": err.Error()})
		return
	}
	defer cursor.Close(context.Background())

	type ProductTracking struct {
		Product      models.Product `json:"product"`
		TotalSold    int            `json:"totalSold"`
		TotalRevenue float64        `json:"totalRevenue"`
		Orders       []struct {
			OrderID       string    `json:"orderId"`
			Quantity      int       `json:"quantity"`
			Price         float64   `json:"price"`
			TotalAmount   float64   `json:"totalAmount"`
			Status        string    `json:"status"`
			PaymentStatus string    `json:"paymentStatus"`
			PaymentMethod string    `json:"paymentMethod"`
			CreatedAt     time.Time `json:"createdAt"`
			Buyer         struct {
				Name         string  `json:"name"`
				Phone        string  `json:"phone"`
				Email        string  `json:"email"`
				ProfileImage *string `json:"profileImage"`
			} `json:"buyer"`
			DeliveryAddress models.DeliveryAddress `json:"deliveryAddress"`
			Notes           string                 `json:"notes"`
		} `json:"orders"`
	}

	productMap := make(map[string]*ProductTracking)

	for cursor.Next(context.Background()) {
		var order models.Order
		cursor.Decode(&order)

		for _, item := range order.Products {
			productID := item.Product.Hex()
			if _, ok := productMap[productID]; !ok {
				var product models.Product
				database.GetDB().Collection("products").FindOne(context.Background(), bson.M{"_id": item.Product}).Decode(&product)
				productMap[productID] = &ProductTracking{
					Product:      product,
					TotalSold:    0,
					TotalRevenue: 0,
				}
			}

			pt := productMap[productID]
			pt.TotalSold += item.Quantity
			pt.TotalRevenue += item.Price * float64(item.Quantity)

			orderNum := order.ID.Hex()
			if len(orderNum) >= 8 {
				orderNum = orderNum[len(orderNum)-8:]
			}

			var buyer models.User
			database.GetDB().Collection("users").FindOne(context.Background(), bson.M{"_id": order.Buyer}).Decode(&buyer)

			pt.Orders = append(pt.Orders, struct {
				OrderID       string    `json:"orderId"`
				Quantity      int       `json:"quantity"`
				Price         float64   `json:"price"`
				TotalAmount   float64   `json:"totalAmount"`
				Status        string    `json:"status"`
				PaymentStatus string    `json:"paymentStatus"`
				PaymentMethod string    `json:"paymentMethod"`
				CreatedAt     time.Time `json:"createdAt"`
				Buyer         struct {
					Name         string  `json:"name"`
					Phone        string  `json:"phone"`
					Email        string  `json:"email"`
					ProfileImage *string `json:"profileImage"`
				} `json:"buyer"`
				DeliveryAddress models.DeliveryAddress `json:"deliveryAddress"`
				Notes           string                 `json:"notes"`
			}{
				OrderID:       order.ID.Hex(),
				Quantity:      item.Quantity,
				Price:         item.Price,
				TotalAmount:   item.Price * float64(item.Quantity),
				Status:        order.Status,
				PaymentStatus: order.PaymentStatus,
				PaymentMethod: order.PaymentMethod,
				CreatedAt:     order.CreatedAt,
				Buyer: struct {
					Name         string  `json:"name"`
					Phone        string  `json:"phone"`
					Email        string  `json:"email"`
					ProfileImage *string `json:"profileImage"`
				}{
					Name:         buyer.Name,
					Phone:        buyer.Phone,
					Email:        buyer.Email,
					ProfileImage: buyer.ProfileImage,
				},
				DeliveryAddress: order.DeliveryAddress,
				Notes:           order.Notes,
			})
		}
	}

	var trackingData []ProductTracking
	for _, pt := range productMap {
		trackingData = append(trackingData, *pt)
	}

	c.JSON(200, trackingData)
}

// UpdateDriverLocation updates the driver's current location for an order
func (h *OrderHandler) UpdateDriverLocation(c *gin.Context) {
	userID := c.GetString("userID")
	orderID := c.Param("id")

	var req struct {
		Latitude  float64 `json:"latitude" binding:"required"`
		Longitude float64 `json:"longitude" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"message": err.Error()})
		return
	}

	orderObjID, err := primitive.ObjectIDFromHex(orderID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid order ID"})
		return
	}

	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid user ID"})
		return
	}

	ordersCollection := database.GetDB().Collection("orders")
	var order models.Order
	err = ordersCollection.FindOne(context.Background(), bson.M{
		"_id":    orderObjID,
		"seller": userObjID,
	}).Decode(&order)
	if err != nil {
		c.JSON(404, gin.H{"message": "Order not found or unauthorized"})
		return
	}

	// Update driver location
	driverLocation := &models.DriverLocation{
		Latitude:  req.Latitude,
		Longitude: req.Longitude,
		Timestamp: time.Now(),
	}

	_, err = ordersCollection.UpdateOne(
		context.Background(),
		bson.M{"_id": orderObjID},
		bson.M{
			"$set": bson.M{
				"driverLocation": driverLocation,
				"updatedAt":      time.Now(),
			},
		},
	)
	if err != nil {
		c.JSON(500, gin.H{"message": "Failed to update driver location"})
		return
	}

	c.JSON(200, driverLocation)
}

// GetDriverLocation gets the driver's current location for an order (buyer only)
func (h *OrderHandler) GetDriverLocation(c *gin.Context) {
	userID := c.GetString("userID")
	orderID := c.Param("id")

	orderObjID, err := primitive.ObjectIDFromHex(orderID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid order ID"})
		return
	}

	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid user ID"})
		return
	}

	ordersCollection := database.GetDB().Collection("orders")
	var order models.Order
	err = ordersCollection.FindOne(context.Background(), bson.M{
		"_id":   orderObjID,
		"buyer": userObjID,
	}).Decode(&order)
	if err != nil {
		c.JSON(404, gin.H{"message": "Order not found or unauthorized"})
		return
	}

	if order.DriverLocation == nil {
		c.JSON(404, gin.H{"message": "Driver location not available"})
		return
	}

	c.JSON(200, order.DriverLocation)
}

// AssignDriver assigns a driver to an order
func (h *OrderHandler) AssignDriver(c *gin.Context) {
	userID := c.GetString("userID")
	orderID := c.Param("id")

	var req struct {
		DriverName  string `json:"driverName" binding:"required"`
		DriverPhone string `json:"driverPhone" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"message": err.Error()})
		return
	}

	orderObjID, err := primitive.ObjectIDFromHex(orderID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid order ID"})
		return
	}

	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid user ID"})
		return
	}

	ordersCollection := database.GetDB().Collection("orders")
	var order models.Order
	err = ordersCollection.FindOne(context.Background(), bson.M{
		"_id":    orderObjID,
		"seller": userObjID,
	}).Decode(&order)
	if err != nil {
		c.JSON(404, gin.H{"message": "Order not found or unauthorized"})
		return
	}

	// Assign driver
	_, err = ordersCollection.UpdateOne(
		context.Background(),
		bson.M{"_id": orderObjID},
		bson.M{
			"$set": bson.M{
				"driverName":  req.DriverName,
				"driverPhone": req.DriverPhone,
				"updatedAt":   time.Now(),
			},
		},
	)
	if err != nil {
		c.JSON(500, gin.H{"message": "Failed to assign driver"})
		return
	}

	c.JSON(200, gin.H{
		"message":     "Driver assigned successfully",
		"driverName":  req.DriverName,
		"driverPhone": req.DriverPhone,
	})
}

// SellerResponse handles seller's response to a scheduled delivery request
func (h *OrderHandler) SellerResponse(c *gin.Context) {
	userID := c.GetString("userID")
	orderID := c.Param("id")

	var req struct {
		Action string `json:"action" binding:"required"` // accept, decline, request_changes
		Notes  string `json:"notes"`                     // required for request_changes
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"message": err.Error()})
		return
	}

	// Validate action
	validActions := map[string]bool{
		"accept":          true,
		"decline":         true,
		"request_changes": true,
	}
	if !validActions[req.Action] {
		c.JSON(400, gin.H{"message": "Invalid action. Must be: accept, decline, or request_changes"})
		return
	}

	// Request changes requires notes
	if req.Action == "request_changes" && req.Notes == "" {
		c.JSON(400, gin.H{"message": "Notes are required when requesting changes"})
		return
	}

	orderObjID, err := primitive.ObjectIDFromHex(orderID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid order ID"})
		return
	}

	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid user ID"})
		return
	}

	ordersCollection := database.GetDB().Collection("orders")
	var order models.Order
	err = ordersCollection.FindOne(context.Background(), bson.M{
		"_id":    orderObjID,
		"seller": userObjID,
	}).Decode(&order)
	if err != nil {
		c.JSON(404, gin.H{"message": "Order not found or unauthorized"})
		return
	}

	// Validate order is in pending_seller_review status
	if order.RequestStatus != "pending_seller_review" {
		c.JSON(400, gin.H{"message": "Order is not pending seller review"})
		return
	}

	// Update order based on action
	update := bson.M{
		"sellerResponseNotes": req.Notes,
		"updatedAt":           time.Now(),
	}

	switch req.Action {
	case "accept":
		update["requestStatus"] = "seller_accepted"
		update["status"] = "seller_accepted"
	case "decline":
		update["requestStatus"] = "seller_declined"
		update["status"] = "cancelled"
	case "request_changes":
		update["requestStatus"] = "awaiting_buyer_confirm"
		update["status"] = "awaiting_buyer_confirm"
	}

	_, err = ordersCollection.UpdateOne(
		context.Background(),
		bson.M{"_id": orderObjID},
		bson.M{"$set": update},
	)
	if err != nil {
		c.JSON(500, gin.H{"message": "Failed to update order"})
		return
	}

	// Fetch updated order
	var updatedOrder models.Order
	ordersCollection.FindOne(context.Background(), bson.M{"_id": orderObjID}).Decode(&updatedOrder)

	// TODO: Send notification to buyer

	c.JSON(200, updatedOrder)
}

// BuyerConfirm handles buyer's confirmation after seller accepted
func (h *OrderHandler) BuyerConfirm(c *gin.Context) {
	userID := c.GetString("userID")
	orderID := c.Param("id")

	var req struct {
		Confirm bool `json:"confirm"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"message": err.Error()})
		return
	}

	orderObjID, err := primitive.ObjectIDFromHex(orderID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid order ID"})
		return
	}

	userObjID, err := primitive.ObjectIDFromHex(userID)
	if err != nil {
		c.JSON(400, gin.H{"message": "Invalid user ID"})
		return
	}

	ordersCollection := database.GetDB().Collection("orders")
	var order models.Order
	err = ordersCollection.FindOne(context.Background(), bson.M{
		"_id":   orderObjID,
		"buyer": userObjID,
	}).Decode(&order)
	if err != nil {
		c.JSON(404, gin.H{"message": "Order not found or unauthorized"})
		return
	}

	// Validate order is in seller_accepted or awaiting_buyer_confirm status
	if order.RequestStatus != "seller_accepted" && order.RequestStatus != "awaiting_buyer_confirm" {
		c.JSON(400, gin.H{"message": "Order is not awaiting buyer confirmation"})
		return
	}

	if !req.Confirm {
		// Buyer declines - cancel order
		_, err = ordersCollection.UpdateOne(
			context.Background(),
			bson.M{"_id": orderObjID},
			bson.M{"$set": bson.M{
				"requestStatus": "buyer_declined",
				"status":        "cancelled",
				"updatedAt":     time.Now(),
			}},
		)
		if err != nil {
			c.JSON(500, gin.H{"message": "Failed to update order"})
			return
		}

		c.JSON(200, gin.H{"message": "Order cancelled", "status": "cancelled"})
		return
	}

	// Buyer confirms - proceed to payment
	_, err = ordersCollection.UpdateOne(
		context.Background(),
		bson.M{"_id": orderObjID},
		bson.M{"$set": bson.M{
			"buyerConfirmed": true,
			"requestStatus":  "",
			"status":         "pending",
			"updatedAt":      time.Now(),
		}},
	)
	if err != nil {
		c.JSON(500, gin.H{"message": "Failed to update order"})
		return
	}

	// Fetch updated order
	var updatedOrder models.Order
	ordersCollection.FindOne(context.Background(), bson.M{"_id": orderObjID}).Decode(&updatedOrder)

	// TODO: Send notification to seller

	c.JSON(200, updatedOrder)
}

// CleanupExpiredRequests auto-declines orders that exceeded seller response deadline
func (h *OrderHandler) CleanupExpiredRequests() {
	ordersCollection := database.GetDB().Collection("orders")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	cursor, err := ordersCollection.Find(ctx, bson.M{
		"requestStatus":   "pending_seller_review",
		"requestDeadline": bson.M{"$lt": time.Now()},
	})
	if err != nil {
		return
	}
	defer cursor.Close(ctx)

	for cursor.Next(ctx) {
		var order models.Order
		if err := cursor.Decode(&order); err != nil {
			continue
		}

		_, err = ordersCollection.UpdateOne(
			ctx,
			bson.M{"_id": order.ID},
			bson.M{"$set": bson.M{
				"requestStatus":       "seller_declined",
				"status":              "cancelled",
				"scheduledNotes":      "Auto-declined: seller did not respond in time",
				"sellerResponseNotes": "Auto-declined: seller did not respond in time",
				"updatedAt":           time.Now(),
			}},
		)
		if err != nil {
			continue
		}

		// TODO: Send notification to buyer about auto-decline
	}
}
