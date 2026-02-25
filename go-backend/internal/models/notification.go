package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Notification struct {
	ID        primitive.ObjectID     `bson:"_id,omitempty" json:"_id"`
	UserID    primitive.ObjectID     `bson:"userId" json:"userId"`
	Type      string                 `bson:"type" json:"type"`       // order_status, new_order, new_message, payment_update, delivery_update, system
	Title     string                 `bson:"title" json:"title"`
	Message   string                 `bson:"message" json:"message"`
	Data      map[string]interface{} `bson:"data,omitempty" json:"data,omitempty"` // orderId, chatRoomId, etc.
	IsRead    bool                   `bson:"isRead" json:"isRead"`
	CreatedAt time.Time              `bson:"createdAt" json:"createdAt"`
}
