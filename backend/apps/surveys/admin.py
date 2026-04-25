
from django.contrib import admin
from .models import SiteSurvey

@admin.register(SiteSurvey)
class SiteSurveyAdmin(admin.ModelAdmin):
    list_display = ["client", "feasibility", "surveyed_by", "created_at"]
    list_filter  = ["feasibility", "roof_type", "grid_status"]
