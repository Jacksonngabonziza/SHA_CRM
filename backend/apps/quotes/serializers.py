from rest_framework import serializers
from .models import Quote, Appliance, ClientFeedback
from apps.products.serializers import ProductListSerializer
from apps.clients.serializers import ClientListSerializer


class ApplianceSerializer(serializers.ModelSerializer):
    daily_kwh = serializers.ReadOnlyField()

    class Meta:
        model  = Appliance
        fields = ['id', 'name', 'quantity', 'wattage', 'hours_per_day', 'daily_kwh']
        read_only_fields = ['id']


class ClientFeedbackSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    class Meta:
        model  = ClientFeedback
        fields = ['id', 'message', 'status', 'status_display', 'client_name', 'created_at']
        read_only_fields = ['id', 'created_at']


class QuoteVersionSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Quote
        fields = ['id', 'ref_number', 'status', 'total_price_rwf', 'system_size_kwp', 'created_at']


class QuoteSerializer(serializers.ModelSerializer):
    appliances      = ApplianceSerializer(many=True, read_only=True)
    feedback        = ClientFeedbackSerializer(many=True, read_only=True)
    versions        = QuoteVersionSerializer(many=True, read_only=True)
    panel_detail    = ProductListSerializer(source='panel',     read_only=True)
    battery_detail  = ProductListSerializer(source='battery',   read_only=True)
    inverter_detail = ProductListSerializer(source='inverter',  read_only=True)
    generator_detail= ProductListSerializer(source='generator', read_only=True)
    client_detail   = ClientListSerializer(source='client',     read_only=True)
    status_display  = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    share_url       = serializers.SerializerMethodField()

    class Meta:
        model  = Quote
        fields = '__all__'
        read_only_fields = ['id', 'ref_number', 'share_token', 'created_at', 'updated_at', 'created_by']

    def get_share_url(self, obj):
        from django.conf import settings
        return f"{settings.FRONTEND_URL}/quote/{obj.share_token}"


class QuoteListSerializer(serializers.ModelSerializer):
    client_name     = serializers.CharField(source='client.name',  read_only=True)
    client_phone    = serializers.CharField(source='client.phone', read_only=True)
    status_display  = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)
    version_count   = serializers.SerializerMethodField()

    class Meta:
        model  = Quote
        fields = [
            'id', 'ref_number', 'client', 'client_name', 'client_phone',
            'system_size_kwp', 'total_price_rwf', 'status', 'status_display',
            'is_all_in_one_mode', 'valid_until', 'created_by_name',
            'version_count', 'created_at',
        ]

    def get_version_count(self, obj):
        return obj.versions.count()


class QuoteCreateSerializer(serializers.ModelSerializer):
    appliances = ApplianceSerializer(many=True)

    class Meta:
        model  = Quote
        fields = [
            'id', 'client', 'appliances', 'backup_hours', 'peak_sun_hours',
            'panel', 'battery', 'inverter', 'generator', 'is_all_in_one_mode',
            'total_daily_kwh', 'design_daily_kwh', 'system_size_kwp',
            'max_load_kw', 'num_panels', 'num_inverters', 'num_batteries',
            'panels_cost', 'battery_cost', 'inverter_cost', 'generator_cost',
            'accessories_cost', 'installation_cost', 'total_price_rwf',
            'annual_savings_rwf', 'payback_years', 'grid_tariff_rwf_kwh',
            'valid_days', 'notes', 'internal_notes',
        ]
        read_only_fields = ['id']

    def create(self, validated_data):
        appliances_data = validated_data.pop('appliances', [])
        validated_data['created_by'] = self.context['request'].user
        quote = Quote.objects.create(**validated_data)
        for a in appliances_data:
            Appliance.objects.create(quote=quote, **a)
        quote.client.status = 'quoted'
        quote.client.save()
        return quote

    def update(self, instance, validated_data):
        appliances_data = validated_data.pop('appliances', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if appliances_data is not None:
            instance.appliances.all().delete()
            for a in appliances_data:
                Appliance.objects.create(quote=instance, **a)
        return instance


class CalculateRequestSerializer(serializers.Serializer):
    appliances    = serializers.ListField(child=serializers.DictField(), min_length=1)
    backup_hours  = serializers.FloatField(default=8.0, min_value=1, max_value=24)
    peak_sun_hours= serializers.FloatField(default=5.5, required=False)
    panel_id      = serializers.IntegerField(required=False, allow_null=True)
    battery_id    = serializers.IntegerField(required=False, allow_null=True)
    inverter_id   = serializers.IntegerField(required=False, allow_null=True)
    generator_id  = serializers.IntegerField(required=False, allow_null=True)
