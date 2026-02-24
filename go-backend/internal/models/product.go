package models

import (
	"encoding/json"
	"fmt"
	"hash/fnv"
	"net/url"
	"regexp"
	"strings"
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

const fallbackSeedFoodImageID = "photo-1504674900247-0877df9cc836"

type Product struct {
	ID           primitive.ObjectID `bson:"_id,omitempty" json:"_id"`
	Name         string             `bson:"name" json:"name"`
	Description  string             `bson:"description" json:"description"`
	Price        float64            `bson:"price" json:"price"`
	Category     string             `bson:"category" json:"category"`
	Images       []string           `bson:"images" json:"images"`
	LegacyImage  string             `bson:"image,omitempty" json:"-"`
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

// MarshalJSON keeps backward compatibility for legacy product records
// that still store a single "image" field instead of "images".
func (p Product) MarshalJSON() ([]byte, error) {
	type Alias Product
	alias := Alias(p)
	if len(alias.Images) == 0 && alias.LegacyImage != "" {
		alias.Images = []string{alias.LegacyImage}
	}
	if len(alias.Images) == 0 {
		alias.Images = []string{buildProductQueryImageURL(alias.Name)}
	} else {
		for i := range alias.Images {
			if strings.Contains(alias.Images[i], "source.unsplash.com") {
				alias.Images[i] = buildKeywordImageURLFromSource(alias.Images[i], alias.Name)
				continue
			}
			if i == 0 && isGenericSeedFallback(alias.Images[i]) {
				alias.Images[i] = buildProductQueryImageURL(alias.Name)
			}
		}
	}
	return json.Marshal(alias)
}

func isGenericSeedFallback(url string) bool {
	return strings.Contains(url, fallbackSeedFoodImageID)
}

func buildProductQueryImageURL(productName string) string {
	return buildKeywordImageURL(productName)
}

func buildKeywordImageURLFromSource(sourceURL string, fallbackName string) string {
	seed := extractSourceUnsplashSeed(sourceURL)
	if seed == "" {
		seed = fallbackName
	}
	return buildKeywordImageURL(seed)
}

func buildKeywordImageURL(seed string) string {
	keywords := sanitizeImageKeywords(seed)
	lock := stableLock(keywords)
	return fmt.Sprintf("https://loremflickr.com/640/480/%s?lock=%d", keywords, lock)
}

func sanitizeImageKeywords(input string) string {
	base := strings.TrimSpace(strings.ToLower(input))
	if base == "" {
		base = "indonesian-food"
	}

	re := regexp.MustCompile(`[^a-z0-9-]+`)
	cleaned := strings.Trim(re.ReplaceAllString(base, ","), ",")
	if cleaned == "" {
		return "indonesian-food"
	}
	return cleaned
}

func stableLock(input string) uint32 {
	hasher := fnv.New32a()
	_, _ = hasher.Write([]byte(input))
	// Keep it in a compact numeric range for loremflickr's lock param.
	return (hasher.Sum32() % 100000) + 1
}

func extractSourceUnsplashSeed(sourceURL string) string {
	idx := strings.Index(sourceURL, "?")
	if idx < 0 || idx >= len(sourceURL)-1 {
		return ""
	}

	queryRaw := sourceURL[idx+1:]
	first := strings.Split(queryRaw, "&")[0]
	if first == "" {
		return ""
	}

	if strings.Contains(first, "=") {
		parts := strings.SplitN(first, "=", 2)
		if len(parts) == 2 {
			first = parts[1]
		}
	}

	if decoded, err := url.QueryUnescape(first); err == nil {
		return decoded
	}
	return first
}
