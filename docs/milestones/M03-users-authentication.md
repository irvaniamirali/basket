# M03 — Users & Authentication

## Goal

Add customer accounts and API authentication so account-owned features can be introduced in later milestones. Keep catalog reads public and restrict catalog mutations to staff users.

## Scope

### User Model

Create a custom Django user model in a dedicated `apps.users` application.

* Extend Django's `AbstractUser` so standard Django authentication and admin behavior are retained.
* Require a unique email address in addition to the inherited username.
* Keep Django's standard integer user primary key; M02's UUID requirement applies to products only.
* Set `AUTH_USER_MODEL` before adding any application models that reference users.
* Register the custom user model with Django admin.

### Authentication API

Use Django REST Framework's built-in token authentication; do not add a JWT dependency.

```text
POST /api/auth/register/
POST /api/auth/token/
GET  /api/auth/me/
POST /api/auth/logout/
```

* Registration accepts username, email, password, and optional first and last names; it creates a non-staff active account and never returns the password.
* Token creation accepts username and password and returns the DRF authentication token.
* The profile endpoint returns the authenticated user's public account fields only.
* Logout deletes the caller's token. It must not affect another user's token.
* Use appropriate `201`, `200`, `400`, and `401` responses with DRF's consistent JSON errors.

### Authorization

* Authentication endpoints for registration and token creation are public.
* The profile and logout endpoints require authentication.
* Product list and detail reads remain public.
* Product create, update, and delete require an authenticated staff user. Ordinary registered users cannot mutate catalog data.
* Do not add role management or an API for granting staff access; staff status is managed through Django admin or trusted operations.

### Password Handling

* Store passwords only through Django's password hashing APIs.
* Apply Django password validators to registration.
* Reject missing or invalid required fields and duplicate usernames or email addresses with field-level validation errors.
* Never include password hashes or submitted passwords in API responses.

## Architecture

Keep user models, serializers, views, URL configuration, and tests in `apps.users`, following the M02 Django app conventions. Use Django authentication and DRF token primitives rather than adding a service layer or third-party authentication framework. Add the token app and authentication defaults to project settings and include the auth URLs beneath `/api/`.

## Tests

Cover:

* Successful registration, password hashing, and non-staff defaults.
* Invalid password, missing fields, duplicate username, and duplicate email.
* Successful token issuance and invalid credentials.
* Authenticated profile retrieval and unauthenticated rejection.
* Logout invalidates only the caller's token.
* Public product reads remain available.
* Anonymous and ordinary-user product mutations are denied; staff mutations succeed.

## Acceptance Criteria

* A custom user model and migration are registered before any dependent application models.
* Registration, token, profile, and logout endpoints work with the documented status codes.
* Passwords are hashed and are never serialized.
* Token authentication is active for API requests.
* Catalog reads remain public while catalog writes are staff-only.
* Focused user and authorization tests pass; formatting and configured lint checks pass.

## Out of Scope

* Cart, orders, payments, password reset, email verification, social login, JWT, and user role-management APIs.