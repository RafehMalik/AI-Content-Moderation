package main

import (
	"log"

	"github.com/rafehmalik/ai-content-moderation/internal/config"
	database "github.com/rafehmalik/ai-content-moderation/internal/database"
	"github.com/rafehmalik/ai-content-moderation/internal/repository"
	"github.com/rafehmalik/ai-content-moderation/internal/server"
)

func main() {
	cfg := config.Load()
	database.Connect(cfg.MongoURI)
	repository.SeedPolicies()
	s := server.New(cfg)
	log.Println("Server starting on :", cfg.Port)
	s.Run(":" + cfg.Port)
}
