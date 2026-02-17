package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ForumThread struct {
	ID          primitive.ObjectID   `bson:"_id,omitempty" json:"_id"`
	Title       string               `bson:"title" json:"title"`
	Content     string               `bson:"content" json:"content"`
	Author      primitive.ObjectID   `bson:"author" json:"author"`
	Category    string               `bson:"category" json:"category"`
	Attachments []ForumAttachment    `bson:"attachments" json:"attachments"`
	ViewCount   int                  `bson:"viewCount" json:"viewCount"`
	ReplyCount  int                  `bson:"replyCount" json:"replyCount"`
	Likes       []primitive.ObjectID `bson:"likes" json:"likes"`
	IsPinned    bool                 `bson:"isPinned" json:"isPinned"`
	IsLocked    bool                 `bson:"isLocked" json:"isLocked"`
	CreatedAt   time.Time            `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time            `bson:"updatedAt" json:"updatedAt"`
}

type ForumReply struct {
	ID          primitive.ObjectID   `bson:"_id,omitempty" json:"_id"`
	Content     string               `bson:"content" json:"content"`
	Author      primitive.ObjectID   `bson:"author" json:"author"`
	Thread      primitive.ObjectID   `bson:"thread" json:"thread"`
	Attachments []ForumAttachment    `bson:"attachments" json:"attachments"`
	Likes       []primitive.ObjectID `bson:"likes" json:"likes"`
	IsEdited    bool                 `bson:"isEdited" json:"isEdited"`
	CreatedAt   time.Time            `bson:"createdAt" json:"createdAt"`
	UpdatedAt   time.Time            `bson:"updatedAt" json:"updatedAt"`
}

type ForumAttachment struct {
	URL      string `bson:"url" json:"url"`
	Filename string `bson:"filename" json:"filename"`
	Mimetype string `bson:"mimetype" json:"mimetype"`
}
