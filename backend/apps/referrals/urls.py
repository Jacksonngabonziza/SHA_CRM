
from django.urls import path
from .views import ReferralListCreateView, ReferralDetailView

urlpatterns = [
    path("", ReferralListCreateView.as_view(), name="referral_list"),
    path("<int:pk>/", ReferralDetailView.as_view(), name="referral_detail"),
]
