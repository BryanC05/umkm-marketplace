package services

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"strings"

	"github.com/disintegration/imaging"
)

// EnhanceSettings holds the parameters for image enhancement.
type EnhanceSettings struct {
	Brightness float64 // -100 to 100, default 10
	Contrast   float64 // -100 to 100, default 15
	Saturation float64 // -100 to 100, default 20
	Sharpen    float64 // sigma for sharpening, default 0.7
}

// DefaultEnhanceSettings returns reasonable product photo enhancement defaults.
func DefaultEnhanceSettings() EnhanceSettings {
	return EnhanceSettings{
		Brightness: 10,
		Contrast:   15,
		Saturation: 20,
		Sharpen:    0.7,
	}
}

// EnhanceImageLocal applies brightness, contrast, saturation, and sharpening
// to the given image bytes. Returns the enhanced image bytes and its MIME type.
func EnhanceImageLocal(fileBytes []byte, mimeType string) ([]byte, string, error) {
	return EnhanceImageLocalWithSettings(fileBytes, mimeType, DefaultEnhanceSettings())
}

// EnhanceImageLocalWithSettings applies custom enhancement settings.
func EnhanceImageLocalWithSettings(fileBytes []byte, mimeType string, settings EnhanceSettings) ([]byte, string, error) {
	reader := bytes.NewReader(fileBytes)

	var img image.Image
	var err error

	normalizedMime := strings.ToLower(strings.TrimSpace(mimeType))

	switch {
	case strings.Contains(normalizedMime, "png"):
		img, err = png.Decode(reader)
	case strings.Contains(normalizedMime, "jpeg") || strings.Contains(normalizedMime, "jpg"):
		img, err = jpeg.Decode(reader)
	default:
		// Fallback: try generic decode
		img, _, err = image.Decode(reader)
	}
	if err != nil {
		return nil, "", fmt.Errorf("failed to decode image: %w", err)
	}

	// Apply enhancements
	enhanced := imaging.AdjustBrightness(img, settings.Brightness)
	enhanced = imaging.AdjustContrast(enhanced, settings.Contrast)
	enhanced = imaging.AdjustSaturation(enhanced, settings.Saturation)
	if settings.Sharpen > 0 {
		enhanced = imaging.Sharpen(enhanced, settings.Sharpen)
	}

	// Encode back to JPEG (best balance of quality/size for product photos)
	var buf bytes.Buffer
	err = jpeg.Encode(&buf, enhanced, &jpeg.Options{Quality: 90})
	if err != nil {
		return nil, "", fmt.Errorf("failed to encode enhanced image: %w", err)
	}

	return buf.Bytes(), "image/jpeg", nil
}

// EnhanceImageToBase64 enhances an image and returns a base64-encoded data URL
// suitable for inline display in the frontend.
func EnhanceImageToBase64(fileBytes []byte, mimeType string) (string, error) {
	enhancedBytes, enhancedMime, err := EnhanceImageLocal(fileBytes, mimeType)
	if err != nil {
		return "", err
	}

	b64 := base64.StdEncoding.EncodeToString(enhancedBytes)
	dataURL := fmt.Sprintf("data:%s;base64,%s", enhancedMime, b64)
	return dataURL, nil
}
