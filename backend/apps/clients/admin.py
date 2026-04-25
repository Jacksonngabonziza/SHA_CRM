from django.contrib import admin
from .models import Client, ClientNote


class ClientNoteInline(admin.TabularInline):
    model = ClientNote
    extra = 0
    readonly_fields = ['created_by', 'created_at']


@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = ['name', 'phone', 'client_type', 'status', 'assigned_to', 'followup_date', 'created_at']
    list_filter = ['status', 'client_type', 'is_offgrid']
    search_fields = ['name', 'phone', 'email', 'location']
    list_editable = ['status']
    inlines = [ClientNoteInline]
