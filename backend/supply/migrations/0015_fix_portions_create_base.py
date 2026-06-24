"""Data migration: Fix Portions with NULL measuring_unit + create base portions for all Ingredients."""

from django.db import migrations


def fix_portions_and_create_base(apps, schema_editor):
    MeasuringUnit = apps.get_model("supply", "MeasuringUnit")
    Ingredient = apps.get_model("supply", "Ingredient")
    Portion = apps.get_model("supply", "Portion")

    # Ensure base measuring units exist
    g_unit, _ = MeasuringUnit.objects.get_or_create(name="g", unit="g", quantity=1, defaults={"description": "Gramm"})
    ml_unit, _ = MeasuringUnit.objects.get_or_create(
        name="ml", unit="ml", quantity=1, defaults={"description": "Milliliter"}
    )

    # Fix existing Portions with NULL measuring_unit
    null_mu_portions = Portion.objects.filter(measuring_unit__isnull=True)
    for portion in null_mu_portions:
        # Guess unit from ingredient viscosity or portion name
        ingredient = portion.ingredient
        if ingredient and ingredient.physical_viscosity == "beverage":
            portion.measuring_unit = ml_unit
        else:
            portion.measuring_unit = g_unit

        # Fix weight_g if it's 0 or None
        if not portion.weight_g or portion.weight_g <= 0:
            portion.weight_g = max(portion.quantity, 1.0)

        portion.save()

    # Create base portions for Ingredients that don't have an is_default portion
    ingredients_without_default = Ingredient.objects.exclude(portions__is_default=True).distinct()

    for ingredient in ingredients_without_default:
        if ingredient.physical_viscosity == "beverage":
            name = "ml"
            mu = ml_unit
            weight_g = ingredient.physical_density or 1.0
        else:
            name = "g"
            mu = g_unit
            weight_g = 1.0

        Portion.objects.create(
            name=name,
            measuring_unit=mu,
            ingredient=ingredient,
            quantity=1,
            weight_g=weight_g,
            is_default=True,
            rank=1,
            priority=0,
        )


def reverse(apps, schema_editor):
    pass  # No reverse needed


class Migration(migrations.Migration):
    dependencies = [
        ("supply", "0014_portion_deleted_at"),
    ]

    operations = [
        migrations.RunPython(fix_portions_and_create_base, reverse),
    ]
