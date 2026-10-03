"""Tests for reviewed create and tag mappings."""

import pytest

from planner.tests import make_buffet_roles
from recipe.models import Recipe
from supply.data.buffet_role_mapping import RoleMapping, role_mappings_from_export
from supply.models import Ingredient, MeasuringUnit, Portion
from supply.services.buffet_role_migration import migrate_buffet_roles
from supply.tests import make_ingredient, make_retail_section


@pytest.mark.django_db
def test_untag_mapping_removes_only_selected_roles():
    roles = make_buffet_roles()
    ingredient = make_ingredient(name="Zutat mit zwei Rollen")
    ingredient.tags.add(roles["buffet-bread"], roles["buffet-fresh"])

    migrate_buffet_roles(
        dry_run=False,
        mapping=(
            RoleMapping(
                action="untag",
                kind="ingredient",
                id=ingredient.id,
                name=ingredient.name,
                role_slugs=("buffet-bread",),
            ),
        ),
    )

    ingredient.refresh_from_db()
    assert not ingredient.tags.filter(slug="buffet-bread").exists()
    assert ingredient.tags.filter(slug="buffet-fresh").exists()


@pytest.mark.django_db
def test_merge_requires_expected_target_name():
    make_buffet_roles()
    source = make_ingredient(name="Quelle")
    target = make_ingredient(name="Ziel")

    report = migrate_buffet_roles(
        dry_run=True,
        mapping=(
            RoleMapping(
                action="merge_into",
                kind="ingredient",
                id=source.id,
                name=source.name,
                target_id=target.id,
                target_name="Falscher Zielname",
            ),
        ),
    )

    assert report.total_changes == 0
    assert any("Zielname" in message for message in report.skipped)
    source.refresh_from_db()
    assert not source.is_deleted


@pytest.mark.django_db
def test_create_ingredient_dry_run_then_reviewed_apply_is_idempotent():
    make_buffet_roles()
    make_retail_section(name="Knabberartikel")
    gram_unit, _ = MeasuringUnit.objects.get_or_create(name="Gramm", defaults={"unit": "g", "quantity": 1.0})
    data = {
        "name": "Neue Salzstange",
        "energy_kcal": 380,
        "retail_section": "Knabberartikel",
        "is_standalone_food": True,
        "portions": [{"name": "Handvoll", "measuring_unit_name": "Gramm", "quantity": 30, "weight_g": 30, "rank": 1}],
    }
    mapping = (
        RoleMapping(
            action="create",
            kind="ingredient",
            id=None,
            name="Neue Salzstange",
            role="buffet-salty-snack",
            role_slugs=("buffet-salty-snack",),
            create_data=data,
        ),
    )

    dry_run = migrate_buffet_roles(dry_run=True, mapping=mapping)
    assert dry_run.changes["create"] == 1
    assert not Ingredient.objects.filter(name="Neue Salzstange").exists()

    applied = migrate_buffet_roles(dry_run=False, mapping=mapping)
    ingredient = Ingredient.objects.get(name="Neue Salzstange")
    assert applied.changes["create"] == 1
    assert ingredient.status == "verified"
    assert ingredient.tags.filter(slug="buffet-salty-snack").exists()
    assert Portion.objects.active().filter(ingredient=ingredient, name="Handvoll", weight_g=30).exists()

    second_apply = migrate_buffet_roles(dry_run=False, mapping=mapping)
    assert second_apply.total_changes == 0
    assert Ingredient.objects.filter(name="Neue Salzstange").count() == 1
    assert gram_unit.unit == "g"


@pytest.mark.django_db
def test_create_recipe_remains_in_existing_staff_review_flow():
    make_buffet_roles()
    ingredient = make_ingredient(name="Nudeln für Rezept", owner=None)
    portion = Portion.objects.active().filter(ingredient=ingredient).first()
    assert portion is not None
    mapping = (
        RoleMapping(
            action="create",
            kind="recipe",
            id=None,
            name="Neue Nudelsuppe",
            role="buffet-dish",
            role_slugs=("buffet-dish",),
            create_data={
                "title": "Neue Nudelsuppe",
                "recipe_type": "warm_meal",
                "portions": 2,
                "items": [
                    {
                        "ingredient_id": ingredient.id,
                        "ingredient_name": ingredient.name,
                        "portion_id": portion.id,
                        "expected_portion_name": portion.name,
                        "quantity": 200,
                        "unit": "g",
                    }
                ],
                "steps": ["Die Zutaten kochen."],
            },
        ),
    )

    report = migrate_buffet_roles(dry_run=False, mapping=mapping)

    recipe = Recipe.objects.get(title="Neue Nudelsuppe")
    assert report.changes["create"] == 1
    assert recipe.status == "draft"
    assert recipe.owner_id is None
    assert recipe.tags.filter(slug="buffet-dish").exists()
    assert recipe.recipe_items.count() == 1


def test_reviewed_export_expands_multiple_role_assignments():
    mappings = role_mappings_from_export(
        {
            "items": [
                {
                    "action": "add",
                    "item_kind": "ingredient",
                    "source_id": 7,
                    "source_name": "Tomaten",
                    "role_slugs": ["buffet-fresh", "buffet-salad"],
                }
            ]
        }
    )

    assert len(mappings) == 2
    assert {mapping.role for mapping in mappings} == {"buffet-fresh", "buffet-salad"}
