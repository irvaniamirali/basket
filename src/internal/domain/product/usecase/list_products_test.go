package usecase

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/google/uuid"
	"github.com/irvaniamirali/basket/src/internal/domain/product"
)

func TestListProductsReturnsActiveProductsOnly(t *testing.T) {
	now := time.Now().UTC()
	repository := &fakeRepository{
		products: []product.Product{
			{ID: uuid.New(), Name: "Active Keyboard", Slug: "active", IsActive: true, CreatedAt: now},
			{ID: uuid.New(), Name: "Hidden Keyboard", Slug: "hidden", IsActive: false, CreatedAt: now},
		},
	}

	result, err := NewListProducts(repository).Execute(context.Background(), product.ListProductsInput{})
	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}
	if result.Total != 1 || len(result.Items) != 1 || result.Items[0].Slug != "active" {
		t.Fatalf("unexpected result: %+v", result)
	}
	if result.Page != 1 || result.Limit != 20 {
		t.Fatalf("unexpected pagination defaults: page=%d limit=%d", result.Page, result.Limit)
	}
}

func TestListProductsSearchesByName(t *testing.T) {
	repository := &fakeRepository{
		products: []product.Product{
			{Name: "Mechanical Keyboard", Slug: "keyboard", IsActive: true},
			{Name: "Wireless Mouse", Slug: "mouse", IsActive: true},
		},
	}

	result, err := NewListProducts(repository).Execute(context.Background(), product.ListProductsInput{Query: "  KEYBOARD  "})
	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}
	if result.Total != 1 || len(result.Items) != 1 || result.Items[0].Slug != "keyboard" {
		t.Fatalf("unexpected search result: %+v", result)
	}
}

func TestListProductsPaginates(t *testing.T) {
	repository := &fakeRepository{
		products: []product.Product{
			{Name: "Product One", Slug: "one", IsActive: true},
			{Name: "Product Two", Slug: "two", IsActive: true},
			{Name: "Product Three", Slug: "three", IsActive: true},
		},
	}

	result, err := NewListProducts(repository).Execute(context.Background(), product.ListProductsInput{Page: 2, Limit: 2})
	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}
	if result.Page != 2 || result.Limit != 2 || result.Total != 3 {
		t.Fatalf("unexpected pagination: %+v", result)
	}
	if len(result.Items) != 1 || result.Items[0].Slug != "three" {
		t.Fatalf("unexpected page items: %+v", result.Items)
	}
}

func TestListProductsCapsLimit(t *testing.T) {
	repository := &fakeRepository{}
	result, err := NewListProducts(repository).Execute(context.Background(), product.ListProductsInput{Page: 0, Limit: 1000})
	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}
	if result.Page != 1 || result.Limit != 100 {
		t.Fatalf("unexpected normalized pagination: %+v", result)
	}
}

func TestListProductsPropagatesRepositoryErrors(t *testing.T) {
	want := errors.New("database unavailable")
	_, err := NewListProducts(&fakeRepository{listErr: want}).Execute(context.Background(), product.ListProductsInput{})
	if !errors.Is(err, want) {
		t.Fatalf("error = %v, want %v", err, want)
	}
}
