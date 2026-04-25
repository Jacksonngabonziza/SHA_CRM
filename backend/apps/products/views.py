from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from apps.accounts.permissions import IsAdminOrReadOnly
from .models import Product
from .serializers import ProductSerializer, ProductListSerializer


class ProductListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAdminOrReadOnly]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields  = ['category', 'brand', 'in_stock', 'phase', 'is_all_in_one']
    search_fields     = ['name', 'brand', 'model']
    ordering_fields   = ['name', 'price_rwf', 'created_at']
    ordering          = ['category', 'name']

    def get_queryset(self):
        return Product.objects.filter(is_active=True)

    def get_serializer_class(self):
        return ProductSerializer if self.request.method != 'GET' else ProductListSerializer


class ProductDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Product.objects.all()
    serializer_class   = ProductSerializer
    permission_classes = [IsAdminOrReadOnly]

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        return Response({'detail': 'Product deactivated.'})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def products_by_category(request):
    """Products grouped by category — used by quote engine."""
    def qs(cat):
        return ProductListSerializer(
            Product.objects.filter(category=cat, is_active=True, in_stock=True), many=True
        ).data

    return Response({
        'panels':       qs('panel'),
        'batteries':    qs('battery'),
        'inverters':    qs('inverter'),
        'generators':   qs('generator'),
        'accessories':  qs('accessory'),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def low_stock_alerts(request):
    """Products with low stock — admin only in dashboard."""
    from django.conf import settings
    threshold = getattr(settings, 'LOW_STOCK_THRESHOLD', 2)
    products = Product.objects.filter(
        is_active=True, in_stock=True, stock_quantity__lte=threshold
    )
    return Response(ProductListSerializer(products, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def compatible_panels(request, generator_id):
    """Return panels compatible with a specific all-in-one generator."""
    try:
        gen = Product.objects.get(pk=generator_id, category='generator', is_active=True)
    except Product.DoesNotExist:
        return Response({'detail': 'Generator not found.'}, status=404)

    qs = Product.objects.filter(category='panel', is_active=True, in_stock=True)

    if gen.max_panel_wp:
        qs = qs.filter(wattage_wp__lte=gen.max_panel_wp)
    if gen.min_panel_wp:
        qs = qs.filter(wattage_wp__gte=gen.min_panel_wp)

    return Response(ProductListSerializer(qs, many=True).data)
