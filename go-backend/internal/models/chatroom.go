package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ChatRoom struct {
	ID          primitive.ObjectID  `bson:"_id,omitempty" json:"_id"`
	Order       *primitive.ObjectID `bson:"order" json:"order"`
	Buyer       primitive.ObjectID  `bson:"buyer" json:"buyer"`
	Seller      primitive.ObjectID  `bson:"seller" json:"seller"`
	ChatType    string              `bson:"chatType" json:"chatType"`
	LastMessage *primitive.ObjectID `bson:"lastMessage" json:"lastMessage"`
	UnreadCount UnreadCount         `bson:"unreadCount" json:"unreadCount"`
	CreatedAt   time.Time           `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time           `bson:"updatedAt" json:"updatedAt"`
}

type UnreadCount struct {
	Buyer  int `bson:"buyer" json:"buyer"`
	Seller int `bson:"seller" json:"seller"`
}

type Message struct {
	ID          primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	ChatRoom    primitive.ObjectID `bson:"chatRoom" json:"chatRoom"`
	Sender      primitive.ObjectID `bson:"sender" json:"sender"`
	Content     string             `bson:"content" json:"content"`
	MessageType string             `bson:"messageType" json:"messageType"`
	Attachments []Attachment       `bson:"attachments" json:"attachments"`
	IsRead      bool               `bson:"isRead" json:"isRead"`
	ReadAt      *time.Time         `bson:"readAt" json:"readAt"`
	CreatedAt   time.Time          `bson:"createdAt" json:"createdAt"`
}

type Attachment struct {
	URL      string `bson:"url" json:"url"`
	Filename string `bson:"filename" json:"filename"`
	FileType string `bson:"fileType" json:"fileType"`
	FileSize int64  `bson:"fileSize" json:"fileSize"`
}
