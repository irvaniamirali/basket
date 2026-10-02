from decimal import Decimal

from django.db import transaction
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.exceptions import APIException, ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.models import Order
from apps.payments.gateways import get_payment_gateway
from apps.payments.gateways.zarinpal import ZarinPalGatewayError
from apps.payments.models import Payment
from apps.payments.serializers import PaymentSerializer

TOMAN_TO_RIAL = 10


class PaymentConflict(APIException):
    status_code = status.HTTP_409_CONFLICT
    default_detail = "This order cannot be paid in its current state."
    default_code = "payment_conflict"


class PaymentCreateView(APIView):
    permission_classes = (IsAuthenticated,)

    def post(self, request, order_id):
        with transaction.atomic():
            order = get_object_or_404(
                Order.objects.select_for_update(),
                id=order_id,
                user=request.user,
            )
            if order.status != Order.Status.PENDING:
                raise PaymentConflict()
            try:
                amount_rials = self.amount_in_rials(order.total)
            except ValueError as exc:
                raise ValidationError({"amount": str(exc)}) from exc

            existing = (
                Payment.objects.select_for_update()
                .filter(order=order, status=Payment.Status.PENDING)
                .first()
            )
            if existing:
                if not existing.authority:
                    raise PaymentConflict(
                        "A payment request for this order is already being processed."
                    )
                gateway = get_payment_gateway()
                return Response(
                    self.payment_response(existing, gateway),
                    status=status.HTTP_200_OK,
                )

            payment = Payment.objects.create(
                order=order,
                amount_rials=amount_rials,
            )

        gateway = get_payment_gateway()
        try:
            result = gateway.request_payment(
                amount_rials=payment.amount_rials,
                description=f"Order {order.id}",
                order_id=order.id,
            )
        except ZarinPalGatewayError as exc:
            self.fail_payment(payment.id, exc)
            response_status = (
                status.HTTP_503_SERVICE_UNAVAILABLE
                if exc.kind == "configuration"
                else status.HTTP_502_BAD_GATEWAY
            )
            return Response(
                {"detail": "Unable to start payment with ZarinPal."},
                status=response_status,
            )

        with transaction.atomic():
            payment = Payment.objects.select_for_update().get(id=payment.id)
            payment.authority = result.authority
            payment.provider_code = result.code
            payment.provider_message = result.message
            payment.save(
                update_fields=(
                    "authority",
                    "provider_code",
                    "provider_message",
                    "updated_at",
                )
            )

        return Response(
            self.payment_response(payment, gateway),
            status=status.HTTP_201_CREATED,
        )

    @staticmethod
    def amount_in_rials(order_total):
        amount = Decimal(order_total) * TOMAN_TO_RIAL
        if amount <= 0:
            raise ValueError("Order total must be greater than zero.")
        if amount != amount.to_integral_value():
            raise ValueError("Order total cannot be represented as whole Rials.")
        return int(amount)

    @staticmethod
    def payment_response(payment, gateway):
        data = PaymentSerializer(payment).data
        data["payment_url"] = gateway.payment_url(payment.authority)
        return data

    @staticmethod
    def fail_payment(payment_id, error):
        Payment.objects.filter(id=payment_id, status=Payment.Status.PENDING).update(
            status=Payment.Status.FAILED,
            provider_code=error.code if isinstance(error.code, int) else None,
            error_code=error.kind,
            provider_message=str(error)[:255],
            updated_at=timezone.now(),
        )


class PaymentDetailView(generics.RetrieveAPIView):
    serializer_class = PaymentSerializer
    permission_classes = (IsAuthenticated,)
    lookup_url_kwarg = "payment_id"

    def get_queryset(self):
        return Payment.objects.filter(order__user=self.request.user)


class ZarinPalCallbackView(APIView):
    permission_classes = (AllowAny,)

    def get(self, request):
        authority = request.query_params.get("Authority", "")
        callback_status = request.query_params.get("Status", "")
        if not authority or callback_status not in ("OK", "NOK"):
            raise ValidationError(
                {"callback": "Authority and a valid Status are required."}
            )

        with transaction.atomic():
            payment = (
                Payment.objects.select_for_update().filter(authority=authority).first()
            )
            if payment is None:
                return Response(
                    {"detail": "Payment not found."},
                    status=status.HTTP_404_NOT_FOUND,
                )
            order = Order.objects.select_for_update().get(id=payment.order_id)

            if payment.status == Payment.Status.PAID:
                return self.callback_response(payment)
            if payment.status != Payment.Status.PENDING:
                return self.callback_response(payment)
            if callback_status == "NOK":
                payment.status = Payment.Status.CANCELED
                payment.error_code = "canceled"
                payment.provider_message = "ZarinPal reported a canceled payment."
                payment.save(
                    update_fields=(
                        "status",
                        "error_code",
                        "provider_message",
                        "updated_at",
                    )
                )
                return self.callback_response(payment)

            if order.status != Order.Status.PENDING:
                self.mark_failed(payment, "order_not_payable", "Order is not payable.")
                return self.callback_response(payment)

            try:
                expected_amount = PaymentCreateView.amount_in_rials(order.total)
            except ValueError:
                expected_amount = None
            if expected_amount != payment.amount_rials:
                self.mark_failed(
                    payment, "amount_mismatch", "Order amount has changed."
                )
                return Response(
                    {"payment_id": str(payment.id), "status": payment.status},
                    status=status.HTTP_400_BAD_REQUEST,
                )

            try:
                result = get_payment_gateway().verify_payment(
                    amount_rials=payment.amount_rials,
                    authority=payment.authority,
                )
            except ZarinPalGatewayError as exc:
                self.record_verification_error(
                    payment,
                    exc.kind,
                    str(exc),
                    provider_code=exc.code if isinstance(exc.code, int) else None,
                )
                return Response(
                    {"payment_id": str(payment.id), "status": payment.status},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            payment.provider_code = result.code
            payment.provider_message = result.message
            if result.code in (100, 101) and (
                result.reference_id or result.code == 101
            ):
                payment.status = Payment.Status.PAID
                payment.reference_id = result.reference_id
                payment.verified_at = timezone.now()
                payment.error_code = ""
                order.status = Order.Status.PAID
                order.save(update_fields=("status", "updated_at"))
            else:
                payment.status = Payment.Status.FAILED
                payment.error_code = "verification_failed"
            payment.save(
                update_fields=(
                    "status",
                    "provider_code",
                    "provider_message",
                    "reference_id",
                    "verified_at",
                    "error_code",
                    "updated_at",
                )
            )
            return self.callback_response(payment)

    @staticmethod
    def mark_failed(payment, error_code, message, provider_code=None):
        payment.status = Payment.Status.FAILED
        payment.error_code = error_code[:100]
        payment.provider_message = message[:255]
        payment.provider_code = provider_code
        payment.save(
            update_fields=(
                "status",
                "error_code",
                "provider_message",
                "provider_code",
                "updated_at",
            )
        )

    @staticmethod
    def record_verification_error(payment, error_code, message, provider_code=None):
        payment.error_code = error_code[:100]
        payment.provider_message = message[:255]
        payment.provider_code = provider_code
        payment.save(
            update_fields=(
                "error_code",
                "provider_message",
                "provider_code",
                "updated_at",
            )
        )

    @staticmethod
    def callback_response(payment):
        return Response(
            {
                "payment_id": str(payment.id),
                "status": payment.status,
                "reference_id": payment.reference_id or None,
            },
            status=status.HTTP_200_OK,
        )
