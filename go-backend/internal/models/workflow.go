package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Workflow struct {
	ID             primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	Seller         primitive.ObjectID `bson:"seller" json:"seller"`
	Name           string             `bson:"name" json:"name"`
	Type           string             `bson:"type" json:"type"`
	N8nWorkflowID  *string            `bson:"n8nWorkflowId" json:"n8nWorkflowId"`
	WebhookURL     *string            `bson:"webhookUrl" json:"webhookUrl"`
	IsActive       bool               `bson:"isActive" json:"isActive"`
	Config         bson.M             `bson:"config" json:"config"`
	ExecutionCount int                `bson:"executionCount" json:"executionCount"`
	LastExecuted   *time.Time         `bson:"lastExecuted" json:"lastExecuted"`
	CreatedAt      time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt      time.Time          `bson:"updatedAt" json:"updatedAt"`
}
