package product

import "context"

type CreateProductInput struct {
	Name        string
	Slug        string
	Description string
	Price       int64
	Stock       int
}

type ListProductsInput struct {
	Page  int
	Limit int
	Query string
}

type ListProductsResult struct {
	Items []Product
	Total int64
	Page  int
	Limit int
}

type CreateProductUseCase interface {
	Execute(ctx context.Context, input CreateProductInput) (*Product, error)
}

type ListProductsUseCase interface {
	Execute(ctx context.Context, input ListProductsInput) (*ListProductsResult, error)
}

type GetProductUseCase interface {
	Execute(ctx context.Context, slug string) (*Product, error)
}
