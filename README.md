# Basket

Basket is an e-commerce project with a Django REST Framework API and a React
storefront. The current implementation includes a product catalog, token-based
customer accounts, persistent carts, order checkout, and ZarinPal payments.
Milestones M01–M06 are implemented; background jobs, caching, and production
readiness work remain on the [roadmap](docs/roadmap.md).

## Technology

- Backend: Python, Django, Django REST Framework, PostgreSQL
- Frontend: React, TypeScript, Vite
- Quality: pytest, Ruff, Vitest, Oxlint, Prettier

Redis, Celery, and Docker appear in future roadmap scope but are not currently
used by the application.

## Start developing

The backend requires Python 3.10 or newer and PostgreSQL. Copy
`.env.example` to `src/.env`, set a local secret key and PostgreSQL
`DATABASE_URL`, then from the repository root run:

```sh
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python src/manage.py migrate
python src/manage.py runserver
```

Run backend tests and quality checks with:

```sh
pytest
ruff check .
ruff format --check .
```

For frontend setup, frontend checks, environment configuration, and the full
project layout, see [Development Guide](docs/development.md). Implemented API
routes and examples are in the [API Reference](docs/api.md); milestone status
and specifications are under [docs/](docs/).
