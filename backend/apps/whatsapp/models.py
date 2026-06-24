from django.db import models


class WAConversation(models.Model):
    LANG_EN = 'en'
    LANG_RW = 'rw'
    LANG_FR = 'fr'
    LANG_CHOICES = [
        (LANG_EN, 'English'),
        (LANG_RW, 'Kinyarwanda'),
        (LANG_FR, 'Français'),
    ]

    STATUS_BOT = 'bot'
    STATUS_HUMAN = 'human'
    STATUS_TRANSFERRED = 'transferred'
    STATUS_RESOLVED = 'resolved'
    STATUS_CHOICES = [
        (STATUS_BOT, 'Bot Handling'),
        (STATUS_HUMAN, 'Awaiting Team'),
        (STATUS_TRANSFERRED, 'Transferred to WA'),
        (STATUS_RESOLVED, 'Resolved'),
    ]

    wa_id = models.CharField(max_length=20, unique=True, db_index=True)
    display_name = models.CharField(max_length=150, blank=True)
    client = models.ForeignKey(
        'clients.Client', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='wa_conversations',
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_BOT)
    language = models.CharField(max_length=2, choices=LANG_CHOICES, default=LANG_EN)
    bot_step = models.IntegerField(default=0)
    bot_data = models.JSONField(default=dict)
    unread_count = models.IntegerField(default=0)
    assigned_to = models.ForeignKey(
        'accounts.User', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='wa_assigned_conversations',
    )
    last_message_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-last_message_at']

    def __str__(self):
        return f"{self.display_name or self.wa_id} ({self.get_status_display()})"


class WAMessage(models.Model):
    DIR_IN = 'inbound'
    DIR_OUT = 'outbound'
    DIR_CHOICES = [(DIR_IN, 'Inbound'), (DIR_OUT, 'Outbound')]

    STATUS_SENT = 'sent'
    STATUS_DELIVERED = 'delivered'
    STATUS_READ = 'read'
    STATUS_FAILED = 'failed'
    STATUS_CHOICES = [
        (STATUS_SENT, 'Sent'), (STATUS_DELIVERED, 'Delivered'),
        (STATUS_READ, 'Read'), (STATUS_FAILED, 'Failed'),
    ]

    TYPE_TEXT = 'text'
    TYPE_IMAGE = 'image'
    TYPE_AUDIO = 'audio'
    TYPE_VIDEO = 'video'
    TYPE_DOCUMENT = 'document'
    TYPE_OTHER = 'other'
    TYPE_CHOICES = [
        (TYPE_TEXT, 'Text'), (TYPE_IMAGE, 'Image'), (TYPE_AUDIO, 'Audio'),
        (TYPE_VIDEO, 'Video'), (TYPE_DOCUMENT, 'Document'), (TYPE_OTHER, 'Other'),
    ]

    conversation = models.ForeignKey(WAConversation, on_delete=models.CASCADE, related_name='messages')
    wa_message_id = models.CharField(max_length=150, unique=True, null=True, blank=True, db_index=True)
    direction = models.CharField(max_length=10, choices=DIR_CHOICES)
    message_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default=TYPE_TEXT)
    body = models.TextField(blank=True)
    sent_by = models.ForeignKey(
        'accounts.User', null=True, blank=True,
        on_delete=models.SET_NULL, related_name='wa_messages_sent',
    )
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=STATUS_SENT)
    timestamp = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"[{self.direction}] {self.body[:60]}"
