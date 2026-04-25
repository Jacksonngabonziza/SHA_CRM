from rest_framework import serializers
from .models import Product


class ProductSerializer(serializers.ModelSerializer):
    display_spec     = serializers.ReadOnlyField()
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    is_low_stock     = serializers.ReadOnlyField()

    class Meta:
        model  = Product
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class ProductListSerializer(serializers.ModelSerializer):
    display_spec     = serializers.ReadOnlyField()
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    is_low_stock     = serializers.ReadOnlyField()

    class Meta:
        model  = Product
        fields = [
            'id', 'name', 'category', 'category_display', 'brand', 'model',
            'display_spec', 'price_rwf', 'warranty_years', 'in_stock',
            'stock_quantity', 'is_low_stock', 'is_active', 'is_all_in_one',
            'wattage_wp', 'capacity_kwh', 'power_kw', 'phase',
            'max_pv_input_w', 'min_panel_wp', 'max_panel_wp',
            'builtin_inverter_kw', 'builtin_capacity_kwh',
        ]
