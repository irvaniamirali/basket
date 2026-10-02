from decimal import Decimal

from rest_framework import serializers

from apps.cart.models import Cart, CartItem
from apps.products.models import Product


class ProductSummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = Product
        fields = ("id", "name", "slug", "price", "stock", "is_active")


class CartItemSerializer(serializers.ModelSerializer):
    product = ProductSummarySerializer(read_only=True)
    unit_price = serializers.DecimalField(
        source="product.price", max_digits=10, decimal_places=2, read_only=True
    )
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = CartItem
        fields = (
            "id",
            "product",
            "quantity",
            "unit_price",
            "line_total",
            "created_at",
            "updated_at",
        )
        read_only_fields = fields

    def get_line_total(self, item):
        return format(item.product.price * item.quantity, ".2f")


class CartSerializer(serializers.ModelSerializer):
    items = CartItemSerializer(many=True, read_only=True)
    total = serializers.SerializerMethodField()

    class Meta:
        model = Cart
        fields = ("id", "items", "total", "created_at", "updated_at")
        read_only_fields = fields

    def get_total(self, cart):
        total = sum(
            (item.product.price * item.quantity for item in cart.items.all()),
            Decimal("0.00"),
        )
        return format(total, ".2f")


class CartItemAddSerializer(serializers.Serializer):
    product_id = serializers.PrimaryKeyRelatedField(
        source="product", queryset=Product.objects.all()
    )
    quantity = serializers.IntegerField(min_value=1)

    def validate(self, attrs):
        product = attrs["product"]
        if not product.is_active:
            raise serializers.ValidationError(
                {"product_id": "This product is not active."}
            )
        if attrs["quantity"] > product.stock:
            raise serializers.ValidationError(
                {"quantity": "Requested quantity exceeds available stock."}
            )
        return attrs


class CartItemUpdateSerializer(serializers.Serializer):
    quantity = serializers.IntegerField(min_value=1)
