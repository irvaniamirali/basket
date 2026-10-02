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
