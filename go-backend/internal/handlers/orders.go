package handlers

import (
	"context"
	"time"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"msme-marketplace/internal/database"
	"msme-marketplace/internal/models"
)

type OrderHandler struct{}

func NewOrderHandler() *OrderHandler {
	return &OrderHandler{}
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
		PickupTime   string `json:"pickupTime"`   // ISO 8601 datetime for pickup

		// Preorder for food
		IsPreorder   bool   `json:"isPreorder"`
		PreorderTime string `json:"preorderTime"` // ISO 8601 datetime when food should be ready

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
		"cash": true, "qris": true, "ewallet": true, "bank_transfer": true, "credit_card": true,
	}
	if !validMethods[req.PaymentMethod] {
		c.JSON(400, gin.H{"message": "Invalid payment method"})
		return
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

	// Parse pickup/preorder times
	var pickupTime *time.Time
	var preorderTime *time.Time

	if req.PickupTime != "" {
		if pt, err := time.Parse(time.RFC3339, req.PickupTime); err == nil {
			pickupTime = &pt
		}
	}

	if req.PreorderTime != "" {
		if pt, err := time.Parse(time.RFC3339, req.PreorderTime); err == nil {
			preorderTime = &pt
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

	order := models.Order{
		Buyer:       userObjID,
		Seller:      sellerID,
		Products:    orderProducts,
		TotalAmount: totalAmount,
		Status:      "pending",
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
		PickupTime:   pickupTime,
		IsPreorder:   req.IsPreorder,
		PreorderTime: preorderTime,
	}

	result, err := ordersCollection.InsertOne(context.Background(), order)
	if err != nil {
		c.JSON(500, gin.H{"message": "Failed to create order"})
		return
	}

	order.ID = result.InsertedID.(primitive.ObjectID)

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

	// Populate product info for each order
	for i, order := range orders {
		if products, ok := order["products"].(primitive.A); ok {
			populatedProducts := make([]bson.M, 0)
			for _, p := range products {
				if productMap, ok := p.(primitive.M); ok {
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

	ordersCollection := database.GetDB().Collection("orders")
	var order models.Order
	err = ordersCollection.FindOne(context.Background(), bson.M{
		"_id": orderObjID,
		"$or": []bson.M{
			{"buyer": bson.M{"$oid": userID}},
			{"seller": bson.M{"$oid": userID}},
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
		"pending": true, "confirmed": true, "preparing": true,
		"ready": true, "delivered": true, "cancelled": true,
	}
	if !validStatuses[req.Status] {
		c.JSON(400, gin.H{"message": "Invalid status"})
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
