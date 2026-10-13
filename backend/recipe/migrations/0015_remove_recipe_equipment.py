from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("recipe", "0014_recipe_portions_one"),
        ("supply", "0024_migrate_equipment_to_material"),
    ]

    operations = [migrations.RemoveField(model_name="recipe", name="equipment")]
