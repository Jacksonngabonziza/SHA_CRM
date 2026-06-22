from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Sum
from django.utils import timezone
from .models import Expense, RecurringExpense
from .serializers import ExpenseSerializer, RecurringExpenseSerializer


class ExpenseListCreateView(generics.ListCreateAPIView):
    serializer_class   = ExpenseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Expense.objects.select_related('recorded_by', 'quote').all()
        category = self.request.query_params.get('category')
        year     = self.request.query_params.get('year')
        month    = self.request.query_params.get('month')
        if category: qs = qs.filter(category=category)
        if year:     qs = qs.filter(date__year=year)
        if month:    qs = qs.filter(date__month=month)
        return qs


class ExpenseDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = Expense.objects.all()
    serializer_class   = ExpenseSerializer
    permission_classes = [IsAuthenticated]


class RecurringExpenseListCreateView(generics.ListCreateAPIView):
    serializer_class   = RecurringExpenseSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        active = self.request.query_params.get('active')
        qs = RecurringExpense.objects.all()
        if active == 'true':
            qs = qs.filter(is_active=True)
        return qs


class RecurringExpenseDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset           = RecurringExpense.objects.all()
    serializer_class   = RecurringExpenseSerializer
    permission_classes = [IsAuthenticated]


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def mark_recurring_paid(request, pk):
    """Mark a recurring expense as paid for this period — creates an Expense record and advances the due date."""
    try:
        recurring = RecurringExpense.objects.get(pk=pk)
    except RecurringExpense.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)

    paid_date = request.data.get('date') or timezone.now().date().isoformat()
    notes     = request.data.get('notes', '')

    expense = Expense.objects.create(
        description = f"{recurring.name} ({recurring.get_frequency_display()})",
        category    = recurring.category,
        amount_rwf  = recurring.amount_rwf,
        date        = paid_date,
        notes       = notes,
        recorded_by = request.user,
    )
    recurring.advance_due_date()

    return Response({
        'expense': ExpenseSerializer(expense).data,
        'recurring': RecurringExpenseSerializer(recurring).data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def expense_summary(request):
    """Total expenses by category for a given year/month."""
    today = timezone.now().date()
    year  = int(request.query_params.get('year', today.year))
    month = request.query_params.get('month')

    qs = Expense.objects.filter(date__year=year)
    if month:
        qs = qs.filter(date__month=int(month))

    by_category = (
        qs.values('category')
        .annotate(total=Sum('amount_rwf'))
        .order_by('-total')
    )
    grand_total = qs.aggregate(t=Sum('amount_rwf'))['t'] or 0

    # Upcoming recurring overdue
    overdue_recurring = RecurringExpense.objects.filter(
        is_active=True, next_due_date__lte=today
    ).count()

    return Response({
        'year': year,
        'month': month,
        'grand_total': float(grand_total),
        'by_category': [
            {'category': r['category'], 'total': float(r['total'])}
            for r in by_category
        ],
        'overdue_recurring': overdue_recurring,
    })
