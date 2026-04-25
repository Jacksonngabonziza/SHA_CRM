from django.urls import path
from .views import (
    QuoteListCreateView, QuoteDetailView,
    calculate_quote, quote_pdf, email_quote,
    whatsapp_share, create_quote_version,
    update_quote_status, shared_quote, submit_feedback,
    export_quotes_csv,
)

urlpatterns = [
    path('', QuoteListCreateView.as_view(), name='quote_list'),
    path('<int:pk>/', QuoteDetailView.as_view(), name='quote_detail'),
    path('<int:pk>/pdf/', quote_pdf, name='quote_pdf'),
    path('<int:pk>/email/', email_quote, name='email_quote'),
    path('<int:pk>/whatsapp/', whatsapp_share, name='whatsapp_share'),
    path('<int:pk>/version/', create_quote_version, name='quote_version'),
    path('<int:pk>/status/', update_quote_status, name='quote_status'),
    path('calculate/', calculate_quote, name='calculate_quote'),
    path('shared/<uuid:token>/', shared_quote, name='shared_quote'),
    path('shared/<uuid:token>/feedback/', submit_feedback, name='submit_feedback'),
    path('export/', export_quotes_csv, name='export_quotes'),
]
