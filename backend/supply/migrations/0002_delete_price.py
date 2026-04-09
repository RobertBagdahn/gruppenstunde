# Migration: Drop Price model

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("supply", "0001_initial"),
    ]

    operations = [
        migrations.DeleteModel(
            name="Price",
        ),
    ]
