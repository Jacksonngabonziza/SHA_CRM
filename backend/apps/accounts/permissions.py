from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Only admin role users."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated
                    and request.user.role == 'admin')


class IsSales(BasePermission):
    """Only sales role users."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated
                    and request.user.role == 'sales')


class IsAdminOrReadOnly(BasePermission):
    """Admin can do anything. Sales can only read."""
    def has_permission(self, request, view):
        if not request.user or not request.user.is_authenticated:
            return False
        if request.method in ('GET', 'HEAD', 'OPTIONS'):
            return True
        return request.user.role == 'admin'


class IsAdminOrOwner(BasePermission):
    """Admin sees everything. Sales sees only their own records."""
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

    def has_object_permission(self, request, view, obj):
        if request.user.role == 'admin':
            return True
        # Check ownership — works for Client, Quote
        owner = getattr(obj, 'created_by', None) or getattr(obj, 'assigned_to', None)
        return owner == request.user


class IsAuthenticatedAdmin(BasePermission):
    """Authenticated + admin — for financial data."""
    message = 'Only administrators can access financial data.'

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated
                    and request.user.role == 'admin')
