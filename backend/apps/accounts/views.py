from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework_simplejwt.tokens import RefreshToken
from .models import User, CompanySettings, AgentProfile, AgentCommission, CommissionTier
from .serializers import (
    CustomTokenObtainPairSerializer, UserSerializer,
    UserCreateSerializer, ChangePasswordSerializer,
    CompanySettingsSerializer, AgentSerializer, AgentCreateSerializer,
    AgentCommissionSerializer, AgentLoginSerializer, CommissionTierSerializer,
)


def _log_login(user, request):
    try:
        from apps.activity.models import ActivityLog
        from apps.activity.middleware import get_client_ip
        ActivityLog.log(
            action='login',
            description=f"{user.get_full_name() or user.username} logged in ({user.role})",
            user=user,
            ip_address=get_client_ip(request),
        )
    except Exception:
        pass


def _log_logout(user, request):
    try:
        from apps.activity.models import ActivityLog
        from apps.activity.middleware import get_client_ip
        ActivityLog.log(
            action='logout',
            description=f"{user.get_full_name() or user.username} logged out",
            user=user,
            ip_address=get_client_ip(request),
        )
    except Exception:
        pass


class LoginView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        response = super().post(request, *args, **kwargs)
        if response.status_code == 200:
            try:
                from django.contrib.auth import get_user_model
                username = request.data.get('username', '')
                user = get_user_model().objects.filter(username=username).first()
                if user:
                    _log_login(user, request)
            except Exception:
                pass
        return response


class AgentLoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = AgentLoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            user_data = data.get('user', {})
            from django.contrib.auth import get_user_model
            user = get_user_model().objects.filter(pk=user_data.get('id')).first()
            if user:
                _log_login(user, request)
        except Exception:
            pass
        return Response(data)


class LogoutView(APIView):
    def post(self, request):
        _log_logout(request.user, request)
        try:
            refresh_token = request.data.get('refresh')
            token = RefreshToken(refresh_token)
            token.blacklist()
        except Exception:
            pass
        return Response({'detail': 'Logged out successfully.'}, status=status.HTTP_200_OK)


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)

    def patch(self, request):
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


class ChangePasswordView(APIView):
    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        return Response({'detail': 'Password changed successfully.'})


class UserListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.exclude(role='field_agent')
    serializer_class = UserSerializer

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return UserCreateSerializer
        return UserSerializer


class UserDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer


class CompanySettingsView(APIView):
    def get(self, request):
        return Response(CompanySettingsSerializer(CompanySettings.get()).data)

    def patch(self, request):
        if request.user.role != 'admin':
            return Response({'detail': 'Admin only.'}, status=status.HTTP_403_FORBIDDEN)
        serializer = CompanySettingsSerializer(
            CompanySettings.get(), data=request.data, partial=True
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data)


# ── Agent management (admin only) ─────────────────────────────────────────────

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class AgentListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.filter(role='field_agent').select_related('agent_profile')

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return AgentCreateSerializer
        return AgentSerializer

    def get_permissions(self):
        return [IsAdmin()]


class AgentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = User.objects.filter(role='field_agent').select_related('agent_profile')
    permission_classes = [IsAdmin]

    def get_serializer_class(self):
        return AgentSerializer

    def patch(self, request, *args, **kwargs):
        agent = self.get_object()
        # Handle profile fields separately
        profile_fields = {k: v for k, v in request.data.items() if k in ('zone', 'target_clients_per_month', 'commission_rate')}
        user_fields = {k: v for k, v in request.data.items() if k not in profile_fields}

        if user_fields:
            user_ser = UserSerializer(agent, data=user_fields, partial=True)
            user_ser.is_valid(raise_exception=True)
            user_ser.save()
        if profile_fields:
            profile, _ = AgentProfile.objects.get_or_create(user=agent)
            for field, value in profile_fields.items():
                setattr(profile, field, value)
            profile.save()

        return Response(AgentSerializer(agent).data)


class AgentResetPinView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        try:
            agent = User.objects.get(pk=pk, role='field_agent')
        except User.DoesNotExist:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        pin = request.data.get('pin', '')
        if len(str(pin)) < 4:
            return Response({'detail': 'PIN must be at least 4 digits.'}, status=status.HTTP_400_BAD_REQUEST)
        agent.set_password(str(pin))
        agent.save()
        return Response({'detail': 'PIN updated.'})


class AgentCommissionListView(generics.ListAPIView):
    serializer_class = AgentCommissionSerializer
    permission_classes = [IsAdmin]

    def get_queryset(self):
        agent_id = self.kwargs['pk']
        return AgentCommission.objects.filter(agent_id=agent_id).select_related('quote').order_by('-created_at')


class AgentCommissionMarkPaidView(APIView):
    permission_classes = [IsAdmin]

    def post(self, request, pk):
        from django.utils import timezone
        commission = AgentCommission.objects.filter(pk=pk).first()
        if not commission:
            return Response({'detail': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)
        commission.is_paid = True
        commission.paid_at = timezone.now()
        commission.notes = request.data.get('notes', commission.notes)
        commission.save()
        return Response(AgentCommissionSerializer(commission).data)


# ── Agent self-service endpoints ──────────────────────────────────────────────

class IsAgent(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'field_agent'


class AgentMeView(APIView):
    permission_classes = [IsAgent]

    def get(self, request):
        from django.db.models import Sum, Count
        from apps.clients.models import Client
        agent = request.user
        now = __import__('django.utils.timezone', fromlist=['now']).now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        clients_this_month = agent.sourced_clients.filter(created_at__gte=month_start).count()
        total_clients = agent.sourced_clients.count()
        clients_won = agent.sourced_clients.filter(status='won').count()
        total_commission = agent.commissions.aggregate(s=Sum('amount_rwf'))['s'] or 0
        pending_commission = agent.commissions.filter(is_paid=False).aggregate(s=Sum('amount_rwf'))['s'] or 0

        profile = getattr(agent, 'agent_profile', None)
        uses_tiers = (profile is None) or (profile.commission_rate is None)
        commission_rate = None
        if profile and profile.commission_rate is not None:
            commission_rate = float(profile.commission_rate)

        tiers = []
        if uses_tiers:
            from .models import CommissionTier
            from .serializers import CommissionTierSerializer
            tiers = CommissionTierSerializer(CommissionTier.objects.order_by('min_amount'), many=True).data

        return Response({
            'id': agent.id,
            'full_name': agent.get_full_name() or agent.username,
            'phone': agent.phone,
            'zone': profile.zone if profile else '',
            'target_clients_per_month': profile.target_clients_per_month if profile else 10,
            'commission_rate': commission_rate,
            'uses_tiers': uses_tiers,
            'tiers': tiers,
            'clients_this_month': clients_this_month,
            'total_clients': total_clients,
            'clients_won': clients_won,
            'total_commission_rwf': float(total_commission),
            'pending_commission_rwf': float(pending_commission),
        })


class AgentMyClientsView(generics.ListAPIView):
    permission_classes = [IsAgent]

    def get_queryset(self):
        from apps.clients.models import Client
        return Client.objects.filter(source_agent=self.request.user).order_by('-created_at')

    def get_serializer_class(self):
        from apps.clients.serializers import ClientListSerializer
        return ClientListSerializer


class AgentMyCommissionsView(generics.ListAPIView):
    serializer_class = AgentCommissionSerializer
    permission_classes = [IsAgent]

    def get_queryset(self):
        return AgentCommission.objects.filter(agent=self.request.user).select_related('quote').order_by('-created_at')


# ── Commission Tiers (admin only) ─────────────────────────────────────────────

class CommissionTierListCreateView(generics.ListCreateAPIView):
    serializer_class = CommissionTierSerializer
    permission_classes = [IsAdmin]
    queryset = CommissionTier.objects.all()


class CommissionTierDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CommissionTierSerializer
    permission_classes = [IsAdmin]
    queryset = CommissionTier.objects.all()
