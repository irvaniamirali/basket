package product

import "errors"

var (
	ErrNotFound     = errors.New("product not found")
	ErrSlugConflict = errors.New("product slug already exists")
)

type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string {
	return e.Message
}
