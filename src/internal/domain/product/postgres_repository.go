package product

import (
	"context"
	"errors"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"
)

type PostgresRepository struct {
	db *gorm.DB
}

func NewPostgresRepository(db *gorm.DB) *PostgresRepository {
	return &PostgresRepository{db: db}
}

func (r *PostgresRepository) Create(ctx context.Context, product *Product) error {
	err := r.db.WithContext(ctx).Create(product).Error
	if isUniqueViolation(err) {
		return ErrSlugConflict
	}
	return err
}

func (r *PostgresRepository) FindBySlug(ctx context.Context, slug string) (*Product, error) {
	var product Product
	err := r.db.WithContext(ctx).Where("slug = ?", slug).First(&product).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &product, nil
}

func (r *PostgresRepository) List(ctx context.Context, params ListParams) ([]Product, int64, error) {
	query := r.db.WithContext(ctx).Model(&Product{})
	if params.ActiveOnly {
		query = query.Where("is_active = ?", true)
	}
	if search := strings.TrimSpace(params.Query); search != "" {
		query = query.Where("name ILIKE ? ESCAPE '\\'", "%"+escapeLike(search)+"%")
	}

	var total int64
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	var products []Product
	offset := (params.Page - 1) * params.Limit
	if err := query.Order("created_at DESC").Limit(params.Limit).Offset(offset).Find(&products).Error; err != nil {
		return nil, 0, err
	}
	if products == nil {
		products = []Product{}
	}
	return products, total, nil
}

func escapeLike(value string) string {
	replacer := strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`)
	return replacer.Replace(value)
}

func isUniqueViolation(err error) bool {
	if err == nil {
		return false
	}
	if errors.Is(err, gorm.ErrDuplicatedKey) {
		return true
	}
	var pgError *pgconn.PgError
	return errors.As(err, &pgError) && pgError.Code == "23505"
}
