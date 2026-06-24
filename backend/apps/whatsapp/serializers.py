from rest_framework import serializers
from .models import WAConversation, WAMessage


class WAMessageSerializer(serializers.ModelSerializer):
    sent_by_name = serializers.SerializerMethodField()

    class Meta:
        model = WAMessage
        fields = [
            'id', 'wa_message_id', 'direction', 'message_type',
            'body', 'sent_by', 'sent_by_name', 'status', 'timestamp',
        ]

    def get_sent_by_name(self, obj):
        if obj.sent_by:
            return obj.sent_by.get_full_name() or obj.sent_by.username
        return None


class WAConversationSerializer(serializers.ModelSerializer):
    last_message_preview = serializers.SerializerMethodField()
    client_name = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()

    class Meta:
        model = WAConversation
        fields = [
            'id', 'wa_id', 'display_name', 'status', 'language',
            'bot_step', 'unread_count', 'last_message_at', 'created_at',
            'client', 'client_name', 'assigned_to', 'assigned_to_name',
            'last_message_preview',
        ]

    def get_last_message_preview(self, obj):
        msg = obj.messages.order_by('-timestamp').first()
        if not msg:
            return ''
        prefix = '→ ' if msg.direction == 'outbound' else ''
        return prefix + msg.body[:80]

    def get_client_name(self, obj):
        return obj.client.name if obj.client_id else None

    def get_assigned_to_name(self, obj):
        if obj.assigned_to_id:
            return obj.assigned_to.get_full_name() or obj.assigned_to.username
        return None


class WAConversationDetailSerializer(WAConversationSerializer):
    messages = WAMessageSerializer(many=True, read_only=True)
    bot_data = serializers.JSONField(read_only=True)

    class Meta(WAConversationSerializer.Meta):
        fields = WAConversationSerializer.Meta.fields + ['messages', 'bot_data']
