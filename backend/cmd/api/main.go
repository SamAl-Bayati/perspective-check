package main

import (
	"log"
	"os"

	"github.com/SamAl-Bayati/perspective-check/backend/internal/server"
)

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	router := server.NewRouter()
	if err := router.Run(":" + port); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
