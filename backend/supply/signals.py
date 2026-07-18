"""Signals for supply app — Portion weight_g calculation, embedding generation, quality score calculation, and audit logging."""

from django.db import transaction
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver

from core.services.background import run_in_background
from .models.ingredient import Ingredient, Portion


@receiver(pre_save, sender=Portion, dispatch_uid="supply.calculate_portion_weight_g")
def calculate_portion_weight_g(sender, instance: Portion, **kwargs):
    """Auto-calculate weight_g based on quantity, measuring_unit, and ingredient density."""
    instance.weight_g = instance.compute_weight_g(instance.weight_g)


# ---------------------------------------------------------------------------
# Ingredient embedding & quality score signals
# ---------------------------------------------------------------------------


@receiver(post_save, sender=Ingredient, dispatch_uid="supply.update_ingredient_embedding_and_score")
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
        except Exception as e:
            import logging

            logging.getLogger(__name__).warning(
                "Failed to update embedding/score for Ingredient #%d: %s", instance.pk, str(e), exc_info=True
            )
        finally:
            if hasattr(instance, "_updating_embedding"):
                delattr(instance, "_updating_embedding")

    transaction.on_commit(lambda: run_in_background(_do_update))


def _embedding_fields_changed(instance, created: bool) -> bool:
    """Check if fields relevant to ingredient embedding have changed.

    The embedding text is built from name, description, and retail_section only
    (see build_ingredient_embedding_text) — so only these fields are considered
    "relevant" here. Uses _old_values (set by capture_ingredient_old_values
    pre_save signal) to determine if any embedding-relevant field changed.
    Falls back to True (conservative) when old values are not available.
    """
    if created:
        return True
    old_values = getattr(instance, "_old_values", None)
    if old_values is None:
        # No pre-save snapshot available — assume changed (conservative)
        return True

    relevant = {
        "name",
        "description",
        "retail_section_id",
    }
    for field in relevant:
        old_val = old_values.get(field)
        new_val = getattr(instance, field, None)
        if old_val != new_val:
            return True
    return False


def timezone_now():
    from django.utils import timezone

    return timezone.now()


# ---------------------------------------------------------------------------
# Ingredient audit log signals
# ---------------------------------------------------------------------------

_ingredient_tracked_fields = {
    "name",
    "description",
    "price_per_kg",
    "energy_kcal",
    "protein_g",
    "fat_g",
    "carbohydrate_g",
    "sugar_g",
    "fibre_g",
    "salt_g",
    "fat_sat_g",
    "sodium_mg",
    "fructose_g",
    "lactose_g",
    "vitamin_c_mg",
    "child_score",
    "scout_score",
    "environmental_score",
    "nova_score",
    "fruit_factor",
    "nutri_score",
    "nutri_class",
    "physical_density",
    "physical_viscosity",
    "durability_in_days",
    "max_storage_temperature",
    "storage_type",
    "cooking_factor",
    "camp_suitable",
    "preparation_time_min",
    "season_start",
    "season_end",
    "status",
    "retail_section_id",
    "is_standalone_food",
    "standalone_type",
}


@receiver(pre_save, sender=Ingredient, dispatch_uid="supply.capture_ingredient_old_values")
def capture_ingredient_old_values(sender, instance: Ingredient, **kwargs):
    """Store old values before save for audit logging."""
    if instance.pk is None:
        instance._old_values = {}
        return

    try:
        old = Ingredient.objects.get(pk=instance.pk)
        instance._old_values = {field: getattr(old, field, None) for field in _ingredient_tracked_fields}
    except Ingredient.DoesNotExist:
        instance._old_values = {}


@receiver(post_save, sender=Ingredient, dispatch_uid="supply.log_ingredient_changes")
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
