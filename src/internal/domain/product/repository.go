package product

import "context"

type ListParams struct {
	Page       int
	Limit      int
	Query      string
	ActiveOnly bool
}

type Repository interface {
	Create(ctx context.Context, product *Product) error
	FindBySlug(ctx context.Context, slug string) (*Product, error)
	List(ctx context.Context, params ListParams) ([]Product, int64, error)
}
