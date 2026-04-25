from django.urls import path
from .views import (
    ClientListCreateView, ClientDetailView,
    ClientNoteListCreateView, update_client_status, followups_due,
    export_clients_csv,
)

urlpatterns = [
    path('', ClientListCreateView.as_view(), name='client_list'),
    path('<int:pk>/', ClientDetailView.as_view(), name='client_detail'),
    path('<int:pk>/status/', update_client_status, name='client_status'),
    path('<int:client_pk>/notes/', ClientNoteListCreateView.as_view(), name='client_notes'),
    path('followups/', followups_due, name='followups_due'),
    path('export/', export_clients_csv, name='export_clients'),
]
