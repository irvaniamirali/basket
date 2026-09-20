package config

import (
	"fmt"
	"net/url"
	"os"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	HTTPAddress     string
	DatabaseURL     string
	Environment     string
	ShutdownTimeout int
}

func Load() (Config, error) {
	_ = godotenv.Load()
	configuration := Config{
		HTTPAddress:     envOrDefault("HTTP_ADDR", ":8080"),
		DatabaseURL:     strings.TrimSpace(os.Getenv("DATABASE_URL")),
		Environment:     envOrDefault("APP_ENV", "development"),
		ShutdownTimeout: 10,
	}

	if configuration.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}
	if configuration.HTTPAddress == "" {
		return Config{}, fmt.Errorf("HTTP_ADDR must not be empty")
	}

	databaseURL, err := url.Parse(configuration.DatabaseURL)
	if err != nil || databaseURL.Scheme != "postgres" && databaseURL.Scheme != "postgresql" || databaseURL.Host == "" {
		return Config{}, fmt.Errorf("DATABASE_URL must be a valid PostgreSQL URL")
	}
	if configuration.Environment == "" {
		return Config{}, fmt.Errorf("APP_ENV must not be empty")
	}

	return configuration, nil
}

func envOrDefault(key, defaultValue string) string {
	value := strings.TrimSpace(os.Getenv(key))
	if value == "" {
		return defaultValue
	}
	return value
}
