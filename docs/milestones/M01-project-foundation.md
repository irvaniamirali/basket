# M01 — Project Foundation

## Objective

Establish the initial foundation of Shopline as a clean Go backend application.

At the end of this milestone, Shopline should be able to start as a standalone Go application, expose a basic HTTP endpoint, connect to PostgreSQL, and shut down gracefully.

This milestone intentionally avoids unnecessary infrastructure and external services.

---

## Scope

### 1. Go Project Initialization

Initialize the Go module and establish the initial repository structure.

The project should follow a structure that allows the application to grow without creating unnecessary architectural complexity.

Initial structure:

```text
shopline/
├── cmd/
│   └── api/
│       └── main.go
├── internal/
├── migrations/
├── docs/
│   ├── roadmap.md
│   └── milestones/
├── go.mod
├── go.sum
├── .gitignore
└── README.md
```

---

### 2. HTTP Server

Create the initial HTTP server.

The server should:

* Start on a configurable address.
* Use a reasonable request timeout configuration.
* Expose a health endpoint.
* Handle HTTP requests cleanly.
* Shut down gracefully.

Initial endpoint:

```http
GET /health
```

Expected response:

```json
{
  "status": "healthy"
}
```

---

### 3. Configuration

Introduce application configuration using environment variables.

Configuration should include at least:

* HTTP server address.
* PostgreSQL connection information.
* Application environment.

Configuration should be loaded explicitly when the application starts.

The application should fail fast when required configuration is invalid or missing.

---

### 4. PostgreSQL Connection

Set up PostgreSQL as the primary database for Shopline.

The application should:

* Establish a database connection on startup.
* Verify the connection.
* Fail startup when the database is unavailable.
* Close the connection during shutdown.

No business tables are required yet.

---

### 5. Database Migrations

Introduce a migration mechanism for managing database schema changes.

The project should have a clear migration workflow that allows developers to:

* Create a migration.
* Apply migrations.
* Roll back migrations when supported.
* Track the current database schema version.

The first migration may establish a minimal database metadata structure or remain empty if the selected migration tool handles schema tracking independently.

---

### 6. Application Lifecycle

Implement a proper application startup and shutdown lifecycle.

The application should:

1. Load configuration.
2. Initialize dependencies.
3. Verify the database connection.
4. Start the HTTP server.
5. Wait for a termination signal.
6. Stop accepting new requests.
7. Close application resources.
8. Exit cleanly.

The server must not rely on forced process termination for normal shutdown.

---

### 7. Logging

Introduce structured application logging.

Logs should provide enough information to understand:

* Application startup.
* Application shutdown.
* Database connection status.
* HTTP server startup.
* Unexpected errors.

Logs should be machine-readable where practical.

---

### 8. Error Handling

Define a basic error-handling approach before implementing business logic.

The project should distinguish between:

* Client errors.
* Server errors.
* Configuration errors.
* Dependency failures.

HTTP errors should return consistent JSON responses.

Example:

```json
{
  "error": {
    "code": "internal_error",
    "message": "internal server error"
  }
}
```

Sensitive implementation details must not be exposed through API responses.

---

## Engineering Constraints

The following are intentionally **out of scope** for M01:

* Authentication
* Product management
* Shopping carts
* Orders
* Payments
* Redis
* RabbitMQ
* Kafka
* Kubernetes
* Microservices
* Docker
* Caching
* Message queues
* Production deployment

These technologies and features will only be introduced when a later milestone has a concrete reason to require them.

---

## Tasks

### Project Setup

* [ ] Initialize the Go module.
* [ ] Create the initial repository structure.
* [ ] Create the initial README.
* [ ] Add basic development instructions.

### Configuration

* [ ] Define application configuration.
* [ ] Load configuration from environment variables.
* [ ] Validate required configuration.
* [ ] Define development defaults where appropriate.

### HTTP

* [ ] Create the HTTP server.
* [ ] Configure server timeouts.
* [ ] Implement `GET /health`.
* [ ] Implement consistent JSON responses.

### Database

* [ ] Configure PostgreSQL connection.
* [ ] Initialize the database connection.
* [ ] Verify database connectivity.
* [ ] Handle database shutdown correctly.

### Migrations

* [ ] Choose a migration tool.
* [ ] Integrate the migration workflow.
* [ ] Create the initial migration structure.
* [ ] Document migration commands.

### Lifecycle

* [ ] Implement application startup.
* [ ] Implement signal handling.
* [ ] Implement graceful HTTP shutdown.
* [ ] Close database resources during shutdown.

### Logging & Errors

* [ ] Add structured logging.
* [ ] Define initial application log fields.
* [ ] Define API error format.
* [ ] Prevent internal errors from leaking through API responses.

---

## Definition of Done

M01 is complete when all of the following are true:

* The project builds successfully with the Go toolchain.
* The application starts successfully with valid configuration.
* The application fails clearly when required configuration is invalid.
* PostgreSQL connectivity is verified during startup.
* `GET /health` returns a successful response.
* HTTP server timeouts are configured.
* Application logs are structured and useful.
* API errors follow a consistent format.
* The application handles SIGINT/SIGTERM gracefully.
* PostgreSQL connections are closed during shutdown.
* Database migrations can be executed successfully.
* The repository contains documentation explaining how to run Shopline locally.
* No unnecessary external infrastructure is required to run M01.

---

## Expected Result

After completing M01, a developer should be able to clone the repository, configure PostgreSQL, start Shopline, verify that the API is healthy, and stop the application cleanly.

The project should now provide a stable foundation for implementing the Product Catalog in M02.
