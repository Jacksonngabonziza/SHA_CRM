from django.db import models


class Product(models.Model):
    CATEGORY_PANEL     = 'panel'
    CATEGORY_BATTERY   = 'battery'
    CATEGORY_INVERTER  = 'inverter'
    CATEGORY_GENERATOR = 'generator'
    CATEGORY_ACCESSORY = 'accessory'
    CATEGORY_CHOICES = [
        (CATEGORY_PANEL,     'Solar Panel'),
        (CATEGORY_BATTERY,   'Battery'),
        (CATEGORY_INVERTER,  'Inverter'),
        (CATEGORY_GENERATOR, 'All-in-One Generator'),
        (CATEGORY_ACCESSORY, 'Accessory / BOS'),
    ]
    PHASE_CHOICES = [('single', 'Single Phase'), ('three', 'Three Phase')]

    name        = models.CharField(max_length=200)
    category    = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    brand       = models.CharField(max_length=100)
    model       = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    image       = models.ImageField(upload_to='products/', null=True, blank=True)

    price_rwf = models.DecimalField(max_digits=12, decimal_places=2)
    price_usd = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    # Panel
    wattage_wp       = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    panel_efficiency = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    panel_dimensions = models.CharField(max_length=50, blank=True)

    # Battery
    capacity_kwh   = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    voltage_v      = models.DecimalField(max_digits=6, decimal_places=1, null=True, blank=True)
    battery_cycles = models.IntegerField(null=True, blank=True)

    # Inverter
    power_kw      = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    inverter_type = models.CharField(max_length=50, blank=True)
    phase         = models.CharField(max_length=10, choices=PHASE_CHOICES, blank=True)

    # All-in-One Generator specific
    is_all_in_one       = models.BooleanField(default=False, help_text='Battery + inverter combined unit')
    max_pv_input_w      = models.IntegerField(null=True, blank=True, help_text='Max total PV input in Watts')
    min_panel_wp        = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text='Min panel size (Wp)')
    max_panel_wp        = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text='Max panel size per unit (Wp)')
    builtin_inverter_kw = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text='Built-in inverter power (kW)')
    builtin_capacity_kwh = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True, help_text='Built-in battery capacity (kWh)')

    # Warranty
    warranty_years        = models.IntegerField(default=5)
    linear_warranty_years = models.IntegerField(null=True, blank=True)

    # Stock
    in_stock       = models.BooleanField(default=True)
    stock_quantity = models.IntegerField(default=0)
    is_active      = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='products')

    class Meta:
        db_table = 'products'
        ordering = ['category', 'name']

    def __str__(self):
        return f"{self.brand} {self.model} ({self.get_category_display()})"

    @property
    def display_spec(self):
        if self.category == self.CATEGORY_PANEL:
            return f"{self.wattage_wp}Wp"
        elif self.category == self.CATEGORY_BATTERY:
            return f"{self.capacity_kwh}kWh"
        elif self.category == self.CATEGORY_INVERTER:
            return f"{self.power_kw}kW"
        elif self.category == self.CATEGORY_GENERATOR:
            parts = []
            if self.builtin_capacity_kwh: parts.append(f"{self.builtin_capacity_kwh}kWh")
            if self.builtin_inverter_kw:  parts.append(f"{self.builtin_inverter_kw}kW")
            if self.max_pv_input_w:       parts.append(f"max {self.max_pv_input_w}W PV")
            return ' / '.join(parts)
        return ""

    @property
    def is_low_stock(self):
        from django.conf import settings
        return self.in_stock and self.stock_quantity <= getattr(settings, 'LOW_STOCK_THRESHOLD', 2)
