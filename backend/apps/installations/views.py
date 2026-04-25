
from rest_framework import generics, status
from rest_framework.views import APIView
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.http import HttpResponse
from django.utils import timezone
from apps.accounts.permissions import IsAdminOrOwner
from .models import Installation, InstallationLog, WarrantyClaim
from .serializers import InstallationSerializer, InstallationLogSerializer, WarrantyClaimSerializer
from .report_generator import generate_installation_report

class InstallationListCreateView(generics.ListCreateAPIView):
    serializer_class   = InstallationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = Installation.objects.select_related("quote","client","created_by").prefetch_related("logs","assigned_team").all()
        status_filter = self.request.query_params.get("status")
        if status_filter:
            qs = qs.filter(status=status_filter)
        return qs

class InstallationDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Installation.objects.select_related("quote","client").prefetch_related("logs","assigned_team").all()
    serializer_class   = InstallationSerializer
    permission_classes = [IsAuthenticated]

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def add_installation_log(request, pk):
    try:
        inst = Installation.objects.get(pk=pk)
    except Installation.DoesNotExist:
        return Response({"detail":"Not found."}, status=404)
    created_at = request.data.get("created_at") or None
    log = InstallationLog.objects.create(
        installation=inst,
        note=request.data.get("note",""),
        logged_by=request.user,
        created_at=created_at or timezone.now(),
    )
    return Response(InstallationLogSerializer(log).data, status=201)

@api_view(["PATCH", "DELETE"])
@permission_classes([IsAuthenticated])
def installation_log_detail(request, pk, log_pk):
    try:
        log = InstallationLog.objects.get(pk=log_pk, installation_id=pk)
    except InstallationLog.DoesNotExist:
        return Response({"detail": "Not found."}, status=404)

    if request.method == "DELETE":
        log.delete()
        return Response(status=204)

    # PATCH
    if "note" in request.data:
        log.note = request.data["note"]
    if "created_at" in request.data and request.data["created_at"]:
        log.created_at = request.data["created_at"]
    log.save()
    return Response(InstallationLogSerializer(log).data)


@api_view(["PATCH"])
@permission_classes([IsAuthenticated])
def update_installation_status(request, pk):
    try:
        inst = Installation.objects.get(pk=pk)
    except Installation.DoesNotExist:
        return Response({"detail":"Not found."}, status=404)
    new_status = request.data.get("status")
    if new_status not in dict(Installation.STATUS_CHOICES):
        return Response({"detail":"Invalid status."}, status=400)
    inst.status = new_status
    if new_status == "in_progress" and not inst.started_at:
        inst.started_at = timezone.now()
    if new_status == "completed" and not inst.completed_at:
        inst.completed_at = timezone.now()
        inst.quote.client.status = "won"
        inst.quote.client.save()
    inst.save()
    return Response(InstallationSerializer(inst, context={"request":request}).data)


class WarrantyClaimListCreateView(generics.ListCreateAPIView):
    serializer_class   = WarrantyClaimSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = WarrantyClaim.objects.select_related(
            'installation__client', 'installation__quote',
            'raised_by', 'resolved_by',
        )
        if self.request.user.role == 'sales':
            qs = qs.filter(raised_by=self.request.user)
        status = self.request.query_params.get('status')
        if status:
            qs = qs.filter(status=status)
        installation = self.request.query_params.get('installation')
        if installation:
            qs = qs.filter(installation_id=installation)
        return qs


class WarrantyClaimDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class   = WarrantyClaimSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = WarrantyClaim.objects.select_related(
            'installation__client', 'installation__quote',
            'raised_by', 'resolved_by',
        )
        if self.request.user.role == 'sales':
            qs = qs.filter(raised_by=self.request.user)
        return qs


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def installation_report(request, pk):
    try:
        inst = Installation.objects.select_related(
            'quote__panel', 'quote__battery', 'quote__inverter', 'quote__generator',
            'client', 'created_by',
        ).get(pk=pk)
    except Installation.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)

    buf = generate_installation_report(inst)
    filename = f"Installation-Report-{inst.client.name.replace(' ', '-')}.pdf"
    response = HttpResponse(buf, content_type='application/pdf')
    response['Content-Disposition'] = f'inline; filename="{filename}"'
    return response


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def resolve_warranty_claim(request, pk):
    try:
        claim = WarrantyClaim.objects.get(pk=pk)
    except WarrantyClaim.DoesNotExist:
        return Response({'detail': 'Not found.'}, status=404)

    notes = request.data.get('resolution_notes', '')
    claim.resolve(user=request.user, notes=notes)
    return Response(WarrantyClaimSerializer(claim).data)
