# M02 — Product Catalog

## Objective

Implement the product catalog and provide REST APIs for creating, listing, retrieving, updating, and deleting products.

## Scope

### Product Model

Create a `Product` model with:

* `id`
* `name`
* `slug`
* `description`
* `price`
* `stock`
* `is_active`
* `created_at`
* `updated_at`

Use PostgreSQL as the database.

The product ID should use UUID.

### API

Implement the following endpoints:

```text
GET    /api/products/
POST   /api/products/
GET    /api/products/{id}/
PATCH  /api/products/{id}/
DELETE /api/products/{id}/
```

### Product Listing

The list endpoint should support:

* Pagination
* Filtering active products
* Basic search by product name

Keep the initial implementation simple and avoid unnecessary filtering abstractions.

### Validation

Validate:

* Required fields
* Product name length
* Non-negative price
* Non-negative stock
* Valid slug
* Unique slug

### API Responses

Use appropriate HTTP status codes and consistent JSON responses.

The API should return clear validation errors for invalid input and a proper `404` response when a product does not exist.

### Architecture

Keep the implementation aligned with Django and Django REST Framework conventions.

Separate:

* Models
* Serializers
* Views
* URL configuration
* Tests

Do not introduce unnecessary layers or abstractions.

### Tests

Add tests covering important product behavior, including:

* Product creation
* Product listing
* Product retrieval
* Product update
* Product deletion
* Invalid product data
* Duplicate slug
* Non-existent product
* Pagination
* Search
* Active/inactive filtering

## Definition of Done

* Product model is implemented.
* Database migrations are created and applied.
* Product CRUD API is available.
* Pagination works.
* Basic search works.
* Active product filtering works.
* Validation is implemented.
* Appropriate HTTP status codes are returned.
* Automated tests cover the main product behavior.
* All tests pass.
* Formatting and linting pass.

## Out of Scope

The following are intentionally excluded from M02:

* User authentication
* Authorization
* Admin-only permissions
* Cart
* Orders
* Payments
* Redis
* Celery
* Product images or file uploads
* Advanced search

Authentication and authorization will be introduced in M03.
