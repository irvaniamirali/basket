package config

import "testing"

func TestLoadUsesDefaults(t *testing.T) {
	t.Setenv("HTTP_ADDR", "")
	t.Setenv("APP_ENV", "")
	t.Setenv("DATABASE_URL", "postgres://localhost/basket")

	configuration, err := Load()
	if err != nil {
		t.Fatalf("Load() returned error: %v", err)
	}
	if configuration.HTTPAddress != ":8080" || configuration.Environment != "development" {
		t.Fatalf("unexpected defaults: %+v", configuration)
	}
}

func TestLoadRejectsMissingDatabaseURL(t *testing.T) {
	t.Setenv("DATABASE_URL", "")

	if _, err := Load(); err == nil {
		t.Fatal("Load() accepted a missing DATABASE_URL")
	}
}

func TestLoadRejectsInvalidDatabaseURL(t *testing.T) {
	t.Setenv("DATABASE_URL", "http://localhost/basket")

	if _, err := Load(); err == nil {
		t.Fatal("Load() accepted an invalid PostgreSQL URL")
	}
}
