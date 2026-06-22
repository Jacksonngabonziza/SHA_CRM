
from django.urls import path
from .views import monthly_report, revenue_report, financial_summary, financial_pdf

urlpatterns = [
    path("monthly/",       monthly_report,    name="monthly_report"),
    path("revenue/",       revenue_report,    name="revenue_report"),
    path("financial/",     financial_summary, name="financial_summary"),
    path("financial/pdf/", financial_pdf,     name="financial_pdf"),
]
