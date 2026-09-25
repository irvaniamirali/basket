package product

import (
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	create CreateProductUseCase
	list   ListProductsUseCase
	get    GetProductUseCase
	logger *slog.Logger
}

func NewHandler(
	create CreateProductUseCase,
	list ListProductsUseCase,
	get GetProductUseCase,
	logger *slog.Logger,
) *Handler {
	return &Handler{
		create: create,
		list:   list,
		get:    get,
		logger: logger,
	}
}

func (h *Handler) Register(group *gin.RouterGroup) {
	group.POST("/products", h.createProduct)
	group.GET("/products", h.listProducts)
	group.GET("/products/:slug", h.getProduct)
}

func (h *Handler) createProduct(c *gin.Context) {
	var request CreateProductRequest
	if err := c.ShouldBindJSON(&request); err != nil {
		writeError(c, http.StatusBadRequest, "invalid_request", "invalid request body")
		return
	}

	created, err := h.create.Execute(c.Request.Context(), CreateProductInput{
		Name:        request.Name,
		Slug:        request.Slug,
		Description: request.Description,
		Price:       request.Price,
		Stock:       request.Stock,
	})
	if err != nil {
		h.writeUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusCreated, NewProductResponse(*created))
}

func (h *Handler) listProducts(c *gin.Context) {
	page, _ := strconv.Atoi(c.Query("page"))
	limit, _ := strconv.Atoi(c.Query("limit"))

	result, err := h.list.Execute(c.Request.Context(), ListProductsInput{
		Page:  page,
		Limit: limit,
		Query: c.Query("q"),
	})
	if err != nil {
		h.writeUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, NewListProductsResponse(*result))
}

func (h *Handler) getProduct(c *gin.Context) {
	found, err := h.get.Execute(c.Request.Context(), c.Param("slug"))
	if err != nil {
		h.writeUseCaseError(c, err)
		return
	}

	c.JSON(http.StatusOK, NewProductResponse(*found))
}

func (h *Handler) writeUseCaseError(c *gin.Context, err error) {
	var validation *ValidationError
	switch {
	case errors.As(err, &validation):
		writeError(c, http.StatusBadRequest, "validation_error", validation.Message)
	case errors.Is(err, ErrSlugConflict):
		writeError(c, http.StatusConflict, "conflict", ErrSlugConflict.Error())
	case errors.Is(err, ErrNotFound):
		writeError(c, http.StatusNotFound, "not_found", "product not found")
	default:
		h.logger.Error("product request failed", "error", err)
		writeError(c, http.StatusInternalServerError, "internal_error", "internal server error")
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
	c.JSON(status, errorResponse{Error: errorBody{Code: code, Message: message}})
}
