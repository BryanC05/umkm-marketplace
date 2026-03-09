package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

// Project represents a user-submitted project (website, game, etc.)
type Project struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	Name        string             `bson:"name" json:"name"`
	Description string             `bson:"description" json:"description"`
	Link        string             `bson:"link" json:"link"`
	Image       string             `bson:"image,omitempty" json:"image,omitempty"`
	Images      []string           `bson:"images,omitempty" json:"images,omitempty"`
	Category    string             `bson:"category" json:"category"` // "website", "game", "app", "other"
	UserID      primitive.ObjectID `bson:"userId" json:"userId"`
	Username    string             `bson:"username" json:"username"`
	UserAvatar  string             `bson:"userAvatar,omitempty" json:"userAvatar,omitempty"`
	Tags        []string           `bson:"tags" json:"tags"`
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time          `bson:"updatedAt" json:"updatedAt"`
}

// ProjectInput represents the input for creating/updating a project
type ProjectInput struct {
	Name        string   `json:"name" binding:"required,min=1,max=100"`
	Description string   `json:"description" binding:"required,min=1,max=1000"`
	Link        string   `json:"link" binding:"required,url"`
	Image       string   `json:"image,omitempty"`
	Images      []string `json:"images,omitempty"`
	Category    string   `json:"category" binding:"required,oneof=website game app other"`
	Tags        []string `json:"tags,omitempty"`
	Username    string   `json:"username,omitempty"`
}
