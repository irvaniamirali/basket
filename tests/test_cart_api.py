from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from apps.cart.models import Cart, CartItem
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


def add_product(client, product, quantity=1):
    return client.post(
        "/api/cart/items/",
        {"product_id": str(product.id), "quantity": quantity},
        format="json",
    )


@pytest.mark.django_db
def test_cart_requires_authentication(api_client):
    response = api_client.get("/api/cart/")

    assert response.status_code == 401


@pytest.mark.django_db
def test_get_cart_creates_empty_cart(authenticated_client, user):
    response = authenticated_client.get("/api/cart/")

    assert response.status_code == 200
    assert response.json()["items"] == []
    assert response.json()["total"] == "0.00"
    assert str(Cart.objects.get(user=user).id) == response.json()["id"]


@pytest.mark.django_db
def test_add_product_returns_cart_with_current_totals(
    authenticated_client, product, user
):
    cart = Cart.objects.create(user=user)
    previous_updated_at = cart.updated_at

    response = add_product(authenticated_client, product, quantity=2)
    cart.refresh_from_db()

    assert response.status_code == 201
    assert len(response.data["items"]) == 1
    assert response.json()["items"][0]["product"]["id"] == str(product.id)
    assert response.json()["items"][0]["quantity"] == 2
    assert response.json()["items"][0]["unit_price"] == "12.50"
    assert response.json()["items"][0]["line_total"] == "25.00"
    assert response.json()["total"] == "25.00"
    assert Cart.objects.get(user=user).items.get().quantity == 2
    assert cart.updated_at > previous_updated_at
    product.refresh_from_db()
    assert product.stock == 8


@pytest.mark.django_db
def test_adding_existing_product_increments_quantity(authenticated_client, product):
    assert add_product(authenticated_client, product, quantity=2).status_code == 201

    response = add_product(authenticated_client, product, quantity=3)

    assert response.status_code == 200
    assert len(response.data["items"]) == 1
    assert response.data["items"][0]["quantity"] == 5


@pytest.mark.django_db
def test_cart_uses_current_product_price(authenticated_client, product):
    add_product(authenticated_client, product, quantity=2)
    product.price = Decimal("14.75")
    product.save(update_fields=("price",))

    response = authenticated_client.get("/api/cart/")

    assert response.json()["items"][0]["unit_price"] == "14.75"
    assert response.json()["items"][0]["line_total"] == "29.50"
    assert response.json()["total"] == "29.50"


@pytest.mark.django_db
def test_add_rejects_quantity_over_stock_without_creating_line(
    authenticated_client, product
):
    response = add_product(authenticated_client, product, quantity=9)

    assert response.status_code == 400
    assert "quantity" in response.data
    assert CartItem.objects.count() == 0


@pytest.mark.django_db
def test_add_rejects_increment_over_stock(authenticated_client, product):
    add_product(authenticated_client, product, quantity=5)

    response = add_product(authenticated_client, product, quantity=4)

    assert response.status_code == 400
    assert CartItem.objects.get().quantity == 5


@pytest.mark.django_db
def test_add_rejects_inactive_product(authenticated_client, product):
    product.is_active = False
    product.save(update_fields=("is_active",))

    response = add_product(authenticated_client, product)

    assert response.status_code == 400
    assert "product_id" in response.data


@pytest.mark.django_db
def test_add_rejects_missing_product(authenticated_client):
    response = authenticated_client.post(
        "/api/cart/items/",
        {"product_id": "00000000-0000-0000-0000-000000000001", "quantity": 1},
        format="json",
    )

    assert response.status_code == 400
    assert "product_id" in response.data


@pytest.mark.django_db
def test_add_rejects_non_positive_quantity(authenticated_client, product):
    response = add_product(authenticated_client, product, quantity=0)

    assert response.status_code == 400
    assert "quantity" in response.data


@pytest.mark.django_db
def test_update_item_sets_quantity_and_recalculates_total(
    authenticated_client, product
):
    added = add_product(authenticated_client, product, quantity=2)
    item_id = added.data["items"][0]["id"]

    response = authenticated_client.patch(
        f"/api/cart/items/{item_id}/", {"quantity": 3}, format="json"
    )

    assert response.status_code == 200
    assert response.json()["items"][0]["quantity"] == 3
    assert response.json()["total"] == "37.50"


@pytest.mark.django_db
def test_update_rejects_inactive_or_insufficient_stock(authenticated_client, product):
    added = add_product(authenticated_client, product, quantity=2)
    item_id = added.data["items"][0]["id"]
    product.stock = 1
    product.save(update_fields=("stock",))

    response = authenticated_client.patch(
        f"/api/cart/items/{item_id}/", {"quantity": 2}, format="json"
    )

    assert response.status_code == 400
    product.stock = 8
    product.is_active = False
    product.save(update_fields=("stock", "is_active"))
    response = authenticated_client.patch(
        f"/api/cart/items/{item_id}/", {"quantity": 1}, format="json"
    )
    assert response.status_code == 400


@pytest.mark.django_db
def test_delete_item_removes_only_that_item(authenticated_client, product):
    added = add_product(authenticated_client, product)

    response = authenticated_client.delete(
        f"/api/cart/items/{added.data['items'][0]['id']}/"
    )

    assert response.status_code == 204
    assert CartItem.objects.count() == 0


@pytest.mark.django_db
def test_clear_cart_keeps_cart_record(authenticated_client, product, user):
    add_product(authenticated_client, product)
    cart = Cart.objects.get(user=user)

    response = authenticated_client.delete("/api/cart/items/")

    assert response.status_code == 204
    assert Cart.objects.filter(pk=cart.pk).exists()
    assert not CartItem.objects.filter(cart=cart).exists()


@pytest.mark.django_db
def test_cart_items_are_isolated_between_users(authenticated_client, product, user):
    added = add_product(authenticated_client, product)
    other_user = get_user_model().objects.create_user(
        username="other",
        email="other@example.com",
        password="Long-random-password-59!",
    )
    other_client = APIClient()
    other_client.force_authenticate(user=other_user)

    response = other_client.get("/api/cart/")
    hidden_item = other_client.delete(
        f"/api/cart/items/{added.data['items'][0]['id']}/"
    )

    assert response.status_code == 200
    assert response.data["items"] == []
    assert hidden_item.status_code == 404
    assert Cart.objects.filter(user=user).count() == 1


@pytest.mark.django_db
def test_product_deletion_cleans_up_cart_item(authenticated_client, product):
    add_product(authenticated_client, product)
    product.delete()

    response = authenticated_client.get("/api/cart/")

    assert response.status_code == 200
    assert response.data["items"] == []
