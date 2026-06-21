"""Signals for supply app — Portion weight_g calculation, Ingredient base portion,
 embedding generation, quality score calculation, and audit logging."""

import threading

from django.db import transaction
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from .choices import MeasuringUnitType, PhysicalViscosityChoices
from .models.ingredient import Ingredient, Portion


@receiver(pre_save, sender=Portion)
def calculate_portion_weight_g(sender, instance: Portion, **kwargs):
    """Auto-calculate weight_g based on quantity, measuring_unit, and ingredient density."""
    instance.weight_g = instance.compute_weight_g(instance.weight_g)


@receiver(post_save, sender=Ingredient)
def create_dummy_recipe_for_standalone_food(sender, instance: Ingredient, created: bool, **kwargs):
    """
    Erstellt automatisch ein Dummy-Rezept wenn is_standalone_food=True gesetzt wird.
    Das Rezept hat recipe_type='ingredient', den Zutaten-Namen als Titel und
    eine Standard-Portion als RecipeItem.
    """
    if not instance.is_standalone_food:
        return

    # Nur auslösen wenn neu erstellt oder is_standalone_food gerade aktiviert wurde
    old_values = getattr(instance, "_old_values", {})
    was_standalone = old_values.get("is_standalone_food", False)
    if not created and was_standalone:
        return  # Flag war bereits gesetzt, kein neues Rezept anlegen

    def _create_recipe():
        from recipe.models import Recipe, RecipeItem
        from django.utils.text import slugify
        import logging
        import uuid

        logger = logging.getLogger(__name__)

        # Standard-Portion für das RecipeItem ermitteln
        default_portion = instance.portions.filter(is_default=True).first()
        if not default_portion:
            default_portion = instance.portions.first()

        # Prüfen ob schon ein Dummy-Rezept für diese Zutat existiert
        existing = Recipe.objects.filter(
            title=instance.name,
            owner=getattr(instance, "_changed_by", None),
        ).first()
        if existing:
            has_ingredient = RecipeItem.objects.filter(
                recipe=existing,
                portion__ingredient=instance,
            ).exists()
            if not has_ingredient and default_portion:
                try:
                    RecipeItem.objects.create(
                        recipe=existing,
                        portion=default_portion,
                        quantity=1,
                        sort_order=existing.recipe_items.count(),
                    )
                except Exception:
                    logger.exception(
                        "Failed to add RecipeItem to existing recipe #%d for ingredient #%d",
                        existing.pk, instance.pk,
                    )
            return

        # Slug sicherstellen
        base_slug = slugify(instance.name) or f"ingredient-{instance.pk}"
        slug = base_slug
        counter = 1
        while Recipe.objects.filter(slug=slug).exists():
            slug = f"{base_slug}-{counter}"
            counter += 1

        owner = getattr(instance, "_changed_by", None)
        recipe_type = instance.standalone_type or "snack"

        recipe = Recipe.objects.create(
            title=instance.name,
            slug=slug,
            recipe_type=recipe_type,
            portions=1,
            owner=owner,
            status="approved",
            visibility="public" if owner is None else "private",
        )

        if default_portion:
            try:
                RecipeItem.objects.create(
                    recipe=recipe,
                    portion=default_portion,
                    quantity=1,
                    sort_order=0,
                )
            except Exception:
                logger.exception(
                    "Failed to create RecipeItem for recipe #%d (ingredient #%d)",
                    recipe.pk, instance.pk,
                )

    transaction.on_commit(_create_recipe)


@receiver(post_save, sender=Ingredient)
def create_base_portion_for_ingredient(sender, instance: Ingredient, created: bool, **kwargs):
    """Ensure every Ingredient has a default base portion (1g or 1ml)."""
    if not created:
        return

    from .models.reference import MeasuringUnit

    if instance.physical_viscosity == PhysicalViscosityChoices.BEVERAGE:
        unit_type = MeasuringUnitType.VOLUME
        name = "ml"
        weight_g = instance.physical_density or 1.0
    else:
        unit_type = MeasuringUnitType.MASS
        name = "g"
        weight_g = 1.0

    # Get or create the base measuring unit (1g or 1ml)
    mu = MeasuringUnit.objects.filter(unit=unit_type, quantity=1).first()
    if not mu:
        mu = MeasuringUnit.objects.create(
            name=name,
            quantity=1,
            unit=unit_type,
        )

    Portion.objects.create(
        name=name,
        measuring_unit=mu,
        ingredient=instance,
        quantity=1,
        weight_g=weight_g,
        is_default=True,
    )


# ---------------------------------------------------------------------------
# Ingredient embedding & quality score signals
# ---------------------------------------------------------------------------


@receiver(post_save, sender=Ingredient)
def update_ingredient_embedding_and_score(sender, instance: Ingredient, created: bool, **kwargs):
    """After save, asynchronously update embedding and quality score."""
    if hasattr(instance, "_updating_embedding"):
        return

    def _do_update():
        try:
            instance._updating_embedding = True
            # Update quality score (fast, local)
            from supply.services.quality_score import calculate_ingredient_quality_score

            new_score = calculate_ingredient_quality_score(instance)
            if instance.quality_score != new_score:
                instance.quality_score = new_score
                instance.quality_score_updated_at = timezone_now()
                instance.save(update_fields=["quality_score", "quality_score_updated_at"])

            # Update embedding (slow, API call) — only on relevant field changes
            if _embedding_fields_changed(instance, created):
                from content.services.embedding_service import update_ingredient_embedding

                update_ingredient_embedding(instance)
        except Exception:
            import logging

            logging.getLogger(__name__).warning("Failed to update embedding/score for Ingredient #%d", instance.pk)
        finally:
            if hasattr(instance, "_updating_embedding"):
                delattr(instance, "_updating_embedding")

    transaction.on_commit(lambda: threading.Thread(target=_do_update, daemon=True).start())


def _embedding_fields_changed(instance, created: bool) -> bool:
    """Check if fields relevant to embedding have changed."""
    if created:
        return True
    if instance.tracker and hasattr(instance.tracker, "changed"):
        relevant = {
            "name", "description", "retail_section_id",
            "short_description", "uses", "source",
            "season_start", "season_end",
            "energy_kcal", "protein_g", "fat_g", "carbohydrate_g",
            "sugar_g", "fibre_g", "salt_g", "fat_sat_g",
            "vitamin_c_mg", "child_score", "scout_score", "environment_score",
            "child_fave", "scout_fave", "is_vegetarian", "is_vegan",
            "is_gluten_free", "is_lactose_free", "price_per_kg",
            "regional_months", "aliases",
        }
        return bool(relevant & set(instance.tracker.changed()))
    return True  # Conservative: update if we can't determine


def timezone_now():
    from django.utils import timezone

    return timezone.now()


# ---------------------------------------------------------------------------
# Ingredient audit log signals
# ---------------------------------------------------------------------------

_ingredient_tracked_fields = {
    "name", "description", "price_per_kg", "energy_kcal", "protein_g", "fat_g",
    "carbohydrate_g", "sugar_g", "fibre_g", "salt_g", "fat_sat_g", "sodium_mg",
    "fructose_g", "lactose_g", "vitamin_c_mg", "child_score", "scout_score",
    "environmental_score", "nova_score", "fruit_factor", "nutri_score", "nutri_class",
    "physical_density", "physical_viscosity", "durability_in_days",
    "max_storage_temperature", "storage_type", "cooking_factor", "camp_suitable",
    "preparation_time_min", "season_start", "season_end", "status", "retail_section_id",
    "is_standalone_food", "standalone_type",
}


@receiver(pre_save, sender=Ingredient)
def capture_ingredient_old_values(sender, instance: Ingredient, **kwargs):
    """Store old values before save for audit logging."""
    if instance.pk is None:
        instance._old_values = {}
        return

    try:
        old = Ingredient.objects.get(pk=instance.pk)
        instance._old_values = {
            field: getattr(old, field, None) for field in _ingredient_tracked_fields
        }
    except Ingredient.DoesNotExist:
        instance._old_values = {}


@receiver(post_save, sender=Ingredient)
def log_ingredient_changes(sender, instance: Ingredient, created: bool, **kwargs):
    """Log field-level changes to ChangeAuditLog."""
    if created:
        return

    old_values = getattr(instance, "_old_values", {})
    if not old_values:
        return

    from content.services.audit_service import log_field_change

    user = getattr(instance, "_changed_by", None)

    for field in _ingredient_tracked_fields:
        new_value = getattr(instance, field, None)
        old_value = old_values.get(field)
        if str(old_value) != str(new_value):
            log_field_change(instance, field, old_value, new_value, user=user)
