from django.urls import path

from apps.orders.views import OrderDetailView, OrderListCreateView

app_name = "orders"

urlpatterns = [
    path("", OrderListCreateView.as_view(), name="order-list-create"),
    path("<uuid:pk>/", OrderDetailView.as_view(), name="order-detail"),
]
