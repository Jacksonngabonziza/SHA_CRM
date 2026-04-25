from django.contrib import admin
from .models import Product


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ['name', 'brand', 'model', 'category', 'display_spec', 'price_rwf', 'in_stock', 'is_active']
    list_filter = ['category', 'brand', 'in_stock', 'is_active']
    search_fields = ['name', 'brand', 'model']
    list_editable = ['in_stock', 'is_active']
