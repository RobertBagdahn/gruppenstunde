"""Signals for supply app — Portion weight_g calculation, Ingredient base portion."""

from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver

from .choices import MeasuringUnitType, PhysicalViscosityChoices
from .models.ingredient import Ingredient, Portion


@receiver(pre_save, sender=Portion)
def calculate_portion_weight_g(sender, instance: Portion, **kwargs):
    """Auto-calculate weight_g based on quantity, measuring_unit, and ingredient density."""
    if not instance.measuring_unit_id:
        return

    mu = instance.measuring_unit
    if mu.unit == MeasuringUnitType.MASS:
        # g-based: weight_g = quantity × measuring_unit.quantity
        instance.weight_g = instance.quantity * mu.quantity
    elif mu.unit == MeasuringUnitType.VOLUME:
        # ml-based: weight_g = quantity × measuring_unit.quantity × density
        density = 1.0
        if instance.ingredient_id:
            try:
                density = instance.ingredient.physical_density or 1.0
            except Ingredient.DoesNotExist:
                pass
        instance.weight_g = instance.quantity * mu.quantity * density
    # else: leave weight_g as-is (manually/AI set for Stück etc.)


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
