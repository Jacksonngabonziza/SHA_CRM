
from rest_framework import serializers
from .models import SiteSurvey

class SiteSurveySerializer(serializers.ModelSerializer):
    client_name    = serializers.CharField(source="client.name", read_only=True)
    surveyed_by_name = serializers.CharField(source="surveyed_by.get_full_name", read_only=True)
    feasibility_display = serializers.CharField(source="get_feasibility_display", read_only=True)

    class Meta:
        model  = SiteSurvey
        fields = "__all__"
        read_only_fields = ["id", "created_at", "updated_at", "surveyed_by"]

    def create(self, validated_data):
        validated_data["surveyed_by"] = self.context["request"].user
        return super().create(validated_data)
