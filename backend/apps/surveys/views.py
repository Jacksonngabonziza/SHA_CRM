
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated
from .models import SiteSurvey
from .serializers import SiteSurveySerializer

class SurveyListCreateView(generics.ListCreateAPIView):
    serializer_class = SiteSurveySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = SiteSurvey.objects.select_related("client","surveyed_by","quote").all()
        if self.request.user.role == "sales":
            qs = qs.filter(surveyed_by=self.request.user)
        client_id = self.request.query_params.get("client")
        if client_id:
            qs = qs.filter(client_id=client_id)
        return qs

class SurveyDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = SiteSurvey.objects.all()
    serializer_class = SiteSurveySerializer
    permission_classes = [IsAuthenticated]
