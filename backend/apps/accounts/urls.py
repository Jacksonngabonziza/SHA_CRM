from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    LoginView, AgentLoginView, LogoutView, MeView,
    ChangePasswordView, UserListCreateView, UserDetailView,
    CompanySettingsView,
    AgentListCreateView, AgentDetailView, AgentResetPinView,
    AgentCommissionListView, AgentCommissionMarkPaidView,
    AgentMeView, AgentMyClientsView, AgentMyCommissionsView,
    CommissionTierListCreateView, CommissionTierDetailView,
)

urlpatterns = [
    # Auth
    path('login/', LoginView.as_view(), name='login'),
    path('agent-login/', AgentLoginView.as_view(), name='agent_login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', MeView.as_view(), name='me'),
    path('change-password/', ChangePasswordView.as_view(), name='change_password'),

    # Staff users
    path('users/', UserListCreateView.as_view(), name='user_list'),
    path('users/<int:pk>/', UserDetailView.as_view(), name='user_detail'),

    # Company
    path('company-settings/', CompanySettingsView.as_view(), name='company_settings'),

    # Agent management (admin)
    path('agents/', AgentListCreateView.as_view(), name='agent_list'),
    path('agents/<int:pk>/', AgentDetailView.as_view(), name='agent_detail'),
    path('agents/<int:pk>/reset-pin/', AgentResetPinView.as_view(), name='agent_reset_pin'),
    path('agents/<int:pk>/commissions/', AgentCommissionListView.as_view(), name='agent_commissions'),
    path('commissions/<int:pk>/mark-paid/', AgentCommissionMarkPaidView.as_view(), name='commission_mark_paid'),

    # Commission tiers (admin)
    path('commission-tiers/', CommissionTierListCreateView.as_view(), name='commission_tier_list'),
    path('commission-tiers/<int:pk>/', CommissionTierDetailView.as_view(), name='commission_tier_detail'),

    # Agent self-service
    path('agent/me/', AgentMeView.as_view(), name='agent_me'),
    path('agent/clients/', AgentMyClientsView.as_view(), name='agent_clients'),
    path('agent/commissions/', AgentMyCommissionsView.as_view(), name='agent_my_commissions'),
]
