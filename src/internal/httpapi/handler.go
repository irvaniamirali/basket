package httpapi

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	logger *slog.Logger
}

func NewHandler(logger *slog.Logger) http.Handler {
	return NewRouter(logger)
}

func NewRouter(logger *slog.Logger) *gin.Engine {
	gin.SetMode(gin.ReleaseMode)
	router := gin.New()
	router.HandleMethodNotAllowed = true
	router.Use(recovery(logger))
	router.Use(requestLogger(logger))

	router.GET("/health", func(c *gin.Context) {
		writeJSON(c, http.StatusOK, map[string]string{"status": "healthy"})
	})

	router.NoRoute(func(c *gin.Context) {
		writeError(c, http.StatusNotFound, "not_found", "resource not found")
	})

	router.NoMethod(func(c *gin.Context) {
		if c.Request.URL.Path == "/health" {
			writeError(c, http.StatusMethodNotAllowed, "method_not_allowed", "method not allowed")
			return
		}
		writeError(c, http.StatusNotFound, "not_found", "resource not found")
	})

	return router
}

func recovery(logger *slog.Logger) gin.HandlerFunc {
	return gin.CustomRecovery(func(c *gin.Context, recovered any) {
		logger.Error("panic recovered", "error", recovered)
		writeError(c, http.StatusInternalServerError, "internal_error", "internal server error")
	})
}

func requestLogger(logger *slog.Logger) gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()
		c.Next()
		logger.Info("HTTP request",
			"method", c.Request.Method,
			"path", c.Request.URL.Path,
			"status", c.Writer.Status(),
			"duration", time.Since(start),
		)
	}
}

type errorResponse struct {
	Error errorBody `json:"error"`
}

type errorBody struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

func writeError(c *gin.Context, status int, code, message string) {
	writeJSON(c, status, errorResponse{Error: errorBody{Code: code, Message: message}})
}

func writeJSON(c *gin.Context, status int, value any) {
	c.JSON(status, value)
}
