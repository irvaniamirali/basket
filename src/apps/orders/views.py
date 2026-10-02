from collections import defaultdict
from decimal import Decimal

from django.db import transaction
from rest_framework import generics, status
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.cart.models import Cart, CartItem
from apps.orders.models import Order, OrderItem
from apps.orders.serializers import OrderSerializer
from apps.products.models import Product


class OrderListCreateView(generics.ListAPIView):
    serializer_class = OrderSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return (
            Order.objects.filter(user=self.request.user)
            .prefetch_related("items")
            .order_by("-created_at", "id")
        )

    @transaction.atomic
    def post(self, request):
        cart = Cart.objects.select_for_update().filter(user=request.user).first()
        if cart is None:
            raise ValidationError(
                {"cart": "Cannot create an order from an empty cart."}
            )

        cart_items = list(CartItem.objects.filter(cart=cart).order_by("product_id"))
        if not cart_items:
            raise ValidationError(
                {"cart": "Cannot create an order from an empty cart."}
            )

        product_ids = {item.product_id for item in cart_items}
        products = (
            Product.objects.select_for_update()
            .filter(id__in=product_ids)
            .order_by("id")
        )
        products_by_id = {product.id: product for product in products}

        quantities = defaultdict(int)
        for item in cart_items:
            product = products_by_id.get(item.product_id)
            if product is None:
                raise ValidationError(
                    {"items": f"Product {item.product_id} no longer exists."}
                )
            if not product.is_active:
                raise ValidationError(
                    {"items": f"Product '{product.name}' is not active."}
                )
            quantities[product.id] += item.quantity
            if quantities[product.id] > product.stock:
                raise ValidationError(
                    {"items": f"Insufficient stock for product '{product.name}'."}
                )

        total = sum(
            (
                products_by_id[item.product_id].price * item.quantity
                for item in cart_items
            ),
            Decimal("0.00"),
        )
        order = Order.objects.create(user=request.user, total=total)
        OrderItem.objects.bulk_create(
            [
                OrderItem(
                    order=order,
                    product=products_by_id[item.product_id],
                    product_name=products_by_id[item.product_id].name,
                    product_slug=products_by_id[item.product_id].slug,
                    unit_price=products_by_id[item.product_id].price,
                    quantity=item.quantity,
                )
                for item in cart_items
            ]
        )

        for product_id, quantity in quantities.items():
            product = products_by_id[product_id]
            product.stock -= quantity
            product.save(update_fields=("stock", "updated_at"))

        cart.items.all().delete()
        cart.save(update_fields=("updated_at",))

        return Response(
            OrderSerializer(order).data,
            status=status.HTTP_201_CREATED,
        )


class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderSerializer
    permission_classes = (IsAuthenticated,)

    def get_queryset(self):
        return Order.objects.filter(user=self.request.user).prefetch_related("items")
