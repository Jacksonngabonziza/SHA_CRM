
from django.db import models
from django.utils import timezone

class Installation(models.Model):
    STATUS_CHOICES = [
        ("scheduled",   "Scheduled"),
        ("in_progress", "In Progress"),
        ("on_hold",     "On Hold"),
        ("completed",   "Completed"),
        ("cancelled",   "Cancelled"),
    ]

    quote           = models.OneToOneField("quotes.Quote", on_delete=models.CASCADE, related_name="installation")
    client          = models.ForeignKey("clients.Client", on_delete=models.CASCADE, related_name="installations")
    assigned_team   = models.ManyToManyField("accounts.User", blank=True, related_name="installations")
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default="scheduled")
    scheduled_date  = models.DateField(null=True, blank=True)
    started_at      = models.DateTimeField(null=True, blank=True)
    completed_at    = models.DateTimeField(null=True, blank=True)
    commissioning_done = models.BooleanField(default=False)
    client_training_done = models.BooleanField(default=False)
    handover_notes  = models.TextField(blank=True)
    issues_noted    = models.TextField(blank=True)
    created_by      = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True, related_name="created_installations")
    created_at      = models.DateTimeField(auto_now_add=True)
    updated_at      = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = "installations"
        ordering = ["scheduled_date"]

    def __str__(self):
        return f"Install — {self.client.name} ({self.status})"

class InstallationLog(models.Model):
    installation = models.ForeignKey(Installation, on_delete=models.CASCADE, related_name="logs")
    note         = models.TextField()
    logged_by    = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True)
    created_at   = models.DateTimeField(default=None, null=True, blank=True)

    class Meta:
        db_table = "installation_logs"
        ordering = ["-created_at"]


class WarrantyClaim(models.Model):
    """A service request or warranty claim raised against a completed installation."""
    STATUS_CHOICES = [
        ('open',        'Open'),
        ('in_review',   'In Review'),
        ('resolved',    'Resolved'),
        ('rejected',    'Rejected'),
    ]
    PRIORITY_CHOICES = [
        ('low',    'Low'),
        ('medium', 'Medium'),
        ('high',   'High'),
    ]

    installation  = models.ForeignKey(Installation, on_delete=models.CASCADE, related_name='warranty_claims')
    title         = models.CharField(max_length=200)
    description   = models.TextField(blank=True)
    status        = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    priority      = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='medium')
    raised_by     = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, related_name='raised_claims')
    resolved_by   = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_claims')
    resolution_notes = models.TextField(blank=True)
    resolved_at   = models.DateTimeField(null=True, blank=True)
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'warranty_claims'
        ordering = ['-created_at']

    def __str__(self):
        return f'Claim — {self.installation.client.name}: {self.title}'

    def resolve(self, user, notes=''):
        self.status = 'resolved'
        self.resolved_by = user
        self.resolution_notes = notes
        self.resolved_at = timezone.now()
        self.save()
