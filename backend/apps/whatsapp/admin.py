from django.contrib import admin
from .models import WAConversation, WAMessage


class WAMessageInline(admin.TabularInline):
    model = WAMessage
    extra = 0
    readonly_fields = ('direction', 'message_type', 'body', 'sent_by', 'status', 'timestamp')
    can_delete = False


@admin.register(WAConversation)
class WAConversationAdmin(admin.ModelAdmin):
    list_display = ('display_name', 'wa_id', 'status', 'language', 'bot_step', 'unread_count', 'last_message_at')
    list_filter = ('status', 'language')
    search_fields = ('wa_id', 'display_name')
    readonly_fields = ('wa_id', 'created_at', 'last_message_at', 'bot_data')
    inlines = [WAMessageInline]


@admin.register(WAMessage)
class WAMessageAdmin(admin.ModelAdmin):
    list_display = ('conversation', 'direction', 'message_type', 'body_preview', 'status', 'timestamp')
    list_filter = ('direction', 'message_type', 'status')
    search_fields = ('body', 'conversation__wa_id', 'conversation__display_name')
    readonly_fields = ('wa_message_id', 'created_at')

    def body_preview(self, obj):
        return obj.body[:60]
    body_preview.short_description = 'Body'
