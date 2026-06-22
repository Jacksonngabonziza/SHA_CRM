from django.urls import path
from .views import (
    ExpenseListCreateView, ExpenseDetailView,
    RecurringExpenseListCreateView, RecurringExpenseDetailView,
    mark_recurring_paid, expense_summary,
)

urlpatterns = [
    path('',                    ExpenseListCreateView.as_view(),    name='expense_list'),
    path('<int:pk>/',           ExpenseDetailView.as_view(),        name='expense_detail'),
    path('recurring/',          RecurringExpenseListCreateView.as_view(), name='recurring_list'),
    path('recurring/<int:pk>/', RecurringExpenseDetailView.as_view(),    name='recurring_detail'),
    path('recurring/<int:pk>/mark-paid/', mark_recurring_paid,      name='recurring_mark_paid'),
    path('summary/',            expense_summary,                    name='expense_summary'),
]
