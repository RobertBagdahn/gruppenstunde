from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("recipe", "0015_recipe_item_source_quantity"),
        ("supply", "0025_migrate_equipment_to_material"),
    ]

    operations = [migrations.RemoveField(model_name="recipe", name="equipment")]
