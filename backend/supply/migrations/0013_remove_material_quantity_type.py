"""Remove quantity_type from ContentMaterialItem model."""

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("supply", "0012_remove_dgereference_biotin_ug_and_more"),
    ]

    operations = [
        migrations.RemoveField(
            model_name="contentmaterialitem",
            name="quantity_type",
        ),
    ]
