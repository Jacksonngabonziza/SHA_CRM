
from django.db import models

class SiteSurvey(models.Model):
    ROOF_CHOICES = [('flat','Flat'),('pitched','Pitched'),('metal','Metal Sheet'),('tile','Tile'),('concrete','Concrete Slab')]
    SHADING_CHOICES = [('none','No Shading'),('partial','Partial'),('heavy','Heavy')]
    GRID_CHOICES = [('connected','Grid Connected'),('offgrid','Off-Grid'),('unstable','Unstable Grid')]
    FEASIBILITY_CHOICES = [('feasible','Feasible'),('conditional','Conditional'),('not_feasible','Not Feasible')]

    client      = models.ForeignKey('clients.Client', on_delete=models.CASCADE, related_name='surveys')
    quote       = models.ForeignKey('quotes.Quote', on_delete=models.SET_NULL, null=True, blank=True, related_name='surveys')
    surveyed_by = models.ForeignKey('accounts.User', on_delete=models.SET_NULL, null=True, related_name='surveys')

    address          = models.TextField(blank=True)
    gps_latitude     = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    gps_longitude    = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    roof_type        = models.CharField(max_length=20, choices=ROOF_CHOICES, blank=True)
    roof_area_m2     = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    roof_orientation = models.CharField(max_length=50, blank=True)
    shading_level    = models.CharField(max_length=20, choices=SHADING_CHOICES, default='none')
    shading_notes    = models.TextField(blank=True)
    grid_status      = models.CharField(max_length=20, choices=GRID_CHOICES, default='connected')
    existing_system_notes = models.TextField(blank=True)
    main_breaker_amps= models.IntegerField(null=True, blank=True)
    three_phase      = models.BooleanField(default=False)
    db_board_condition = models.CharField(max_length=100, blank=True)
    scaffolding_needed = models.BooleanField(default=False)
    installation_risks = models.TextField(blank=True)
    feasibility      = models.CharField(max_length=20, choices=FEASIBILITY_CHOICES, default='feasible')
    recommended_system_kw = models.DecimalField(max_digits=8, decimal_places=2, null=True, blank=True)
    surveyor_notes   = models.TextField(blank=True)
    photo_roof       = models.ImageField(upload_to='surveys/roof/', null=True, blank=True)
    photo_db_board   = models.ImageField(upload_to='surveys/db/', null=True, blank=True)
    photo_site       = models.ImageField(upload_to='surveys/site/', null=True, blank=True)
    surveyed_at      = models.DateTimeField(null=True, blank=True)
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'site_surveys'
        ordering = ['-created_at']

    def __str__(self):
        return f"Survey — {self.client.name} ({self.created_at.date()})"
