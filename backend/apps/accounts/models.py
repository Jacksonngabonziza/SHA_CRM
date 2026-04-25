from django.contrib.auth.models import AbstractUser
from django.db import models
from decimal import Decimal


class User(AbstractUser):
    ROLE_ADMIN = 'admin'
    ROLE_SALES = 'sales'
    ROLE_AGENT = 'field_agent'
    ROLE_CHOICES = [
        (ROLE_ADMIN, 'Admin'),
        (ROLE_SALES, 'Sales'),
        (ROLE_AGENT, 'Field Agent'),
    ]

    email = models.EmailField(unique=True, blank=True, null=True, default=None)
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default=ROLE_SALES)
    phone = models.CharField(max_length=20, blank=True)
    avatar = models.ImageField(upload_to='avatars/', null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.role})"

    @property
    def is_admin(self):
        return self.role == self.ROLE_ADMIN

    @property
    def is_field_agent(self):
        return self.role == self.ROLE_AGENT


class CommissionTier(models.Model):
    """Global tiered commission brackets — higher deal value earns a higher rate."""
    label      = models.CharField(max_length=100, blank=True, help_text='e.g. Standard, Silver, Gold')
    min_amount = models.DecimalField(max_digits=14, decimal_places=2, default=Decimal('0'))
    max_amount = models.DecimalField(max_digits=14, decimal_places=2, null=True, blank=True,
                                     help_text='Leave blank for no upper cap')
    rate       = models.DecimalField(max_digits=5, decimal_places=4,
                                     help_text='Fraction of deal value (e.g. 0.025 = 2.5%)')

    class Meta:
        db_table = 'commission_tiers'
        ordering = ['min_amount']

    def __str__(self):
        cap = f"— {self.max_amount:,.0f}" if self.max_amount else "+"
        return f"{self.label or 'Tier'}: {self.min_amount:,.0f} {cap} RWF → {float(self.rate)*100:.2f}%"

    @classmethod
    def get_rate_for(cls, deal_amount):
        """Return the applicable tier rate for a given deal amount (Decimal)."""
        from django.db.models import Q
        tier = cls.objects.filter(
            min_amount__lte=deal_amount
        ).filter(
            Q(max_amount__isnull=True) | Q(max_amount__gte=deal_amount)
        ).order_by('-min_amount').first()
        return tier.rate if tier else None


class AgentProfile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='agent_profile')
    zone = models.CharField(max_length=200, blank=True)
    target_clients_per_month = models.PositiveIntegerField(default=10)
    commission_rate = models.DecimalField(
        max_digits=5, decimal_places=4, null=True, blank=True,
        help_text='Personal override rate. Leave blank to use global commission tiers.'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'agent_profiles'

    def __str__(self):
        return f"Profile: {self.user.get_full_name() or self.user.username}"

    def effective_rate(self, deal_amount=None):
        """Return the rate that will apply: personal override > global tier > 0."""
        if self.commission_rate is not None:
            return self.commission_rate
        if deal_amount is not None:
            tier_rate = CommissionTier.get_rate_for(deal_amount)
            if tier_rate is not None:
                return tier_rate
        return Decimal('0')


class AgentCommission(models.Model):
    agent = models.ForeignKey(User, on_delete=models.CASCADE, related_name='commissions')
    quote = models.ForeignKey('quotes.Quote', on_delete=models.CASCADE, related_name='agent_commissions')
    amount_rwf = models.DecimalField(max_digits=14, decimal_places=2)
    is_paid = models.BooleanField(default=False)
    paid_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'agent_commissions'
        unique_together = ('agent', 'quote')

    def __str__(self):
        return f"Commission {self.agent.username} — {self.quote.ref_number}: {self.amount_rwf} RWF"


class CompanySettings(models.Model):
    """Singleton model — always use CompanySettings.get() to access."""

    # Company identity (used in PDFs and public pages)
    company_name    = models.CharField(max_length=200, default='SolarHope Africa')
    company_phone   = models.CharField(max_length=50,  default='+250 780 348 624')
    company_email   = models.EmailField(default='info@solarhopeafrica.com')
    company_website = models.CharField(max_length=200, default='www.solarhopeafrica.com')
    company_tagline = models.CharField(max_length=300, default='Light Up Dreams, The Solar Way')
    company_address = models.CharField(max_length=300, blank=True, default='')

    # Payment / banking details (shown in reports & receipts)
    bank_name       = models.CharField(max_length=100, blank=True, default='Bank of Kigali')
    bank_account    = models.CharField(max_length=50,  blank=True, default='100229629799')
    momo_number     = models.CharField(max_length=50,  blank=True, default='')
    momo_name       = models.CharField(max_length=100, blank=True, default='')
    payment_instructions = models.TextField(blank=True, default='')

    # Quote / proposal defaults
    system_lifespan = models.CharField(max_length=30, default='25–30 years')
    quote_terms     = models.TextField(blank=True, default='')

    # Calculation defaults
    grid_tariff_rwf_kwh    = models.DecimalField(max_digits=8,  decimal_places=2, default=Decimal('386'))
    installation_pct       = models.DecimalField(max_digits=5,  decimal_places=4, default=Decimal('0.10'))
    accessories_pct        = models.DecimalField(max_digits=5,  decimal_places=4, default=Decimal('0.08'))
    safety_margin_pct      = models.DecimalField(max_digits=5,  decimal_places=4, default=Decimal('0.20'))
    default_peak_sun_hours = models.DecimalField(max_digits=4,  decimal_places=1, default=Decimal('5.5'))
    default_backup_hours   = models.IntegerField(default=8)
    default_valid_days     = models.IntegerField(default=30)

    class Meta:
        db_table = 'company_settings'
        verbose_name = 'Company Settings'

    @classmethod
    def get(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj
