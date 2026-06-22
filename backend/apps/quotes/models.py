from django.db import models
from django.utils import timezone
import uuid


def generate_ref():
    now = timezone.now()
    uid = str(uuid.uuid4())[:4].upper()
    return f"SHA-{now.strftime('%Y%m%d')}-{uid}"


class Appliance(models.Model):
    quote         = models.ForeignKey('Quote', on_delete=models.CASCADE, related_name='appliances')
    name          = models.CharField(max_length=100)
    quantity      = models.IntegerField(default=1)
    wattage       = models.DecimalField(max_digits=8, decimal_places=2)
    hours_per_day = models.DecimalField(max_digits=5, decimal_places=2)

    class Meta:
        db_table = 'appliances'

    @property
    def daily_kwh(self):
        return float(self.quantity) * float(self.wattage) * float(self.hours_per_day) / 1000


class Quote(models.Model):
    STATUS_DRAFT='draft'; STATUS_SENT='sent'; STATUS_APPROVED='approved'
    STATUS_REJECTED='rejected'; STATUS_EXPIRED='expired'
    STATUS_CHOICES=[('draft','Draft'),('sent','Sent to Client'),('approved','Approved'),('rejected','Rejected'),('expired','Expired')]

    TYPE_INSTALLATION = 'installation'
    TYPE_PRODUCT_ORDER = 'product_order'
    TYPE_CHOICES = [('installation', 'Installation Quote'), ('product_order', 'Product Order')]

    ref_number   = models.CharField(max_length=30, unique=True, default=generate_ref)
    quote_type   = models.CharField(max_length=20, choices=TYPE_CHOICES, default='installation')
    client       = models.ForeignKey('clients.Client', on_delete=models.PROTECT, related_name='quotes')
    created_by   = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, related_name='quotes')
    parent_quote = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='versions')

    total_daily_kwh   = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    design_daily_kwh  = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    system_size_kwp   = models.DecimalField(max_digits=8,  decimal_places=2, default=0)
    max_load_kw       = models.DecimalField(max_digits=8,  decimal_places=2, default=0)
    num_panels        = models.IntegerField(default=0)
    num_inverters     = models.IntegerField(default=1)
    num_batteries     = models.IntegerField(default=1)
    backup_hours      = models.DecimalField(max_digits=5,  decimal_places=1, default=8)
    peak_sun_hours    = models.DecimalField(max_digits=4,  decimal_places=1, default=5.5)

    panel     = models.ForeignKey('products.Product', on_delete=models.PROTECT, null=True, blank=True, related_name='panel_quotes')
    battery   = models.ForeignKey('products.Product', on_delete=models.PROTECT, null=True, blank=True, related_name='battery_quotes')
    inverter  = models.ForeignKey('products.Product', on_delete=models.PROTECT, null=True, blank=True, related_name='inverter_quotes')
    generator = models.ForeignKey('products.Product', on_delete=models.PROTECT, null=True, blank=True, related_name='generator_quotes')
    is_all_in_one_mode = models.BooleanField(default=False)

    panels_cost       = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    battery_cost      = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    inverter_cost     = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    generator_cost    = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    accessories_cost  = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    installation_cost = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_price_rwf   = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    grid_tariff_rwf_kwh = models.DecimalField(max_digits=8,  decimal_places=2, default=89)
    annual_savings_rwf  = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    payback_years       = models.DecimalField(max_digits=5,  decimal_places=1, default=0)

    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    valid_days     = models.IntegerField(default=30)
    valid_until    = models.DateField(null=True, blank=True)
    notes          = models.TextField(blank=True)
    internal_notes = models.TextField(blank=True)
    share_token    = models.UUIDField(default=uuid.uuid4, unique=True)
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'quotes'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.ref_number} — {self.client.name}"

    def save(self, *args, **kwargs):
        if not self.valid_until and self.valid_days:
            from datetime import timedelta
            self.valid_until = timezone.now().date() + timedelta(days=self.valid_days)
        super().save(*args, **kwargs)


class QuoteLineItem(models.Model):
    quote       = models.ForeignKey(Quote, on_delete=models.CASCADE, related_name='line_items')
    product     = models.ForeignKey('products.Product', on_delete=models.PROTECT, null=True, blank=True)
    description = models.CharField(max_length=255)
    quantity    = models.IntegerField(default=1)
    unit_price  = models.DecimalField(max_digits=12, decimal_places=2)
    total       = models.DecimalField(max_digits=14, decimal_places=2)

    class Meta:
        db_table = 'quote_line_items'

    def save(self, *args, **kwargs):
        self.total = self.unit_price * self.quantity
        super().save(*args, **kwargs)


class ClientFeedback(models.Model):
    STATUS_PENDING='pending'; STATUS_APPROVED='approved'; STATUS_REJECTED='rejected'
    STATUS_CHOICES=[('pending','Pending'),('approved','Approved'),('rejected','Rejected')]
    quote       = models.ForeignKey(Quote, on_delete=models.CASCADE, related_name='feedback')
    message     = models.TextField()
    status      = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    client_name = models.CharField(max_length=200, blank=True)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'client_feedback'
        ordering = ['-created_at']
