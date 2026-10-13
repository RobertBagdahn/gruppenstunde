from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("supply", "0024_migrate_equipment_to_material"),
        ("recipe", "0015_remove_recipe_equipment"),
    ]

    operations = [migrations.DeleteModel(name="Equipment")]
