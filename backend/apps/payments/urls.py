
from django.urls import path
from .views import PaymentListCreateView, PaymentDetailView, quote_payment_summary, export_payments_csv

urlpatterns = [
    path("", PaymentListCreateView.as_view(), name="payment_list"),
    path("<int:pk>/", PaymentDetailView.as_view(), name="payment_detail"),
    path("quote/<int:quote_id>/summary/", quote_payment_summary, name="payment_summary"),
    path("export/", export_payments_csv, name="export_payments"),
]
