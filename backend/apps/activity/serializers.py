from rest_framework import serializers
from .models import ActivityLog


class ActivityLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = ActivityLog
        fields = [
            'id', 'user', 'user_name', 'user_role',
            'action', 'resource_type', 'resource_id', 'resource_label',
            'description', 'ip_address', 'created_at',
        ]
