package usecase

import (
	"context"
	"errors"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"
	"github.com/irvaniamirali/basket/src/internal/domain/product"
)

type CreateProduct struct {
	repository product.Repository
}

func NewCreateProduct(repository product.Repository) *CreateProduct {
	return &CreateProduct{repository: repository}
}

func (uc *CreateProduct) Execute(ctx context.Context, input product.CreateProductInput) (*product.Product, error) {
	name := strings.TrimSpace(input.Name)
	slug := strings.TrimSpace(input.Slug)
	description := strings.TrimSpace(input.Description)

	if name == "" {
		return nil, &product.ValidationError{Message: "name is required"}
	}
	nameLength := utf8.RuneCountInString(name)
	if nameLength < 3 || nameLength > 120 {
		return nil, &product.ValidationError{Message: "name must be between 3 and 120 characters"}
	}
	if slug == "" {
		return nil, &product.ValidationError{Message: "slug is required"}
	}
	if input.Price < 0 {
		return nil, &product.ValidationError{Message: "price must not be negative"}
	}
	if input.Stock < 0 {
		return nil, &product.ValidationError{Message: "stock must not be negative"}
	}

	_, err := uc.repository.FindBySlug(ctx, slug)
	if err == nil {
		return nil, product.ErrSlugConflict
	}
	if !errors.Is(err, product.ErrNotFound) {
		return nil, err
	}

	now := time.Now().UTC()
	created := &product.Product{
		ID:          uuid.New(),
		Name:        name,
		Slug:        slug,
		Description: description,
		Price:       input.Price,
		Stock:       input.Stock,
		IsActive:    true,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	if err := uc.repository.Create(ctx, created); err != nil {
		return nil, err
	}
	return created, nil
}
