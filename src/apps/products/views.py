from rest_framework import generics
from rest_framework.exceptions import ValidationError
from rest_framework.filters import SearchFilter

from apps.products.models import Product
from apps.products.serializers import ProductSerializer


class ProductListCreateView(generics.ListCreateAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
    filter_backends = (SearchFilter,)
    search_fields = ("name",)

    def get_queryset(self):
        queryset = super().get_queryset()
        is_active = self.request.query_params.get("is_active")
        if is_active is None:
            return queryset
        if is_active.lower() not in ("true", "false"):
            raise ValidationError({"is_active": "Must be 'true' or 'false'."})
        return queryset.filter(is_active=is_active.lower() == "true")


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Product.objects.all()
    serializer_class = ProductSerializer
