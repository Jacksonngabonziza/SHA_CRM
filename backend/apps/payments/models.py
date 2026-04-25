
from django.db import models

class Payment(models.Model):
    TYPE_DEPOSIT  = "deposit"
    TYPE_PARTIAL  = "partial"
    TYPE_FINAL    = "final"
    TYPE_FULL     = "full"
    TYPE_CHOICES  = [("deposit","Deposit"),("partial","Partial Payment"),("final","Final Payment"),("full","Full Payment")]

    METHOD_CASH   = "cash"
    METHOD_MOMO   = "momo"
    METHOD_BANK   = "bank"
    METHOD_CHEQUE = "cheque"
    METHOD_CHOICES= [("cash","Cash"),("momo","Mobile Money"),("bank","Bank Transfer"),("cheque","Cheque")]

    STATUS_PENDING   = "pending"
    STATUS_CONFIRMED = "confirmed"
    STATUS_FAILED    = "failed"
    STATUS_CHOICES   = [("pending","Pending"),("confirmed","Confirmed"),("failed","Failed")]

    quote           = models.ForeignKey("quotes.Quote", on_delete=models.CASCADE, related_name="payments")
    client          = models.ForeignKey("clients.Client", on_delete=models.CASCADE, related_name="payments")
    amount_rwf      = models.DecimalField(max_digits=14, decimal_places=2)
    payment_type    = models.CharField(max_length=20, choices=TYPE_CHOICES)
    payment_method  = models.CharField(max_length=20, choices=METHOD_CHOICES, default="momo")
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    reference       = models.CharField(max_length=100, blank=True, help_text="Transaction ref / MoMo code")
    payment_date    = models.DateField()
    notes           = models.TextField(blank=True)
    recorded_by     = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="payments")
    created_at      = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "payments"
        ordering = ["-payment_date"]

    def __str__(self):
        return f"{self.get_payment_type_display()} — {self.client.name} — RWF {self.amount_rwf:,.0f}"

    @property
    def is_confirmed(self):
        return self.status == self.STATUS_CONFIRMED
