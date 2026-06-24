"""Enable pg_trgm extension for fuzzy text matching."""

from django.contrib.postgres.operations import TrigramExtension
from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("supply", "0004_ingredient_biotin_ug_ingredient_calcium_mg_and_more"),
    ]

    operations = [
        TrigramExtension(),
    ]
