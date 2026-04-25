
from django.contrib import admin
from .models import Referral

@admin.register(Referral)
class ReferralAdmin(admin.ModelAdmin):
    list_display = ["referrer","referred","status","reward_given","created_at"]
    list_filter  = ["status","reward_given"]
