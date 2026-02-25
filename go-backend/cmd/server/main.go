package main

import (
	"fmt"
	"log"
	"os"

	"msme-marketplace/internal/config"
	"msme-marketplace/internal/database"
	"msme-marketplace/internal/handlers"
	"msme-marketplace/internal/middleware"
	"msme-marketplace/internal/websocket"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	err := godotenv.Load()
	if err != nil {
		if fallbackErr := godotenv.Load("../.env"); fallbackErr != nil {
			log.Println("Warning: .env file not found, using environment variables")
		}
	}

	cfg := config.Load()

	err = database.Connect(cfg.MongoDBURI, "msme_marketplace")
	if err != nil {
		log.Fatalf("Failed to connect to MongoDB: %v", err)
	}

	r := gin.Default()

	r.Use(middleware.CORSMiddleware())

	r.Static("/uploads", "./uploads")

	r.GET("/api/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "OK",
			"message": "MSME Marketplace API is running",
		})
	})

	websocket.Init()

	r.GET("/ws", websocket.GetHub().HandleWebSocket)

	authHandler := handlers.NewAuthHandler(cfg)
	userHandler := handlers.NewUserHandler()
	productHandler := handlers.NewProductHandler()
	orderHandler := handlers.NewOrderHandler()
	driverHandler := handlers.NewDriverHandler()
	chatHandler := handlers.NewChatHandler()
	forumHandler := handlers.NewForumHandler()
	workflowHandler := handlers.NewWorkflowHandler()
	logoHandler := handlers.NewLogoHandler()
	navigationHandler := handlers.NewNavigationHandler()
	webhookHandler := handlers.NewWebhookHandler()
	productImageHandler := handlers.NewProductImageHandler(cfg)
	notificationHandler := handlers.NewNotificationHandler()
	reviewHandler := handlers.NewReviewHandler()
	promoHandler := handlers.NewPromoHandler()
	analyticsHandler := handlers.NewAnalyticsHandler()
	reportHandler := handlers.NewReportHandler()

	api := r.Group("/api")
	{
		auth := api.Group("/auth")
		{
			auth.POST("/register", authHandler.Register)
			auth.POST("/login", authHandler.Login)
			auth.PUT("/profile", middleware.AuthRequired(cfg.JWTSecret), authHandler.UpdateProfile)
		}

		users := api.Group("/users")
		users.Use(middleware.AuthRequired(cfg.JWTSecret))
		{
			users.GET("/profile", userHandler.GetProfile)
			users.PUT("/profile", userHandler.UpdateProfile)
			users.GET("/saved-products", userHandler.GetSavedProducts)
			users.POST("/saved-products/:productId", userHandler.SaveProduct)
			users.DELETE("/saved-products/:productId", userHandler.UnsaveProduct)
			users.GET("/saved-products/check/:productId", userHandler.CheckSavedProduct)

			// Membership routes
			users.GET("/membership/status", userHandler.GetMembershipStatus)
			users.POST("/membership/payment", userHandler.SubmitMembershipPayment)
		}

		// Admin routes for membership management
		admin := api.Group("/admin")
		admin.Use(middleware.AuthRequired(cfg.JWTSecret))
		{
			admin.GET("/membership/pending", userHandler.GetPendingMemberships)
			admin.POST("/membership/approve/:memberId", userHandler.ApproveMembership)
			admin.POST("/membership/reject/:memberId", userHandler.RejectMembership)
			admin.POST("/membership/extend/:memberId", userHandler.ExtendMembership)
		}

		api.GET("/users/sellers/count", userHandler.GetSellersCount)
		api.GET("/users/nearby-sellers", userHandler.GetNearbySellers)
		api.GET("/users/seller/:id", userHandler.GetSellerByID)
		api.GET("/navigation/route", navigationHandler.GetRoute)

		products := api.Group("/products")
		{
			products.GET("/", productHandler.GetProducts)
			products.GET("/categories/counts", productHandler.GetCategoryCounts)
			products.GET("/seller/:sellerId", productHandler.GetProductsBySeller)
			products.GET("/:id", productHandler.GetProductByID)

			products.POST("/", middleware.AuthRequired(cfg.JWTSecret), productHandler.CreateProduct)
			products.PUT("/:id", middleware.AuthRequired(cfg.JWTSecret), productHandler.UpdateProduct)
			products.DELETE("/:id", middleware.AuthRequired(cfg.JWTSecret), productHandler.DeleteProduct)

			products.GET("/my-products", middleware.AuthRequired(cfg.JWTSecret), productHandler.GetMyProducts)
		}

		productImages := api.Group("/product-images")
		productImages.Use(middleware.AuthRequired(cfg.JWTSecret))
		{
			productImages.POST("/process", productImageHandler.ProcessImage)
			productImages.DELETE("/cleanup", productImageHandler.Cleanup)
		}

		orders := api.Group("/orders")
		orders.Use(middleware.AuthRequired(cfg.JWTSecret))
		{
			orders.GET("/my-orders", orderHandler.GetMyOrders)
			orders.GET("/:id", orderHandler.GetOrderByID)
			orders.PUT("/:id/status", orderHandler.UpdateOrderStatus)
			orders.PUT("/:id/payment", orderHandler.UpdatePayment)
			orders.PUT("/:id/seller-response", orderHandler.SellerResponse)
			orders.PUT("/:id/buyer-confirm", orderHandler.BuyerConfirm)
			orders.GET("/:id/chat-room", orderHandler.GetOrderChatRoom)
			orders.GET("/seller/product-tracking", orderHandler.GetProductTracking)

			// Driver tracking routes
			orders.POST("/:id/driver/location", orderHandler.UpdateDriverLocation)
			orders.GET("/:id/driver/location", orderHandler.GetDriverLocation)
			orders.POST("/:id/driver/assign", orderHandler.AssignDriver)

			orders.POST("/", orderHandler.CreateOrder)
		}

		driver := api.Group("/driver")
		driver.Use(middleware.AuthRequired(cfg.JWTSecret))
		{
			driver.POST("/toggle", driverHandler.ToggleDriverMode)
			driver.GET("/profile", driverHandler.GetDriverProfile)
			driver.PUT("/profile", driverHandler.UpdateDriverProfile)
			driver.PUT("/location", driverHandler.UpdateDriverLocation)
			driver.PUT("/push-token", driverHandler.SavePushToken)
			driver.GET("/stats", driverHandler.GetDriverStats)
			driver.GET("/available-orders", driverHandler.GetAvailableOrders)
			driver.POST("/claim/:id", driverHandler.ClaimOrder)
			driver.GET("/active-delivery", driverHandler.GetActiveDelivery)
			driver.POST("/status/:id", driverHandler.UpdateDeliveryStatus)
			driver.POST("/complete/:id", driverHandler.CompleteDelivery)
			driver.GET("/history", driverHandler.GetDeliveryHistory)
			driver.GET("/earnings", driverHandler.GetEarningsHistory)
		}

		driverRating := api.Group("/driver-rating")
		driverRating.Use(middleware.AuthRequired(cfg.JWTSecret))
		{
			driverRating.POST("/:orderId", driverHandler.RateDriver)
		}

		chat := api.Group("/chat")
		chat.Use(middleware.AuthRequired(cfg.JWTSecret))
		{
			chat.POST("/rooms", chatHandler.CreateChatRoom)
			chat.POST("/rooms/direct", chatHandler.CreateDirectChatRoom)
			chat.GET("/rooms", chatHandler.GetChatRooms)
			chat.GET("/rooms/direct/my-stores", chatHandler.GetMyStores)
			chat.GET("/rooms/direct/my-customers", chatHandler.GetMyCustomers)
			chat.GET("/rooms/:roomId/messages", chatHandler.GetMessages)
			chat.POST("/rooms/:roomId/messages", chatHandler.SendMessage)
			chat.GET("/rooms/:roomId/unread-count", chatHandler.GetUnreadCount)
		}

		forum := api.Group("/forum")
		{
			forum.GET("/", forumHandler.GetThreads)
			forum.GET("/:id", forumHandler.GetThread)

			forum.POST("/", middleware.AuthRequired(cfg.JWTSecret), forumHandler.CreateThread)
			forum.PUT("/:id", middleware.AuthRequired(cfg.JWTSecret), forumHandler.UpdateThread)
			forum.DELETE("/:id", middleware.AuthRequired(cfg.JWTSecret), forumHandler.DeleteThread)
			forum.POST("/:id/reply", middleware.AuthRequired(cfg.JWTSecret), forumHandler.CreateReply)
			forum.POST("/:id/like", middleware.AuthRequired(cfg.JWTSecret), forumHandler.LikeThread)
			forum.POST("/reply/:id/like", middleware.AuthRequired(cfg.JWTSecret), forumHandler.LikeReply)
		}

		workflows := api.Group("/workflows")
		workflows.Use(middleware.AuthRequired(cfg.JWTSecret))
		{
			workflows.GET("/", workflowHandler.GetWorkflows)
			workflows.POST("/", workflowHandler.CreateWorkflow)
			workflows.PATCH("/:id/toggle", workflowHandler.ToggleWorkflow)
			workflows.DELETE("/:id", workflowHandler.DeleteWorkflow)
		}

		webhooks := api.Group("/webhooks")
		{
			webhooks.POST("/n8n/callback", webhookHandler.N8nCallback)
			webhooks.POST("/test", middleware.AuthRequired(cfg.JWTSecret), webhookHandler.TestWebhook)
		}

		logo := api.Group("/logo")
		logo.Use(middleware.AuthRequired(cfg.JWTSecret))
		{
			logo.POST("/generate", logoHandler.GenerateLogo)
			logo.GET("/history", logoHandler.GetLogoHistory)
			logo.GET("/status", logoHandler.GetLogoStatus)
			logo.POST("/reset-limit", logoHandler.ResetLogoLimit)
			logo.PUT("/select/:logoId", logoHandler.SelectLogo)
			logo.DELETE("/:logoId", logoHandler.DeleteLogo)
			logo.POST("/upload", logoHandler.UploadCustomLogo)
		}

		notifications := api.Group("/notifications")
		notifications.Use(middleware.AuthRequired(cfg.JWTSecret))
		{
			notifications.GET("/", notificationHandler.GetNotifications)
			notifications.GET("/unread-count", notificationHandler.GetUnreadCount)
			notifications.PUT("/:id/read", notificationHandler.MarkAsRead)
			notifications.PUT("/read-all", notificationHandler.MarkAllRead)
			notifications.POST("/test", notificationHandler.SendTestNotification)
		}

		// Reviews - public read, authenticated write
		api.GET("/products/:productId/reviews", reviewHandler.GetProductReviews)
		reviews := api.Group("/reviews")
		reviews.Use(middleware.AuthRequired(cfg.JWTSecret))
		{
			reviews.POST("/", reviewHandler.CreateReview)
			reviews.GET("/mine", reviewHandler.GetMyReviews)
			reviews.DELETE("/:id", reviewHandler.DeleteReview)
		}

		// Promos
		promos := api.Group("/promos")
		promos.Use(middleware.AuthRequired(cfg.JWTSecret))
		{
			promos.POST("/", promoHandler.CreatePromo)
			promos.GET("/", promoHandler.GetMyPromos)
			promos.POST("/validate", promoHandler.ValidatePromo)
			promos.DELETE("/:id", promoHandler.DeletePromo)
		}

		// Analytics
		analytics := api.Group("/analytics")
		analytics.Use(middleware.AuthRequired(cfg.JWTSecret))
		{
			analytics.GET("/sales", analyticsHandler.GetSalesAnalytics)
			analytics.GET("/recommended", analyticsHandler.GetRecommended)
		}

		// Reports & Disputes
		reports := api.Group("/reports")
		reports.Use(middleware.AuthRequired(cfg.JWTSecret))
		{
			reports.POST("/", reportHandler.CreateReport)
			reports.GET("/", reportHandler.GetReports)
		}

		disputes := api.Group("/disputes")
		disputes.Use(middleware.AuthRequired(cfg.JWTSecret))
		{
			disputes.POST("/", reportHandler.CreateDispute)
			disputes.GET("/", reportHandler.GetMyDisputes)
			disputes.PUT("/:id/resolve", reportHandler.ResolveDispute)
		}
	}

	os.MkdirAll("./uploads/logos", 0755)
	os.MkdirAll("./uploads/products", 0755)
	os.MkdirAll("./uploads/forum", 0755)

	port := cfg.Port
	if port == "" {
		port = "5000"
	}

	fmt.Printf("🚀 Server running on port %s\n", port)
	r.Run(":" + port)
}
