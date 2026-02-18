package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"msme-marketplace/internal/config"
)

type ClaidError struct {
	Code      string
	Message   string
	Status    int
	Retryable bool
}

func (e *ClaidError) Error() string {
	if e == nil {
		return "claid error"
	}
	return fmt.Sprintf("%s: %s", e.Code, e.Message)
}

type ClaidService struct {
	apiKey  string
	baseURL string
	client  *http.Client
}

func NewClaidService(cfg *config.Config) *ClaidService {
	timeout := time.Duration(cfg.ClaidTimeoutSeconds) * time.Second
	if timeout <= 0 {
		timeout = 45 * time.Second
	}

	return &ClaidService{
		apiKey:  strings.TrimSpace(cfg.ClaidAPIKey),
		baseURL: strings.TrimRight(strings.TrimSpace(cfg.ClaidBaseURL), "/"),
		client:  &http.Client{Timeout: timeout},
	}
}

func (s *ClaidService) IsConfigured() bool {
	return s != nil && s.apiKey != ""
}

func (s *ClaidService) EnhanceImage(ctx context.Context, fileBytes []byte, filename, mimeType string) ([]byte, string, error) {
	if !s.IsConfigured() {
		return nil, "", &ClaidError{
			Code:      "unconfigured",
			Message:   "CLAID_API_KEY is not configured",
			Status:    0,
			Retryable: false,
		}
	}

	operations := map[string]any{
		"restorations": map[string]any{
			"decompress": "auto",
			"upscale":    "smart_enhance",
		},
		"resizing": map[string]any{
			"width":  "150%",
			"height": "150%",
		},
		"output": map[string]any{
			"format": map[string]any{
				"type": "jpeg",
				"jpg": map[string]any{
					"quality": 85,
				},
			},
		},
	}

	enhancedBytes, enhancedContentType, err := s.callUploadEndpoint(ctx, fileBytes, filename, mimeType, "image", operations)
	if err == nil {
		return enhancedBytes, enhancedContentType, nil
	}

	claidErr, ok := err.(*ClaidError)
	if ok && claidErr.Status >= 400 && claidErr.Status < 500 {
		return s.callUploadEndpoint(ctx, fileBytes, filename, mimeType, "file", operations)
	}

	return nil, "", err
}

func (s *ClaidService) callUploadEndpoint(ctx context.Context, fileBytes []byte, filename, mimeType, fileField string, operations map[string]any) ([]byte, string, error) {
	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	part, err := writer.CreateFormFile(fileField, filename)
	if err != nil {
		return nil, "", &ClaidError{Code: "request_build", Message: err.Error(), Status: 0, Retryable: false}
	}
	if _, err := part.Write(fileBytes); err != nil {
		return nil, "", &ClaidError{Code: "request_build", Message: err.Error(), Status: 0, Retryable: false}
	}

	opsBytes, err := json.Marshal(operations)
	if err != nil {
		return nil, "", &ClaidError{Code: "request_build", Message: err.Error(), Status: 0, Retryable: false}
	}

	if err := writer.WriteField("operations", string(opsBytes)); err != nil {
		return nil, "", &ClaidError{Code: "request_build", Message: err.Error(), Status: 0, Retryable: false}
	}

	if err := writer.Close(); err != nil {
		return nil, "", &ClaidError{Code: "request_build", Message: err.Error(), Status: 0, Retryable: false}
	}

	endpoint := s.baseURL + "/image/edit/upload"
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, body)
	if err != nil {
		return nil, "", &ClaidError{Code: "request_build", Message: err.Error(), Status: 0, Retryable: false}
	}

	req.Header.Set("Authorization", "Bearer "+s.apiKey)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	req.Header.Set("Accept", "application/json,image/*")

	resp, err := s.client.Do(req)
	if err != nil {
		return nil, "", &ClaidError{
			Code:      "timeout",
			Message:   err.Error(),
			Status:    0,
			Retryable: true,
		}
	}
	defer resp.Body.Close()

	contentType := strings.ToLower(resp.Header.Get("Content-Type"))
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		bodyPreview, _ := io.ReadAll(io.LimitReader(resp.Body, 2048))
		return nil, "", &ClaidError{
			Code:      classifyClaidStatusCode(resp.StatusCode),
			Message:   strings.TrimSpace(string(bodyPreview)),
			Status:    resp.StatusCode,
			Retryable: resp.StatusCode >= 500 || resp.StatusCode == 429,
		}
	}

	if strings.HasPrefix(contentType, "image/") {
		enhancedBytes, err := io.ReadAll(resp.Body)
		if err != nil {
			return nil, "", &ClaidError{Code: "io_error", Message: err.Error(), Status: resp.StatusCode, Retryable: true}
		}
		return enhancedBytes, contentType, nil
	}

	payload, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, "", &ClaidError{Code: "io_error", Message: err.Error(), Status: resp.StatusCode, Retryable: true}
	}

	tmpURL, parseErr := parseClaidTmpURL(payload)
	if parseErr != nil || tmpURL == "" {
		msg := "unable to parse Claid response"
		if parseErr != nil {
			msg = parseErr.Error()
		}
		return nil, "", &ClaidError{Code: "unprocessable", Message: msg, Status: resp.StatusCode, Retryable: false}
	}

	downloadReq, err := http.NewRequestWithContext(ctx, http.MethodGet, tmpURL, nil)
	if err != nil {
		return nil, "", &ClaidError{Code: "request_build", Message: err.Error(), Status: 0, Retryable: false}
	}
	downloadResp, err := s.client.Do(downloadReq)
	if err != nil {
		return nil, "", &ClaidError{Code: "download_failed", Message: err.Error(), Status: 0, Retryable: true}
	}
	defer downloadResp.Body.Close()

	if downloadResp.StatusCode < 200 || downloadResp.StatusCode >= 300 {
		bodyPreview, _ := io.ReadAll(io.LimitReader(downloadResp.Body, 512))
		return nil, "", &ClaidError{
			Code:      "download_failed",
			Message:   strings.TrimSpace(string(bodyPreview)),
			Status:    downloadResp.StatusCode,
			Retryable: downloadResp.StatusCode >= 500 || downloadResp.StatusCode == 429,
		}
	}

	enhancedBytes, err := io.ReadAll(downloadResp.Body)
	if err != nil {
		return nil, "", &ClaidError{Code: "io_error", Message: err.Error(), Status: downloadResp.StatusCode, Retryable: true}
	}

	downloadType := strings.ToLower(downloadResp.Header.Get("Content-Type"))
	if !strings.HasPrefix(downloadType, "image/") {
		downloadType = "image/jpeg"
	}

	return enhancedBytes, downloadType, nil
}

func parseClaidTmpURL(payload []byte) (string, error) {
	var response struct {
		Data struct {
			Output struct {
				TmpURL string `json:"tmp_url"`
			} `json:"output"`
		} `json:"data"`
		Output struct {
			TmpURL string `json:"tmp_url"`
		} `json:"output"`
		TmpURL string `json:"tmp_url"`
	}

	if err := json.Unmarshal(payload, &response); err != nil {
		return "", err
	}

	switch {
	case response.Data.Output.TmpURL != "":
		return response.Data.Output.TmpURL, nil
	case response.Output.TmpURL != "":
		return response.Output.TmpURL, nil
	case response.TmpURL != "":
		return response.TmpURL, nil
	default:
		return "", fmt.Errorf("claid tmp_url is missing in response")
	}
}

func classifyClaidStatusCode(status int) string {
	switch status {
	case http.StatusTooManyRequests:
		return "rate_limit"
	case http.StatusUnauthorized, http.StatusForbidden:
		return "unauthorized"
	case http.StatusUnprocessableEntity, http.StatusBadRequest:
		return "unprocessable"
	case http.StatusGatewayTimeout, http.StatusRequestTimeout:
		return "timeout"
	default:
		if status >= 500 {
			return "upstream_error"
		}
		return "request_failed"
	}
}

func ExtensionForContentType(contentType string) string {
	switch strings.ToLower(strings.TrimSpace(contentType)) {
	case "image/png":
		return ".png"
	case "image/webp":
		return ".webp"
	case "image/gif":
		return ".gif"
	default:
		return ".jpg"
	}
}

func NormalizeFilename(name string) string {
	name = strings.TrimSpace(name)
	if name == "" {
		return "image"
	}

	base := strings.TrimSuffix(name, filepath.Ext(name))
	if base == "" {
		return "image"
	}
	return base
}
