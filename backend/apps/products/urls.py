from django.urls import path
from .views import (
    ProductListCreateView, ProductDetailView,
    products_by_category, low_stock_alerts, compatible_panels,
)

urlpatterns = [
    path('', ProductListCreateView.as_view(), name='product_list'),
    path('<int:pk>/', ProductDetailView.as_view(), name='product_detail'),
    path('by-category/', products_by_category, name='products_by_category'),
    path('low-stock/', low_stock_alerts, name='low_stock_alerts'),
    path('<int:generator_id>/compatible-panels/', compatible_panels, name='compatible_panels'),
]
