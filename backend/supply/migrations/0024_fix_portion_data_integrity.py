"""Data migration for Portion and MeasuringUnit data integrity.

- Task 5.1: Remaps duplicate measuring units 87-99 to canonical 61-75, updates Portions referencing them, deletes empty duplicates.
- Task 5.2: Deduplicates Portions per ingredient based on (ingredient_id, name.strip().lower(), measuring_unit_id, rounded quantity), updates RecipeItem.portion, and soft-deletes duplicate portions.
- Task 5.3: Derives empty/blank or "g" portion names from the associated measuring unit name (or fallback to "Stück").
- Task 5.4: Computes/fills null weight_g values via central weight_g formula (quantity * measuring_unit.quantity).
- Task 5.6: Recalculates recipe cache for all affected recipes.
"""

from django.db import migrations
from django.utils import timezone


def fix_portion_data_integrity(apps, schema_editor):
    MeasuringUnit = apps.get_model("supply", "MeasuringUnit")
    Portion = apps.get_model("supply", "Portion")
    RecipeItem = apps.get_model("recipe", "RecipeItem")
    Recipe = apps.get_model("recipe", "Recipe")

    # 1. Remap duplicate measuring units (87–99) to canonical ones (61–75)
    duplicate_units = MeasuringUnit.objects.filter(id__gte=87, id__lte=99)
    for dup in duplicate_units:
        # Search for canonical matching unit by name
        canonical = MeasuringUnit.objects.filter(name__iexact=dup.name).exclude(id=dup.id).order_by("id").first()
        if not canonical:
            # Synonyms check
            try:
                from supply.services.unit_resolution import SYNONYMS

                canon_name = SYNONYMS.get(dup.name.lower().strip())
                if canon_name:
                    canonical = (
                        MeasuringUnit.objects.filter(name__iexact=canon_name).exclude(id=dup.id).order_by("id").first()
                    )
            except ImportError:
                pass

        if canonical:
            # Remap portions and delete the duplicate
            Portion.objects.filter(measuring_unit_id=dup.id).update(measuring_unit_id=canonical.id)
            dup.delete()

    # 2. Derive empty/blank or "g" portion names from measuring unit names (Task 5.3)
    from django.db.models import Q

    bad_name_portions = Portion.objects.filter(Q(name="") | Q(name__isnull=True) | Q(name="g"))
    for p in bad_name_portions:
        mu_id = p.measuring_unit_id
        if mu_id:
            try:
                mu = MeasuringUnit.objects.get(id=mu_id)
                derived_name = mu.name
            except MeasuringUnit.DoesNotExist:
                derived_name = "Stück"
        else:
            derived_name = "Stück"

        if not derived_name or derived_name == "g":
            derived_name = "Stück"

        p.name = derived_name
        p.save(update_fields=["name"])

    # 3. Calculate null/invalid weight_g via quantity * measuring_unit.quantity (Task 5.4)
    # We should run this for any portion where weight_g is NULL or <= 0
    portions_to_calc = Portion.objects.filter(Q(weight_g__isnull=True) | Q(weight_g__lte=0))
    for p in portions_to_calc:
        mu_id = p.measuring_unit_id
        if mu_id:
            try:
                mu = MeasuringUnit.objects.get(id=mu_id)
                mu_quantity = mu.quantity or 0
            except MeasuringUnit.DoesNotExist:
                mu_quantity = 0
            calc = (p.quantity or 0) * mu_quantity
            p.weight_g = calc if calc > 0 else None
            p.save(update_fields=["weight_g"])

    # 4. Portion deduplication per ingredient (Task 5.2)
    # Retrieve active portions
    all_portions = Portion.objects.filter(deleted_at__isnull=True).order_by("id")
    seen = {}  # (ingredient_id, name_lower, measuring_unit_id, rounded_quantity) -> canonical_portion_id
    recalculated_recipe_ids = set()

    for p in all_portions:
        cleaned_name = p.name.strip().lower()
        rounded_quantity = round(float(p.quantity or 0), 4)
        key = (p.ingredient_id, cleaned_name, p.measuring_unit_id, rounded_quantity)

        if key in seen:
            canonical_id = seen[key]
            # Find any RecipeItems using the duplicate portion, update them to canonical portion
            affected_items = RecipeItem.objects.filter(portion_id=p.id)
            for item in affected_items:
                recalculated_recipe_ids.add(item.recipe_id)
            affected_items.update(portion_id=canonical_id)

            # Soft delete the duplicate portion
            p.deleted_at = timezone.now()
            p.save(update_fields=["deleted_at"])
        else:
            seen[key] = p.id

    # 5. Recalculate recipe caches for affected recipes (Task 5.6)
    if recalculated_recipe_ids:
        try:
            from recipe.services.recipe_checks import recalculate_recipe_cache

            for recipe in Recipe.objects.filter(id__in=list(recalculated_recipe_ids)):
                try:
                    recalculate_recipe_cache(recipe)
                except Exception:
                    pass
        except ImportError:
            pass


def reverse_portion_data_integrity(apps, schema_editor):
    pass  # Data recovery not needed or reversible on rollback


class Migration(migrations.Migration):
    dependencies = [
        ("supply", "0023_fix_portion_weight_g_data"),
        ("recipe", "0025_recipe_cached_energy_total_kj"),
    ]

    operations = [
        migrations.RunPython(fix_portion_data_integrity, reverse_portion_data_integrity),
    ]
