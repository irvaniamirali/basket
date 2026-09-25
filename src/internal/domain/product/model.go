package product

import (
	"time"

	"github.com/google/uuid"
)

type Product struct {
	ID          uuid.UUID `gorm:"type:uuid;primaryKey"`
	Name        string    `gorm:"type:text;not null"`
	Slug        string    `gorm:"type:text;not null;uniqueIndex"`
	Description string    `gorm:"type:text;not null"`
	Price       int64     `gorm:"not null"`
	Stock       int       `gorm:"not null"`
	IsActive    bool      `gorm:"not null"`
	CreatedAt   time.Time `gorm:"not null"`
	UpdatedAt   time.Time `gorm:"not null"`
}
