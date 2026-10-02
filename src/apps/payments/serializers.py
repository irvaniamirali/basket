from rest_framework import serializers

from apps.payments.models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = (
            "id",
            "order_id",
            "provider",
            "status",
            "amount_rials",
            "reference_id",
            "created_at",
            "updated_at",
            "verified_at",
        )
        read_only_fields = fields
