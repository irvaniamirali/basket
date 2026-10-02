# M04 — Cart

## Goal

Allow an authenticated customer to maintain a persistent cart of catalog products in preparation for checkout. Cart operations are scoped to the current user and do not reserve inventory.

## Dependencies

* M02 provides the product catalog and current price, active flag, and stock.
* M03 provides the custom user model, token authentication, and authenticated API requests.

## Scope

### Data Model

Create a cart application in `apps.cart` with:

* `Cart`: UUID primary key, one-to-one owner reference to the configured user model, and creation/update timestamps.
* `CartItem`: UUID primary key, cart and product references, positive quantity, and creation/update timestamps.
* A database uniqueness constraint on `(cart, product)` so each product has at most one line in a cart.
* Deleting a product removes its cart line; deleting a user removes that user's cart.

Cart prices are not stored as authoritative snapshots. Responses use the product's current price, and M05 rechecks price and stock when creating an order.

### API

All endpoints require authentication and operate only on the caller's cart.

```text
GET    /api/cart/
POST   /api/cart/items/
PATCH  /api/cart/items/{id}/
DELETE /api/cart/items/{id}/
DELETE /api/cart/items/
```

* `GET /api/cart/` returns the caller's cart, creating an empty cart when needed.
* Add accepts `product_id` and a positive `quantity`. If the product is already present, the submitted quantity is added to the existing quantity.
* Update accepts a positive quantity and replaces the line quantity.
* Delete-item removes only the identified line belonging to the caller.
* Delete on the items collection clears the caller's cart and leaves the cart itself available.
* Cart responses include item identifiers, product summary, quantity, current unit price, line total, and a server-calculated cart total.
* Return `201` for a newly added line and `200` for cart retrieval or updates; deletes return `204`. Invalid input returns `400`, missing lines return `404`, and unauthenticated requests return `401`.

### Business Rules

* Products must exist and be active to add to a cart.
* Quantities must be positive integers and the resulting line quantity cannot exceed current stock.
* Updating a line repeats the active-product and stock checks.
* Cart operations never accept a client-supplied price or total.
* Inventory is not reserved or decremented by cart operations. Checkout must independently revalidate availability.
* Users cannot read, update, or delete another user's cart or cart lines.

## Architecture

Keep models, serializers, views, URL configuration, and tests in `apps.cart`, following the existing Django app conventions. Use the configured custom user model through `settings.AUTH_USER_MODEL`. Keep the cart API and calculations in DRF serializers/views; do not add a general service layer or checkout/order behavior.

## Tests

Cover:

* Authenticated empty-cart retrieval and cart creation.
* Adding a product, incrementing an existing line, updating quantity, deleting a line, and clearing the cart.
* Computed current-price line totals and cart total.
* Rejection of missing, inactive, or insufficient-stock products and non-positive quantities.
* Isolation between two users and rejection of unauthenticated requests.
* Product deletion cleanup of cart lines.

## Acceptance Criteria

* Cart data persists and is uniquely associated with the authenticated user.
* The documented endpoints return only the caller's cart data and correct status codes.
* Product eligibility, quantity, and stock rules are enforced on add and update.
* Prices and totals are computed by the server; cart operations do not change inventory.
* Focused cart tests, formatting, and configured lint checks pass.

## Out of Scope

* Checkout, order creation, inventory reservation, coupons, shipping, taxes, payments, guest carts, cart merging, and Redis caching.