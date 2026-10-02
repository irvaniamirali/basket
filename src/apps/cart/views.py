from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.cart.models import Cart, CartItem
from apps.cart.serializers import (
    CartItemAddSerializer,
    CartItemUpdateSerializer,
    CartSerializer,
)


def get_user_cart(user):
    cart, _ = Cart.objects.get_or_create(user=user)
    return cart


class CartView(APIView):
    permission_classes = (IsAuthenticated,)

    def get(self, request):
        cart = get_user_cart(request.user)
        return Response(CartSerializer(cart).data)


class CartItemListView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request):
        serializer = CartItemAddSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        with transaction.atomic():
            cart = get_user_cart(request.user)
            product = serializer.validated_data["product"]
            quantity = serializer.validated_data["quantity"]
            item, created = CartItem.objects.get_or_create(
                cart=cart,
                product=product,
                defaults={"quantity": quantity},
            )
            if not created:
                new_quantity = item.quantity + quantity
                if new_quantity > product.stock:
                    return Response(
                        {"quantity": ["Requested quantity exceeds available stock."]},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                item.quantity = new_quantity
                item.save(update_fields=("quantity", "updated_at"))
            cart.save(update_fields=("updated_at",))

        return Response(
            CartSerializer(cart).data,
            status=status.HTTP_201_CREATED if created else status.HTTP_200_OK,
        )

    def delete(self, request):
        cart = get_user_cart(request.user)
        cart.items.all().delete()
        cart.save(update_fields=("updated_at",))
        return Response(status=status.HTTP_204_NO_CONTENT)


class CartItemDetailView(APIView):
    permission_classes = (IsAuthenticated,)

    def patch(self, request, item_id):
        item = get_object_or_404(
            CartItem.objects.select_related("product", "cart"),
            id=item_id,
            cart__user=request.user,
        )
        serializer = CartItemUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        quantity = serializer.validated_data["quantity"]

        if not item.product.is_active:
            return Response(
                {"product": ["This product is not active."]},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if quantity > item.product.stock:
            return Response(
                {"quantity": ["Requested quantity exceeds available stock."]},
                status=status.HTTP_400_BAD_REQUEST,
            )

        item.quantity = quantity
        item.save(update_fields=("quantity", "updated_at"))
        item.cart.save(update_fields=("updated_at",))
        return Response(CartSerializer(item.cart).data)

    def delete(self, request, item_id):
        item = get_object_or_404(
            CartItem.objects.select_related("cart"),
            id=item_id,
            cart__user=request.user,
        )
        cart = item.cart
        item.delete()
        cart.save(update_fields=("updated_at",))
        return Response(status=status.HTTP_204_NO_CONTENT)
