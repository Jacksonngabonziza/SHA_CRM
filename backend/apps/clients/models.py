from django.db import models


class Client(models.Model):
    STATUS_NEW = 'new'
    STATUS_QUOTED = 'quoted'
    STATUS_FOLLOWUP = 'followup'
    STATUS_WON = 'won'
    STATUS_LOST = 'lost'
    STATUS_CHOICES = [
        (STATUS_NEW, 'New'),
        (STATUS_QUOTED, 'Quoted'),
        (STATUS_FOLLOWUP, 'Follow Up'),
        (STATUS_WON, 'Won'),
        (STATUS_LOST, 'Lost'),
    ]

    TYPE_RESIDENTIAL = 'residential'
    TYPE_SCHOOL = 'school'
    TYPE_CLINIC = 'clinic'
    TYPE_BUSINESS = 'business'
    TYPE_COMMUNITY = 'community'
    TYPE_CHOICES = [
        (TYPE_RESIDENTIAL, 'Residential'),
        (TYPE_SCHOOL, 'School / Institution'),
        (TYPE_CLINIC, 'Clinic / Health Facility'),
        (TYPE_BUSINESS, 'Business / Hotel'),
        (TYPE_COMMUNITY, 'Community / Mini-grid'),
    ]

    # Basic info
    name = models.CharField(max_length=200)
    phone = models.CharField(max_length=20)
    email = models.EmailField(blank=True)
    location = models.CharField(max_length=200, blank=True)
    address = models.TextField(blank=True)
    client_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_RESIDENTIAL)

    # Energy context
    is_offgrid = models.BooleanField(default=False, help_text='True if no grid connection')
    monthly_bill_rwf = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True,
        help_text='Last monthly electricity bill in RWF'
    )
    monthly_kwh = models.DecimalField(
        max_digits=10, decimal_places=2, null=True, blank=True,
        help_text='Monthly kWh consumption'
    )

    # CRM
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_NEW)
    source = models.CharField(
        max_length=100, blank=True,
        help_text='How did client hear about us (referral, social media, etc.)'
    )
    notes = models.TextField(blank=True)
    followup_date = models.DateField(null=True, blank=True)

    # Meta
    assigned_to = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='clients'
    )
    source_agent = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='sourced_clients',
        help_text='Field agent who found this client'
    )
    created_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='created_clients'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'clients'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.phone})"

    @property
    def total_quotes(self):
        return self.quotes.count()

    @property
    def latest_quote(self):
        return self.quotes.order_by('-created_at').first()


class ClientNote(models.Model):
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='client_notes')
    note = models.TextField()
    created_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL,
        null=True, related_name='client_notes'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'client_notes'
        ordering = ['-created_at']

    def __str__(self):
        return f"Note for {self.client.name} — {self.created_at.date()}"
