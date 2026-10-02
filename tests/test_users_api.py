import pytest
from django.contrib.auth import get_user_model
from rest_framework.authtoken.models import Token
from rest_framework.test import APIClient


@pytest.fixture
def api_client():
    return APIClient()


def registration_data(**overrides):
    data = {
        "username": "customer",
        "email": "customer@example.com",
        "password": "Long-random-password-59!",
        "first_name": "Casey",
        "last_name": "Customer",
    }
    return {**data, **overrides}


@pytest.mark.django_db
def test_register_user_hashes_password_and_returns_public_fields(api_client):
    response = api_client.post(
        "/api/auth/register/", registration_data(), format="json"
    )
    user = get_user_model().objects.get(username="customer")

    assert response.status_code == 201
    assert user.check_password(registration_data()["password"])
    assert user.password != registration_data()["password"]
    assert user.is_active is True
    assert user.is_staff is False
    assert "password" not in response.data
    assert "is_staff" not in response.data


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("overrides", "field"),
    [
        ({"username": ""}, "username"),
        ({"email": ""}, "email"),
        ({"email": "invalid"}, "email"),
        ({"password": "12345678"}, "password"),
    ],
)
def test_registration_rejects_invalid_fields(api_client, overrides, field):
    response = api_client.post(
        "/api/auth/register/", registration_data(**overrides), format="json"
    )

    assert response.status_code == 400
    assert field in response.data


@pytest.mark.django_db
def test_registration_requires_fields(api_client):
    response = api_client.post("/api/auth/register/", {}, format="json")

    assert response.status_code == 400
    assert "username" in response.data
    assert "email" in response.data
    assert "password" in response.data


@pytest.mark.django_db
@pytest.mark.parametrize("duplicate_field", ("username", "email"))
def test_registration_rejects_duplicate_username_or_email(api_client, duplicate_field):
    api_client.post("/api/auth/register/", registration_data(), format="json")
    response = api_client.post(
        "/api/auth/register/",
        registration_data(
            username="another-customer" if duplicate_field == "email" else "customer",
            email="another@example.com"
            if duplicate_field == "username"
            else "customer@example.com",
        ),
        format="json",
    )

    assert response.status_code == 400
    assert duplicate_field in response.data


@pytest.mark.django_db
def test_token_endpoint_authenticates_user(api_client):
    api_client.post("/api/auth/register/", registration_data(), format="json")

    response = api_client.post(
        "/api/auth/token/",
        {"username": "customer", "password": "Long-random-password-59!"},
        format="json",
    )

    assert response.status_code == 200
    assert Token.objects.filter(key=response.data["token"]).exists()


@pytest.mark.django_db
def test_token_endpoint_rejects_invalid_credentials(api_client):
    response = api_client.post(
        "/api/auth/token/", {"username": "missing", "password": "wrong"}
    )

    assert response.status_code == 400
    assert "non_field_errors" in response.data


@pytest.mark.django_db
def test_profile_requires_authentication(api_client):
    response = api_client.get("/api/auth/me/")

    assert response.status_code == 401


@pytest.mark.django_db
def test_profile_returns_authenticated_user(api_client):
    user = get_user_model().objects.create_user(
        username="customer",
        email="customer@example.com",
        password="Long-random-password-59!",
    )
    api_client.force_authenticate(user=user)

    response = api_client.get("/api/auth/me/")

    assert response.status_code == 200
    assert response.data == {
        "id": user.id,
        "username": "customer",
        "email": "customer@example.com",
        "first_name": "",
        "last_name": "",
    }
    assert "password" not in response.data


@pytest.mark.django_db
def test_logout_deletes_only_callers_token(api_client):
    user_model = get_user_model()
    user = user_model.objects.create_user(
        username="customer",
        email="customer@example.com",
        password="Long-random-password-59!",
    )
    other_user = user_model.objects.create_user(
        username="other",
        email="other@example.com",
        password="Long-random-password-59!",
    )
    token = Token.objects.create(user=user)
    other_token = Token.objects.create(user=other_user)
    api_client.credentials(HTTP_AUTHORIZATION=f"Token {token.key}")

    response = api_client.post("/api/auth/logout/")

    assert response.status_code == 204
    assert not Token.objects.filter(pk=token.pk).exists()
    assert Token.objects.filter(pk=other_token.pk).exists()
    assert api_client.get("/api/auth/me/").status_code == 401


@pytest.mark.django_db
def test_anonymous_user_cannot_create_product(api_client):
    response = api_client.post(
        "/api/products/",
        {
            "name": "Coffee beans",
            "slug": "coffee-beans",
            "price": "12.50",
            "stock": 8,
        },
        format="json",
    )

    assert response.status_code == 401


@pytest.mark.django_db
def test_regular_user_cannot_create_product(api_client):
    user = get_user_model().objects.create_user(
        username="customer",
        email="customer@example.com",
        password="Long-random-password-59!",
    )
    api_client.force_authenticate(user=user)

    response = api_client.post(
        "/api/products/",
        {
            "name": "Coffee beans",
            "slug": "coffee-beans",
            "price": "12.50",
            "stock": 8,
        },
        format="json",
    )

    assert response.status_code == 403
