import json
from decimal import Decimal
from urllib.error import URLError

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.orders.models import Order
from apps.payments.models import Payment

AUTHORITY = "A0000000000000000000000000000wwOGYpd"


class JsonResponse:
    def __init__(self, payload):
        self.body = json.dumps(payload).encode("utf-8")

    def __enter__(self):
        return self

    def __exit__(self, *args):
        return False

    def read(self):
        return self.body


@pytest.fixture(autouse=True)
def zarinpal_settings(settings):
    settings.ZARINPAL_MERCHANT_ID = "12345678-1234-1234-1234-123456789abc"
    settings.ZARINPAL_SANDBOX = True
    settings.ZARINPAL_BASE_URL = "https://sandbox.zarinpal.com"
    settings.ZARINPAL_CALLBACK_URL = (
        "https://shop.example.test/api/payments/zarinpal/callback/"
    )
    settings.ZARINPAL_TIMEOUT = 4.0


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(
        username="customer",
        email="customer@example.com",
        password="Long-random-password-59!",
    )


@pytest.fixture
def order(user):
    return Order.objects.create(user=user, total=Decimal("1200.00"))


@pytest.fixture
def api_client(user):
    client = APIClient()
    client.force_authenticate(user=user)
    return client


def mock_urlopen(monkeypatch, payload=None, error=None):
    calls = []

    def fake_urlopen(request, *, timeout, context):
        calls.append((request, timeout, context))
        if error:
            raise error
        return JsonResponse(payload)

    monkeypatch.setattr("apps.payments.gateways.zarinpal.urlopen", fake_urlopen)
    return calls


def request_success():
    return {
        "data": {
            "code": 100,
            "message": "Success",
            "authority": AUTHORITY,
        },
        "errors": [],
    }


def verify_success(code=100):
    return {
        "data": {
            "code": code,
            "message": "Verified",
            "ref_id": 201,
        },
        "errors": [],
    }


def decoded_request(call):
    request, timeout, context = call
    return request, json.loads(request.data.decode("utf-8")), timeout, context


@pytest.mark.django_db
def test_create_payment_uses_server_amount_and_stores_authority(
    api_client, order, monkeypatch
):
    calls = mock_urlopen(monkeypatch, request_success())

    response = api_client.post(
        f"/api/orders/{order.id}/payments/",
        {"amount": 1, "currency": "USD"},
        format="json",
    )

    payment = Payment.objects.get(order=order)
    request, payload, timeout, context = decoded_request(calls[0])
    assert response.status_code == 201
    assert response.data["status"] == "pending"
    assert response.data["payment_url"] == (
        f"https://sandbox.zarinpal.com/pg/StartPay/{AUTHORITY}"
    )
    assert response.data["amount_rials"] == 12000
    assert payment.amount_rials == 12000
    assert payment.authority == AUTHORITY
    assert payload == {
        "merchant_id": "12345678-1234-1234-1234-123456789abc",
        "amount": 12000,
        "currency": "IRR",
        "description": f"Order {order.id}",
        "callback_url": "https://shop.example.test/api/payments/zarinpal/callback/",
        "metadata": {"order_id": str(order.id)},
    }
    assert request.full_url == "https://sandbox.zarinpal.com/pg/v4/payment/request.json"
    assert request.get_header("Content-type") == "application/json"
    assert request.get_header("Accept") == "application/json"
    assert timeout == 4.0
    assert context.check_hostname is True
    assert context.verify_mode != 0


@pytest.mark.django_db
def test_payment_creation_rejects_non_payable_order(api_client, order, monkeypatch):
    order.status = Order.Status.PAID
    order.save(update_fields=("status",))
    calls = mock_urlopen(monkeypatch, request_success())

    response = api_client.post(f"/api/orders/{order.id}/payments/", {}, format="json")

    assert response.status_code == 409
    assert not calls
    assert Payment.objects.count() == 0


@pytest.mark.django_db
def test_payment_creation_hides_another_users_order(api_client, order, monkeypatch):
    other_user = get_user_model().objects.create_user(
        username="other",
        email="other@example.com",
        password="Long-random-password-59!",
    )
    api_client.force_authenticate(user=other_user)
    calls = mock_urlopen(monkeypatch, request_success())

    response = api_client.post(f"/api/orders/{order.id}/payments/", {}, format="json")

    assert response.status_code == 404
    assert not calls
    assert Payment.objects.count() == 0


@pytest.mark.django_db
def test_payment_creation_rejects_fractional_rial_amount(
    api_client, order, monkeypatch
):
    order.total = Decimal("0.15")
    order.save(update_fields=("total",))
    calls = mock_urlopen(monkeypatch, request_success())

    response = api_client.post(f"/api/orders/{order.id}/payments/", {}, format="json")

    assert response.status_code == 400
    assert Payment.objects.count() == 0
    assert not calls


@pytest.mark.django_db
def test_provider_request_failure_marks_payment_failed(api_client, order, monkeypatch):
    mock_urlopen(
        monkeypatch,
        {"data": {"code": -9, "message": "Merchant rejected"}, "errors": []},
    )

    response = api_client.post(f"/api/orders/{order.id}/payments/", {}, format="json")

    payment = Payment.objects.get(order=order)
    assert response.status_code == 502
    assert "Merchant rejected" not in str(response.data)
    assert payment.status == Payment.Status.FAILED
    assert payment.provider_code == -9
    assert order.status == Order.Status.PENDING


@pytest.mark.django_db
def test_provider_network_error_is_handled_safely(api_client, order, monkeypatch):
    mock_urlopen(monkeypatch, error=URLError("private network details"))

    response = api_client.post(f"/api/orders/{order.id}/payments/", {}, format="json")

    payment = Payment.objects.get(order=order)
    assert response.status_code == 502
    assert "private network details" not in str(response.data)
    assert payment.status == Payment.Status.FAILED
    assert payment.error_code == "network"


@pytest.mark.django_db
def test_existing_pending_payment_reuses_authority_without_request(
    api_client, order, monkeypatch
):
    payment = Payment.objects.create(
        order=order,
        amount_rials=12000,
        authority=AUTHORITY,
    )
    calls = mock_urlopen(monkeypatch, request_success())

    response = api_client.post(f"/api/orders/{order.id}/payments/", {}, format="json")

    assert response.status_code == 200
    assert response.data["id"] == str(payment.id)
    assert not calls
    assert Payment.objects.filter(order=order).count() == 1


@pytest.mark.django_db
def test_production_mode_uses_production_payment_url(
    api_client, order, monkeypatch, settings
):
    settings.ZARINPAL_SANDBOX = False
    settings.ZARINPAL_BASE_URL = "https://payment.zarinpal.com"
    mock_urlopen(monkeypatch, request_success())

    response = api_client.post(f"/api/orders/{order.id}/payments/", {}, format="json")

    assert response.status_code == 201
    assert response.data["payment_url"] == (
        f"https://payment.zarinpal.com/pg/StartPay/{AUTHORITY}"
    )


@pytest.mark.django_db
def test_in_progress_payment_without_authority_returns_conflict(
    api_client, order, monkeypatch
):
    Payment.objects.create(order=order, amount_rials=12000)
    calls = mock_urlopen(monkeypatch, request_success())

    response = api_client.post(f"/api/orders/{order.id}/payments/", {}, format="json")

    assert response.status_code == 409
    assert not calls


@pytest.mark.django_db
def test_canceled_callback_does_not_verify_or_pay_order(api_client, order, monkeypatch):
    payment = Payment.objects.create(
        order=order,
        amount_rials=12000,
        authority=AUTHORITY,
    )
    calls = mock_urlopen(monkeypatch, verify_success())

    response = APIClient().get(
        "/api/payments/zarinpal/callback/",
        {"Authority": AUTHORITY, "Status": "NOK"},
    )

    payment.refresh_from_db()
    order.refresh_from_db()
    assert response.status_code == 200
    assert payment.status == Payment.Status.CANCELED
    assert order.status == Order.Status.PENDING
    assert not calls


@pytest.mark.django_db
def test_invalid_callback_status_does_not_change_payment(order, monkeypatch):
    payment = Payment.objects.create(
        order=order,
        amount_rials=12000,
        authority=AUTHORITY,
    )
    calls = mock_urlopen(monkeypatch, verify_success())

    response = APIClient().get(
        "/api/payments/zarinpal/callback/",
        {"Authority": AUTHORITY, "Status": "paid"},
    )

    payment.refresh_from_db()
    assert response.status_code == 400
    assert payment.status == Payment.Status.PENDING
    assert not calls


@pytest.mark.django_db
def test_successful_callback_verifies_amount_and_marks_payment_and_order_paid(
    api_client, order, monkeypatch
):
    payment = Payment.objects.create(
        order=order,
        amount_rials=12000,
        authority=AUTHORITY,
    )
    calls = mock_urlopen(monkeypatch, verify_success())

    response = APIClient().get(
        "/api/payments/zarinpal/callback/",
        {"Authority": AUTHORITY, "Status": "OK"},
    )

    request, payload, _, _ = decoded_request(calls[0])
    payment.refresh_from_db()
    order.refresh_from_db()
    assert request.full_url == "https://sandbox.zarinpal.com/pg/v4/payment/verify.json"
    assert payload == {
        "merchant_id": "12345678-1234-1234-1234-123456789abc",
        "amount": 12000,
        "authority": AUTHORITY,
    }
    assert response.status_code == 200
    assert payment.status == Payment.Status.PAID
    assert payment.reference_id == "201"
    assert payment.verified_at is not None
    assert order.status == Order.Status.PAID


@pytest.mark.django_db
def test_callback_verification_failure_leaves_order_pending(order, monkeypatch):
    payment = Payment.objects.create(
        order=order,
        amount_rials=12000,
        authority=AUTHORITY,
    )
    mock_urlopen(
        monkeypatch,
        {"data": {"code": -9, "message": "Verification failed"}, "errors": []},
    )

    response = APIClient().get(
        "/api/payments/zarinpal/callback/",
        {"Authority": AUTHORITY, "Status": "OK"},
    )

    payment.refresh_from_db()
    order.refresh_from_db()
    assert response.status_code == 200
    assert payment.status == Payment.Status.FAILED
    assert payment.error_code == "verification_failed"
    assert order.status == Order.Status.PENDING


@pytest.mark.django_db
def test_callback_amount_mismatch_fails_without_provider_verification(
    order, monkeypatch
):
    payment = Payment.objects.create(
        order=order,
        amount_rials=12000,
        authority=AUTHORITY,
    )
    order.total = Decimal("1300.00")
    order.save(update_fields=("total",))
    calls = mock_urlopen(monkeypatch, verify_success())

    response = APIClient().get(
        "/api/payments/zarinpal/callback/",
        {"Authority": AUTHORITY, "Status": "OK"},
    )

    payment.refresh_from_db()
    order.refresh_from_db()
    assert response.status_code == 400
    assert payment.status == Payment.Status.FAILED
    assert payment.error_code == "amount_mismatch"
    assert order.status == Order.Status.PENDING
    assert not calls


@pytest.mark.django_db
def test_unknown_authority_returns_not_found(monkeypatch):
    calls = mock_urlopen(monkeypatch, verify_success())

    response = APIClient().get(
        "/api/payments/zarinpal/callback/",
        {"Authority": AUTHORITY, "Status": "OK"},
    )

    assert response.status_code == 404
    assert not calls


@pytest.mark.django_db
def test_callback_without_required_parameters_is_rejected():
    response = APIClient().get("/api/payments/zarinpal/callback/")

    assert response.status_code == 400


@pytest.mark.django_db
def test_verification_network_error_keeps_payment_retryable(order, monkeypatch):
    payment = Payment.objects.create(
        order=order,
        amount_rials=12000,
        authority=AUTHORITY,
    )
    mock_urlopen(monkeypatch, error=URLError("offline"))

    response = APIClient().get(
        "/api/payments/zarinpal/callback/",
        {"Authority": AUTHORITY, "Status": "OK"},
    )

    payment.refresh_from_db()
    order.refresh_from_db()
    assert response.status_code == 502
    assert payment.status == Payment.Status.PENDING
    assert payment.error_code == "network"
    assert order.status == Order.Status.PENDING


@pytest.mark.django_db
def test_callback_retries_after_inconclusive_verification(order, monkeypatch):
    payment = Payment.objects.create(
        order=order,
        amount_rials=12000,
        authority=AUTHORITY,
    )
    calls = []
    outcomes = [URLError("offline"), JsonResponse(verify_success())]

    def fake_urlopen(request, *, timeout, context):
        calls.append(request)
        outcome = outcomes.pop(0)
        if isinstance(outcome, Exception):
            raise outcome
        return outcome

    monkeypatch.setattr("apps.payments.gateways.zarinpal.urlopen", fake_urlopen)
    client = APIClient()
    callback = "/api/payments/zarinpal/callback/"
    params = {"Authority": AUTHORITY, "Status": "OK"}

    first = client.get(callback, params)
    second = client.get(callback, params)

    payment.refresh_from_db()
    order.refresh_from_db()
    assert first.status_code == 502
    assert second.status_code == 200
    assert payment.status == Payment.Status.PAID
    assert order.status == Order.Status.PAID
    assert len(calls) == 2


@pytest.mark.django_db
def test_malformed_provider_json_marks_payment_failed(api_client, order, monkeypatch):
    calls = []

    class InvalidJsonResponse(JsonResponse):
        def __init__(self):
            self.body = b"not json"

    def fake_urlopen(request, *, timeout, context):
        calls.append(request)
        return InvalidJsonResponse()

    monkeypatch.setattr("apps.payments.gateways.zarinpal.urlopen", fake_urlopen)

    response = api_client.post(f"/api/orders/{order.id}/payments/", {}, format="json")

    assert response.status_code == 502
    assert Payment.objects.get(order=order).status == Payment.Status.FAILED
    assert len(calls) == 1


@pytest.mark.django_db
def test_verification_code_101_is_idempotent_success(order, monkeypatch):
    payment = Payment.objects.create(
        order=order,
        amount_rials=12000,
        authority=AUTHORITY,
    )
    calls = mock_urlopen(monkeypatch, verify_success(code=101))

    response = APIClient().get(
        "/api/payments/zarinpal/callback/",
        {"Authority": AUTHORITY, "Status": "OK"},
    )

    payment.refresh_from_db()
    order.refresh_from_db()
    assert response.status_code == 200
    assert payment.status == Payment.Status.PAID
    assert order.status == Order.Status.PAID
    assert len(calls) == 1


@pytest.mark.django_db
def test_repeated_success_callback_does_not_verify_twice(order, monkeypatch):
    payment = Payment.objects.create(
        order=order,
        amount_rials=12000,
        authority=AUTHORITY,
    )
    calls = mock_urlopen(monkeypatch, verify_success())
    client = APIClient()

    first = client.get(
        "/api/payments/zarinpal/callback/",
        {"Authority": AUTHORITY, "Status": "OK"},
    )
    second = client.get(
        "/api/payments/zarinpal/callback/",
        {"Authority": AUTHORITY, "Status": "OK"},
    )

    payment.refresh_from_db()
    order.refresh_from_db()
    assert first.status_code == 200
    assert second.status_code == 200
    assert payment.status == Payment.Status.PAID
    assert order.status == Order.Status.PAID
    assert len(calls) == 1


@pytest.mark.django_db
def test_already_paid_payment_skips_provider_verification(order, monkeypatch):
    Payment.objects.create(
        order=order,
        amount_rials=12000,
        authority=AUTHORITY,
        status=Payment.Status.PAID,
        reference_id="201",
    )
    order.status = Order.Status.PAID
    order.save(update_fields=("status",))
    calls = mock_urlopen(monkeypatch, verify_success())

    response = APIClient().get(
        "/api/payments/zarinpal/callback/",
        {"Authority": AUTHORITY, "Status": "OK"},
    )

    assert response.status_code == 200
    assert response.data["status"] == Payment.Status.PAID
    assert not calls
