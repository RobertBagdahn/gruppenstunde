from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("content", "0002_pg_trgm"),
    ]

    operations = [
        migrations.RunSQL(
            sql="CREATE EXTENSION IF NOT EXISTS vector;",
            reverse_sql="DROP EXTENSION IF EXISTS vector;",
        ),
    ]
