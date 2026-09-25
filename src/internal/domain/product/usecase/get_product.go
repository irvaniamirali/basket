package usecase

import (
	"context"
	"strings"

	"github.com/irvaniamirali/basket/src/internal/domain/product"
)

type GetProduct struct {
	repository product.Repository
}

func NewGetProduct(repository product.Repository) *GetProduct {
	return &GetProduct{repository: repository}
}

func (uc *GetProduct) Execute(ctx context.Context, slug string) (*product.Product, error) {
	slug = strings.TrimSpace(slug)
	if slug == "" {
		return nil, &product.ValidationError{Message: "slug is required"}
	}

	found, err := uc.repository.FindBySlug(ctx, slug)
	if err != nil {
		return nil, err
	}
	if !found.IsActive {
		return nil, product.ErrNotFound
	}
	return found, nil
}
