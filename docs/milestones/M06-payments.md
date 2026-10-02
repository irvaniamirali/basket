# M06 — Payments

## Goal

Accept payment for an authenticated user's pending order through ZarinPal's current REST API v4. Persist the payment lifecycle and update an order to paid only after server-side provider verification.

## Dependencies

* M03 provides the configured user model and token authentication.
* M05 provides user-owned pending orders, their server-calculated totals, and order-item snapshots.

## Scope

### Payment Model

Create a `payments` application in `apps.payments` with a `Payment` model containing:

* UUID primary key and a foreign key to `Order`.
* Provider identifier (`zarinpal`) and explicit status choices: `pending`, `paid`, `failed`, and `canceled`.
* `amount_rials` as a positive integer, snapshotted from the order when the payment is created.
* Unique nullable ZarinPal authority, nullable provider reference ID, provider response/error code and safe message fields, and creation/update/verification timestamps.
* A conditional uniqueness constraint allowing at most one pending payment for an order while retaining prior failed and canceled attempts.

Keep payment status on `Payment`; extend `Order.Status` only with `paid`. A successful verified payment transitions its order from `pending` to `paid`. Failed or canceled payment attempts leave the order pending and payable.

### Amount and Currency

Existing product and order decimal amounts have no documented currency unit. For M06, interpret `Order.total` as Tomans and make that convention explicit in payment code and API documentation. ZarinPal v4 request and verify amounts are integer Rials; convert with `Decimal` arithmetic (`Tomans * 10`) and persist the resulting integer in `amount_rials`. Never use floating point. Reject non-positive totals or a conversion that does not produce a whole Rial. Send `currency: "IRR"` and verify using the exact persisted `amount_rials`; clients never supply an amount.

### ZarinPal REST v4 Gateway

Keep HTTP communication and provider parsing in an isolated ZarinPal gateway module. Use JSON `POST` requests with explicit `Accept` and `Content-Type` headers, a finite timeout, TLS verification enabled, and meaningful handling for HTTP, JSON, network, and provider errors. Do not log credentials or return raw provider payloads to clients.

Use these current endpoints:

```text
POST {base_url}/pg/v4/payment/request.json
POST {base_url}/pg/v4/payment/verify.json
GET  {base_url}/pg/StartPay/{authority}
```

Production `base_url`: `https://payment.zarinpal.com`

Sandbox `base_url`: `https://sandbox.zarinpal.com`

The request includes `merchant_id`, integer `amount` in Rials, `currency: "IRR"`, `description`, `callback_url`, and an order identifier in metadata. A successful request has `data.code == 100` and a non-empty `data.authority`. Build the payment URL using the selected base URL and returned authority.

ZarinPal redirects to the configured callback with `Authority` and `Status` (`OK` or `NOK`). Only `Status == "OK"` may initiate verification. Verification sends the configured merchant ID, persisted integer Rial amount, and authority. Treat `data.code == 100` as newly verified success and `data.code == 101` as the provider's documented already-verified success; all other provider codes are not successful.

### Configuration

Follow the existing `django-environ` settings conventions:

* `ZARINPAL_MERCHANT_ID`: required when requesting/verifying a payment; never hardcoded.
* `ZARINPAL_SANDBOX`: default to `DEBUG`; select sandbox or production URLs without code changes.
* `ZARINPAL_CALLBACK_URL`: absolute callback URL registered with the payment request; require it when initiating payment.
* `ZARINPAL_TIMEOUT`: finite HTTP timeout with a safe default.

Tests must work with sandbox mode and mocked HTTP without production credentials. The sandbox permits a UUID merchant identifier; production deployments must supply their assigned merchant ID and a public HTTPS callback URL.

## API

```text
POST /api/orders/{order_id}/payments/
GET  /api/payments/zarinpal/callback/
```

* Payment creation requires authentication, verifies order ownership, and only accepts an order in `pending` status.
* The request body is empty; amount, currency, order data, and payment status are server-controlled.
* Return `201` with payment ID, `pending` status, and `payment_url` after a successful provider request. Do not include merchant credentials or raw provider responses.
* Reuse an existing pending payment with an authority instead of creating duplicate provider requests. If an in-progress payment lacks an authority, return a conflict response; failed/canceled attempts allow a new attempt.
* The callback is public because ZarinPal redirects the buyer without the API token. Authority is the lookup key, not proof of payment. Unknown authority returns `404`; malformed callbacks return `400`.
* Return a stable result for callback success, cancellation, and provider failure. Never claim payment success based only on the callback query string.

## Business Rules and Idempotency

* Create and lock payment state transactionally when coordinating requests for the same order; enforce the pending-payment uniqueness constraint in the database.
* Before verification, lock the Payment and Order rows and ensure the payment is still pending. Already-paid callbacks return the existing result without calling the provider again or changing the order again.
* For `Status == "NOK"`, mark a pending payment canceled and do not verify or change the order status.
* For `Status == "OK"`, compare the stored `amount_rials` with the exact integer-Rial conversion of the order total before calling verify. Do not trust any callback amount.
* Only provider verification code `100` or documented repeat code `101`, for the same authority and stored amount, can set Payment to paid, store `ref_id` and verification time, and set Order to paid in one transaction.
* Provider rejection, network failure, malformed response, amount mismatch, or failed verification must never mark the order paid. Persist safe failure information and keep/release state so a future attempt can be handled according to the payment status.
* Repeated callbacks cannot create additional payments, apply payment twice, or move a paid order to another state.

## Architecture

Keep Payment models, serializers, views, URLs, and tests in `apps.payments`. Put ZarinPal HTTP details behind a small internal gateway/service interface; views coordinate ownership and local state but do not construct provider requests. Reuse the existing Order model and do not add a separate order payment-state field. Use the project's existing Django, DRF, and environment configuration patterns.

## Tests

Mock all external HTTP calls. Cover:

* Valid payment creation, server-derived Rial amount, provider payload, authority persistence, and payment URL.
* Non-payable and another user's orders; existing pending-payment reuse and duplicate-attempt constraints.
* Provider rejection, malformed JSON/response, network errors, and safe failure state.
* Successful request followed by `Status=OK`, verification code `100`, reference ID storage, Payment success, and Order transition.
* `Status=NOK`, invalid status, unknown authority, verification failure, amount mismatch, and no accidental paid state.
* Provider code `101`, duplicate callbacks, and callbacks for already-paid payments without duplicate verification or transitions.
* Tests assert both responses and persisted Payment, Order, and provider-call state.

## Acceptance Criteria

* Payments use only ZarinPal REST API v4 request/verify endpoints and the corresponding StartPay URL.
* Sandbox/production configuration is environment-driven and no credentials are committed or required by mocked tests.
* Integer Rial amounts are derived from the server-side Order total without floating point or client control.
* Order is marked paid only after validated server-side verification.
* Callback handling is transactional and idempotent, and failed/canceled/invalid payments leave the order unpaid.
* Focused tests, formatting, linting, and migration checks pass.
* The manual sandbox flow is reported as verified only if it was actually completed; otherwise record the missing credentials/network/public-callback requirements.

## Out of Scope

* Refunds, partial payments, multiple providers, installment payments, fulfillment, payment webhooks beyond the documented redirect callback, background reconciliation, and production secret management infrastructure.

## Provider References

* [ZarinPal payment gateway connection guide](https://www.zarinpal.com/docs/paymentGateway/connectToGateway.html)
* [ZarinPal sandbox guide](https://www.zarinpal.com/docs/paymentGateway/sandBox.html)