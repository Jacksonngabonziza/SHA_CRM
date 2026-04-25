
from django.urls import path
from .views import (
    InstallationListCreateView, InstallationDetailView,
    add_installation_log, installation_log_detail, update_installation_status,
    installation_report,
    WarrantyClaimListCreateView, WarrantyClaimDetailView,
    resolve_warranty_claim,
)

urlpatterns = [
    path("", InstallationListCreateView.as_view(), name="installation_list"),
    path("<int:pk>/", InstallationDetailView.as_view(), name="installation_detail"),
    path("<int:pk>/logs/", add_installation_log, name="installation_log"),
    path("<int:pk>/logs/<int:log_pk>/", installation_log_detail, name="installation_log_detail"),
    path("<int:pk>/status/", update_installation_status, name="installation_status"),
    path("<int:pk>/report/", installation_report, name="installation_report"),
    path("warranty/", WarrantyClaimListCreateView.as_view(), name="warranty_list"),
    path("warranty/<int:pk>/", WarrantyClaimDetailView.as_view(), name="warranty_detail"),
    path("warranty/<int:pk>/resolve/", resolve_warranty_claim, name="warranty_resolve"),
]
