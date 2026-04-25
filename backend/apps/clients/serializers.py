from rest_framework import serializers
from .models import Client, ClientNote
from apps.accounts.serializers import UserSerializer


class ClientNoteSerializer(serializers.ModelSerializer):
    created_by_name = serializers.CharField(source='created_by.get_full_name', read_only=True)

    class Meta:
        model = ClientNote
        fields = ['id', 'note', 'created_by', 'created_by_name', 'created_at']
        read_only_fields = ['id', 'created_by', 'created_at']

    def create(self, validated_data):
        validated_data['created_by'] = self.context['request'].user
        return super().create(validated_data)


class ClientSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    client_type_display = serializers.CharField(source='get_client_type_display', read_only=True)
    total_quotes = serializers.ReadOnlyField()
    assigned_to_name = serializers.CharField(
        source='assigned_to.get_full_name', read_only=True, default=None
    )
    created_by_name = serializers.CharField(
        source='created_by.get_full_name', read_only=True, default=None
    )

    source_agent_name = serializers.CharField(
        source='source_agent.get_full_name', read_only=True, default=None
    )

    class Meta:
        model = Client
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by']

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['created_by'] = user
        if user.role == 'field_agent' and 'source_agent' not in validated_data:
            validated_data['source_agent'] = user
        return super().create(validated_data)


class ClientListSerializer(serializers.ModelSerializer):
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    client_type_display = serializers.CharField(source='get_client_type_display', read_only=True)
    total_quotes = serializers.ReadOnlyField()
    assigned_to_name = serializers.CharField(
        source='assigned_to.get_full_name', read_only=True, default=None
    )
    source_agent_name = serializers.CharField(
        source='source_agent.get_full_name', read_only=True, default=None
    )

    class Meta:
        model = Client
        fields = [
            'id', 'name', 'phone', 'email', 'location',
            'client_type', 'client_type_display',
            'status', 'status_display',
            'is_offgrid', 'monthly_bill_rwf',
            'total_quotes', 'assigned_to_name',
            'source_agent', 'source_agent_name',
            'followup_date', 'created_at',
        ]
