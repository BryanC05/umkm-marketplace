package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Review struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	Product   primitive.ObjectID `bson:"product" json:"product"`
	User      primitive.ObjectID `bson:"user" json:"user"`
	UserName  string             `bson:"userName" json:"userName"`
	Rating    int                `bson:"rating" json:"rating"` // 1-5
	Comment   string             `bson:"comment" json:"comment"`
	Images    []string           `bson:"images,omitempty" json:"images"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time          `bson:"updatedAt" json:"updatedAt"`
}
