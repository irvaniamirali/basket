# M01 — Project Foundation

## Objective

Establish the foundation of the Basket backend and create a clean, runnable Django project that is ready for feature development.

## Scope

### Project Setup

* Initialize the Python project.
* Create the Django project structure.
* Configure Django for development.
* Configure environment-based settings.
* Add `.env` support.
* Configure `.gitignore`.
* Define project dependencies.

### Database

* Configure PostgreSQL.
* Configure Django database settings through environment variables.
* Verify database connectivity.
* Create and apply the initial Django migrations.

### API

* Install and configure Django REST Framework.
* Establish the API structure.
* Add a basic health-check endpoint.

Example:

```text
GET /api/health/
```

Expected response:

```json
{
  "status": "healthy"
}
```

### Application Structure

Establish a structure that can scale as the project grows without introducing unnecessary abstraction.

The structure should clearly separate Django configuration from domain applications.

### Configuration

Environment variables should be used for configuration such as:

* `DJANGO_SECRET_KEY`
* `DJANGO_DEBUG`
* `DATABASE_URL`
* `ALLOWED_HOSTS`

Sensitive configuration must not be committed to the repository.

### Quality

* Configure formatting and linting.
* Configure pytest.
* Add tests for the health endpoint.
* Ensure the project passes the configured quality checks.

## Definition of Done

* The Django application starts successfully.
* PostgreSQL connection works.
* Django migrations run successfully.
* Django REST Framework is configured.
* `GET /api/health/` returns a successful response.
* Environment-based configuration works.
* Basic automated tests pass.
* Formatting and linting checks pass.
* The project has a clean initial structure suitable for M02.

## Out of Scope

The following are intentionally excluded from M01:

* Products
* Users
* Authentication
* Cart
* Orders
* Payments
* Redis
* Celery
* Docker production configuration

These will be introduced in later milestones when they become necessary.
