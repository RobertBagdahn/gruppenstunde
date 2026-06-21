from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("content", "0008_delete_contentcollaborator"),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                "CREATE EXTENSION IF NOT EXISTS google_ml_integration VERSION '1.2';",
                "GRANT EXECUTE ON FUNCTION embedding TO inspi;",
            ],
            reverse_sql=[
                "REVOKE EXECUTE ON FUNCTION embedding FROM inspi;",
                "DROP EXTENSION IF EXISTS google_ml_integration;",
            ],
        ),
    ]
