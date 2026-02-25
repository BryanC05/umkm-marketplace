package handlers

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"

	"github.com/gin-gonic/gin"
)

type AIHandler struct{}

func NewAIHandler() *AIHandler {
	return &AIHandler{}
}

type GenerateDescRequest struct {
	Name     string `json:"name" binding:"required"`
	Keywords string `json:"keywords"`
}

type GroqRequest struct {
	Model    string        `json:"model"`
	Messages []GroqMessage `json:"messages"`
}

type GroqMessage struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type GroqResponse struct {
	Choices []struct {
		Message struct {
			Content string `json:"content"`
		} `json:"message"`
	} `json:"choices"`
}

func (h *AIHandler) GenerateDescription(c *gin.Context) {
	var req GenerateDescRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	apiKey := os.Getenv("GROQ_API_KEY")
	if apiKey == "" {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "API key not configured"})
		return
	}

	prompt := fmt.Sprintf("You are an expert copywriter for an e-commerce MSME (Micro, Small, Medium Enterprise) marketplace. Write a catchy, professional, and SEO-friendly product description tailored for the Indonesian market for the product '%s'.", req.Name)
	if req.Keywords != "" {
		prompt += fmt.Sprintf(" Please include these keywords naturally: %s.", req.Keywords)
	}
	prompt += " Keep it concise, engaging, and format it nicely with emojis."

	groqReq := GroqRequest{
		Model: "llama-3.1-8b-instant", // Fast and free tier model on Groq
		Messages: []GroqMessage{
			{
				Role:    "system",
				Content: "You are a helpful e-commerce copywriter assistant.",
			},
			{
				Role:    "user",
				Content: prompt,
			},
		},
	}

	jsonData, err := json.Marshal(groqReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create request"})
		return
	}

	httpReq, err := http.NewRequest("POST", "https://api.groq.com/openai/v1/chat/completions", bytes.NewBuffer(jsonData))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create HTTP request"})
		return
	}

	httpReq.Header.Set("Authorization", "Bearer "+apiKey)
	httpReq.Header.Set("Content-Type", "application/json")

	client := &http.Client{}
	resp, err := client.Do(httpReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to call AI API"})
		return
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		fmt.Printf("Groq API Error: %s\n", string(bodyBytes))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "AI provider refused the request. Please check API key/quota."})
		return
	}

	var groqResp GroqResponse
	if err := json.NewDecoder(resp.Body).Decode(&groqResp); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to parse AI response"})
		return
	}

	if len(groqResp.Choices) == 0 {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "No response choice from AI"})
		return
	}

	generatedText := strings.TrimSpace(groqResp.Choices[0].Message.Content)

	c.JSON(http.StatusOK, gin.H{
		"description": generatedText,
	})
}
