from django.contrib import admin
from .models import Expense, RecurringExpense

admin.site.register(Expense)
admin.site.register(RecurringExpense)
