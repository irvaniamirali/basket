from rest_framework import serializers

from apps.orders.models import Order, OrderItem


class OrderItemSerializer(serializers.ModelSerializer):
    product_id = serializers.UUIDField(read_only=True, allow_null=True)
    line_total = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = (
            "id",
            "product_id",
            "product_name",
            "product_slug",
            "unit_price",
            "quantity",
            "line_total",
        )
        read_only_fields = fields

    def get_line_total(self, item):
        return format(item.unit_price * item.quantity, ".2f")


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = ("id", "status", "total", "created_at", "updated_at", "items")
        read_only_fields = fields
