from django.db import models


CATEGORY_CHOICES = [
    ('rent',        'Rent'),
    ('utilities',   'Utilities'),
    ('fuel',        'Fuel'),
    ('materials',   'Materials'),
    ('salaries',    'Salaries'),
    ('contractor',  'Contractor Commission'),
    ('marketing',   'Marketing'),
    ('transport',   'Transport'),
    ('maintenance', 'Maintenance'),
    ('other',       'Other'),
]

FREQUENCY_CHOICES = [
    ('monthly',   'Monthly'),
    ('quarterly', 'Quarterly'),
    ('annual',    'Annual'),
]


class Expense(models.Model):
    description = models.CharField(max_length=300)
    category    = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='other')
    amount_rwf  = models.DecimalField(max_digits=14, decimal_places=2)
    date        = models.DateField()
    quote       = models.ForeignKey(
        'quotes.Quote', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='expenses',
    )
    notes       = models.TextField(blank=True)
    recorded_by = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL,
        null=True, related_name='expenses',
    )
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'expenses'
        ordering = ['-date', '-created_at']

    def __str__(self):
        return f"{self.get_category_display()} — {self.amount_rwf} RWF ({self.date})"


class RecurringExpense(models.Model):
    name         = models.CharField(max_length=200)
    category     = models.CharField(max_length=30, choices=CATEGORY_CHOICES, default='other')
    amount_rwf   = models.DecimalField(max_digits=14, decimal_places=2)
    frequency    = models.CharField(max_length=20, choices=FREQUENCY_CHOICES, default='monthly')
    next_due_date = models.DateField()
    is_active    = models.BooleanField(default=True)
    notes        = models.TextField(blank=True)
    created_by   = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL,
        null=True, related_name='recurring_expenses',
    )
    created_at   = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'recurring_expenses'
        ordering = ['next_due_date']

    def __str__(self):
        return f"{self.name} ({self.get_frequency_display()}) — {self.amount_rwf} RWF"

    def advance_due_date(self):
        from datetime import date
        import calendar
        d = self.next_due_date
        if self.frequency == 'monthly':
            month = d.month % 12 + 1
            year  = d.year + (1 if d.month == 12 else 0)
            day   = min(d.day, calendar.monthrange(year, month)[1])
            self.next_due_date = date(year, month, day)
        elif self.frequency == 'quarterly':
            months = d.month + 3
            year   = d.year + (months - 1) // 12
            month  = (months - 1) % 12 + 1
            day    = min(d.day, calendar.monthrange(year, month)[1])
            self.next_due_date = date(year, month, day)
        elif self.frequency == 'annual':
            year  = d.year + 1
            day   = min(d.day, calendar.monthrange(year, d.month)[1])
            self.next_due_date = date(year, d.month, day)
        self.save(update_fields=['next_due_date'])
