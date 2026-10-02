from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.cart.models import Cart, CartItem
from apps.orders.models import Order, OrderItem
from apps.products.models import Product


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def user(db):
    return get_user_model().objects.create_user(
        username="customer",
        email="customer@example.com",
        password="Long-random-password-59!",
    )


@pytest.fixture
def authenticated_client(api_client, user):
    api_client.force_authenticate(user=user)
    return api_client


@pytest.fixture
def product(db):
    return Product.objects.create(
        name="Coffee beans",
        slug="coffee-beans",
        price=Decimal("12.50"),
        stock=8,
    )


@pytest.fixture
def cart(user):
    return Cart.objects.create(user=user)


def add_item(cart, product, quantity):
    return CartItem.objects.create(cart=cart, product=product, quantity=quantity)


@pytest.mark.django_db
def test_order_creation_snapshots_items_and_updates_stock_and_cart(
    authenticated_client, cart, product
):
    add_item(cart, product, quantity=2)
    other_product = Product.objects.create(
        name="Green tea",
        slug="green-tea",
        price=Decimal("5.00"),
        stock=4,
    )
    add_item(cart, other_product, quantity=1)

    response = authenticated_client.post(
        "/api/orders/",
        {"total": "0.01", "status": "paid", "items": []},
        format="json",
    )

    assert response.status_code == 201
    assert response.json()["status"] == "pending"
    assert response.json()["total"] == "30.00"
    assert len(response.json()["items"]) == 2
    coffee_item = next(
        item
        for item in response.json()["items"]
        if item["product_id"] == str(product.id)
    )
    assert coffee_item["product_name"] == "Coffee beans"
    assert coffee_item["product_slug"] == "coffee-beans"
    assert coffee_item["unit_price"] == "12.50"
    assert coffee_item["quantity"] == 2
    product.refresh_from_db()
    other_product.refresh_from_db()
    assert product.stock == 6
    assert other_product.stock == 3
    assert cart.items.count() == 0
    assert Order.objects.count() == 1


@pytest.mark.django_db
def test_checkout_uses_current_database_price(authenticated_client, cart, product):
    add_item(cart, product, quantity=2)
    product.price = Decimal("15.75")
    product.save(update_fields=("price",))

    response = authenticated_client.post("/api/orders/", {}, format="json")

    assert response.status_code == 201
    assert response.json()["total"] == "31.50"
    assert response.json()["items"][0]["unit_price"] == "15.75"


@pytest.mark.django_db
def test_checkout_rejects_empty_cart_without_creating_order(authenticated_client, cart):
    response = authenticated_client.post("/api/orders/", {}, format="json")

    assert response.status_code == 400
    assert "cart" in response.data
    assert Order.objects.count() == 0


@pytest.mark.django_db
@pytest.mark.parametrize("failure", ("inactive", "insufficient_stock"))
def test_checkout_rolls_back_when_any_product_is_unavailable(
    authenticated_client, cart, product, failure
):
    add_item(cart, product, quantity=2)
    unavailable = Product.objects.create(
        name="Green tea",
        slug="green-tea",
        price=Decimal("5.00"),
        stock=4 if failure == "inactive" else 1,
        is_active=failure != "inactive",
    )
    add_item(cart, unavailable, quantity=2)

    response = authenticated_client.post("/api/orders/", {}, format="json")

    assert response.status_code == 400
    assert Order.objects.count() == 0
    assert OrderItem.objects.count() == 0
    assert cart.items.count() == 2
    product.refresh_from_db()
    unavailable.refresh_from_db()
    assert product.stock == 8
    assert unavailable.stock == (4 if failure == "inactive" else 1)


@pytest.mark.django_db
def test_checkout_after_product_deletion_rejects_empty_cart(
    authenticated_client, cart, product
):
    add_item(cart, product, quantity=1)
    product.delete()

    response = authenticated_client.post("/api/orders/", {}, format="json")

    assert response.status_code == 400
    assert Order.objects.count() == 0
    assert cart.items.count() == 0


@pytest.mark.django_db
def test_order_list_and_detail_are_scoped_to_current_user(
    authenticated_client, cart, product, user
):
    add_item(cart, product, quantity=1)
    created = authenticated_client.post("/api/orders/", {}, format="json")
    other_user = get_user_model().objects.create_user(
        username="other",
        email="other@example.com",
        password="Long-random-password-59!",
    )
    other_order = Order.objects.create(user=other_user, total=Decimal("1.00"))

    response = authenticated_client.get("/api/orders/")
    own_order = authenticated_client.get(f"/api/orders/{created.data['id']}/")
    hidden_order = authenticated_client.get(f"/api/orders/{other_order.id}/")

    assert response.status_code == 200
    assert response.data["count"] == 1
    assert response.data["results"][0]["id"] == created.data["id"]
    assert own_order.status_code == 200
    assert hidden_order.status_code == 404


@pytest.mark.django_db
def test_order_endpoints_require_authentication(api_client):
    assert api_client.post("/api/orders/", {}, format="json").status_code == 401
    assert api_client.get("/api/orders/").status_code == 401


@pytest.mark.django_db
def test_product_deletion_preserves_order_item_snapshots(
    authenticated_client, cart, product
):
    add_item(cart, product, quantity=2)
    response = authenticated_client.post("/api/orders/", {}, format="json")
    order_id = response.data["id"]
    product.delete()

    response = authenticated_client.get(f"/api/orders/{order_id}/")

    assert response.status_code == 200
    assert response.data["items"][0]["product_id"] is None
    assert response.data["items"][0]["product_name"] == "Coffee beans"
    assert response.data["items"][0]["product_slug"] == "coffee-beans"
    assert response.data["items"][0]["unit_price"] == "12.50"


@pytest.mark.django_db
def test_order_list_is_paginated(api_client, user):
    Order.objects.bulk_create(
        [Order(user=user, total=Decimal("1.00")) for _ in range(11)]
    )
    api_client.force_authenticate(user=user)

    response = api_client.get("/api/orders/")

    assert response.status_code == 200
    assert response.data["count"] == 11
    assert len(response.data["results"]) == 10
    assert response.data["next"] is not None
