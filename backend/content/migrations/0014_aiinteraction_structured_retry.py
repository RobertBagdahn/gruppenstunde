from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("content", "0006_alter_aiinteraction_context")]

    operations = [
        migrations.AddField(
            model_name="aiinteraction",
            name="structured_attempts",
            field=models.PositiveSmallIntegerField(default=1),
        ),
        migrations.AddField(
            model_name="aiinteraction",
            name="structured_validation_error",
            field=models.TextField(blank=True, default=""),
        ),
    ]
