from django.urls import path

from apps.cart.views import CartItemDetailView, CartItemListView, CartView

app_name = "cart"

urlpatterns = [
    path("", CartView.as_view(), name="cart"),
    path("items/", CartItemListView.as_view(), name="cart-items"),
    path("items/<uuid:item_id>/", CartItemDetailView.as_view(), name="cart-item"),
]
