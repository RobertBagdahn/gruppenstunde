# Copy Recipe.owner to created_by before owner field is removed

from django.db import migrations


def migrate_recipe_owner_forward(apps, schema_editor):
    Recipe = apps.get_model("recipe", "Recipe")
    for recipe in Recipe.objects.filter(created_by__isnull=True, owner__isnull=False).iterator():
        recipe.created_by = recipe.owner
        recipe.save(update_fields=["created_by"])


def migrate_recipe_owner_reverse(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ("recipe", "0033_migrate_rule_scope_data"),
    ]

    operations = [
        migrations.RunPython(migrate_recipe_owner_forward, migrate_recipe_owner_reverse),
    ]
