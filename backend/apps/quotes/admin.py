from django.contrib import admin
from .models import Quote, Appliance, ClientFeedback


class ApplianceInline(admin.TabularInline):
    model = Appliance
    extra = 0


class FeedbackInline(admin.TabularInline):
    model = ClientFeedback
    extra = 0
    readonly_fields = ['created_at']


@admin.register(Quote)
class QuoteAdmin(admin.ModelAdmin):
    list_display = [
        'ref_number', 'client', 'system_size_kwp',
        'total_price_rwf', 'status', 'created_by', 'created_at'
    ]
    list_filter = ['status', 'created_by']
    search_fields = ['ref_number', 'client__name', 'client__phone']
    readonly_fields = ['ref_number', 'share_token', 'created_at', 'updated_at']
    inlines = [ApplianceInline, FeedbackInline]
