from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("apps.core.urls")),
    path("api/auth/", include("apps.users.urls")),
    path("api/products/", include("apps.products.urls")),
    path("api/cart/", include("apps.cart.urls")),
    path(
        "api/orders/<uuid:order_id>/payments/",
        include("apps.payments.order_urls"),
    ),
    path(
        "api/payments/",
        include("apps.payments.urls"),
    ),
    path("api/orders/", include("apps.orders.urls")),
]
