package usecase

import (
	"context"
	"errors"
	"testing"

	"github.com/google/uuid"
	"github.com/irvaniamirali/basket/src/internal/domain/product"
)

func TestGetProductSuccess(t *testing.T) {
	id := uuid.New()
	repository := &fakeRepository{
		products: []product.Product{{ID: id, Name: "Mechanical Keyboard", Slug: "mechanical-keyboard", IsActive: true}},
	}

	found, err := NewGetProduct(repository).Execute(context.Background(), " mechanical-keyboard ")
	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}
	if found.ID != id || found.Slug != "mechanical-keyboard" {
		t.Fatalf("unexpected product: %+v", found)
	}
}

func TestGetProductNotFound(t *testing.T) {
	_, err := NewGetProduct(&fakeRepository{}).Execute(context.Background(), "missing")
	if !errors.Is(err, product.ErrNotFound) {
		t.Fatalf("error = %v, want not found", err)
	}
}

func TestGetProductHidesInactiveProducts(t *testing.T) {
	repository := &fakeRepository{
		products: []product.Product{{Name: "Hidden", Slug: "hidden", IsActive: false}},
	}
	_, err := NewGetProduct(repository).Execute(context.Background(), "hidden")
	if !errors.Is(err, product.ErrNotFound) {
		t.Fatalf("error = %v, want not found", err)
	}
}

func TestGetProductRequiresSlug(t *testing.T) {
	_, err := NewGetProduct(&fakeRepository{}).Execute(context.Background(), "   ")
	var validation *product.ValidationError
	if !errors.As(err, &validation) {
		t.Fatalf("error = %v, want validation error", err)
	}
	if validation.Message != "slug is required" {
		t.Fatalf("message = %q", validation.Message)
	}
}
