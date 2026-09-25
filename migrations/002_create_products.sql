-- +goose Up
CREATE TABLE products (
    id UUID PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price BIGINT NOT NULL,
    stock INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT products_slug_key UNIQUE (slug),
    CONSTRAINT products_price_nonnegative CHECK (price >= 0),
    CONSTRAINT products_stock_nonnegative CHECK (stock >= 0)
);

-- +goose Down
DROP TABLE IF EXISTS products;
