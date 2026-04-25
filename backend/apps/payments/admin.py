
from django.contrib import admin
from .models import Payment

@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ["client","payment_type","amount_rwf","status","payment_date"]
    list_filter  = ["status","payment_type","payment_method"]
