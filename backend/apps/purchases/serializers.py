from rest_framework import serializers
from .models import Supplier, PurchaseOrder, PurchaseOrderItem


class SupplierSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Supplier
        fields = '__all__'
        read_only_fields = ['id', 'created_at']


class PurchaseOrderItemSerializer(serializers.ModelSerializer):
    product_name = serializers.CharField(source='product.name', read_only=True)
    product_brand = serializers.CharField(source='product.brand', read_only=True)
    product_model = serializers.CharField(source='product.model', read_only=True)

    class Meta:
        model  = PurchaseOrderItem
        fields = '__all__'
        read_only_fields = ['id', 'line_total', 'purchase_order']


class PurchaseOrderSerializer(serializers.ModelSerializer):
    supplier_name  = serializers.CharField(source='supplier.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    items          = PurchaseOrderItemSerializer(many=True, read_only=True)

    class Meta:
        model  = PurchaseOrder
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'total_cost_rwf']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)
