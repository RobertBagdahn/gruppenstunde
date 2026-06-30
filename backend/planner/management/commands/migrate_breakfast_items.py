"""Migrate old breakfast wizard MealItems to new portion-based format.

Old format: quantity=grams_per_person, factor=normPortions, measuring_unit='g'
New format: quantity=portions_per_person, factor=1.0, measuring_unit=portion_unit
"""

from django.core.management.base import BaseCommand

from planner.models import MealItem
from supply.models import MeasuringUnit, Portion


def _find_best_portion(ingredient, measuring_unit) -> Portion | None:
    """Find or infer the best Portion for an ingredient."""
    name = measuring_unit.name.lower()
    # Try new-style named portion units (Scheibe, Portion)
    if name in ("scheibe", "portion"):
        portions = list(ingredient.portions.filter(measuring_unit=measuring_unit).order_by("-is_default", "-priority"))
        if portions:
            return portions[0]
    # Try 'g' unit portions (old seed data)
    g_unit = MeasuringUnit.objects.filter(name="g").first()
    if g_unit:
        portions = list(ingredient.portions.filter(measuring_unit=g_unit).order_by("-is_default", "-priority"))
        if portions:
            return portions[0]
    return None


class Command(BaseCommand):
    help = "Migrate old breakfast wizard MealItems to portion-based format."

    def handle(self, *args, **options):
        # Find all items that are likely old-format:
        # 1. factor > 1 (factor=normPortions, quantity=grams) OR
        # 2. factor=1.0, measuring_unit='g'/'ml', quantity > 3 (grams, not portions)
        g_unit = MeasuringUnit.objects.filter(name="g").first()
        ml_unit = MeasuringUnit.objects.filter(name="ml").first()
        raw_units = [u for u in [g_unit, ml_unit] if u]

        from django.db.models import Q

        query = Q(ingredient__isnull=False, factor__gt=1.0)
        if raw_units:
            query |= Q(ingredient__isnull=False, factor=1.0, measuring_unit__in=raw_units, quantity__gt=3)

        old_items = MealItem.objects.filter(query).select_related("ingredient", "measuring_unit")

        updated = 0
        skipped = 0
        errors = []

        for item in old_items:
            if not item.quantity or not item.measuring_unit:
                skipped += 1
                continue

            ingredient = item.ingredient
            mu = item.measuring_unit
            old_quantity = float(item.quantity)

            # Determine target portion unit based on ingredient tags
            tags = list(ingredient.tags.values_list("slug", flat=True))
            if "breakfast-base" in tags:
                target_unit_name = "Scheibe"
            elif "breakfast-topping" in tags:
                target_unit_name = "Portion"
            elif "breakfast-drink" in tags:
                target_unit_name = "Tasse (200ml)"
            else:
                target_unit_name = mu.name  # keep current

            target_unit = MeasuringUnit.objects.filter(name=target_unit_name).first()
            if not target_unit:
                errors.append(
                    f"No measuring unit '{target_unit_name}' for ingredient #{ingredient.id} ({ingredient.name})"
                )
                skipped += 1
                continue

            # Find portion weight for conversion
            portion = _find_best_portion(ingredient, target_unit)
            if not portion:
                # Try the 'g' unit
                g_unit = MeasuringUnit.objects.filter(name="g").first()
                if target_unit_name == "Scheibe" and ingredient.standard_recipe_weight_g:
                    weight_g = float(ingredient.standard_recipe_weight_g)
                elif target_unit_name == "Tasse (200ml)":
                    weight_g = 200.0
                elif target_unit_name == "Schuss (30ml)":
                    weight_g = 30.0
                else:
                    weight_g = 10.0  # fallback

                # Auto-create the portion
                portion = Portion.objects.create(
                    ingredient=ingredient,
                    measuring_unit=target_unit,
                    name=target_unit_name,
                    quantity=1,
                    weight_g=weight_g,
                )
                self.stdout.write(f"  CREATED Portion '{target_unit_name}' ({weight_g}g) for {ingredient.name}")

            if portion.weight_g and portion.weight_g > 0:
                new_quantity = old_quantity / float(portion.weight_g)
                item.quantity = new_quantity
                item.measuring_unit = target_unit
                item.factor = 1.0
                item.save(update_fields=["quantity", "measuring_unit", "factor"])
                updated += 1
                self.stdout.write(
                    f"  MIGRATED item #{item.id}: {ingredient.name} {old_quantity}{mu.name} → {new_quantity:.2f} {target_unit_name} (×1.0)"
                )
            else:
                # Can't convert — just set factor to 1.0 and keep grams
                item.factor = 1.0
                item.save(update_fields=["factor"])
                skipped += 1
                self.stdout.write(f"  SKIP item #{item.id}: {ingredient.name} — no valid portion weight")

        self.stdout.write(self.style.SUCCESS(f"\nMigrated {updated} items, skipped {skipped}."))
        if errors:
            for err in errors:
                self.stderr.write(self.style.ERROR(err))
