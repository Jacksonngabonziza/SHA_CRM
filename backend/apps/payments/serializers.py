
from rest_framework import serializers
from .models import Payment
from django.db.models import Sum

class PaymentSerializer(serializers.ModelSerializer):
    payment_type_display   = serializers.CharField(source="get_payment_type_display", read_only=True)
    payment_method_display = serializers.CharField(source="get_payment_method_display", read_only=True)
    status_display         = serializers.CharField(source="get_status_display", read_only=True)
    client_name            = serializers.CharField(source="client.name", read_only=True)
    quote_ref              = serializers.CharField(source="quote.ref_number", read_only=True)
    quote_total            = serializers.DecimalField(source="quote.total_price_rwf", max_digits=14, decimal_places=2, read_only=True)
    balance_due            = serializers.SerializerMethodField()

    class Meta:
        model  = Payment
        fields = "__all__"
        read_only_fields = ["id","created_at","recorded_by"]

    def get_balance_due(self, obj):
        paid = Payment.objects.filter(quote=obj.quote, status="confirmed").aggregate(t=Sum("amount_rwf"))["t"] or 0
        return float(obj.quote.total_price_rwf) - float(paid)

    def create(self, validated_data):
        validated_data["recorded_by"] = self.context["request"].user
        return super().create(validated_data)
