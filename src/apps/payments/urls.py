from django.urls import path

from apps.payments.views import ZarinPalCallbackView

app_name = "payments"

urlpatterns = [
    path(
        "zarinpal/callback/", ZarinPalCallbackView.as_view(), name="zarinpal-callback"
    ),
]
