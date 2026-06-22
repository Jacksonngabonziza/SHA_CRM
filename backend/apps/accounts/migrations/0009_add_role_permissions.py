from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0008_add_company_tin'),
    ]

    operations = [
        migrations.AddField(
            model_name='companysettings',
            name='role_permissions',
            field=models.JSONField(
                blank=True,
                default=dict,
                help_text='Maps role name to list of module keys the role can access.',
            ),
        ),
    ]
