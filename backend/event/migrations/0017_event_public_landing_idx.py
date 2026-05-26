from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('event', '0016_whatsappconnection_last_health_check_at_and_more'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='event',
            index=models.Index(
                fields=['is_public', 'is_template', 'start_date'],
                name='event_public_landing_idx',
            ),
        ),
    ]
