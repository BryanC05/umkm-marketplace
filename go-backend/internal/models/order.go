package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Order struct {
	ID              primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	Buyer           primitive.ObjectID `bson:"buyer" json:"buyer"`
	Seller          primitive.ObjectID `bson:"seller" json:"seller"`
	Products        []OrderProduct     `bson:"products" json:"products"`
	TotalAmount     float64            `bson:"totalAmount" json:"totalAmount"`
	Status          string             `bson:"status" json:"status"`
	DeliveryAddress DeliveryAddress    `bson:"deliveryAddress" json:"deliveryAddress"`
	PaymentStatus   string             `bson:"paymentStatus" json:"paymentStatus"`
	PaymentMethod   string             `bson:"paymentMethod" json:"paymentMethod"`
	PaymentDetails  PaymentDetails     `bson:"paymentDetails" json:"paymentDetails"`
	Notes           string             `bson:"notes" json:"notes"`

	// Delivery options
	DeliveryType string `bson:"deliveryType" json:"deliveryType"` // "delivery" or "pickup"

	// Preorder / Scheduled delivery
	IsPreorder     bool   `bson:"isPreorder" json:"isPreorder"`         // used for scheduled delivery
	PreorderTime   string `bson:"preorderTime" json:"preorderTime"`     // delivery time "19:00"
	DeliveryDate   string `bson:"deliveryDate" json:"deliveryDate"`     // "2026-02-25"
	ScheduledNotes string `bson:"scheduledNotes" json:"scheduledNotes"` // buyer notes for scheduled delivery

	// Request status for scheduled delivery flow
	RequestStatus       string    `bson:"requestStatus" json:"requestStatus"`             // pending_seller_review, seller_accepted, seller_declined, awaiting_buyer_confirm
	RequestDeadline     time.Time `bson:"requestDeadline" json:"requestDeadline"`         // 24h from creation
	SellerResponseNotes string    `bson:"sellerResponseNotes" json:"sellerResponseNotes"` // seller reason for decline/changes
	BuyerConfirmed      bool      `bson:"buyerConfirmed" json:"buyerConfirmed"`           // buyer confirmed after seller accepted

	// Driver tracking for delivery
	DriverID       *primitive.ObjectID  `bson:"driverId,omitempty" json:"driverId,omitempty"`
	ClaimedBy      *primitive.ObjectID  `bson:"claimedBy,omitempty" json:"claimedBy,omitempty"`
	DriverLocation *OrderDriverLocation `bson:"driverLocation,omitempty" json:"driverLocation,omitempty"`
	DriverName     string               `bson:"driverName,omitempty" json:"driverName,omitempty"`
	DriverPhone    string               `bson:"driverPhone,omitempty" json:"driverPhone,omitempty"`

	// Delivery timing
	ClaimedAt   *time.Time `bson:"claimedAt,omitempty" json:"claimedAt,omitempty"`
	PickupAt    *time.Time `bson:"pickupAt,omitempty" json:"pickupAt,omitempty"`
	DeliveredAt *time.Time `bson:"deliveredAt,omitempty" json:"deliveredAt,omitempty"`

	// Fee calculation
	DeliveryFee    float64 `bson:"deliveryFee" json:"deliveryFee"`
	DriverEarnings float64 `bson:"driverEarnings" json:"driverEarnings"`

	// Distance estimation
	EstimatedDistance float64 `bson:"estimatedDistance" json:"estimatedDistance"` // km
	EstimatedDuration int     `bson:"estimatedDuration" json:"estimatedDuration"` // minutes

	// Delivery progress tracking
	DeliveryProgress []DeliveryProgressPoint `bson:"deliveryProgress,omitempty" json:"deliveryProgress,omitempty"`
	EstimatedArrival *time.Time              `bson:"estimatedArrival,omitempty" json:"estimatedArrival,omitempty"`

	// Delivery proof
	PickupImage   string `bson:"pickupImage,omitempty" json:"pickupImage,omitempty"`
	DeliveryImage string `bson:"deliveryImage,omitempty" json:"deliveryImage,omitempty"`
	DeliveryNotes string `bson:"deliveryNotes,omitempty" json:"deliveryNotes,omitempty"`

	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}

// DriverLocation in order context
type OrderDriverLocation struct {
	Latitude  float64   `bson:"latitude" json:"latitude"`
	Longitude float64   `bson:"longitude" json:"longitude"`
	Timestamp time.Time `bson:"timestamp" json:"timestamp"`
}

type DeliveryProgressPoint struct {
	Status    string    `bson:"status" json:"status"`
	Timestamp time.Time `bson:"timestamp" json:"timestamp"`
	Note      string    `bson:"note,omitempty" json:"note,omitempty"`
}

type OrderProduct struct {
	Product         primitive.ObjectID `bson:"product" json:"product"`
	Quantity        int                `bson:"quantity" json:"quantity"`
	Price           float64            `bson:"price" json:"price"`
	VariantName     *string            `bson:"variantName" json:"variantName"`
	SelectedOptions []SelectedOption   `bson:"selectedOptions" json:"selectedOptions"`
}

type SelectedOption struct {
	GroupName   string   `bson:"groupName" json:"groupName"`
	Chosen      []string `bson:"chosen" json:"chosen"`
	PriceAdjust float64  `bson:"priceAdjust" json:"priceAdjust"`
}

type DeliveryAddress struct {
	Address     string    `bson:"address" json:"address"`
	City        string    `bson:"city" json:"city"`
	State       string    `bson:"state" json:"state"`
	Pincode     string    `bson:"pincode" json:"pincode"`
	Coordinates []float64 `bson:"coordinates" json:"coordinates"` // [longitude, latitude] for MongoDB GeoJSON
}

// GetLatLng returns coordinates as latitude, longitude (for frontend)
func (d DeliveryAddress) GetLatLng() (float64, float64) {
	if len(d.Coordinates) >= 2 {
		return d.Coordinates[1], d.Coordinates[0] // Return lat, lng
	}
	return 0, 0
}

type PaymentDetails struct {
	QRISURL         *string    `bson:"qrisUrl" json:"qrisUrl"`
	QRISCode        *string    `bson:"qrisCode" json:"qrisCode"`
	EwalletProvider *string    `bson:"ewalletProvider" json:"ewalletProvider"`
	EwalletPhone    *string    `bson:"ewalletPhone" json:"ewalletPhone"`
	CashReceived    float64    `bson:"cashReceived" json:"cashReceived"`
	CashChange      float64    `bson:"cashChange" json:"cashChange"`
	BankName        *string    `bson:"bankName" json:"bankName"`
	AccountNumber   *string    `bson:"accountNumber" json:"accountNumber"`
	AccountHolder   *string    `bson:"accountHolder" json:"accountHolder"`
	TransferProof   *string    `bson:"transferProof" json:"transferProof"`
	TransactionID   *string    `bson:"transactionId" json:"transactionId"`
	PaidAt          *time.Time `bson:"paidAt" json:"paidAt"`
}
