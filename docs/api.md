# API Reference

The API is rooted at `/api/` and returns JSON unless a response is `204 No
Content`. Include a trailing slash on paths. Protected endpoints use DRF token
authentication:

```http
Authorization: Token <token>
Content-Type: application/json
```

Public routes are health, registration, token issuance, product reads, and the
ZarinPal redirect callback. Cart and order routes, profile/logout, product
mutations, and payment status/payment creation require authentication as
described below. DRF validation errors generally return `400` with field names
and arrays of messages, for example `{"quantity":["A valid integer is required."]}`.

## Health

`GET /api/health/` — public liveness response.

```json
{"status":"healthy"}
```

## Authentication

### Register

`POST /api/auth/register/` — public. Required: `username`, `email`, and
`password`; `first_name` and `last_name` are optional. Password validators
configured by Django apply. A new account is active and non-staff.

```json
{
  "username": "casey",
  "email": "casey@example.com",
  "password": "a-long-password"
}
```

Returns `201` with public account fields only:

```json
{
  "id": 12,
  "username": "casey",
  "email": "casey@example.com",
  "first_name": "",
  "last_name": ""
}
```

Missing/invalid values and duplicate username/email return `400` field
validation errors. Passwords are not returned.

### Create token

`POST /api/auth/token/` — public. Send `username` and `password`; returns `200`
with `{"token":"<token>"}`. Invalid credentials return `400`.

### Current profile

`GET /api/auth/me/` — authenticated. Returns the account's `id`, `username`,
`email`, `first_name`, and `last_name`. Anonymous requests return `401`.

### Logout

`POST /api/auth/logout/` — authenticated. Deletes the caller's token and
returns `204`. The deleted token can no longer authenticate requests.

## Products

Product reads are public. All product fields are returned by list/detail and
create/update responses: UUID `id`, `name`, `slug`, `description`, decimal
string `price`, integer `stock`, `is_active`, `created_at`, and `updated_at`.
New products default to `is_active: true`.

| Method | Path | Access | Success |
| --- | --- | --- | --- |
| `GET` | `/api/products/` | Public | `200`, paginated products |
| `POST` | `/api/products/` | Staff | `201`, created product |
| `GET` | `/api/products/{id}/` | Public | `200`, product |
| `PATCH` | `/api/products/{id}/` | Staff | `200`, updated product |
| `DELETE` | `/api/products/{id}/` | Staff | `204` |

List parameters: `page` (page-number pagination, 10 results per page),
`search` (product name), and `is_active=true|false`. Without `is_active`, both
active and inactive products may appear. An invalid `is_active` value returns
`400`. Paginated responses have `count`, `next`, `previous`, and `results`.

Create example:

```json
{
  "name": "Coffee beans",
  "slug": "coffee-beans",
  "description": "Whole bean coffee",
  "price": "12.50",
  "stock": 8
}
```

The `is_active` field can also be supplied. Invalid fields and duplicate slugs
return `400`; an unknown product UUID returns `404`. Anonymous mutations return
`401`; authenticated non-staff mutations return `403`.

## Cart

All cart endpoints require authentication and are scoped to the current user.
Prices are read from the current product record; adding/updating a cart never
reserves or decrements stock.

| Method | Path | Success |
| --- | --- | --- |
| `GET` | `/api/cart/` | `200`, current cart (creates an empty cart if needed) |
| `POST` | `/api/cart/items/` | `201` for a new line, `200` when adding to an existing line |
| `PATCH` | `/api/cart/items/{id}/` | `200`, updated cart |
| `DELETE` | `/api/cart/items/{id}/` | `204` |
| `DELETE` | `/api/cart/items/` | `204`, clears lines but retains the cart |

Add a line with `{"product_id":"<product-uuid>","quantity":2}`. If that product
is already in the cart, the quantity is added to the existing quantity. Update
a line with `{"quantity":3}`; this replaces its quantity. Quantities must be
positive and cannot exceed current stock. Only active products can be added or
updated.

Cart responses contain `id`, `items`, `total`, `created_at`, and `updated_at`.
Each item includes `id`, product summary (`id`, `name`, `slug`, `price`,
`stock`, `is_active`), `quantity`, current `unit_price`, `line_total`, and
timestamps. Monetary values are decimal strings:

```json
{
  "id": "22c72f57-9f23-4b34-b0bc-410057d87ef3",
  "items": [{
    "id": "0b414f74-5238-4f79-998d-8472e3b4b1b2",
    "product": {
      "id": "58274131-351f-4bd7-862e-cc9ccb0cdd37",
      "name": "Coffee beans",
      "slug": "coffee-beans",
      "price": "12.50",
      "stock": 8,
      "is_active": true
    },
    "quantity": 2,
    "unit_price": "12.50",
    "line_total": "25.00",
    "created_at": "2026-10-02T12:00:00Z",
    "updated_at": "2026-10-02T12:00:00Z"
  }],
  "total": "25.00",
  "created_at": "2026-10-02T12:00:00Z",
  "updated_at": "2026-10-02T12:00:00Z"
}
```

Invalid product/quantity or insufficient stock returns `400`; another user's
line is hidden as `404`. Anonymous requests return `401`.

## Orders

All order endpoints require authentication. Checkout uses the caller's cart and
accepts no client-controlled order, price, quantity, or status values.

| Method | Path | Success |
| --- | --- | --- |
| `POST` | `/api/orders/` | `201`, order created from cart |
| `GET` | `/api/orders/` | `200`, paginated orders for caller |
| `GET` | `/api/orders/{id}/` | `200`, caller's order |

Send an empty JSON object to create an order: `{}`. The server rechecks product
availability and current prices, snapshots item details, decrements stock,
and clears cart lines in one transaction. An empty cart, inactive/deleted
product, or insufficient stock returns `400`; failed checkout leaves order,
inventory, and cart unchanged.

Order responses contain UUID `id`, `status` (`pending` or `paid`), decimal
string `total`, timestamps, and `items`. Each item includes integer `id`,
nullable `product_id`, `product_name`, `product_slug`, decimal string
`unit_price`, `quantity`, and decimal string `line_total`. For example:

```json
{
  "id": "24c4348b-34c8-4315-8132-7bcbfbd230d7",
  "status": "pending",
  "total": "25.00",
  "created_at": "2026-10-02T12:00:00Z",
  "updated_at": "2026-10-02T12:00:00Z",
  "items": [{
    "id": 3,
    "product_id": "58274131-351f-4bd7-862e-cc9ccb0cdd37",
    "product_name": "Coffee beans",
    "product_slug": "coffee-beans",
    "unit_price": "12.50",
    "quantity": 2,
    "line_total": "25.00"
  }]
}
```

Lists use page-number pagination with 10 results per page. A different user's
order is indistinguishable from a missing order and returns `404`.

## Payments (ZarinPal)

Payment creation and status retrieval require authentication and are restricted
to the order owner. The callback is public because the provider redirects the
customer without the API token; the authority is looked up server-side and
payment success is based on provider verification, not callback parameters
alone.

| Method | Path | Access | Success |
| --- | --- | --- | --- |
| `POST` | `/api/orders/{order_id}/payments/` | Authenticated order owner | `201` new payment, `200` reused pending payment |
| `GET` | `/api/payments/{payment_id}/` | Authenticated payment owner | `200`, payment |
| `GET` | `/api/payments/zarinpal/callback/?Authority=...&Status=...` | Public provider callback | `200`, payment result |

Payment creation accepts an empty body. Only pending orders can be paid. The
API treats `Order.total` as Tomans and converts it using decimal arithmetic to
an integer Rial amount (`amount_rials = total * 10`); clients cannot set the
amount or currency. A newly created response includes payment fields
(`id`, `order_id`, `provider`, `status`, `amount_rials`, `reference_id`,
timestamps, and `verified_at`) plus `payment_url`:

```json
{
  "id": "d3337a61-00fb-4a68-859e-89e782d8a472",
  "order_id": "24c4348b-34c8-4315-8132-7bcbfbd230d7",
  "provider": "zarinpal",
  "status": "pending",
  "amount_rials": 25000,
  "reference_id": "",
  "created_at": "2026-10-02T12:00:00Z",
  "updated_at": "2026-10-02T12:00:00Z",
  "verified_at": null,
  "payment_url": "https://sandbox.zarinpal.com/pg/StartPay/<authority>"
}
```

An already pending request with an authority reuses its payment (`200`). An
order that cannot be paid or a payment being created without an authority
returns `409`; another user's or unknown order returns `404`; invalid/non-whole
Rial amounts return `400`. Missing provider configuration returns `503`;
provider/network errors return `502`. Payment retrieval is scoped to the
authenticated owner; other users receive `404`.

The public callback accepts `Authority` and `Status=OK|NOK`. Missing/invalid
parameters return `400`; unknown authority returns `404`. `NOK` cancels a
pending payment without changing the order. `OK` requests server-side
verification; only provider success (`100`, or documented already-verified
`101`) can mark the payment and order paid. The callback returns:

```json
{
  "payment_id": "d3337a61-00fb-4a68-859e-89e782d8a472",
  "status": "paid",
  "reference_id": "201"
}
```

The returned status may instead be `canceled`, `failed`, or `pending` depending
on callback/provider outcome. Configuration, provider, or network failures do
not claim payment success.

## Authentication and permissions summary

| Resource | Public | Authenticated | Staff |
| --- | --- | --- | --- |
| Health, registration, token | Yes | — | — |
| Product list/detail | Yes | — | — |
| Product create/update/delete | No | No | Yes |
| Profile, logout, cart, orders | No | Yes | No |
| Payment create/retrieve | No | Yes, own order only | No |
| ZarinPal callback | Yes | — | — |

## Database

The principal application tables and relationships are:

| Model (default table name) | Key fields and relationships |
| --- | --- |
| `users.User` (`users_user`) | Django `AbstractUser` fields, integer primary key, unique email. |
| `products.Product` (`products_product`) | UUID primary key; name, unique slug, description, price, stock, active flag, timestamps. |
| `cart.Cart` (`cart_cart`) | UUID primary key; one-to-one owner (`users.User`). |
| `cart.CartItem` (`cart_cartitem`) | UUID primary key; cart/product foreign keys, positive quantity; unique `(cart, product)`. Product/user deletion removes cart data through cascades. |
| `orders.Order` (`orders_order`) | UUID primary key; protected user foreign key, status, total, timestamps. |
| `orders.OrderItem` (`orders_orderitem`) | Order foreign key, nullable product foreign key, product name/slug/price snapshots and quantity. Product deletion preserves the item snapshot (`SET_NULL`). |
| `payments.Payment` (`payments_payment`) | UUID primary key; protected order foreign key, provider/status, integer Rial amount, authority/reference/provider metadata and timestamps. At most one pending payment per order. |

Migration history is app-local:

- `src/apps/users/migrations/0001_initial.py`: custom user.
- `src/apps/products/migrations/0001_initial.py`: catalog.
- `src/apps/cart/migrations/0001_initial.py`: cart and line constraints.
- `src/apps/orders/migrations/0001_initial.py` and
  `0002_alter_order_status.py`: orders/items, then the `paid` order status for
  the payment flow.
- `src/apps/payments/migrations/0001_initial.py`: payment state and pending
  payment uniqueness.

Apply migrations with `python src/manage.py migrate`; create/review model
migrations with `python src/manage.py makemigrations`. Django's built-in auth,
admin, session, and DRF token tables are also installed.
