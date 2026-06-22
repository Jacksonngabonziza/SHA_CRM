from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('products', '0001_initial'),
        ('quotes', '0003_add_num_batteries'),
    ]

    operations = [
        migrations.AddField(
            model_name='quote',
            name='quote_type',
            field=models.CharField(
                choices=[('installation', 'Installation Quote'), ('product_order', 'Product Order')],
                default='installation',
                max_length=20,
            ),
        ),
        migrations.CreateModel(
            name='QuoteLineItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('description', models.CharField(max_length=255)),
                ('quantity', models.IntegerField(default=1)),
                ('unit_price', models.DecimalField(decimal_places=2, max_digits=12)),
                ('total', models.DecimalField(decimal_places=2, max_digits=14)),
                ('product', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.PROTECT,
                    to='products.product',
                )),
                ('quote', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='line_items',
                    to='quotes.quote',
                )),
            ],
            options={'db_table': 'quote_line_items'},
        ),
    ]
