from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, CompanySettings, AgentProfile, AgentCommission, CommissionTier


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['username'] = user.username
        token['email'] = user.email
        token['role'] = user.role
        token['full_name'] = user.get_full_name()
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        data['user'] = UserSerializer(self.user).data
        return data


class UserSerializer(serializers.ModelSerializer):
    full_name = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'full_name', 'role', 'phone', 'avatar', 'is_active',
            'created_at',
        ]
        read_only_fields = ['id', 'created_at']

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    password_confirm = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            'username', 'email', 'first_name', 'last_name',
            'password', 'password_confirm', 'role', 'phone',
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({'password': 'Passwords do not match.'})
        return attrs

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class CommissionTierSerializer(serializers.ModelSerializer):
    rate_pct = serializers.SerializerMethodField()

    class Meta:
        model = CommissionTier
        fields = ['id', 'label', 'min_amount', 'max_amount', 'rate', 'rate_pct']

    def get_rate_pct(self, obj):
        return round(float(obj.rate) * 100, 2)


class CompanySettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompanySettings
        fields = [
            'company_name', 'company_phone', 'company_email',
            'company_website', 'company_tagline', 'company_address',
            'bank_name', 'bank_account', 'momo_number', 'momo_name',
            'payment_instructions',
            'system_lifespan', 'quote_terms',
            'grid_tariff_rwf_kwh', 'installation_pct', 'accessories_pct',
            'safety_margin_pct', 'default_peak_sun_hours',
            'default_backup_hours', 'default_valid_days',
        ]


class AgentProfileSerializer(serializers.ModelSerializer):
    uses_tiers = serializers.SerializerMethodField()

    class Meta:
        model = AgentProfile
        fields = ['zone', 'target_clients_per_month', 'commission_rate', 'uses_tiers']

    def get_uses_tiers(self, obj):
        return obj.commission_rate is None


class AgentCommissionSerializer(serializers.ModelSerializer):
    quote_ref   = serializers.CharField(source='quote.ref_number', read_only=True)
    client_name = serializers.SerializerMethodField()
    quote_total = serializers.DecimalField(source='quote.total_price_rwf', max_digits=14, decimal_places=2, read_only=True)

    class Meta:
        model = AgentCommission
        fields = ['id', 'quote', 'quote_ref', 'client_name', 'quote_total', 'amount_rwf', 'is_paid', 'paid_at', 'notes', 'created_at']
        read_only_fields = ['id', 'amount_rwf', 'created_at']

    def get_client_name(self, obj):
        try:
            return obj.quote.client.name
        except Exception:
            return ''


class AgentSerializer(serializers.ModelSerializer):
    full_name              = serializers.SerializerMethodField()
    agent_profile          = AgentProfileSerializer(read_only=True)
    total_clients          = serializers.SerializerMethodField()
    clients_this_month     = serializers.SerializerMethodField()
    clients_won            = serializers.SerializerMethodField()
    total_quotes           = serializers.SerializerMethodField()
    total_commission_rwf   = serializers.SerializerMethodField()
    pending_commission_rwf = serializers.SerializerMethodField()
    last_login_at          = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'username', 'first_name', 'last_name', 'full_name',
            'phone', 'is_active', 'created_at',
            'agent_profile',
            'total_clients', 'clients_this_month', 'clients_won',
            'total_quotes',
            'total_commission_rwf', 'pending_commission_rwf',
            'last_login_at',
        ]

    def get_full_name(self, obj):
        return obj.get_full_name() or obj.username

    def get_total_clients(self, obj):
        return obj.sourced_clients.count()

    def get_clients_this_month(self, obj):
        from django.utils import timezone
        now = timezone.now()
        start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        return obj.sourced_clients.filter(created_at__gte=start).count()

    def get_clients_won(self, obj):
        return obj.sourced_clients.filter(status='won').count()

    def get_total_quotes(self, obj):
        try:
            from apps.quotes.models import Quote
            return Quote.objects.filter(client__source_agent=obj).count()
        except Exception:
            return 0

    def get_total_commission_rwf(self, obj):
        from django.db.models import Sum
        total = obj.commissions.aggregate(s=Sum('amount_rwf'))['s']
        return float(total or 0)

    def get_pending_commission_rwf(self, obj):
        from django.db.models import Sum
        total = obj.commissions.filter(is_paid=False).aggregate(s=Sum('amount_rwf'))['s']
        return float(total or 0)

    def get_last_login_at(self, obj):
        try:
            from apps.activity.models import ActivityLog
            log = ActivityLog.objects.filter(user=obj, action='login').order_by('-created_at').first()
            return log.created_at.isoformat() if log else None
        except Exception:
            return None


class AgentCreateSerializer(serializers.ModelSerializer):
    pin = serializers.CharField(write_only=True, min_length=4, max_length=6)
    zone = serializers.CharField(required=False, allow_blank=True, default='')
    target_clients_per_month = serializers.IntegerField(required=False, default=10)
    commission_rate = serializers.DecimalField(required=False, max_digits=5, decimal_places=4, allow_null=True, default=None)

    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone', 'pin', 'zone', 'target_clients_per_month', 'commission_rate']

    def validate_phone(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('An agent with this phone number already exists.')
        return value

    def create(self, validated_data):
        pin = validated_data.pop('pin')
        zone = validated_data.pop('zone', '')
        target = validated_data.pop('target_clients_per_month', 10)
        rate = validated_data.pop('commission_rate', None)
        phone = validated_data['phone']
        # Use constructor + set_password to avoid Django's normalize_email()
        # converting None → '' which breaks the unique constraint for multiple agents.
        user = User(username=phone, email=None, role=User.ROLE_AGENT, **validated_data)
        user.set_password(pin)
        user.save()
        AgentProfile.objects.create(user=user, zone=zone, target_clients_per_month=target, commission_rate=rate)
        return user


class AgentLoginSerializer(TokenObtainPairSerializer):
    """Accepts phone + PIN. Phone is stored as username."""
    username_field = 'phone'

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields['phone'] = serializers.CharField()
        self.fields['pin'] = serializers.CharField()
        self.fields.pop('password', None)

    def validate(self, attrs):
        import re
        phone = re.sub(r'\D', '', attrs.get('phone', ''))
        pin = re.sub(r'\D', '', str(attrs.get('pin', '')))
        from django.contrib.auth import authenticate
        user = authenticate(request=self.context.get('request'), username=phone, password=pin)
        if not user:
            raise serializers.ValidationError('Invalid phone number or PIN.')
        if not user.is_active:
            raise serializers.ValidationError('This account is disabled.')
        if user.role != User.ROLE_AGENT:
            raise serializers.ValidationError('This login is for field agents only.')
        refresh = self.get_token(user)
        return {
            'access': str(refresh.access_token),
            'refresh': str(refresh),
            'user': UserSerializer(user).data,
        }

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['full_name'] = user.get_full_name()
        return token


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Old password is incorrect.')
        return value
