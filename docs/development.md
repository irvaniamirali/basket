# Development Guide

## Project status and technology

Basket is a local e-commerce application: Django REST Framework serves catalog,
account, cart, order, and ZarinPal payment APIs, while a React storefront
consumes them. M01–M06 are implemented. Background tasks/notifications,
caching/performance work, and production readiness remain planned (M07–M10).
The repository currently does not configure Redis, Celery, Docker, or a
production deployment.

The backend uses Python 3.10+, Django 5.2, Django REST Framework, PostgreSQL,
`django-environ`, and psycopg 3. Tests use pytest and pytest-django; Ruff checks
and formats Python. The frontend uses React 19, TypeScript, Vite, React Router,
Vitest, Testing Library, Oxlint, and Prettier. Use a Node.js version allowed by
the installed frontend dependencies (for example, Node 22.22.2 or another
supported current release).

## Repository layout

```text
src/
  busket/                 Django settings, root URLs, ASGI and WSGI entry points
  apps/
    core/               Health endpoint
    products/           Catalog model, serializers, views, staff write permission
    users/              Custom user, admin registration, registration and token APIs
    cart/               User-owned cart and cart-item APIs
    orders/             Checkout, order snapshots, and order-history APIs
    payments/           Payment lifecycle, API, and ZarinPal gateway integration
  manage.py             Django management entry point
tests/                  Backend API tests, organized by feature
frontend/
  src/api/              Typed API client and API data types
  src/auth/             Authentication state and route guard
  src/cart/             Cart state
  src/components/       Shared storefront components
  src/pages/            Storefront, account, cart, order, and payment pages
  package.json          Frontend scripts and dependencies
docs/
  roadmap.md            Milestone status and development principles
  milestones/           Milestone goals, scope, and acceptance criteria
  development.md        This setup and architecture guide
  api.md                Implemented HTTP API reference
requirements.txt         Pinned Python dependencies
pyproject.toml           pytest settings and Python source path
```

## Local setup

### Backend

Requirements: Python 3.10 or later and a running PostgreSQL server/database.
Create a database and a PostgreSQL role that can connect to it; pytest also
needs permission to create its test database.

From the repository root:

```sh
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example src/.env
```

Edit `src/.env` before starting Django. Settings load the file from `src/`
(alongside the Django project package), not from the repository root. Replace
the example secret and database URL with local values. `DATABASE_URL` uses a
`django-environ` database URL, for example
`postgres://USER:PASSWORD@localhost:5432/basket`.

Apply migrations and run the development server:

```sh
python src/manage.py migrate
python src/manage.py runserver
```

The API is then available at `http://127.0.0.1:8000/`; Django admin is at
`/admin/`.

### Configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `DJANGO_SECRET_KEY` | Yes | Django secret; settings refuse to start without it. |
| `DATABASE_URL` | Yes | PostgreSQL connection URL; settings refuse to start without it. |
| `DJANGO_DEBUG` | No | Debug setting; defaults to `false`. |
| `ALLOWED_HOSTS` | No | Comma-separated Django host list; defaults to `localhost,127.0.0.1`. |
| `TIME_ZONE` | No | Django time zone; defaults to `UTC`. |
| `ZARINPAL_MERCHANT_ID` | For payment requests | Merchant ID; not required for other local development. |
| `ZARINPAL_SANDBOX` | No | Selects ZarinPal sandbox or production; defaults to `DJANGO_DEBUG`. |
| `ZARINPAL_CALLBACK_URL` | For payment requests | Absolute frontend return URL registered with the payment request. |
| `ZARINPAL_TIMEOUT` | No | Provider HTTP timeout in seconds; defaults to `10.0`. |

The default payment base URL follows `ZARINPAL_SANDBOX`. Payment initiation
requires both merchant ID and callback URL; do not commit real credentials.
The current example environment file contains the required Django settings,
not payment credentials.

### Frontend

In another terminal, use a compatible Node.js installation and run:

```sh
cd frontend
npm ci
npm run dev
```

Vite serves the storefront at `http://localhost:5173` and proxies `/api/*` to
`http://127.0.0.1:8000`. Set `VITE_API_PROXY_TARGET` in
`frontend/.env.local` to change the backend target. For local ZarinPal testing,
set the backend payment variables described above and use the frontend return
URL `http://localhost:5173/payment/return`. See [frontend/README.md](../frontend/README.md)
for payment-return details.

## Tests and quality checks

Run backend checks from the repository root:

```sh
pytest
ruff check .
ruff format --check .
python src/manage.py check
```

Run frontend checks from `frontend/`:

```sh
npm test
npm run lint
npm run format:check
npm run build
```

Backend tests live in `tests/test_*.py`; frontend tests are colocated with
components/pages and run through Vitest. Django database changes are
version-controlled in each app's `migrations/` package. After model changes,
create migrations with `python src/manage.py makemigrations`, review them, and
apply them with `python src/manage.py migrate`. To detect unapplied model
changes without writing a migration, use
`python src/manage.py makemigrations --check --dry-run`.

## Architecture and conventions

The Django project configuration is in `../src/basket`; domain code is grouped by
Django app under `src/apps/`. Root URL routes in `main/urls.py` delegate to
each app's URL configuration. A request is dispatched to a DRF generic view or
`APIView`; permissions and serializers enforce access and validate/shape data,
and views use Django ORM models for persistence. There is no general service
layer. Payment HTTP calls are the exception: `apps.payments.gateways` defines a
small gateway interface, implemented by `ZarinPalGateway`; payment views
coordinate local order/payment state and use database transactions.

The main boundaries are:

- `products`: public catalog reads; authenticated staff users alone can create,
  update, or delete products.
- `users`: custom `AbstractUser` subclass and registration, token, profile, and
  logout endpoints. Registration creates active non-staff customers; Django's
  `is_staff` flag grants catalog-write access and is managed through Django
  admin or trusted operations (there is no role-management API).
- `cart`: one persistent cart per user; cart lines use current product prices
  and do not reserve stock.
- `orders`: checkout rechecks products and stock, snapshots item details,
  decrements stock, and clears the cart atomically.
- `payments`: starts and verifies ZarinPal payments; only verified success
  marks an order paid.

Follow Django app conventions: keep related models, serializers, views, URLs,
migrations, and app configuration together. API validation errors use DRF's
JSON response structure, commonly field-keyed arrays; missing resources return
`404`. Business rules are enforced at the API boundary and important behavior
is covered by feature-focused pytest tests. Recent commit subjects use prefixes
such as `feat:`, `chore:`, and `docs:`; no stricter project-wide commit policy
is configured.

See [API Reference](api.md) for exact endpoint contracts and
[Database](api.md#database) for tables and migration history.

## Troubleshooting

- **Django reports a missing secret or database URL:** confirm `src/.env`
  exists, has non-placeholder `DJANGO_SECRET_KEY` and `DATABASE_URL` values,
  and is readable by the process.
- **PostgreSQL connection or test setup fails:** verify the server is running,
  the database and role in `DATABASE_URL` exist, and the role can create the
  test database used by pytest.
- **A migration is pending:** run `python src/manage.py migrate`. If model
  changes have no migration, run `makemigrations`, review the generated file,
  then apply it.
- **A protected API request returns `401`:** log in to receive a DRF token and
  send `Authorization: Token <token>`. Catalog writes by a non-staff user
  return `403`.
- **The frontend cannot reach the API:** start Django on port 8000 or set
  `VITE_API_PROXY_TARGET` in `frontend/.env.local` to the actual backend URL.
- **Payment initiation returns `503`:** set `ZARINPAL_MERCHANT_ID` and
  `ZARINPAL_CALLBACK_URL`; use sandbox credentials and the local return URL
  for local testing. Provider/network failures can also return `502`.
