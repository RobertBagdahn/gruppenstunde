"""Tests for the idempotent buffet template seed."""

from io import StringIO

import pytest
from django.core.management import call_command
from model_bakery import baker

from planner.models import BuffetTemplate
from planner.services.buffet_template_seed import BUFFET_TEMPLATE_SEEDS, seed_buffet_templates
from planner.tests import make_buffet_roles, make_buffet_template
from recipe.models import Recipe
from supply.models import Ingredient


@pytest.mark.django_db
def test_seed_creates_all_templates_with_drinks_and_is_idempotent():
    make_buffet_roles()

    first_report = seed_buffet_templates()
    second_report = seed_buffet_templates()

    assert len(first_report.created) == len(BUFFET_TEMPLATE_SEEDS)
    assert not first_report.existing
    assert not second_report.created
    assert len(second_report.existing) == len(BUFFET_TEMPLATE_SEEDS)
    assert BuffetTemplate.objects.count() == len(BUFFET_TEMPLATE_SEEDS)
    assert all(template.roles.filter(role__slug="buffet-drink").exists() for template in BuffetTemplate.objects.all())


@pytest.mark.django_db
def test_seed_command_defaults_to_dry_run():
    make_buffet_roles()
    output = StringIO()

    call_command("seed_buffet_templates", stdout=output)

    assert "Dry-Run: nichts gespeichert." in output.getvalue()
    assert BuffetTemplate.objects.count() == 0


@pytest.mark.django_db
def test_free_template_contains_all_roles_and_only_starts_core_roles_enabled():
    make_buffet_roles()
    seed_buffet_templates()

    template = BuffetTemplate.objects.get(slug="free")
    roles = {role.role.slug: role for role in template.roles.select_related("role")}
    enabled = {slug for slug, role in roles.items() if role.enabled_by_default}

    assert len(roles) == 19
    assert enabled == {"buffet-bread", "buffet-savory", "buffet-fresh", "buffet-drink"}
    assert roles["buffet-drink"].amount_per_person == 250
    assert roles["buffet-drink"].unit == "ml"
    assert roles["buffet-soup"].unit == "ml"


@pytest.mark.django_db
def test_drinks_template_contains_only_drinks_role():
    make_buffet_roles()
    seed_buffet_templates()

    template = BuffetTemplate.objects.get(slug="drinks-bar")
    roles = list(template.roles.select_related("role"))

    assert len(roles) == 1
    assert roles[0].role.slug == "buffet-drink"
    assert roles[0].amount_per_person == 300
    assert roles[0].unit == "ml"


@pytest.mark.django_db
def test_named_drinks_presets_seed_complete_default_selections():
    make_buffet_roles()
    for name in ("Saft (Apfel)", "Saft (Multivitamin)", "Saft (Orange)"):
        baker.make(Ingredient, name=name, owner=None)
    tea = baker.make(Recipe, title="Ingwertee mit Zitronen", recipe_type="drink", owner=None)
    drink_seeds = tuple(seed for seed in BUFFET_TEMPLATE_SEEDS if seed.slug in {"house-trip-juices", "camp-lemon-tea"})

    seed_buffet_templates(seeds=drink_seeds)

    juice_role = BuffetTemplate.objects.get(slug="house-trip-juices").roles.get(role__slug="buffet-drink")
    tea_role = BuffetTemplate.objects.get(slug="camp-lemon-tea").roles.get(role__slug="buffet-drink")
    assert set(juice_role.default_ingredients.values_list("name", flat=True)) == {
        "Saft (Apfel)",
        "Saft (Multivitamin)",
        "Saft (Orange)",
    }
    assert list(tea_role.default_recipes.all()) == [tea]


@pytest.mark.django_db
def test_seed_can_fill_only_empty_defaults_of_existing_templates():
    make_buffet_roles()
    ingredient = baker.make(Ingredient, name="Brotchips Tomate-Olive", owner=None)
    snack_seed = next(seed for seed in BUFFET_TEMPLATE_SEEDS if seed.slug == "snack-platter")
    template = make_buffet_template(
        slug="snack-platter",
        roles={
            "buffet-fresh": (150, "g", True),
            "buffet-dip": (40, "g", True),
            "buffet-cheese": (30, "g", True),
            "buffet-salty-snack": (25, "g", True),
            "buffet-drink": (250, "ml", True),
            "buffet-nuts": (20, "g", False),
            "buffet-bread": (40, "g", False),
        },
    )
    salty_role = template.roles.get(role__slug="buffet-salty-snack")

    dry_run = seed_buffet_templates(seeds=(snack_seed,), dry_run=True, fill_missing_defaults=True)

    assert "Snackplatte / buffet-salty-snack: Brotchips Tomate-Olive" in dry_run.defaults_added
    assert not salty_role.default_ingredients.exists()

    seed_buffet_templates(seeds=(snack_seed,), fill_missing_defaults=True)
    assert list(salty_role.default_ingredients.all()) == [ingredient]

    salty_role.default_ingredients.clear()
    seed_buffet_templates(seeds=(snack_seed,))
    assert not salty_role.default_ingredients.exists()


@pytest.mark.django_db
def test_seed_does_not_overwrite_staff_edited_template():
    make_buffet_roles()
    template = make_buffet_template(
        slug="breakfast",
        name="Frühstück (angepasst)",
        roles={"buffet-bread": (175, "g", True)},
    )
    role = template.roles.get(role__slug="buffet-bread")
    role.enabled_by_default = False
    role.save(update_fields=["enabled_by_default"])

    seed_buffet_templates()

    template.refresh_from_db()
    role.refresh_from_db()
    assert template.name == "Frühstück (angepasst)"
    assert role.amount_per_person == 175
    assert role.enabled_by_default is False
