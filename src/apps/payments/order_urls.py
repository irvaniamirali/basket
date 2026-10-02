from django.urls import path

from apps.payments.views import PaymentCreateView

app_name = "order_payments"

urlpatterns = [
    path("", PaymentCreateView.as_view(), name="order-payment-create"),
]
