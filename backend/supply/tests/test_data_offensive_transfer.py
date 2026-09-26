"""Roundtrip tests for the data offensive export/apply package."""

import datetime as dt

import pytest
from django.utils import timezone

from supply.services.data_offensive_transfer import apply_package, build_package


@pytest.mark.django_db
def test_package_roundtrip_applies_corrections_and_respects_manual_sections():
    from supply.models import Ingredient, RetailSection

    obst = RetailSection.objects.create(name="Obst", rank=1)
    saefte = RetailSection.objects.create(name="Säfte & Smoothies", rank=31)
    juice = Ingredient.objects.create(
        name="Orangensaft",
        energy_kcal=45,
        retail_section=saefte,
        retail_section_source="ai",
        ai_reviewed_at=timezone.now(),
        ai_review_verdict="corrected",
    )
    manual = Ingredient.objects.create(
        name="Apfel", energy_kcal=52, retail_section=saefte, retail_section_source="ai", ai_reviewed_at=timezone.now()
    )
    package = build_package(since=timezone.now() - dt.timedelta(days=1))

    # Simulate the target environment: stale values and a manual choice.
    Ingredient.objects.filter(id=juice.id).update(energy_kcal=188, retail_section=obst, retail_section_source="")
    Ingredient.objects.filter(id=manual.id).update(retail_section=obst, retail_section_source="manual")

    dry = apply_package(package, apply=False)
    juice.refresh_from_db()
    assert dry.ingredients_updated == 2
    assert juice.energy_kcal == 188

    apply_package(package, apply=True)
    juice.refresh_from_db()
    manual.refresh_from_db()
    assert juice.energy_kcal == 45
    assert juice.retail_section_id == saefte.id
    assert manual.retail_section_id == obst.id


@pytest.mark.django_db
def test_unknown_package_version_is_rejected():
    with pytest.raises(ValueError):
        apply_package({"version": 99}, apply=False)
