from django.urls import path

from apps.payments.views import PaymentDetailView, ZarinPalCallbackView

app_name = "payments"

urlpatterns = [
    path(
        "zarinpal/callback/", ZarinPalCallbackView.as_view(), name="zarinpal-callback"
    ),
    path("<uuid:payment_id>/", PaymentDetailView.as_view(), name="payment-detail"),
]
