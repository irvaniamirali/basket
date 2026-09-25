package usecase

import (
	"context"
	"strings"

	"github.com/irvaniamirali/basket/src/internal/domain/product"
)

type fakeRepository struct {
	products  []product.Product
	createErr error
	findErr   error
	listErr   error
}

func (f *fakeRepository) Create(_ context.Context, item *product.Product) error {
	if f.createErr != nil {
		return f.createErr
	}
	f.products = append(f.products, *item)
	return nil
}

func (f *fakeRepository) FindBySlug(_ context.Context, slug string) (*product.Product, error) {
	if f.findErr != nil {
		return nil, f.findErr
	}
	for i := range f.products {
		if f.products[i].Slug == slug {
			found := f.products[i]
			return &found, nil
		}
	}
	return nil, product.ErrNotFound
}

func (f *fakeRepository) List(_ context.Context, params product.ListParams) ([]product.Product, int64, error) {
	if f.listErr != nil {
		return nil, 0, f.listErr
	}

	query := strings.ToLower(strings.TrimSpace(params.Query))
	matched := make([]product.Product, 0, len(f.products))
	for _, item := range f.products {
		if params.ActiveOnly && !item.IsActive {
			continue
		}
		if query != "" && !strings.Contains(strings.ToLower(item.Name), query) {
			continue
		}
		matched = append(matched, item)
	}

	total := int64(len(matched))
	start := (params.Page - 1) * params.Limit
	if start < 0 {
		start = 0
	}
	if start >= len(matched) {
		return []product.Product{}, total, nil
	}
	end := start + params.Limit
	if end > len(matched) {
		end = len(matched)
	}
	return matched[start:end], total, nil
}
