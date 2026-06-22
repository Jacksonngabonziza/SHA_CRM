from django.urls import path
from .views import (
    QuoteListCreateView, QuoteDetailView,
    calculate_quote, quote_pdf, email_quote,
    whatsapp_share, create_quote_version,
    update_quote_status, shared_quote, submit_feedback,
    export_quotes_csv, ProductOrderListCreateView,
    ProductOrderDetailView, product_order_pdf,
    email_order, order_whatsapp, shared_order,
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
    # Product orders
    path('orders/', ProductOrderListCreateView.as_view(), name='product_order_list'),
    path('orders/<int:pk>/', ProductOrderDetailView.as_view(), name='product_order_detail'),
    path('orders/<int:pk>/pdf/', product_order_pdf, name='product_order_pdf'),
    path('orders/<int:pk>/email/', email_order, name='order_email'),
    path('orders/<int:pk>/whatsapp/', order_whatsapp, name='order_whatsapp'),
    path('orders/<int:pk>/status/', update_quote_status, name='order_status'),
    path('orders/shared/<uuid:token>/', shared_order, name='shared_order'),
]
