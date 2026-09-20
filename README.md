# Shopline

Shopline is a Go e-commerce backend built as a modular monolith.

## Run locally

Requirements: Go 1.25+ and PostgreSQL.

Create a database, then configure the application environment:

```sh
export HTTP_ADDR=:8080
export APP_ENV=development
export DATABASE_URL='postgres://user:password@localhost:5432/shopline?sslmode=disable'
```

Apply migrations with Goose:

```sh
go run github.com/pressly/goose/v3/cmd/goose@v3.24.1 -dir migrations postgres "$DATABASE_URL" up
```

Run the API:

```sh
go run ./src/cmd/api
```

Verify it:

```sh
curl http://localhost:8080/health
```

The API verifies PostgreSQL connectivity during startup and exits clearly when configuration or the database is unavailable. Send `SIGINT` or `SIGTERM` to stop it gracefully.