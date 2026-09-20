package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/amiri/shopline/src/internal/config"
	"github.com/amiri/shopline/src/internal/database"
	"github.com/amiri/shopline/src/internal/httpapi"
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	if err := run(logger); err != nil {
		logger.Error("application stopped with error", "error", err)
		os.Exit(1)
	}
}

func run(logger *slog.Logger) error {
	configuration, err := config.Load()
	if err != nil {
		return err
	}
	logger.Info("application starting", "environment", configuration.Environment)

	databasePool, err := database.Open(context.Background(), configuration.DatabaseURL)
	if err != nil {
		return err
	}
	defer databasePool.Close()
	logger.Info("database connection verified")

	server := &http.Server{
		Addr:              configuration.HTTPAddress,
		Handler:           httpapi.NewRouter(logger),
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      10 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	serverErrors := make(chan error, 1)
	go func() {
		logger.Info("http server started", "address", server.Addr)
		serverErrors <- server.ListenAndServe()
	}()

	shutdownContext, stop := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer stop()

	select {
	case err := <-serverErrors:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return err
	case <-shutdownContext.Done():
		logger.Info("shutdown signal received")
	}

	shutdownDeadline, cancel := context.WithTimeout(context.Background(), time.Duration(configuration.ShutdownTimeout)*time.Second)
	defer cancel()
	if err := server.Shutdown(shutdownDeadline); err != nil {
		return err
	}
	logger.Info("application stopped")
	return nil
}
