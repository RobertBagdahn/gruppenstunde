"""Factories for creating test data (supply app)."""

from model_bakery import baker

from supply.models import Ingredient, MeasuringUnit, Portion, RetailSection


def make_retail_section(**kwargs) -> RetailSection:
    defaults = {
        "name": "Backwaren",
        "rank": 1,
    }
    defaults.update(kwargs)
    return baker.make(RetailSection, **defaults)


def make_measuring_unit(**kwargs) -> MeasuringUnit:
    defaults = {
        "name": "Gramm",
        "quantity": 1.0,
        "unit": "g",
    }
    defaults.update(kwargs)
    return baker.make(MeasuringUnit, **defaults)


def make_ingredient(**kwargs) -> Ingredient:
    defaults = {
        "name": "Weizenmehl",
        "status": "verified",
        "energy_kcal": 339.0,
        "protein_g": 10.3,
        "fat_g": 1.0,
        "fat_sat_g": 0.2,
        "carbohydrate_g": 71.0,
        "sugar_g": 0.5,
        "fibre_g": 2.8,
        "salt_g": 0.01,
    }
    defaults.update(kwargs)
    if "name" not in kwargs:
        defaults["name"] = unique_system_ingredient_name(defaults["name"])
    if "retail_section" not in kwargs:
        defaults["retail_section"] = make_retail_section()
    return baker.make(Ingredient, **defaults)


def unique_system_ingredient_name(base: str) -> str:
    """Return ``base`` or a numbered variant that `uniq_system_ingredient_name` allows."""
    name = base
    suffix = 2
    while Ingredient.objects.filter(name__iexact=name, owner__isnull=True).exists():
        name = f"{base} {suffix}"
        suffix += 1
    return name


def make_portion(ingredient: Ingredient | None = None, **kwargs) -> Portion:
    if ingredient is None:
        ingredient = make_ingredient()
    defaults = {
        "name": "100g Mehl",
        "quantity": 100.0,
        "weight_g": 100.0,
    }
    defaults.update(kwargs)
    if "measuring_unit" not in kwargs:
        defaults["measuring_unit"] = make_measuring_unit()
    return baker.make(Portion, ingredient=ingredient, **defaults)


def make_legacy_ingredient(name: str, **fields) -> Ingredient:
    """Ingredient stored as before the import gate: values are written verbatim.

    ``Ingredient.save`` runs `import_gate_new_ingredient`, which repairs nutrition
    and assigns a retail section. Tests for cleanup tooling need the unrepaired
    data, so the fields are applied with a queryset update after creation.
    """
    fields.setdefault("retail_section", None)
    fields.setdefault("retail_section_source", "")
    ingredient = Ingredient.objects.create(name=name)
    Ingredient.objects.filter(pk=ingredient.pk).update(**fields)
    ingredient.refresh_from_db()
    return ingredient
