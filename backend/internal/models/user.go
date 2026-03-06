package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type User struct {
	ID                    primitive.ObjectID    `bson:"_id,omitempty" json:"_id"`
	Name                  string                `bson:"name" json:"name"`
	Email                 string                `bson:"email" json:"email"`
	Password              string                `bson:"password" json:"-"`
	Phone                 string                `bson:"phone" json:"phone"`
	IsSeller              bool                  `bson:"isSeller" json:"isSeller"`
	AutomationEnabled     bool                  `bson:"automationEnabled" json:"automationEnabled"`
	BusinessName          *string               `bson:"businessName" json:"businessName"`
	BusinessType          string                `bson:"businessType" json:"businessType"`
	BusinessID            *primitive.ObjectID   `bson:"businessId,omitempty" json:"businessId"` // Reference to registered business
	Business              *BusinessResponse     `bson:"-,omitempty" json:"business,omitempty"`  // Populated business data
	Location              Location              `bson:"location" json:"location"`
	IsVerified            bool                  `bson:"isVerified" json:"isVerified"`
	ProfileImage          *string               `bson:"profileImage" json:"profileImage"`
	Rating                float64               `bson:"rating" json:"rating"`
	TotalReviews          int                   `bson:"totalReviews" json:"totalReviews"`
	SavedProducts         []primitive.ObjectID  `bson:"savedProducts" json:"savedProducts"`
	LogoGenerationCount   LogoGenerationCount   `bson:"logoGenerationCount" json:"logoGenerationCount"`
	ImageEnhancementCount ImageEnhancementCount `bson:"imageEnhancementCount" json:"imageEnhancementCount"`
	GeneratedLogos        []GeneratedLogo       `bson:"generatedLogos" json:"generatedLogos"`
	BusinessLogo          *string               `bson:"businessLogo" json:"businessLogo"`
	HasCustomLogo         bool                  `bson:"hasCustomLogo" json:"hasCustomLogo"`

	// Membership fields
	IsMember           bool       `bson:"isMember" json:"isMember"`
	MemberSince        *time.Time `bson:"memberSince" json:"memberSince"`
	MemberExpiry       *time.Time `bson:"memberExpiry" json:"memberExpiry"`
	MembershipStatus   string     `bson:"membershipStatus" json:"membershipStatus"` // "active", "expired", "pending", "none"
	PaymentProof       *string    `bson:"paymentProof" json:"paymentProof"`
	PaymentSubmittedAt *time.Time `bson:"paymentSubmittedAt" json:"paymentSubmittedAt"`

	// Social Media Links
	SocialLinks      []SocialLink `bson:"socialLinks" json:"socialLinks"`           // Profile links
	StoreSocialLinks []SocialLink `bson:"storeSocialLinks" json:"storeSocialLinks"` // Store links (separate from profile)

	// Instagram Accounts
	InstagramAccounts []InstagramAccount `bson:"instagramAccounts" json:"instagramAccounts"`

	CreatedAt time.Time `bson:"createdAt" json:"createdAt"`
	UpdatedAt time.Time `bson:"updatedAt" json:"updatedAt"`
}

type Location struct {
	Type        string    `bson:"type" json:"type"`
	Coordinates []float64 `bson:"coordinates" json:"coordinates"`
	Address     string    `bson:"address" json:"address"`
	City        string    `bson:"city" json:"city"`
	State       string    `bson:"state" json:"state"`
	Pincode     string    `bson:"pincode" json:"pincode"`
}

type LogoGenerationCount struct {
	Count         int       `bson:"count" json:"count"`
	LastResetDate time.Time `bson:"lastResetDate" json:"lastResetDate"`
}

type ImageEnhancementCount struct {
	Count         int       `bson:"count" json:"count"`
	LastResetDate time.Time `bson:"lastResetDate" json:"lastResetDate"`
}

type GeneratedLogo struct {
	ID        primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	LogoID    string             `bson:"logoId" json:"logoId"`
	URL       string             `bson:"url" json:"url"`
	Prompt    string             `bson:"prompt" json:"prompt"`
	FilePath  string             `bson:"filePath" json:"filePath"`
	CreatedAt time.Time          `bson:"createdAt" json:"createdAt"`
	ExpiresAt time.Time          `bson:"expiresAt" json:"expiresAt"`
}

// InstagramAccount represents a connected Instagram account
type InstagramAccount struct {
	InstagramUserID string    `bson:"instagramUserID" json:"instagramUserID"`
	Username        string    `bson:"username" json:"username"`
	AccessToken     string    `bson:"accessToken" json:"-"` // Encrypted, never expose to API
	IsDefault       bool      `bson:"isDefault" json:"isDefault"`
	ConnectedAt     time.Time `bson:"connectedAt" json:"connectedAt"`
}

// SocialLink represents a social media link
type SocialLink struct {
	Platform string `bson:"platform" json:"platform"` // instagram, tiktok, facebook, twitter, youtube, whatsapp, website
	URL      string `bson:"url" json:"url"`
}
