package main

import (
	"context"
	"encoding/json"
	"testing"

	"github.com/aws/aws-lambda-go/events"
)

func TestHandlerHealth(t *testing.T) {
	res, err := handler(context.Background(), events.APIGatewayProxyRequest{
		HTTPMethod: "GET",
		Path:       "/health",
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	if res.StatusCode != 200 {
		t.Fatalf("expected status 200, got %d", res.StatusCode)
	}

	var payload map[string]bool
	if err := json.Unmarshal([]byte(res.Body), &payload); err != nil {
		t.Fatalf("failed to decode response body: %v", err)
	}

	if !payload["ok"] {
		t.Fatalf("expected ok=true payload, got %#v", payload)
	}
}
