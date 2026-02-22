package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

type NavigationHandler struct {
	client      *http.Client
	osrmBaseURL string
}

type RoutePoint struct {
	Lat float64 `json:"lat"`
	Lng float64 `json:"lng"`
}

type RouteStep struct {
	DistanceMeters float64    `json:"distanceMeters"`
	DurationSecond float64    `json:"durationSeconds"`
	Name           string     `json:"name"`
	Instruction    string     `json:"instruction"`
	Type           string     `json:"type"`
	Modifier       string     `json:"modifier,omitempty"`
	Location       RoutePoint `json:"location"`
}

func NewNavigationHandler() *NavigationHandler {
	baseURL := strings.TrimSpace(os.Getenv("OSRM_BASE_URL"))
	if baseURL == "" {
		baseURL = "https://router.project-osrm.org"
	}

	return &NavigationHandler{
		client: &http.Client{
			Timeout: 12 * time.Second,
		},
		osrmBaseURL: strings.TrimRight(baseURL, "/"),
	}
}

func (h *NavigationHandler) GetRoute(c *gin.Context) {
	originLat, ok := parseCoordinateQuery(c, "originLat")
	if !ok {
		return
	}
	originLng, ok := parseCoordinateQuery(c, "originLng")
	if !ok {
		return
	}
	destLat, ok := parseCoordinateQuery(c, "destinationLat")
	if !ok {
		return
	}
	destLng, ok := parseCoordinateQuery(c, "destinationLng")
	if !ok {
		return
	}

	if !isValidLatLng(originLat, originLng) || !isValidLatLng(destLat, destLng) {
		c.JSON(http.StatusBadRequest, gin.H{"message": "Invalid coordinates"})
		return
	}

	profile := normalizeRouteProfile(c.DefaultQuery("profile", "driving"))

	requestURL := fmt.Sprintf(
		"%s/route/v1/%s/%f,%f;%f,%f?overview=full&geometries=geojson&steps=true",
		h.osrmBaseURL,
		profile,
		originLng,
		originLat,
		destLng,
		destLat,
	)

	req, err := http.NewRequestWithContext(c.Request.Context(), http.MethodGet, requestURL, nil)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"message": "Failed to create route request"})
		return
	}

	resp, err := h.client.Do(req)
	if err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"message": "Routing provider request failed"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		c.JSON(http.StatusBadGateway, gin.H{
			"message": "Routing provider returned non-success status",
			"status":  resp.StatusCode,
		})
		return
	}

	var osrmResp struct {
		Code    string `json:"code"`
		Message string `json:"message"`
		Routes  []struct {
			Distance float64 `json:"distance"`
			Duration float64 `json:"duration"`
			Geometry struct {
				Coordinates [][]float64 `json:"coordinates"`
			} `json:"geometry"`
			Legs []struct {
				Steps []struct {
					Distance float64 `json:"distance"`
					Duration float64 `json:"duration"`
					Name     string  `json:"name"`
					Maneuver struct {
						Type     string    `json:"type"`
						Modifier string    `json:"modifier"`
						Location []float64 `json:"location"`
					} `json:"maneuver"`
				} `json:"steps"`
			} `json:"legs"`
		} `json:"routes"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&osrmResp); err != nil {
		c.JSON(http.StatusBadGateway, gin.H{"message": "Failed to parse routing response"})
		return
	}

	if strings.ToLower(osrmResp.Code) != "ok" || len(osrmResp.Routes) == 0 {
		c.JSON(http.StatusBadGateway, gin.H{
			"message":  "No route returned by provider",
			"provider": osrmResp.Message,
		})
		return
	}

	bestRoute := osrmResp.Routes[0]
	path := make([]RoutePoint, 0, len(bestRoute.Geometry.Coordinates))
	for _, point := range bestRoute.Geometry.Coordinates {
		if len(point) < 2 {
			continue
		}
		// OSRM uses [lng, lat]
		path = append(path, RoutePoint{
			Lat: point[1],
			Lng: point[0],
		})
	}

	steps := make([]RouteStep, 0)
	for _, leg := range bestRoute.Legs {
		for _, step := range leg.Steps {
			stepPoint := RoutePoint{}
			if len(step.Maneuver.Location) >= 2 {
				stepPoint = RoutePoint{
					Lat: step.Maneuver.Location[1],
					Lng: step.Maneuver.Location[0],
				}
			}
			steps = append(steps, RouteStep{
				DistanceMeters: step.Distance,
				DurationSecond: step.Duration,
				Name:           step.Name,
				Type:           step.Maneuver.Type,
				Modifier:       step.Maneuver.Modifier,
				Instruction:    buildRouteInstruction(step.Name, step.Maneuver.Type, step.Maneuver.Modifier),
				Location:       stepPoint,
			})
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"provider":        "osrm",
		"profile":         profile,
		"distanceMeters":  bestRoute.Distance,
		"durationSeconds": bestRoute.Duration,
		"path":            path,
		"steps":           steps,
		"origin": RoutePoint{
			Lat: originLat,
			Lng: originLng,
		},
		"destination": RoutePoint{
			Lat: destLat,
			Lng: destLng,
		},
	})
}

func parseCoordinateQuery(c *gin.Context, key string) (float64, bool) {
	raw := strings.TrimSpace(c.Query(key))
	if raw == "" {
		c.JSON(http.StatusBadRequest, gin.H{"message": fmt.Sprintf("Missing query param: %s", key)})
		return 0, false
	}

	value, err := strconv.ParseFloat(raw, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"message": fmt.Sprintf("Invalid query param: %s", key)})
		return 0, false
	}

	return value, true
}

func isValidLatLng(lat, lng float64) bool {
	if lat < -90 || lat > 90 {
		return false
	}
	if lng < -180 || lng > 180 {
		return false
	}
	return true
}

func normalizeRouteProfile(raw string) string {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "walk", "walking":
		return "walking"
	case "bike", "bicycle", "cycling":
		return "cycling"
	default:
		return "driving"
	}
}

func buildRouteInstruction(name, maneuverType, modifier string) string {
	name = strings.TrimSpace(name)
	modifier = strings.TrimSpace(modifier)

	switch maneuverType {
	case "depart":
		if name != "" {
			return fmt.Sprintf("Depart onto %s", name)
		}
		return "Depart"
	case "arrive":
		return "Arrive at destination"
	case "turn":
		if modifier != "" && name != "" {
			return fmt.Sprintf("Turn %s onto %s", modifier, name)
		}
		if modifier != "" {
			return fmt.Sprintf("Turn %s", modifier)
		}
		if name != "" {
			return fmt.Sprintf("Turn onto %s", name)
		}
		return "Turn"
	case "roundabout":
		if name != "" {
			return fmt.Sprintf("Enter roundabout toward %s", name)
		}
		return "Enter roundabout"
	default:
		if name != "" {
			return fmt.Sprintf("%s onto %s", capitalizeWord(maneuverType), name)
		}
		if maneuverType != "" {
			return capitalizeWord(maneuverType)
		}
		return "Continue"
	}
}

func capitalizeWord(value string) string {
	if value == "" {
		return value
	}
	lower := strings.ToLower(value)
	return strings.ToUpper(lower[:1]) + lower[1:]
}
