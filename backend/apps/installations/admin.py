
from django.contrib import admin
from .models import Installation, InstallationLog

class LogInline(admin.TabularInline):
    model = InstallationLog; extra = 0

@admin.register(Installation)
class InstallationAdmin(admin.ModelAdmin):
    list_display = ["client","status","scheduled_date","completed_at"]
    list_filter  = ["status"]
    inlines      = [LogInline]
