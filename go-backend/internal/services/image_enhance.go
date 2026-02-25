package services

import (
	"bytes"
	"encoding/base64"
	"fmt"
	"image"
	"image/color"
	"image/jpeg"
	"image/png"
	"math"
	"strings"

	"github.com/disintegration/imaging"
)

// EnhanceImageLocal applies food-photography-optimized enhancement:
// warm color grading, vibrant food colors, S-curve contrast, and texture sharpening.
func EnhanceImageLocal(fileBytes []byte, mimeType string) ([]byte, string, error) {
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
		img, _, err = image.Decode(reader)
	}
	if err != nil {
		return nil, "", fmt.Errorf("failed to decode image: %w", err)
	}

	// === Food Photography Color Grading Pipeline ===

	// 1. Warm color shift — push tones towards warm amber/orange
	//    Makes food look fresh and inviting (food photographers always warm their shots)
	warmed := applyWarmth(img, 12)

	// 2. S-curve contrast — creates depth with richer shadows and brighter highlights
	//    More natural than linear contrast, mimics professional photo editing
	contrasted := imaging.AdjustSigmoid(warmed, 0.5, 5.0)

	// 3. Boost saturation — makes reds, oranges, yellows pop (the "appetizing" colors)
	saturated := imaging.AdjustSaturation(contrasted, 30)

	// 4. Slight brightness lift — keeps the image airy and fresh
	brightened := imaging.AdjustBrightness(saturated, 5)

	// 5. Boost warm color channels — specifically enhance red/orange/yellow food tones
	foodColored := boostFoodColors(brightened)

	// 6. Sharpen for texture detail — brings out crispy, juicy, flaky food textures
	sharpened := imaging.Sharpen(foodColored, 1.0)

	// Encode to high-quality JPEG
	var buf bytes.Buffer
	err = jpeg.Encode(&buf, sharpened, &jpeg.Options{Quality: 92})
	if err != nil {
		return nil, "", fmt.Errorf("failed to encode enhanced image: %w", err)
	}

	return buf.Bytes(), "image/jpeg", nil
}

// applyWarmth shifts the image towards warmer tones by boosting red channel
// and slightly reducing blue channel. Amount is 0-100.
func applyWarmth(img image.Image, amount int) *image.NRGBA {
	bounds := img.Bounds()
	dst := imaging.New(bounds.Dx(), bounds.Dy(), color.NRGBA{0, 0, 0, 0})

	redBoost := float64(amount)
	blueReduce := float64(amount) * 0.6

	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			r, g, b, a := img.At(x, y).RGBA()

			// Convert from 16-bit to 8-bit
			r8 := float64(r >> 8)
			g8 := float64(g >> 8)
			b8 := float64(b >> 8)
			a8 := uint8(a >> 8)

			// Warm shift: boost red, slightly boost green, reduce blue
			newR := clampF(r8 + redBoost)
			newG := clampF(g8 + redBoost*0.3)
			newB := clampF(b8 - blueReduce)

			dst.SetNRGBA(x-bounds.Min.X, y-bounds.Min.Y, color.NRGBA{
				R: uint8(newR),
				G: uint8(newG),
				B: uint8(newB),
				A: a8,
			})
		}
	}
	return dst
}

// boostFoodColors selectively enhances warm tones (reds, oranges, yellows)
// which are the dominant colors in appetizing food photography.
func boostFoodColors(img image.Image) *image.NRGBA {
	bounds := img.Bounds()
	dst := imaging.New(bounds.Dx(), bounds.Dy(), color.NRGBA{0, 0, 0, 0})

	for y := bounds.Min.Y; y < bounds.Max.Y; y++ {
		for x := bounds.Min.X; x < bounds.Max.X; x++ {
			r, g, b, a := img.At(x, y).RGBA()

			r8 := float64(r >> 8)
			g8 := float64(g >> 8)
			b8 := float64(b >> 8)
			a8 := uint8(a >> 8)

			// Detect warm-toned pixels (reds, oranges, yellows)
			// Warm pixels have high red, moderate-to-high green, low blue
			warmness := 0.0
			if r8 > b8 && r8 > 60 {
				warmness = (r8 - b8) / 255.0
				if g8 > b8 {
					warmness *= 1.2 // Orange/yellow tones get extra boost
				}
			}

			// Clamp warmness factor
			if warmness > 1.0 {
				warmness = 1.0
			}

			// Apply selective saturation boost to warm colors
			boost := warmness * 15.0
			newR := clampF(r8 + boost)
			newG := clampF(g8 + boost*0.4)
			newB := clampF(b8 - boost*0.2)

			dst.SetNRGBA(x-bounds.Min.X, y-bounds.Min.Y, color.NRGBA{
				R: uint8(newR),
				G: uint8(newG),
				B: uint8(newB),
				A: a8,
			})
		}
	}
	return dst
}

// clampF clamps a float64 value to [0, 255].
func clampF(v float64) float64 {
	return math.Max(0, math.Min(255, v))
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
