# Basket
A production-oriented e-commerce backend built with Python, Django, and Django REST Framework, focusing on clean architecture, scalable APIs, PostgreSQL, testing, and real-world backend engineering practices.

## Development

Requires Python 3.10 or newer and PostgreSQL. Create and activate a virtual environment, install the development dependencies, and copy `.env.example` to `.env` with a local secret key and PostgreSQL `DATABASE_URL`.

```sh
pip install -r requirements.txt
python manage.py migrate
python manage.py runserver
```

The health endpoint is available at `GET /api/health/`. Run the tests and quality checks with:

```sh
pytest
ruff check .
ruff format --check .
```

## Frontend

The React storefront lives in `frontend/`. Start Django using the backend setup above, then run `npm install` and `npm run dev` from `frontend/`. Vite proxies API requests to `http://127.0.0.1:8000` by default. See [frontend setup](frontend/README.md) for API and ZarinPal callback configuration.
