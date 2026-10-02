# M05 — Orders

## Goal

Let an authenticated customer place an order from their cart and retrieve their own order history. Checkout must preserve an accurate purchase snapshot and update inventory atomically.

## Dependencies

* M02 provides products, prices, active state, and stock.
* M03 provides the configured user model and token authentication.
* M04 provides the authenticated user's persistent cart and cart lines.

## Scope

### Data Model

Create an order application in `apps.orders` with:

* `Order`: UUID primary key, protected reference to its user, status, server-calculated total, and creation/update timestamps.
* `OrderItem`: order reference, nullable product reference using `SET_NULL`, product-name and slug snapshots, unit-price snapshot, and positive quantity.
* Product deletion must not delete an order or its item snapshots. The nullable product reference records the relationship while the name, slug, price, and quantity preserve the purchased item details.
* A user's order history must not be removed by deleting the user; protect users with orders from deletion.
* The order total is the sum of each stored item unit price multiplied by its quantity. No shipping, tax, or discount amounts are included in M05.

### API

All endpoints require authentication and are scoped to the current user.

```text
POST /api/orders/
GET  /api/orders/
GET  /api/orders/{id}/
```

* `POST /api/orders/` creates an order from the caller's current cart. The request body is empty; clients cannot choose products, quantities, prices, totals, or status.
* The response includes order ID, status, total, timestamps, and item snapshots.
* `GET /api/orders/` returns only the caller's orders using the configured API pagination.
* `GET /api/orders/{id}/` returns only an order belonging to the caller; another user's order is indistinguishable from a missing order and returns `404`.
* Successful creation returns `201`; invalid checkout returns `400`; unauthenticated access returns `401`.

### Business Rules

* The cart must contain at least one line.
* Every cart product must still exist, be active, and have sufficient current stock at checkout.
* Re-read authoritative prices and inventory from the database; ignore all client-supplied pricing or order data.
* Copy product name, slug, unit price, and quantity into order-item snapshots and calculate the order total on the server.
* Use a database transaction for order creation, item snapshots, stock decrements, and cart clearing. If any line is invalid or stock is insufficient, roll back all changes and leave the cart and inventory unchanged.
* Lock product rows during checkout where supported by the database so concurrent orders cannot oversell stock.
* A successfully ordered cart is empty afterward; its `Cart` record remains available.
* New orders have status `pending`. M05 provides no status-changing, cancellation, or payment workflow.

## Architecture

Keep order models, serializers, views, URL configuration, and tests in `apps.orders`, following the existing Django app conventions. Use `settings.AUTH_USER_MODEL` for user relationships and reuse cart/product models. Keep checkout orchestration in the order creation view or a narrowly scoped helper only if needed for a testable transaction; do not add a broad domain/service framework.

## Tests

Cover:

* Successful checkout, persisted item snapshots, calculated total, stock decrement, and cart clearing.
* Empty-cart rejection.
* Inactive, missing, and insufficient-stock product rejection with no partial order, stock, or cart changes.
* Current database prices are used instead of client-supplied values.
* Order list and detail are isolated between users; another user's order returns `404`.
* Unauthenticated requests are rejected.
* Product deletion preserves order-item snapshots.
* Pagination of the order list.

## Acceptance Criteria

* Authenticated users can create orders from their own carts and read only their own order history.
* Order item data and totals are immutable snapshots of the successful checkout.
* Stock decrement, order creation, and cart clearing are atomic and cannot partially succeed.
* Concurrent checkout uses row locking where supported to prevent overselling.
* Focused order tests, formatting, and configured lint checks pass.

## Out of Scope

* Payments, refunds, cancellation, shipping, taxes, discounts, coupon codes, invoices, notifications, and background processing.