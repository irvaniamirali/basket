from django.urls import path

from apps.products.views import ProductDetailView, ProductListCreateView

app_name = "products"

urlpatterns = [
    path("", ProductListCreateView.as_view(), name="product-list"),
    path("<uuid:pk>/", ProductDetailView.as_view(), name="product-detail"),
]
