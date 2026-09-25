# M03 — Users & Authentication

## Objective

Introduce users, authentication, authorization, and user roles into Basket.

At the end of this milestone:

* Customers can register and log in.
* Users can retrieve their own profile.
* Passwords are stored securely and are never stored in plain text.
* Authentication is handled using signed access tokens.
* Authenticated requests can identify the current user.
* Users have explicit roles.
* Customers and administrators have different permissions.
* Protected endpoints reject unauthenticated requests.
* Role-protected endpoints reject users without the required role.
* Product creation is restricted to administrators.
* Authentication and authorization behavior is covered by tests.

The implementation should follow the existing Basket architecture and conventions rather than introducing a separate architectural style for authentication.

---

## Scope

### Included

This milestone includes:

1. User domain model
2. User database migration
3. User roles
4. User registration
5. Password hashing and verification
6. Login
7. Access token generation and validation
8. Authentication middleware
9. Current-user resolution
10. Role-based authorization
11. Current-user profile endpoint
12. Admin-only product creation
13. Configuration for authentication secrets
14. Domain errors for authentication and authorization failures
15. Unit tests
16. HTTP/handler tests
17. Repository/integration tests where database behavior is involved
18. Migration verification
19. Documentation of the authentication API

### Not included

The following are intentionally outside M03:

* Email verification
* Password reset
* OAuth/social login
* Two-factor authentication
* Account deletion
* Account suspension
* Refresh tokens
* Sessions stored in Redis
* Fine-grained permissions beyond roles
* Admin management UI
* User management CRUD for administrators

These can be introduced in later milestones if needed.

---

# 1. Architecture

Follow the existing feature-first architecture.

The implementation should remain under:

```text
src/internal/domain/
```

The user feature should follow the same general structure already established by the product feature.

A reasonable structure is:

```text
src/internal/domain/user/
├── model.go
├── dto.go
├── interface.go
├── repository.go
├── handler.go
├── middleware.go
└── usecase/
    ├── register.go
    ├── login.go
    └── get_me.go
```

Additional files may be introduced when they improve separation of responsibilities.

Do not create a large generic authentication package containing unrelated business logic.

Authentication belongs to the user/authentication domain, while reusable HTTP concerns such as middleware can be placed in the existing HTTP infrastructure if that matches the current project structure.

Follow the existing Basket conventions instead of blindly copying this structure if the current codebase has evolved.

---

# 2. User Domain Model

Introduce a user model with at least:

```text
id
email
password_hash
role
created_at
updated_at
```

Recommended database types:

* `id`: UUID
* `email`: VARCHAR with a unique constraint
* `password_hash`: TEXT
* `role`: VARCHAR
* `created_at`: TIMESTAMP/TIMESTAMPTZ
* `updated_at`: TIMESTAMP/TIMESTAMPTZ

The email address must be unique.

Email handling should be normalized consistently. At minimum:

* trim surrounding whitespace
* convert to lowercase before lookup/storage

Do not store the user's plain-text password.

---

# 3. User Roles

M03 initially has exactly two application roles:

```text
customer
admin
```

The role should be represented explicitly in the user model.

The default role for public registration must always be:

```text
customer
```

A client must never be able to choose `admin` during registration.

For example, this request must not allow privilege escalation:

```json
{
  "email": "user@example.com",
  "password": "password",
  "role": "admin"
}
```

The API should ignore/reject the role supplied by the client and create the account as `customer`.

The preferred behavior is to make role assignment an internal concern rather than part of the registration DTO.

---

# 4. Database Migration

Create a new Goose migration:

```text
migrations/003_users.sql
```

The migration must create the users table.

It should include:

* UUID primary key
* unique email
* password hash
* role
* created timestamp
* updated timestamp

The migration should also include an appropriate constraint for valid roles if this is consistent with the project's PostgreSQL conventions.

At minimum, the database must prevent duplicate emails.

The migration must have both:

```sql
-- +goose Up
```

and:

```sql
-- +goose Down
```

The down migration must safely remove the users table.

Before considering M03 complete, verify:

```bash
goose -dir migrations postgres "$DATABASE_URL" status
```

and:

```bash
goose -dir migrations postgres "$DATABASE_URL" up
```

---

# 5. Password Security

Passwords must never be stored directly.

Use a proven password-hashing algorithm from a maintained Go cryptography package.

For this milestone, use bcrypt through:

```text
golang.org/x/crypto/bcrypt
```

Do not implement a password-hashing algorithm manually.

Use an appropriate cost suitable for a production backend.

Password verification must use the secure comparison provided by the hashing library.

The implementation must never log:

* plain-text passwords
* password hashes
* authentication tokens

Error messages must not expose sensitive authentication details.

---

# 6. Registration

Introduce:

```text
POST /v1/auth/register
```

Request:

```json
{
  "email": "user@example.com",
  "password": "secure-password"
}
```

The response should contain the newly created user's public information.

Do not return:

* password
* password hash
* internal authentication data

The newly registered user must always receive:

```text
customer
```

as their role.

## Validation

Registration must validate:

* email is present
* email has a valid basic format
* password is present
* password satisfies the minimum password policy

The password policy should be simple and explicit.

Recommended minimum:

```text
8 characters
```

Do not create an unnecessarily complicated password policy in M03.

## Duplicate email

If the email already exists, return an appropriate conflict response.

Recommended HTTP status:

```text
409 Conflict
```

Do not leak unnecessary information about internal database errors.

---

# 7. Login

Introduce:

```text
POST /v1/auth/login
```

Request:

```json
{
  "email": "user@example.com",
  "password": "secure-password"
}
```

The server must:

1. normalize the email
2. find the user
3. verify the password
4. generate an access token
5. return the token and public user information

Example response:

```json
{
  "access_token": "...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "user": {
    "id": "...",
    "email": "user@example.com",
    "role": "customer"
  }
}
```

The exact response structure can follow existing Basket DTO conventions.

---

# 8. Authentication Token

Use a signed JWT access token.

Use a maintained JWT implementation:

```text
github.com/golang-jwt/jwt/v5
```

The token should contain enough information to identify the authenticated user.

Recommended claims:

```text
sub
role
iat
exp
```

Where:

* `sub` = user UUID
* `role` = user role
* `iat` = issued-at time
* `exp` = expiration time

Use a configurable signing secret.

Do not hard-code the JWT secret in source code.

---

# 9. Authentication Configuration

Extend the existing application configuration with authentication settings.

At minimum:

```text
JWT_SECRET
JWT_EXPIRES_IN
```

The exact configuration naming should follow the existing config conventions.

Example:

```env
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=1h
```

The secret must be required when the application starts in a non-test environment.

Do not provide a weak production secret as a default.

Tests may use a deterministic test secret through test configuration.

The application must fail fast if required authentication configuration is missing.

---

# 10. Authentication Middleware

Introduce authentication middleware for protected endpoints.

The middleware must:

1. read the `Authorization` header
2. require the `Bearer <token>` format
3. validate the JWT signature
4. validate expiration
5. extract the user ID
6. extract the role
7. make the authenticated user information available to downstream handlers

Requests without a valid token must receive:

```text
401 Unauthorized
```

Do not allow malformed, expired, or incorrectly signed tokens through.

Do not trust arbitrary user information sent in request headers.

The authenticated user identity must come from the validated token.

---

# 11. Current User

Introduce:

```text
GET /v1/auth/me
```

This endpoint requires authentication.

It returns the currently authenticated user's public information:

```json
{
  "id": "...",
  "email": "user@example.com",
  "role": "customer"
}
```

The password and password hash must never be returned.

The endpoint should resolve the user using the authenticated identity.

Do not accept a user ID from the client for this endpoint.

The identity should come from the validated access token.

---

# 12. Authorization

Authentication answers:

```text
Who is this user?
```

Authorization answers:

```text
Is this user allowed to perform this operation?
```

M03 must introduce role-based authorization.

Create reusable authorization middleware or an equivalent mechanism.

For example:

```text
RequireRole("admin")
```

The exact API can differ based on the existing codebase.

An authenticated customer attempting to access an admin-only endpoint must receive:

```text
403 Forbidden
```

An unauthenticated request must receive:

```text
401 Unauthorized
```

These cases must remain distinguishable.

---

# 13. Product Authorization

Integrate M03 authorization into the product feature created in M02.

Product creation:

```text
POST /v1/products
```

must require:

```text
authenticated admin
```

Therefore:

| Request              | Result             |
| -------------------- | ------------------ |
| No token             | `401 Unauthorized` |
| Invalid token        | `401 Unauthorized` |
| Valid customer token | `403 Forbidden`    |
| Valid admin token    | allowed            |

Existing public product browsing endpoints such as:

```text
GET /v1/products
GET /v1/products/:id
```

should remain publicly accessible unless the existing M02 design explicitly requires otherwise.

Do not unnecessarily protect public catalog browsing.

---

# 14. Admin User Creation

There must be a safe way to create an initial administrator for local development and testing.

Do not allow public registration to create admins.

If the current project does not already have a seed mechanism, introduce a small development/test seed mechanism rather than exposing an HTTP endpoint such as:

```text
POST /v1/users
```

for arbitrary role creation.

The exact mechanism should fit the existing project conventions.

The important security rule is:

```text
Public registration can create customers only.
```

---

# 15. Repository

The user repository should expose only the operations required by M03.

At minimum:

```text
Create
FindByEmail
FindByID
```

Keep the repository interface separate from its concrete PostgreSQL/ORM implementation, following the existing Basket architecture.

Do not put authentication business rules inside the repository.

The repository should be responsible for persistence.

Password hashing, token generation, registration rules, and authentication decisions belong to the appropriate use-case/service layer.

---

# 16. Use Cases

Implement authentication operations as separate use cases, following the existing Basket convention of one operation per file.

At minimum:

```text
register.go
login.go
get_me.go
```

## Register

Responsibilities:

1. validate input
2. normalize email
3. check whether the email already exists
4. hash password
5. create customer user
6. return public user data

## Login

Responsibilities:

1. normalize email
2. find user
3. verify password
4. generate access token
5. return authentication response

Authentication failures should not reveal whether the email exists.

For example, use a generic authentication error for invalid credentials.

## Get Me

Responsibilities:

1. receive authenticated user identity
2. load user information if necessary
3. return public user data

---

# 17. Domain Errors

Introduce explicit domain/application errors where appropriate.

At minimum distinguish:

```text
invalid input
email already exists
invalid credentials
unauthenticated
forbidden
not found
```

Map these errors to HTTP responses in the HTTP layer.

Do not scatter raw database errors or string comparisons throughout handlers.

The HTTP layer should translate known application errors into appropriate status codes.

Recommended mapping:

| Error                     | HTTP |
| ------------------------- | ---: |
| Invalid input             |  400 |
| Invalid credentials       |  401 |
| Unauthenticated           |  401 |
| Forbidden                 |  403 |
| User already exists       |  409 |
| User not found            |  404 |
| Unexpected internal error |  500 |

Do not expose PostgreSQL error messages directly to API clients.

---

# 18. DTOs

Create request/response DTOs appropriate for the authentication API.

Registration request:

```text
email
password
```

Login request:

```text
email
password
```

Public user response:

```text
id
email
role
```

Authentication response:

```text
access_token
token_type
expires_in
user
```

Do not reuse database models directly as public API responses if that would expose internal fields.

In particular:

```text
password_hash
```

must never be serialized in an API response.

---

# 19. HTTP Routes

The final M03 authentication routes should include:

```text
POST /v1/auth/register
POST /v1/auth/login
GET  /v1/auth/me
```

Authentication middleware should be applied only where required.

The product routes should be updated so that:

```text
GET  /v1/products
GET  /v1/products/:id
```

remain public.

And:

```text
POST /v1/products
```

requires an authenticated admin.

Follow the existing router structure instead of introducing a completely separate router architecture.

---

# 20. Testing Strategy

M03 must have comprehensive tests.

Do not consider the milestone complete after only testing the happy path.

Tests should cover the domain/use-case layer, repository behavior where appropriate, middleware, handlers, and important HTTP integration behavior.

---

# 21. Password Tests

Test that:

1. a password can be hashed
2. the correct password verifies successfully
3. an incorrect password fails verification
4. the stored value is not equal to the plain-text password
5. registration never stores the plain-text password

---

# 22. Registration Tests

Test at minimum:

### Successful registration

Given a valid email and password:

```text
POST /v1/auth/register
```

must create a user.

Verify:

* status is successful
* user is returned
* role is `customer`
* password is not returned
* password hash exists in the database
* password hash is not the original password

### Duplicate email

Register the same email twice.

Expected:

```text
409 Conflict
```

### Invalid email

Expected:

```text
400 Bad Request
```

### Missing password

Expected:

```text
400 Bad Request
```

### Short password

Expected:

```text
400 Bad Request
```

### Attempted role escalation

A registration request containing:

```json
{
  "email": "user@example.com",
  "password": "password123",
  "role": "admin"
}
```

must never create an admin.

The resulting user must have:

```text
customer
```

---

# 23. Login Tests

Test:

### Valid credentials

Expected:

```text
200 OK
```

and a valid access token.

### Wrong password

Expected:

```text
401 Unauthorized
```

### Unknown email

Expected:

```text
401 Unauthorized
```

The API should not expose whether the email exists.

### Malformed request

Expected:

```text
400 Bad Request
```

### Token claims

Verify that generated tokens contain the expected:

```text
sub
role
iat
exp
```

claims.

---

# 24. JWT Tests

Test:

1. valid token is accepted
2. expired token is rejected
3. invalid signature is rejected
4. malformed token is rejected
5. missing token is rejected
6. missing/invalid required claims are rejected
7. wrong signing secret is rejected

Do not rely only on manually inspecting tokens.

Tests should actually validate middleware behavior.

---

# 25. Authentication Middleware Tests

Test:

### No Authorization header

Expected:

```text
401
```

### Invalid Authorization format

Examples:

```text
Basic ...
Bearer
Bearer
```

Expected:

```text
401
```

### Invalid token

Expected:

```text
401
```

### Expired token

Expected:

```text
401
```

### Valid token

Expected:

```text
request reaches handler
```

---

# 26. Authorization Tests

Test:

### Customer accessing admin endpoint

Expected:

```text
403 Forbidden
```

### Admin accessing admin endpoint

Expected:

```text
success
```

### Unauthenticated user accessing admin endpoint

Expected:

```text
401 Unauthorized
```

This distinction is important and must be explicitly tested.

---

# 27. `/v1/auth/me` Tests

Test:

1. authenticated customer receives their profile
2. authenticated admin receives their profile
3. unauthenticated request returns `401`
4. invalid token returns `401`
5. password/password hash never appears in the response

---

# 28. Product Authorization Tests

Update M02 product handler tests to cover authentication.

At minimum:

### Public list

```text
GET /v1/products
```

works without authentication.

### Public get

```text
GET /v1/products/:id
```

works without authentication.

### Anonymous create

```text
POST /v1/products
```

returns:

```text
401
```

### Customer create

Returns:

```text
403
```

### Admin create

Successfully creates the product.

These tests are required because authorization is not complete until it is actually connected to an existing business operation.

---

# 29. Repository Tests

Where the existing project uses an integration database for repository tests, add user repository tests covering:

1. create user
2. find by email
3. find by ID
4. unique email constraint
5. persisted role
6. persisted password hash

Tests should clean up after themselves or use isolated test data.

Do not make tests depend on the developer's manually created production/development users.

---

# 30. Test Isolation

Tests must not depend on:

```text
a running API process
a developer's existing users
a manually inserted admin
a specific local database state
a real JWT secret
```

Use test configuration and isolated test data.

If the existing Basket test architecture already provides database setup/cleanup utilities, reuse them.

Do not introduce a second unrelated testing infrastructure.

---

# 31. Configuration Tests

Extend configuration tests to cover authentication configuration.

Test:

1. valid JWT configuration loads successfully
2. missing JWT secret is rejected where required
3. JWT expiration configuration is parsed correctly
4. invalid expiration configuration is rejected

Keep configuration behavior consistent with the existing `config` package.

---

# 32. API Security Requirements

The implementation must follow these rules:

* Never store plain-text passwords.
* Never log passwords.
* Never log access tokens.
* Never return password hashes.
* Never allow public registration to select `admin`.
* Never trust role information from the request body.
* Never trust user identity from arbitrary headers.
* Validate JWT signatures.
* Validate token expiration.
* Keep authentication secrets out of source code.
* Do not expose raw database errors to clients.
* Return `401` for authentication failures.
* Return `403` for authenticated users lacking permission.

---

# 33. Error Response Consistency

Authentication endpoints should use the same error-response conventions already established by Basket.

Do not introduce a completely different JSON error format just for M03.

If the existing project has a standard format such as:

```json
{
  "error": "..."
}
```

continue using it.

Authentication errors should remain intentionally generic where revealing more information would create a security problem.

---

# 34. Documentation

Update the project documentation to reflect M03.

Document:

* registration endpoint
* login endpoint
* current-user endpoint
* authentication format
* role behavior
* public vs protected product endpoints
* required environment variables
* local admin setup
* how to run authentication tests

Include example requests where useful.

The documentation should be concise and consistent with the existing milestone documentation.

---

# 35. Definition of Done

M03 is complete only when all of the following are true:

* [ ] Users table exists through a Goose migration.
* [ ] Migration has working Up and Down sections.
* [ ] User emails are unique.
* [ ] User roles exist.
* [ ] `customer` and `admin` roles are supported.
* [ ] Public registration creates customers only.
* [ ] Passwords are securely hashed.
* [ ] Plain-text passwords are never persisted.
* [ ] Registration endpoint works.
* [ ] Login endpoint works.
* [ ] JWT access tokens are generated.
* [ ] JWT signatures are validated.
* [ ] JWT expiration is validated.
* [ ] Authentication middleware works.
* [ ] Current user can be resolved from the token.
* [ ] `/v1/auth/me` works.
* [ ] Role-based authorization works.
* [ ] Product creation requires admin role.
* [ ] Public product browsing remains available.
* [ ] `401` and `403` are correctly distinguished.
* [ ] Authentication configuration is validated.
* [ ] Domain/application errors are handled cleanly.
* [ ] Passwords and tokens are never logged.
* [ ] Password hashes are never returned by the API.
* [ ] Registration tests are complete.
* [ ] Login tests are complete.
* [ ] JWT tests are complete.
* [ ] Authentication middleware tests are complete.
* [ ] Authorization tests are complete.
* [ ] `/v1/auth/me` tests are complete.
* [ ] Product authorization tests are complete.
* [ ] Repository tests are complete.
* [ ] Configuration tests are updated.
* [ ] Documentation is updated.
* [ ] Formatting passes.
* [ ] All relevant tests pass.

---

# 36. Implementation Constraints

While implementing M03:

1. Read the existing project before changing anything.
2. Read `docs/roadmap.md`.
3. Read the previous milestone documentation.
4. Inspect the current product implementation.
5. Follow the existing architecture and naming conventions.
6. Do not rewrite unrelated M01/M02 code.
7. Do not introduce unnecessary abstractions.
8. Keep use cases separated by operation.
9. Keep repository interfaces separate from implementations.
10. Keep HTTP concerns out of the domain/use-case layer.
11. Keep business rules out of the repository.
12. Reuse existing configuration, database, HTTP, error, and test infrastructure where appropriate.
13. Prefer small focused files over large files.
14. Do not add features outside the M03 scope.
15. Do not weaken security requirements to make tests pass.

The final implementation should feel like a natural continuation of M01 and M02, not a separate authentication project added on top of Basket.

---

# 37. Verification

Before marking M03 complete, run:

```bash
gofmt -w .
```

Run the project's relevant tests.

At minimum, verify:

```bash
go test ./...
```

Verify migration status:

```bash
goose -dir migrations postgres "$DATABASE_URL" status
```

Run the application and manually verify:

```text
POST /v1/auth/register
POST /v1/auth/login
GET  /v1/auth/me
GET  /v1/products
POST /v1/products
```

Verify all three product-creation cases:

```text
anonymous -> 401
customer  -> 403
admin     -> success
```

Do not consider the milestone complete until the automated test suite and the authentication flow both work successfully.

---

## Expected Result

At the end of M03, Basket has a real authentication foundation:

```text
                    ┌──────────────┐
                    │   Register   │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   Customer   │
                    └──────┬───────┘
                           │
                         Login
                           │
                           ▼
                    ┌──────────────┐
                    │  JWT Token   │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ Auth Middleware
                    └──────┬───────┘
                           │
                    ┌──────┴──────┐
                    ▼             ▼
               Customer         Admin
                    │             │
                    │             └──► Admin operations
                    │
                    └────────────────► Customer operations
```

M03 should establish the authentication and authorization foundation that later milestones can build on without needing to redesign the user system.
