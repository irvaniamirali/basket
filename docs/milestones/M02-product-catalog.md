# M02 — Product Catalog

## Objective

Build the product catalog and its REST API using Clean Architecture.

This milestone introduces the first business feature of Basket. Public clients can browse products, while the API also supports creating products for development and future administrative features.

---

## Scope

### Included

- Product domain model
- PostgreSQL persistence with GORM
- Repository pattern
- Use Cases
    - Create Product
    - List Products
    - Get Product
- REST API with Gin
- Pagination
- Basic search by product name
- Request validation
- Unit tests for use cases

### Not Included

- Authentication & authorization
- Update/Delete products
- Categories
- Product images
- Redis cache
- Filtering by price or stock

---

## Architecture

Follow the existing Feature-First Clean Architecture.

```text
internal/
└── domain/
    └── product/
        ├── usecase/
        │   ├── create_product.go
        │   ├── list_products.go
        │   └── get_product.go
        │
        ├── model.go
        ├── repository.go
        ├── handler.go
        ├── dto.go
        └── interface.go
```

**Dependency rule**

- Delivery → Use Case
- Use Case → Repository Interface
- Repository → GORM
- Domain has no external dependencies.

---

## Product Model

| Field | Type | Notes |
|--------|------|-------|
| ID | UUID | Primary key |
| Name | string | Required |
| Slug | string | Unique |
| Description | string | Optional |
| Price | int64 | Integer amount |
| Stock | int | Inventory |
| IsActive | bool | Visible to customers |
| CreatedAt | time | Auto |
| UpdatedAt | time | Auto |

---

## API Endpoints

### Create Product

```http
POST /v1/products
```

Request

```json
{
  "name": "Mechanical Keyboard",
  "slug": "mechanical-keyboard",
  "description": "Hot-swappable keyboard",
  "price": 4200000,
  "stock": 15
}
```

Response

```http
201 Created
```

---

### List Products

```http
GET /v1/products?page=1&limit=20&q=keyboard
```

Returns paginated active products.

---

### Get Product

```http
GET /v1/products/:slug
```

Returns a single product.

---

## Validation Rules

| Field | Rule |
|--------|------|
| Name | Required, 3–120 chars |
| Slug | Required, unique |
| Price | Must be ≥ 0 |
| Stock | Must be ≥ 0 |

Return proper HTTP status codes for validation errors.

---

## Tasks

### Domain

- [ ] Create Product entity
- [ ] Define Product repository interface

### Database

- [ ] Create products table migration
- [ ] Implement PostgreSQL repository using GORM

### Use Cases

- [ ] Create Product
- [ ] List Products
- [ ] Get Product

### HTTP

- [ ] POST /v1/products
- [ ] GET /v1/products
- [ ] GET /v1/products/:slug
- [ ] Request validation
- [ ] Error responses

### Testing

- [ ] Unit tests for CreateProduct
- [ ] Unit tests for ListProducts
- [ ] Unit tests for GetProduct

---

## Definition of Done

- Products are stored in PostgreSQL.
- Repository is implemented with GORM.
- Business logic exists only inside Use Cases.
- All three endpoints return correct HTTP responses.
- Pagination and search work correctly.
- Validation prevents invalid product creation.
- Use Case unit tests pass.

---

## Notes

- Use UUID as the primary key.
- Store monetary values as integers (`int64`).
- Only active products are returned in public listing.
- Update and Delete operations belong to a future milestone.