package config

import (
	"os"
	"strconv"
)

type Config struct {
	Port                 string
	MongoDBURI           string
	JWTSecret            string
	NodeEnv              string
	LogoGenerationLimit  int
	LogoRetentionDays    int
	ClaidAPIKey          string
	ClaidBaseURL         string
	ClaidTimeoutSeconds  int
	ProductImageMaxSize  int
	ProductImageMaxCount int
	ProductEnhanceLimit  int
}

func Load() *Config {
	return &Config{
		Port:                 getEnv("PORT", "5000"),
		MongoDBURI:           getEnv("MONGODB_URI", "mongodb://localhost:27017/msme_marketplace"),
		JWTSecret:            getEnv("JWT_SECRET", "your-secret-key"),
		NodeEnv:              getEnv("NODE_ENV", "development"),
		LogoGenerationLimit:  5,
		LogoRetentionDays:    7,
		ClaidAPIKey:          firstNonEmpty(getEnv("CLAID_API_KEY", ""), getEnv("CLAID_EDITING_API_KEY", "")),
		ClaidBaseURL:         getEnv("CLAID_BASE_URL", "https://api.claid.ai/v1"),
		ClaidTimeoutSeconds:  getEnvInt("CLAID_TIMEOUT_SECONDS", 45),
		ProductImageMaxSize:  getEnvInt("PRODUCT_IMAGE_MAX_SIZE_MB", 5),
		ProductImageMaxCount: getEnvInt("PRODUCT_IMAGE_MAX_COUNT", 4),
		ProductEnhanceLimit:  getEnvInt("PRODUCT_ENHANCE_DAILY_LIMIT", 20),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	value := os.Getenv(key)
	if value == "" {
		return defaultValue
	}

	parsed, err := strconv.Atoi(value)
	if err != nil {
		return defaultValue
	}
	return parsed
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if value != "" {
			return value
		}
	}
	return ""
}
