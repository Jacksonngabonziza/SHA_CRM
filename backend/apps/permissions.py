from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Only admin role can access."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role == 'admin'


class IsSales(BasePermission):
    """Sales or admin can access."""
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.role in ('admin', 'sales')


class IsAdminOrReadOnly(BasePermission):
    """Admin can write; both roles can read."""
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return request.user.role == 'admin'


class IsOwnerOrAdmin(BasePermission):
    """Admin sees everything; sales sees only their own records."""
    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        owner = getattr(obj, 'created_by', None) or getattr(obj, 'assigned_to', None)
        return owner == request.user
