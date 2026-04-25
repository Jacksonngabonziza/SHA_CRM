
from rest_framework import serializers
from .models import Installation, InstallationLog, WarrantyClaim
from apps.accounts.serializers import UserSerializer

class InstallationLogSerializer(serializers.ModelSerializer):
    logged_by_name = serializers.CharField(source="logged_by.get_full_name", read_only=True)
    class Meta:
        model  = InstallationLog
        fields = ["id","note","logged_by","logged_by_name","created_at"]
        read_only_fields = ["id","logged_by"]

class InstallationSerializer(serializers.ModelSerializer):
    logs            = InstallationLogSerializer(many=True, read_only=True)
    status_display  = serializers.CharField(source="get_status_display", read_only=True)
    client_name     = serializers.CharField(source="client.name", read_only=True)
    quote_ref       = serializers.CharField(source="quote.ref_number", read_only=True)
    total_price_rwf = serializers.DecimalField(source="quote.total_price_rwf", max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model  = Installation
        fields = "__all__"
        read_only_fields = ["id","created_at","updated_at","created_by"]

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)

class WarrantyClaimSerializer(serializers.ModelSerializer):
    status_display   = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    raised_by_name   = serializers.CharField(source='raised_by.get_full_name', read_only=True)
    resolved_by_name = serializers.CharField(source='resolved_by.get_full_name', read_only=True)
    client_name      = serializers.CharField(source='installation.client.name', read_only=True)
    installation_ref = serializers.CharField(source='installation.quote.ref_number', read_only=True)

    class Meta:
        model  = WarrantyClaim
        fields = '__all__'
        read_only_fields = ['id', 'raised_by', 'resolved_by', 'resolved_at', 'created_at', 'updated_at']

    def create(self, validated_data):
        validated_data['raised_by'] = self.context['request'].user
        return super().create(validated_data)
