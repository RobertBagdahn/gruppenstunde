from django.db import migrations


def migrate_energy_kj_rules_to_kcal(apps, schema_editor):
    Rule = apps.get_model("recipe", "Rule")
    Rule.objects.filter(parameter="energy_kj").update(parameter="energy_kcal")


class Migration(migrations.Migration):
    dependencies = [
        ("recipe", "0006_recipeitemidempotencyrecord"),
    ]

    operations = [
        migrations.RunPython(
            migrate_energy_kj_rules_to_kcal,
            reverse_code=migrations.RunPython.noop,
        ),
    ]
