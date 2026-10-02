import uuid
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.products.models import Product


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def staff_user(db):
    return get_user_model().objects.create_user(
        username="catalog-staff",
        email="catalog-staff@example.com",
        password="Staff-password-59!",
        is_staff=True,
    )


@pytest.fixture
def product(db):
    return Product.objects.create(
        name="Coffee beans",
        slug="coffee-beans",
        description="Whole bean coffee",
        price=Decimal("12.50"),
        stock=8,
    )


def product_data(**overrides):
    data = {
        "name": "Coffee beans",
        "slug": "coffee-beans",
        "description": "Whole bean coffee",
        "price": "12.50",
        "stock": 8,
    }
    return {**data, **overrides}


@pytest.mark.django_db
def test_create_product(api_client, staff_user):
    api_client.force_authenticate(user=staff_user)
    response = api_client.post("/api/products/", product_data(), format="json")

    assert response.status_code == 201
    assert uuid.UUID(response.data["id"])
    assert response.data["name"] == "Coffee beans"
    assert response.data["is_active"] is True
    assert Product.objects.count() == 1


@pytest.mark.django_db
def test_list_products(api_client, product):
    response = api_client.get("/api/products/")

    assert response.status_code == 200
    assert response.data["count"] == 1
    assert response.data["results"][0]["id"] == str(product.id)


@pytest.mark.django_db
def test_retrieve_product(api_client, product):
    response = api_client.get(f"/api/products/{product.id}/")

    assert response.status_code == 200
    assert response.data["slug"] == product.slug


@pytest.mark.django_db
def test_update_product(api_client, product, staff_user):
    api_client.force_authenticate(user=staff_user)
    response = api_client.patch(
        f"/api/products/{product.id}/", {"price": "15.00"}, format="json"
    )

    assert response.status_code == 200
    assert response.data["price"] == "15.00"
    product.refresh_from_db()
    assert product.price == Decimal("15.00")


@pytest.mark.django_db
def test_delete_product(api_client, product, staff_user):
    api_client.force_authenticate(user=staff_user)
    response = api_client.delete(f"/api/products/{product.id}/")

    assert response.status_code == 204
    assert not Product.objects.filter(id=product.id).exists()


@pytest.mark.django_db
@pytest.mark.parametrize(
    ("overrides", "field"),
    [
        ({"name": ""}, "name"),
        ({"name": "n" * 256}, "name"),
        ({"price": "-0.01"}, "price"),
        ({"stock": -1}, "stock"),
        ({"slug": "not a valid slug"}, "slug"),
    ],
)
def test_create_product_rejects_invalid_data(api_client, staff_user, overrides, field):
    api_client.force_authenticate(user=staff_user)
    response = api_client.post(
        "/api/products/", product_data(**overrides), format="json"
    )

    assert response.status_code == 400
    assert field in response.data


@pytest.mark.django_db
def test_create_product_rejects_duplicate_slug(api_client, product, staff_user):
    api_client.force_authenticate(user=staff_user)
    response = api_client.post("/api/products/", product_data(), format="json")

    assert response.status_code == 400
    assert "slug" in response.data


@pytest.mark.django_db
def test_create_product_requires_name(api_client, staff_user):
    api_client.force_authenticate(user=staff_user)
    data = product_data()
    del data["name"]

    response = api_client.post("/api/products/", data, format="json")

    assert response.status_code == 400
    assert "name" in response.data


@pytest.mark.django_db
def test_nonexistent_product_returns_not_found(api_client):
    response = api_client.get(f"/api/products/{uuid.uuid4()}/")

    assert response.status_code == 404


@pytest.mark.django_db
def test_product_list_is_paginated(api_client):
    Product.objects.bulk_create(
        [
            Product(
                name=f"Product {index}",
                slug=f"product-{index}",
                price=Decimal("1.00"),
                stock=1,
            )
            for index in range(11)
        ]
    )

    response = api_client.get("/api/products/")

    assert response.status_code == 200
    assert response.data["count"] == 11
    assert len(response.data["results"]) == 10
    assert response.data["next"] is not None


@pytest.mark.django_db
def test_product_list_searches_by_name(api_client, product):
    Product.objects.create(
        name="Tea",
        slug="tea",
        price=Decimal("5.00"),
        stock=3,
    )

    response = api_client.get("/api/products/?search=coffee")

    assert response.status_code == 200
    assert response.data["count"] == 1
    assert response.data["results"][0]["id"] == str(product.id)


@pytest.mark.django_db
def test_product_list_filters_active_status(api_client, product):
    inactive_product = Product.objects.create(
        name="Tea",
        slug="tea",
        price=Decimal("5.00"),
        stock=3,
        is_active=False,
    )

    active_response = api_client.get("/api/products/?is_active=true")
    inactive_response = api_client.get("/api/products/?is_active=false")

    assert active_response.data["count"] == 1
    assert active_response.data["results"][0]["id"] == str(product.id)
    assert inactive_response.data["count"] == 1
    assert inactive_response.data["results"][0]["id"] == str(inactive_product.id)
