import uuid

from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q

from apps.orders.models import Order


class Payment(models.Model):
    class Provider(models.TextChoices):
        ZARINPAL = "zarinpal", "ZarinPal"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        PAID = "paid", "Paid"
        FAILED = "failed", "Failed"
        CANCELED = "canceled", "Canceled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    order = models.ForeignKey(
        Order,
        on_delete=models.PROTECT,
        related_name="payments",
    )
    provider = models.CharField(
        max_length=20,
        choices=Provider.choices,
        default=Provider.ZARINPAL,
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
    )
    amount_rials = models.PositiveBigIntegerField(validators=[MinValueValidator(1)])
    authority = models.CharField(max_length=64, unique=True, null=True, blank=True)
    reference_id = models.CharField(max_length=64, blank=True)
    provider_code = models.IntegerField(null=True, blank=True)
    provider_message = models.CharField(max_length=255, blank=True)
    error_code = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    verified_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ("-created_at", "id")
        constraints = [  # noqa: RUF012
            models.UniqueConstraint(
                fields=("order",),
                condition=Q(status="pending"),
                name="one_pending_payment_per_order",
            ),
        ]

    def __str__(self):
        return f"Payment {self.id} ({self.status})"
