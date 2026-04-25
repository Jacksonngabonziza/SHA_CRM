
from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum
from apps.accounts.permissions import IsAdminOrReadOnly
from .models import Payment
from .serializers import PaymentSerializer

class PaymentListCreateView(generics.ListCreateAPIView):
    serializer_class   = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Payment.objects.select_related("quote","client","recorded_by").all()
        quote_id = self.request.query_params.get("quote")
        client_id= self.request.query_params.get("client")
        if quote_id:  qs = qs.filter(quote_id=quote_id)
        if client_id: qs = qs.filter(client_id=client_id)
        return qs

class PaymentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Payment.objects.select_related("quote","client").all()
    serializer_class   = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def destroy(self, request, *args, **kwargs):
        if request.user.role != "admin":
            return Response({"detail":"Only admins can delete payments."}, status=403)
        return super().destroy(request, *args, **kwargs)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def quote_payment_summary(request, quote_id):
    from apps.quotes.models import Quote
    try:
        quote = Quote.objects.get(pk=quote_id)
    except Quote.DoesNotExist:
        return Response({"detail":"Not found."}, status=404)
    payments = Payment.objects.filter(quote=quote)
    total_paid = payments.filter(status="confirmed").aggregate(t=Sum("amount_rwf"))["t"] or 0
    return Response({
        "quote_ref": quote.ref_number,
        "total_price": float(quote.total_price_rwf),
        "total_paid": float(total_paid),
        "balance_due": float(quote.total_price_rwf) - float(total_paid),
        "payments": PaymentSerializer(payments, many=True).data,
        "is_fully_paid": float(total_paid) >= float(quote.total_price_rwf),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_payments_csv(request):
    import csv
    from django.http import HttpResponse

    qs = Payment.objects.select_related('quote', 'recorded_by').order_by('-payment_date')
    if request.user.role == 'sales':
        qs = qs.filter(recorded_by=request.user)

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="payments.csv"'

    writer = csv.writer(response)
    writer.writerow([
        'Quote Ref', 'Client', 'Amount (RWF)', 'Type', 'Method',
        'Status', 'Reference', 'Payment Date', 'Notes', 'Recorded By',
    ])
    for p in qs:
        writer.writerow([
            p.quote_ref,
            p.client_name,
            float(p.amount_rwf),
            p.get_payment_type_display(),
            p.get_payment_method_display(),
            p.get_status_display(),
            p.reference,
            p.payment_date,
            p.notes,
            p.recorded_by.get_full_name() if p.recorded_by else '',
        ])
    return response
