from rest_framework import generics, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework.filters import SearchFilter, OrderingFilter
from django.utils import timezone
from apps.accounts.permissions import IsAdminOrOwner
from .models import Client, ClientNote
from .serializers import ClientSerializer, ClientListSerializer, ClientNoteSerializer


class ClientListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    filter_backends    = [DjangoFilterBackend, SearchFilter, OrderingFilter]
    filterset_fields   = ['status', 'client_type', 'is_offgrid', 'assigned_to', 'source_agent']
    search_fields      = ['name', 'phone', 'email', 'location']
    ordering_fields    = ['name', 'created_at', 'followup_date']
    ordering           = ['-created_at']

    def get_queryset(self):
        qs = Client.objects.select_related('assigned_to', 'created_by', 'source_agent').all()
        if self.request.user.role == 'sales':
            qs = qs.filter(created_by=self.request.user)
        elif self.request.user.role == 'field_agent':
            qs = qs.filter(source_agent=self.request.user)
        return qs

    def get_serializer_class(self):
        return ClientListSerializer if self.request.method == 'GET' else ClientSerializer


class ClientDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAdminOrOwner]
    serializer_class   = ClientSerializer

    def get_queryset(self):
        qs = Client.objects.select_related('assigned_to', 'created_by').all()
        if self.request.user.role == 'sales':
            qs = qs.filter(created_by=self.request.user)
        return qs

    def destroy(self, request, *args, **kwargs):
        if request.user.role != 'admin':
            return Response({'detail': 'Only admins can delete clients.'}, status=403)
        return super().destroy(request, *args, **kwargs)


class ClientNoteListCreateView(generics.ListCreateAPIView):
    serializer_class = ClientNoteSerializer

    def get_queryset(self):
        return ClientNote.objects.filter(client_id=self.kwargs['client_pk']).select_related('created_by')

    def perform_create(self, serializer):
        serializer.save(client_id=self.kwargs['client_pk'], created_by=self.request.user)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_client_status(request, pk):
    try:
        qs = Client.objects.all()
        if request.user.role == 'sales':
            qs = qs.filter(created_by=request.user)
        client = qs.get(pk=pk)
    except Client.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)

    new_status = request.data.get('status')
    if new_status not in dict(Client.STATUS_CHOICES):
        return Response({'detail': 'Invalid status.'}, status=400)

    client.status = new_status
    if new_status == Client.STATUS_FOLLOWUP:
        client.followup_date = request.data.get('followup_date')
    client.save()
    return Response(ClientSerializer(client, context={'request': request}).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def followups_due(request):
    today = timezone.now().date()
    qs = Client.objects.filter(followup_date__lte=today, status=Client.STATUS_FOLLOWUP)
    if request.user.role == 'sales':
        qs = qs.filter(created_by=request.user)
    return Response(ClientListSerializer(qs.order_by('followup_date'), many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_clients_csv(request):
    import csv
    from django.http import HttpResponse

    qs = Client.objects.select_related('assigned_to', 'created_by').order_by('-created_at')
    if request.user.role == 'sales':
        qs = qs.filter(created_by=request.user)

    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = 'attachment; filename="clients.csv"'

    writer = csv.writer(response)
    writer.writerow([
        'Name', 'Phone', 'Email', 'Location', 'Type', 'Status',
        'Source', 'Follow-up Date', 'Off-grid', 'Monthly Bill (RWF)',
        'Monthly kWh', 'Assigned To', 'Created At',
    ])
    for c in qs:
        writer.writerow([
            c.name, c.phone, c.email, c.location,
            c.get_client_type_display(), c.get_status_display(),
            c.source, c.followup_date or '',
            'Yes' if c.is_offgrid else 'No',
            c.monthly_bill_rwf or '', c.monthly_kwh or '',
            c.assigned_to.get_full_name() if c.assigned_to else '',
            c.created_at.strftime('%Y-%m-%d'),
        ])
    return response
