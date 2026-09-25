package usecase

import (
	"context"
	"strings"

	"github.com/irvaniamirali/basket/src/internal/domain/product"
)

const (
	defaultPage  = 1
	defaultLimit = 20
	maxLimit     = 100
)

type ListProducts struct {
	repository product.Repository
}

func NewListProducts(repository product.Repository) *ListProducts {
	return &ListProducts{repository: repository}
}

func (uc *ListProducts) Execute(ctx context.Context, input product.ListProductsInput) (*product.ListProductsResult, error) {
	page := input.Page
	if page < 1 {
		page = defaultPage
	}
	limit := input.Limit
	if limit < 1 {
		limit = defaultLimit
	}
	if limit > maxLimit {
		limit = maxLimit
	}

	items, total, err := uc.repository.List(ctx, product.ListParams{
		Page:       page,
		Limit:      limit,
		Query:      strings.TrimSpace(input.Query),
		ActiveOnly: true,
	})
	if err != nil {
		return nil, err
	}

	return &product.ListProductsResult{
		Items: items,
		Total: total,
		Page:  page,
		Limit: limit,
	}, nil
}
