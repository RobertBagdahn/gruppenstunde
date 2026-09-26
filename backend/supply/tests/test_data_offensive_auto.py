"""Tests for the automatic decision rules of the data offensive."""

import pytest

from supply.services.data_offensive_auto import (
    auto_resolve,
    is_cosmetic_rename,
    is_safe_duplicate,
    is_safe_rename,
    is_spelling_variant,
)


@pytest.mark.parametrize(
    ("source", "target"),
    [
        ("Chia-Samen", "Chiasamen"),
        ("Auberginen", "Aubergine"),
        ("Datteln entkernt", "Datteln"),
        ("Dinkelmehl Type 630", "Dinkelmehl"),
        ("Brokkoli (Röschen)", "Brokkoli"),
    ],
)
def test_safe_duplicates(source, target):
    assert is_safe_duplicate(source, target)


@pytest.mark.parametrize(
    ("source", "target"),
    [
        ("Gehackte Mandeln", "Gehackte Walnüsse"),
        ("BBQ-Soße", "BBQ-Sauce light"),
        ("Gehackte Tomaten", "Gehackte Tomaten (Dose)"),
        ("Gnocchi Bio vegetarisch", "Gnocchi Bio"),
    ],
)
def test_unsafe_duplicates(source, target):
    assert not is_safe_duplicate(source, target)


def test_rename_rules():
    assert is_cosmetic_rename("Ananasstücke (Dose)", "Ananasstücke Dose")
    assert is_safe_rename("Butterkekse", "Butterkeks", 0.9)
    assert not is_safe_rename("Hartkäse Salgiano", "Salami", 0.95)
    assert not is_safe_rename("Wiener Würstchen (Dose)", "Wiener Würstchen in Dosen", 0.95)


def test_spelling_variants():
    assert is_spelling_variant("Knuspermüsli Nuss-Schoko", "Knuspermüsli Schoko-Nuss")
    assert not is_spelling_variant("Tomatenmark Bio", "Tomatenmark")


@pytest.mark.django_db
def test_auto_resolve_applies_plausible_suggestions_and_merges_safe_duplicates():
    from supply.models import Ingredient

    bonbon = Ingredient.objects.create(
        name="Bonbons zuckerfrei",
        energy_kcal=380,
        protein_g=0,
        fat_g=0,
        carbohydrate_g=95,
        sugar_g=90,
        fibre_g=0,
        salt_g=0,
        ai_review_verdict="corrected",
        ai_review_notes={"suggestions": {"sugar_g": 0.0}},
    )
    target = Ingredient.objects.create(name="Chiasamen")
    source = Ingredient.objects.create(
        name="Chia-Samen", ai_review_verdict="duplicate", ai_review_notes={"duplicate_of_id": target.id}
    )
    wrong = Ingredient.objects.create(
        name="Gehackte Mandeln", ai_review_verdict="duplicate", ai_review_notes={"duplicate_of_id": target.id}
    )
    junk = Ingredient.objects.create(name="LauchTest")

    report = auto_resolve(apply=True)

    bonbon.refresh_from_db()
    source.refresh_from_db()
    wrong.refresh_from_db()
    junk.refresh_from_db()
    assert bonbon.sugar_g == 0.0
    assert source.is_deleted
    assert not wrong.is_deleted
    assert junk.is_deleted
    assert report.duplicates_left == 1


@pytest.mark.django_db
def test_auto_resolve_dry_run_changes_nothing():
    from supply.models import Ingredient

    junk = Ingredient.objects.create(name="LauchTest")
    auto_resolve(apply=False)
    junk.refresh_from_db()
    assert not junk.is_deleted
