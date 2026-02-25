package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type PromoCode struct {
	ID             primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	Seller         primitive.ObjectID `bson:"seller" json:"seller"`
	Code           string             `bson:"code" json:"code"`
	DiscountType   string             `bson:"discountType" json:"discountType"`     // "percentage" or "fixed"
	DiscountValue  float64            `bson:"discountValue" json:"discountValue"`   // percentage (0-100) or fixed amount
	MinOrderAmount float64            `bson:"minOrderAmount" json:"minOrderAmount"` // minimum order to apply
	MaxUses        int                `bson:"maxUses" json:"maxUses"`               // 0 = unlimited
	CurrentUses    int                `bson:"currentUses" json:"currentUses"`
	IsActive       bool               `bson:"isActive" json:"isActive"`
	ExpiresAt      *time.Time         `bson:"expiresAt,omitempty" json:"expiresAt"`
	CreatedAt      time.Time          `bson:"createdAt" json:"createdAt"`
}
