package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Product struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	Name         string             `bson:"name" json:"name"`
	Description  string             `bson:"description" json:"description"`
	Price        float64            `bson:"price" json:"price"`
	Category     string             `bson:"category" json:"category"`
	Images       []string           `bson:"images" json:"images"`
	Seller       primitive.ObjectID `bson:"seller" json:"seller"`
	Location     Location           `bson:"location" json:"location"`
	Stock        int                `bson:"stock" json:"stock"`
	Unit         string             `bson:"unit" json:"unit"`
	IsAvailable  bool               `bson:"isAvailable" json:"isAvailable"`
	HasVariants  bool               `bson:"hasVariants" json:"hasVariants"`
	Variants     []Variant          `bson:"variants" json:"variants"`
	OptionGroups []OptionGroup      `bson:"optionGroups" json:"optionGroups"`
	Tags         []string           `bson:"tags" json:"tags"`
	Rating       float64            `bson:"rating" json:"rating"`
	TotalReviews int                `bson:"totalReviews" json:"totalReviews"`
	CreatedAt    time.Time          `bson:"createdAt" json:"createdAt"`
	UpdatedAt    time.Time          `bson:"updatedAt" json:"updatedAt"`
}

type Variant struct {
	Name  string  `bson:"name" json:"name"`
	Price float64 `bson:"price" json:"price"`
	Stock int     `bson:"stock" json:"stock"`
}

type OptionGroup struct {
	Name     string   `bson:"name" json:"name"`
	Required bool     `bson:"required" json:"required"`
	Multiple bool     `bson:"multiple" json:"multiple"`
	Options  []Option `bson:"options" json:"options"`
}

type Option struct {
	Name        string  `bson:"name" json:"name"`
	PriceAdjust float64 `bson:"priceAdjust" json:"priceAdjust"`
}
