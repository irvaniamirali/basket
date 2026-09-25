package product

import "time"

type CreateProductRequest struct {
	Name        string `json:"name"`
	Slug        string `json:"slug"`
	Description string `json:"description"`
	Price       int64  `json:"price"`
	Stock       int    `json:"stock"`
}

type ProductResponse struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Slug        string    `json:"slug"`
	Description string    `json:"description"`
	Price       int64     `json:"price"`
	Stock       int       `json:"stock"`
	IsActive    bool      `json:"is_active"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

type ListProductsResponse struct {
	Items []ProductResponse `json:"items"`
	Page  int               `json:"page"`
	Limit int               `json:"limit"`
	Total int64             `json:"total"`
}

func NewProductResponse(item Product) ProductResponse {
	return ProductResponse{
		ID:          item.ID.String(),
		Name:        item.Name,
		Slug:        item.Slug,
		Description: item.Description,
		Price:       item.Price,
		Stock:       item.Stock,
		IsActive:    item.IsActive,
		CreatedAt:   item.CreatedAt,
		UpdatedAt:   item.UpdatedAt,
	}
}

func NewListProductsResponse(result ListProductsResult) ListProductsResponse {
	items := make([]ProductResponse, 0, len(result.Items))
	for _, item := range result.Items {
		items = append(items, NewProductResponse(item))
	}
	return ListProductsResponse{
		Items: items,
		Page:  result.Page,
		Limit: result.Limit,
		Total: result.Total,
	}
}
