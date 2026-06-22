from django.db import models


class Supplier(models.Model):
    name         = models.CharField(max_length=200)
    contact_name = models.CharField(max_length=200, blank=True)
    phone        = models.CharField(max_length=20, blank=True)
    email        = models.EmailField(blank=True)
    address      = models.TextField(blank=True)
    notes        = models.TextField(blank=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'suppliers'
        ordering = ['name']

    def __str__(self):
        return self.name


class PurchaseOrder(models.Model):
    STATUS_DRAFT     = 'draft'
    STATUS_ORDERED   = 'ordered'
    STATUS_RECEIVED  = 'received'
    STATUS_CANCELLED = 'cancelled'
    STATUS_CHOICES = [
        ('draft',     'Draft'),
        ('ordered',   'Ordered'),
        ('received',  'Received'),
        ('cancelled', 'Cancelled'),
    ]

    supplier       = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='purchase_orders')
    ref_number     = models.CharField(max_length=50, blank=True, help_text="Supplier's reference number")
    status         = models.CharField(max_length=20, choices=STATUS_CHOICES, default='draft')
    order_date     = models.DateField()
    received_date  = models.DateField(null=True, blank=True)
    total_cost_rwf = models.DecimalField(max_digits=14, decimal_places=2, default=0)
    notes          = models.TextField(blank=True)
    created_by     = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL,
        null=True, related_name='purchase_orders',
    )
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'purchase_orders'
        ordering = ['-order_date', '-created_at']

    def __str__(self):
        return f"PO/{self.id} — {self.supplier.name} ({self.status})"

    def recalculate_total(self):
        from django.db.models import Sum
        total = self.items.aggregate(t=Sum('line_total'))['t'] or 0
        self.total_cost_rwf = total
        self.save(update_fields=['total_cost_rwf'])

    def mark_received(self, received_date=None):
        from django.utils import timezone
        from django.db.models import F
        self.status = self.STATUS_RECEIVED
        self.received_date = received_date or timezone.now().date()
        self.save(update_fields=['status', 'received_date'])
        # Increase product stock for each item
        for item in self.items.select_related('product').all():
            item.product.__class__.objects.filter(pk=item.product_id).update(
                stock_quantity=F('stock_quantity') + item.quantity
            )


class PurchaseOrderItem(models.Model):
    purchase_order = models.ForeignKey(PurchaseOrder, on_delete=models.CASCADE, related_name='items')
    product        = models.ForeignKey('products.Product', on_delete=models.PROTECT)
    quantity       = models.PositiveIntegerField(default=1)
    unit_cost_rwf  = models.DecimalField(max_digits=12, decimal_places=2)
    line_total     = models.DecimalField(max_digits=14, decimal_places=2, default=0)

    class Meta:
        db_table = 'purchase_order_items'

    def save(self, *args, **kwargs):
        self.line_total = self.quantity * self.unit_cost_rwf
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.product} × {self.quantity}"
