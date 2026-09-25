package usecase

import (
	"context"
	"errors"
	"strings"
	"testing"
	"unicode/utf8"

	"github.com/irvaniamirali/basket/src/internal/domain/product"
)

func TestCreateProductSuccess(t *testing.T) {
	repository := &fakeRepository{}
	created, err := NewCreateProduct(repository).Execute(context.Background(), product.CreateProductInput{
		Name:        "  Mechanical Keyboard  ",
		Slug:        " mechanical-keyboard ",
		Description: " Hot-swappable keyboard ",
		Price:       4_200_000,
		Stock:       15,
	})
	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}
	if created.ID.String() == "" || created.Name != "Mechanical Keyboard" || created.Slug != "mechanical-keyboard" {
		t.Fatalf("unexpected product: %+v", created)
	}
	if created.Description != "Hot-swappable keyboard" || !created.IsActive || created.Price != 4_200_000 || created.Stock != 15 {
		t.Fatalf("unexpected product fields: %+v", created)
	}
	if len(repository.products) != 1 {
		t.Fatalf("repository size = %d, want 1", len(repository.products))
	}
}

func TestCreateProductValidation(t *testing.T) {
	tests := []struct {
		name    string
		input   product.CreateProductInput
		message string
	}{
		{
			name:    "missing name",
			input:   product.CreateProductInput{Slug: "keyboard", Price: 1, Stock: 1},
			message: "name is required",
		},
		{
			name:    "name too short",
			input:   product.CreateProductInput{Name: "ab", Slug: "keyboard", Price: 1, Stock: 1},
			message: "name must be between 3 and 120 characters",
		},
		{
			name:    "name too long",
			input:   product.CreateProductInput{Name: strings.Repeat("a", 121), Slug: "keyboard", Price: 1, Stock: 1},
			message: "name must be between 3 and 120 characters",
		},
		{
			name:    "missing slug",
			input:   product.CreateProductInput{Name: "Keyboard", Price: 1, Stock: 1},
			message: "slug is required",
		},
		{
			name:    "negative price",
			input:   product.CreateProductInput{Name: "Keyboard", Slug: "keyboard", Price: -1, Stock: 1},
			message: "price must not be negative",
		},
		{
			name:    "negative stock",
			input:   product.CreateProductInput{Name: "Keyboard", Slug: "keyboard", Price: 1, Stock: -1},
			message: "stock must not be negative",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, err := NewCreateProduct(&fakeRepository{}).Execute(context.Background(), test.input)
			var validation *product.ValidationError
			if !errors.As(err, &validation) {
				t.Fatalf("error = %v, want validation error", err)
			}
			if validation.Message != test.message {
				t.Fatalf("message = %q, want %q", validation.Message, test.message)
			}
		})
	}
}

func TestCreateProductNameLengthAllowsUnicode(t *testing.T) {
	name := strings.Repeat("ک", 120)
	if utf8.RuneCountInString(name) != 120 {
		t.Fatal("test setup: expected 120 runes")
	}
	created, err := NewCreateProduct(&fakeRepository{}).Execute(context.Background(), product.CreateProductInput{
		Name: name,
		Slug: "unicode-keyboard",
	})
	if err != nil {
		t.Fatalf("Execute() error = %v", err)
	}
	if created.Name != name {
		t.Fatalf("name = %q", created.Name)
	}
}

func TestCreateProductRejectsDuplicateSlug(t *testing.T) {
	repository := &fakeRepository{
		products: []product.Product{{Slug: "mechanical-keyboard", Name: "Existing"}},
	}
	_, err := NewCreateProduct(repository).Execute(context.Background(), product.CreateProductInput{
		Name:  "Mechanical Keyboard",
		Slug:  "mechanical-keyboard",
		Price: 1,
	})
	if !errors.Is(err, product.ErrSlugConflict) {
		t.Fatalf("error = %v, want slug conflict", err)
	}
}

func TestCreateProductPropagatesRepositoryErrors(t *testing.T) {
	want := errors.New("database unavailable")
	_, err := NewCreateProduct(&fakeRepository{findErr: want}).Execute(context.Background(), product.CreateProductInput{
		Name: "Mechanical Keyboard",
		Slug: "mechanical-keyboard",
	})
	if !errors.Is(err, want) {
		t.Fatalf("error = %v, want %v", err, want)
	}
}
