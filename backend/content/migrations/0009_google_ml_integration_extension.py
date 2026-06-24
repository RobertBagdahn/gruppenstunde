from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0008_delete_contentcollaborator"),
    ]

    # This migration is a no-op for local development.
    # google_ml_integration extension is only available on Cloud SQL.
    # In production, this should be manually applied after the extension is installed.
    operations = []
