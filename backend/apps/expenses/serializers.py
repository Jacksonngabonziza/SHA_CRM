from rest_framework import serializers
from .models import Expense, RecurringExpense


class ExpenseSerializer(serializers.ModelSerializer):
    category_display  = serializers.CharField(source='get_category_display', read_only=True)
    recorded_by_name  = serializers.CharField(source='recorded_by.get_full_name', read_only=True)
    quote_ref         = serializers.CharField(source='quote.ref_number', read_only=True)

    class Meta:
        model  = Expense
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'recorded_by']

    def create(self, validated_data):
        validated_data['recorded_by'] = self.context['request'].user
        return super().create(validated_data)


class RecurringExpenseSerializer(serializers.ModelSerializer):
    category_display  = serializers.CharField(source='get_category_display', read_only=True)
    frequency_display = serializers.CharField(source='get_frequency_display', read_only=True)
    is_overdue        = serializers.SerializerMethodField()

    class Meta:
        model  = RecurringExpense
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'created_by']

    def get_is_overdue(self, obj):
        from django.utils import timezone
        return obj.is_active and obj.next_due_date <= timezone.now().date()

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)
