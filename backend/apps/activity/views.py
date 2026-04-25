from rest_framework import generics, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from .models import ActivityLog
from .serializers import ActivityLogSerializer


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class ActivityLogListView(generics.ListAPIView):
    serializer_class = ActivityLogSerializer
    permission_classes = [IsAdmin]
    filter_backends = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields = ['action', 'resource_type', 'user']
    search_fields = ['description', 'user_name', 'resource_label']
    ordering_fields = ['created_at']
    ordering = ['-created_at']

    def get_queryset(self):
        qs = ActivityLog.objects.select_related('user').all()
        user_id = self.request.query_params.get('user_id')
        if user_id:
            qs = qs.filter(user_id=user_id)
        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)
        return qs


class ActivitySummaryView(APIView):
    permission_classes = [IsAdmin]

    def get(self, request):
        from django.db.models import Count
        from apps.accounts.models import User

        total = ActivityLog.objects.count()
        today_count = ActivityLog.objects.filter(
            created_at__date=__import__('django.utils.timezone', fromlist=['now']).now().date()
        ).count()

        by_action = list(
            ActivityLog.objects.values('action')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        by_resource = list(
            ActivityLog.objects.exclude(resource_type='')
            .values('resource_type')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        top_users = list(
            ActivityLog.objects.exclude(user=None)
            .values('user_id', 'user_name', 'user_role')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )
        return Response({
            'total': total,
            'today': today_count,
            'by_action': by_action,
            'by_resource': by_resource,
            'top_users': top_users,
        })
