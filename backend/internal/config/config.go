package config

import (
	"log"
	"os"

	"github.com/joho/godotenv"
)

type Config struct {
	MongoURI    string
	JWTSECRET   string
	HuggingFace string // your HF API token
	Port        string
}

func Load() *Config {
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file, reading from environment")
	}
	return &Config{
		MongoURI:    getEnv("MONGO_URI", "mongodb://localhost:27017"),
		JWTSECRET:   getEnv("JWT_SECRET", "supersecret"),
		HuggingFace: getEnv("HF_API_TOKEN", ""),
		Port:        getEnv("PORT", "5000"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
