from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('clients', '0001_initial'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='WAConversation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('wa_id', models.CharField(db_index=True, max_length=20, unique=True)),
                ('display_name', models.CharField(blank=True, max_length=150)),
                ('status', models.CharField(
                    choices=[('bot', 'Bot Handling'), ('human', 'Awaiting Team'), ('transferred', 'Transferred to WA'), ('resolved', 'Resolved')],
                    default='bot', max_length=20,
                )),
                ('language', models.CharField(
                    choices=[('en', 'English'), ('rw', 'Kinyarwanda'), ('fr', 'Français')],
                    default='en', max_length=2,
                )),
                ('bot_step', models.IntegerField(default=0)),
                ('bot_data', models.JSONField(default=dict)),
                ('unread_count', models.IntegerField(default=0)),
                ('last_message_at', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('assigned_to', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='wa_assigned_conversations',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('client', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='wa_conversations',
                    to='clients.client',
                )),
            ],
            options={'ordering': ['-last_message_at']},
        ),
        migrations.CreateModel(
            name='WAMessage',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('wa_message_id', models.CharField(blank=True, db_index=True, max_length=150, null=True, unique=True)),
                ('direction', models.CharField(choices=[('inbound', 'Inbound'), ('outbound', 'Outbound')], max_length=10)),
                ('message_type', models.CharField(
                    choices=[('text', 'Text'), ('image', 'Image'), ('audio', 'Audio'), ('video', 'Video'), ('document', 'Document'), ('other', 'Other')],
                    default='text', max_length=20,
                )),
                ('body', models.TextField(blank=True)),
                ('status', models.CharField(
                    choices=[('sent', 'Sent'), ('delivered', 'Delivered'), ('read', 'Read'), ('failed', 'Failed')],
                    default='sent', max_length=20,
                )),
                ('timestamp', models.DateTimeField()),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('conversation', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='messages',
                    to='whatsapp.waconversation',
                )),
                ('sent_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='wa_messages_sent',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={'ordering': ['timestamp']},
        ),
    ]
