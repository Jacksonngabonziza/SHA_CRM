from django.urls import path
from .views import ActivityLogListView, ActivitySummaryView

urlpatterns = [
    path('', ActivityLogListView.as_view(), name='activity_log'),
    path('summary/', ActivitySummaryView.as_view(), name='activity_summary'),
]
