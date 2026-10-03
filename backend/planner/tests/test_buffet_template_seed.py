"""Tests for the idempotent buffet template seed."""

from io import StringIO

import pytest
from django.core.management import call_command

from planner.models import BuffetTemplate
from planner.services.buffet_template_seed import BUFFET_TEMPLATE_SEEDS, seed_buffet_templates
from planner.tests import make_buffet_roles, make_buffet_template


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
