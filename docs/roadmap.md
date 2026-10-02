# Basket

Basket is an e-commerce project with a Django REST Framework backend and React storefront. The first six milestones are implemented and provide a runnable local shop, including an external ZarinPal payment flow.

The roadmap below separates implemented functionality from future work. Redis, Celery, Docker deployment, background notifications, caching, and production hardening are not currently implemented.

## Current Tech Stack

* Python, Django, and Django REST Framework
* PostgreSQL and psycopg
* React, TypeScript, and Vite
* pytest/pytest-django and Ruff; Vitest, Oxlint, and Prettier

Redis, Celery, and Docker are not part of the current application stack; related
infrastructure work is planned in later milestones.

## Roadmap

| ID  | Milestone                       | Status      |
| --- | ------------------------------- | ----------- |
| M01 | Project Foundation              | Complete    |
| M02 | Product Catalog                 | Complete    |
| M03 | Users & Authentication          | Complete    |
| M04 | Cart                            | Complete    |
| M05 | Orders                          | Complete    |
| M06 | Payments                        | Complete    |
| M07 | Background Jobs & Notifications | Planned     |
| M08 | Caching & Performance           | Planned     |
| M09 | Testing & Quality               | Planned     |
| M10 | Production Readiness            | Planned     |

## Current Implementation

The API supports public product reads and staff-only catalog writes, customer
registration and DRF token authentication, user-owned carts and orders, and
ZarinPal payment initiation and callback verification. The React storefront
uses these APIs. Automated backend and frontend tests and local lint/format
commands exist; M09 remains planned for its broader milestone scope rather
than indicating that tests or checks are absent.

See the [Development Guide](development.md) for setup and architecture and the
[API Reference](api.md) for implemented routes and response examples.

## Development Principles

* Keep the codebase simple and maintainable.
* Prefer explicit and readable code over unnecessary abstractions.
* Separate business logic from framework-specific concerns where it provides real value.
* Design APIs around clear domain boundaries.
* Use PostgreSQL as the primary database.
* Write tests for important business behavior.
* Keep infrastructure and application concerns clearly separated.
* Build each milestone incrementally and keep the project runnable throughout development.
