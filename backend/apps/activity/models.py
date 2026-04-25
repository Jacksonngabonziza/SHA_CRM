from django.db import models


class ActivityLog(models.Model):
    ACTION_LOGIN          = 'login'
    ACTION_LOGOUT         = 'logout'
    ACTION_CREATE         = 'create'
    ACTION_UPDATE         = 'update'
    ACTION_DELETE         = 'delete'
    ACTION_STATUS_CHANGE  = 'status_change'
    ACTION_SEND           = 'send'
    ACTION_RESET_PIN      = 'reset_pin'
    ACTION_MARK_PAID      = 'mark_paid'
    ACTION_APPROVE        = 'approve'
    ACTION_REJECT         = 'reject'

    ACTION_CHOICES = [
        (ACTION_LOGIN,         'Login'),
        (ACTION_LOGOUT,        'Logout'),
        (ACTION_CREATE,        'Create'),
        (ACTION_UPDATE,        'Update'),
        (ACTION_DELETE,        'Delete'),
        (ACTION_STATUS_CHANGE, 'Status Change'),
        (ACTION_SEND,          'Send'),
        (ACTION_RESET_PIN,     'Reset PIN'),
        (ACTION_MARK_PAID,     'Mark Paid'),
        (ACTION_APPROVE,       'Approve'),
        (ACTION_REJECT,        'Reject'),
    ]

    user = models.ForeignKey(
        'accounts.User', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='activity_logs'
    )
    # Denormalized so logs survive user deletion
    user_name = models.CharField(max_length=200, blank=True)
    user_role = models.CharField(max_length=20, blank=True)

    action        = models.CharField(max_length=30, choices=ACTION_CHOICES)
    resource_type = models.CharField(max_length=50, blank=True)
    resource_id   = models.IntegerField(null=True, blank=True)
    resource_label= models.CharField(max_length=300, blank=True)
    description   = models.TextField()
    ip_address    = models.GenericIPAddressField(null=True, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'activity_logs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['resource_type', 'created_at']),
            models.Index(fields=['action', 'created_at']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"[{self.action}] {self.user_name} — {self.description}"

    @classmethod
    def log(cls, *, action, description, user=None, resource_type='', resource_id=None,
            resource_label='', ip_address=None):
        """Create a log entry. Falls back to thread-local request if user/ip not provided."""
        from apps.activity.middleware import get_current_request, get_client_ip
        if user is None:
            req = get_current_request()
            user = getattr(req, 'user', None) if req else None
            if user and not user.is_authenticated:
                user = None
        if ip_address is None:
            req = get_current_request()
            ip_address = get_client_ip(req) if req else None

        user_name = ''
        user_role = ''
        if user:
            user_name = user.get_full_name() or user.username
            user_role = user.role

        cls.objects.create(
            user=user,
            user_name=user_name,
            user_role=user_role,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            resource_label=resource_label,
            description=description,
            ip_address=ip_address,
        )
