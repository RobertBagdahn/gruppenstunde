"""Seed system portions for all existing ingredients: mark g/ml as system,
create Packung and Stück portions where missing."""

from django.db import migrations


def seed_system_portions(apps, schema_editor):
    Portion = apps.get_model("supply", "Portion")
    Ingredient = apps.get_model("supply", "Ingredient")
    MeasuringUnit = apps.get_model("supply", "MeasuringUnit")

    # Mark existing g/ml portions as system
    Portion.objects.filter(name__in=["g", "ml"]).update(is_system=True)

    # Get measuring units
    mu_packung = MeasuringUnit.objects.filter(name__iexact="Packung").first()
    if not mu_packung:
        mu_packung = MeasuringUnit.objects.create(name="Packung", quantity=1.0, unit="g")
    mu_stueck = MeasuringUnit.objects.filter(name__iexact="Stück").first()
    if not mu_stueck:
        mu_stueck = MeasuringUnit.objects.create(name="Stück", quantity=1.0, unit="g")
    mu_gramm = MeasuringUnit.objects.filter(name__iexact="Gramm").first()
    if not mu_gramm:
        mu_gramm = MeasuringUnit.objects.create(name="Gramm", quantity=1.0, unit="g")

    for ingredient in Ingredient.objects.all().iterator():
        existing_names = set(
            Portion.objects.filter(ingredient=ingredient, deleted_at__isnull=True).values_list("name", flat=True)
        )

        # Ensure g or ml base system portion
        if ingredient.physical_viscosity == "beverage" and "ml" not in existing_names:
            if not Portion.objects.filter(ingredient=ingredient, name="ml").exists():
                mu = MeasuringUnit.objects.filter(unit="ml", quantity=1).first()
                if not mu:
                    mu = MeasuringUnit.objects.create(name="ml", quantity=1.0, unit="ml")
                Portion.objects.create(
                    ingredient=ingredient,
                    name="ml",
                    measuring_unit=mu,
                    quantity=1.0,
                    weight_g=ingredient.physical_density or 1.0,
                    is_default=True,
                    is_system=True,
                )
        elif "g" not in existing_names:
            if not Portion.objects.filter(ingredient=ingredient, name="g").exists():
                Portion.objects.create(
                    ingredient=ingredient,
                    name="g",
                    measuring_unit=mu_gramm,
                    quantity=1.0,
                    weight_g=1.0,
                    is_default=True,
                    is_system=True,
                )

        # Packung
        if "Packung" not in existing_names:
            if not Portion.objects.filter(ingredient=ingredient, name="Packung").exists():
                Portion.objects.create(
                    ingredient=ingredient,
                    name="Packung",
                    measuring_unit=mu_packung,
                    quantity=1.0,
                    is_system=True,
                )

        # Stück
        if "Stück" not in existing_names:
            if not Portion.objects.filter(ingredient=ingredient, name="Stück").exists():
                Portion.objects.create(
                    ingredient=ingredient,
                    name="Stück",
                    measuring_unit=mu_stueck,
                    quantity=1.0,
                    is_system=True,
                )


class Migration(migrations.Migration):
    dependencies = [
        ("supply", "0039_add_portion_is_system"),
    ]

    operations = [
        migrations.RunPython(seed_system_portions, reverse_code=migrations.RunPython.noop),
    ]
