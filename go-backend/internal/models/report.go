package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Report struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	Reporter   primitive.ObjectID `bson:"reporter" json:"reporter"`
	TargetType string             `bson:"targetType" json:"targetType"` // "product" or "seller"
	TargetID   primitive.ObjectID `bson:"targetId" json:"targetId"`
	Reason     string             `bson:"reason" json:"reason"`
	Details    string             `bson:"details" json:"details"`
	Status     string             `bson:"status" json:"status"` // "pending", "reviewed", "resolved"
	CreatedAt  time.Time          `bson:"createdAt" json:"createdAt"`
}

type Dispute struct {
	ID         primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	Order      primitive.ObjectID `bson:"order" json:"order"`
	Buyer      primitive.ObjectID `bson:"buyer" json:"buyer"`
	Seller     primitive.ObjectID `bson:"seller" json:"seller"`
	Reason     string             `bson:"reason" json:"reason"`
	Details    string             `bson:"details" json:"details"`
	Status     string             `bson:"status" json:"status"` // "open", "in_review", "resolved", "rejected"
	Resolution string             `bson:"resolution" json:"resolution"`
	CreatedAt  time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt  time.Time          `bson:"updatedAt" json:"updatedAt"`
}
