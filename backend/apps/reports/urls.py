
from django.urls import path
from .views import monthly_report, revenue_report

urlpatterns = [
    path("monthly/",  monthly_report,  name="monthly_report"),
    path("revenue/",  revenue_report,  name="revenue_report"),
]
