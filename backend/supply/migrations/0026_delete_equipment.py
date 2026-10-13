from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("supply", "0025_migrate_equipment_to_material"),
        ("recipe", "0016_remove_recipe_equipment"),
    ]

    operations = [migrations.DeleteModel(name="Equipment")]
