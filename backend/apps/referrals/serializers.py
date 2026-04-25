
from rest_framework import serializers
from .models import Referral

class ReferralSerializer(serializers.ModelSerializer):
    referrer_name = serializers.CharField(source="referrer.name", read_only=True)
    referred_name = serializers.CharField(source="referred.name", read_only=True)
    status_display= serializers.CharField(source="get_status_display", read_only=True)

    class Meta:
        model  = Referral
        fields = "__all__"
        read_only_fields = ["id","created_at","created_by"]

    def create(self, validated_data):
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)
