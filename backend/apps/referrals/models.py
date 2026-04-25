
from django.db import models

class Referral(models.Model):
    STATUS_CHOICES = [("pending","Pending"),("converted","Converted"),("lost","Lost")]

    referrer     = models.ForeignKey("clients.Client", on_delete=models.CASCADE, related_name="referrals_made")
    referred     = models.ForeignKey("clients.Client", on_delete=models.CASCADE, related_name="referred_by")
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    notes        = models.TextField(blank=True)
    reward_given = models.BooleanField(default=False)
    reward_notes = models.TextField(blank=True)
    created_by   = models.ForeignKey("accounts.User", on_delete=models.SET_NULL, null=True)
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = "referrals"
        unique_together = [("referrer","referred")]
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.referrer.name} referred {self.referred.name}"
