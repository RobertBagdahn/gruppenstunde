"""Tests for the unified Ingredient status (draft/verified) and visibility policy."""

import io
import json
from itertools import product

import pytest
from django.contrib.contenttypes.models import ContentType
from django.core.management import call_command
from django.db import IntegrityError, connection, transaction

from content.models import ChangeAuditLog
from content.services.food_access import can_read, matchable_ingredient_queryset, visible_ingredient_queryset
from profiles.models import GroupMembership, UserGroup
from recipe.models import Recipe, RecipeItem
from recipe.services.ingredient_matcher import IngredientMatcher
from supply.models import Ingredient, IngredientAlias, MeasuringUnit, Portion
from supply.services.ingredient_status import (
    SYSTEM,
    IngredientStatusPermissionError,
    set_ingredient_status,
)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def users(db, django_user_model):
    group = UserGroup.objects.create(name="Wölflinge", slug="woelflinge")
    creator = django_user_model.objects.create_user(username="creator", password="pw")
    owner = django_user_model.objects.create_user(username="owner", password="pw")
    stranger = django_user_model.objects.create_user(username="stranger", password="pw")
    member = django_user_model.objects.create_user(username="member", password="pw")
    staff = django_user_model.objects.create_user(username="staff", password="pw", is_staff=True)
    GroupMembership.objects.create(user=member, group=group, role="member", is_active=True)
    return {
        "creator": creator,
        "owner": owner,
        "stranger": stranger,
        "member": member,
        "staff": staff,
        "group": group,
    }


@pytest.fixture
def gram_unit(db):
    return MeasuringUnit.objects.create(name="Gramm", unit="g", quantity=1.0)


def _login(client, user):
    client.force_login(user)
    return client


# ---------------------------------------------------------------------------
# 1.4 Constraints and migration
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_invalid_status_is_rejected_by_database():
    with pytest.raises(IntegrityError), transaction.atomic():
        Ingredient.objects.create(name="Alt", slug="alt", status="user_content")


@pytest.mark.django_db
def test_public_requires_verified():
    with pytest.raises(IntegrityError), transaction.atomic():
        Ingredient.objects.create(name="Öffentlich", slug="oeffentlich", status="draft", visibility="public")


@pytest.mark.django_db
def test_migration_maps_legacy_status_to_draft_without_deleting():
    """Runs the data step of 0016 on rows with legacy values (tests run without migrations)."""
    import importlib

    from django.apps import apps

    if connection.vendor != "sqlite":
        pytest.skip("Legacy rows can only be inserted with SQLite's ignore_check_constraints")
    migration = importlib.import_module("supply.migrations.0016_ingredient_status_visibility_unification")
    with connection.cursor() as cursor:
        cursor.execute("PRAGMA ignore_check_constraints = ON")
    try:
        approved = Ingredient.objects.create(name="Lauch", slug="lauch-alt", status="approved")
        user_content = Ingredient.objects.create(name="Vorrat", slug="vorrat-alt", status="user_content")
        verified = Ingredient.objects.create(name="Mehl", slug="mehl-alt", status="verified")
    finally:
        with connection.cursor() as cursor:
            cursor.execute("PRAGMA ignore_check_constraints = OFF")

    migration.normalize_ingredient_status(apps, None)

    statuses = dict(
        Ingredient.all_objects.filter(id__in=[approved.id, user_content.id, verified.id]).values_list("id", "status")
    )
    assert statuses == {approved.id: "draft", user_content.id: "draft", verified.id: "verified"}


# ---------------------------------------------------------------------------
# 2.3 Schemas
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_patch_with_unknown_status_returns_422(admin_client):
    ingredient = Ingredient.objects.create(name="Mehl", slug="mehl", status="draft")
    resp = admin_client.patch(
        f"/api/ingredients/{ingredient.slug}/", data=json.dumps({"status": "approved"}), content_type="application/json"
    )
    assert resp.status_code == 422
    ingredient.refresh_from_db()
    assert ingredient.status == "draft"


@pytest.mark.django_db
def test_patch_with_public_visibility_returns_422(client, users):
    ingredient = Ingredient.objects.create(name="Pesto", slug="pesto", owner=users["owner"], created_by=users["owner"])
    resp = _login(client, users["owner"]).patch(
        f"/api/ingredients/{ingredient.slug}/",
        data=json.dumps({"visibility": "public"}),
        content_type="application/json",
    )
    assert resp.status_code == 422


@pytest.mark.django_db
def test_can_verify_flag(client, users):
    ingredient = Ingredient.objects.create(name="Mehl", slug="mehl", status="verified")
    assert _login(client, users["stranger"]).get(f"/api/ingredients/{ingredient.slug}/").json()["can_verify"] is False
    assert _login(client, users["staff"]).get(f"/api/ingredients/{ingredient.slug}/").json()["can_verify"] is True


# ---------------------------------------------------------------------------
# 3.6 Matrix: can_read == queryset
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_can_read_matches_queryset_for_all_combinations(users):
    from django.contrib.auth.models import AnonymousUser

    ingredients: list[Ingredient] = []
    for index, status in enumerate(["draft", "verified"]):
        ingredients.append(
            Ingredient.objects.create(
                name=f"System {status}", slug=f"system-{index}", status=status, created_by=users["creator"]
            )
        )
    for index, (status, visibility) in enumerate(product(["draft", "verified"], ["private", "shared", "public"])):
        if visibility == "public" and status != "verified":
            continue
        ingredient = Ingredient.objects.create(
            name=f"User {status} {visibility}",
            slug=f"user-{index}",
            status=status,
            visibility=visibility,
            owner=users["owner"],
            created_by=users["owner"],
        )
        if visibility == "shared":
            ingredient.shared_groups.add(users["group"])
        ingredients.append(ingredient)

    viewers = [AnonymousUser(), users["creator"], users["owner"], users["stranger"], users["member"], users["staff"]]
    for viewer in viewers:
        visible_ids = set(visible_ingredient_queryset(viewer).values_list("id", flat=True))
        for ingredient in ingredients:
            assert can_read(ingredient, viewer) == (ingredient.id in visible_ids), (str(viewer), ingredient.name)


@pytest.mark.django_db
def test_matrix_expectations(users):
    from django.contrib.auth.models import AnonymousUser

    system_draft = Ingredient.objects.create(name="Kidneybohnen", slug="kidney", created_by=users["creator"])
    system_verified = Ingredient.objects.create(name="Mehl", slug="mehl", status="verified")
    private_draft = Ingredient.objects.create(
        name="Pesto", slug="pesto", owner=users["owner"], created_by=users["owner"]
    )

    assert not can_read(system_draft, AnonymousUser())
    assert can_read(system_verified, AnonymousUser())
    assert can_read(system_draft, users["creator"])
    assert not can_read(system_draft, users["stranger"])
    assert can_read(system_draft, users["staff"])
    assert not can_read(private_draft, users["stranger"])
    assert can_read(private_draft, users["owner"])


# ---------------------------------------------------------------------------
# 3.7 API behaviour
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_anonymous_reads_verified_but_not_draft(api_client):
    verified = Ingredient.objects.create(name="Mehl", slug="mehl", status="verified")
    draft = Ingredient.objects.create(name="Kidneybohnen aus der Dose", slug="kidney")
    assert api_client.get(f"/api/ingredients/{verified.slug}/").status_code == 200
    assert api_client.get(f"/api/ingredients/{draft.slug}/").status_code == 404


@pytest.mark.django_db
def test_creator_finds_own_draft_in_search(client, users):
    Ingredient.objects.create(name="Kidneybohnen aus der Dose", slug="kidney", created_by=users["creator"])
    data = _login(client, users["creator"]).get("/api/ingredients/?name=Kidney&page=1&page_size=20").json()
    assert data["total"] == 1
    assert data["items"][0]["slug"] == "kidney"


@pytest.mark.django_db
def test_owner_cannot_edit_verified_ingredient(client, users, gram_unit):
    ingredient = Ingredient.objects.create(
        name="Pesto", slug="pesto", owner=users["owner"], created_by=users["owner"], status="verified"
    )
    portion = Portion.objects.create(ingredient=ingredient, name="Glas", measuring_unit=gram_unit, weight_g=190)
    alias = IngredientAlias.objects.create(ingredient=ingredient, name="Basilikumpesto")
    client = _login(client, users["owner"])

    assert (
        client.patch(
            f"/api/ingredients/{ingredient.slug}/", data=json.dumps({"name": "Neu"}), content_type="application/json"
        ).status_code
        == 403
    )
    assert (
        client.patch(
            f"/api/ingredients/{ingredient.slug}/portions/{portion.id}/",
            data=json.dumps({"name": "Großes Glas"}),
            content_type="application/json",
        ).status_code
        == 403
    )
    assert client.delete(f"/api/ingredients/{ingredient.slug}/aliases/{alias.id}/").status_code == 403
    ingredient.refresh_from_db()
    assert ingredient.name == "Pesto"


@pytest.mark.django_db
def test_non_staff_cannot_verify_own_draft(client, users):
    ingredient = Ingredient.objects.create(name="Pesto", slug="pesto", owner=users["owner"], created_by=users["owner"])
    resp = _login(client, users["owner"]).patch(
        f"/api/ingredients/{ingredient.slug}/", data=json.dumps({"status": "verified"}), content_type="application/json"
    )
    assert resp.status_code == 403
    ingredient.refresh_from_db()
    assert ingredient.status == "draft"


@pytest.mark.django_db
def test_anonymous_cannot_patch(api_client):
    ingredient = Ingredient.objects.create(name="Mehl", slug="mehl", status="verified")
    resp = api_client.patch(
        f"/api/ingredients/{ingredient.slug}/", data=json.dumps({"status": "draft"}), content_type="application/json"
    )
    assert resp.status_code == 403


@pytest.mark.django_db
def test_staff_verifies_user_ingredient_and_resets(client, users, api_client):
    ingredient = Ingredient.objects.create(name="Pesto", slug="pesto", owner=users["owner"], created_by=users["owner"])
    staff = _login(client, users["staff"])

    resp = staff.patch(
        f"/api/ingredients/{ingredient.slug}/", data=json.dumps({"status": "verified"}), content_type="application/json"
    )
    assert resp.status_code == 200
    ingredient.refresh_from_db()
    assert (ingredient.status, ingredient.visibility, ingredient.owner_id) == ("verified", "public", users["owner"].id)
    assert api_client.get(f"/api/ingredients/{ingredient.slug}/").status_code == 200

    resp = staff.patch(
        f"/api/ingredients/{ingredient.slug}/", data=json.dumps({"status": "draft"}), content_type="application/json"
    )
    assert resp.status_code == 200
    ingredient.refresh_from_db()
    assert (ingredient.status, ingredient.visibility) == ("draft", "private")


@pytest.mark.django_db
def test_status_change_is_audited(users):
    ingredient = Ingredient.objects.create(name="Mehl", slug="mehl")
    set_ingredient_status(ingredient, "verified", actor=users["staff"])
    ct = ContentType.objects.get_for_model(Ingredient)
    log = ChangeAuditLog.objects.get(content_type=ct, object_id=ingredient.id, field_name="status")
    assert (log.old_value, log.new_value, log.changed_by_id) == ("draft", "verified", users["staff"].id)


@pytest.mark.django_db
def test_set_status_rejects_non_staff(users):
    ingredient = Ingredient.objects.create(name="Mehl", slug="mehl")
    with pytest.raises(IngredientStatusPermissionError):
        set_ingredient_status(ingredient, "verified", actor=users["owner"])


@pytest.mark.django_db
def test_debug_endpoint_is_gone(api_client):
    assert api_client.get("/api/supply/breakfast-catalog/debug/").status_code == 404


# ---------------------------------------------------------------------------
# 4.4 Creation paths, matcher, meal plan references
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_ai_draft_creation_sets_creator(users):
    from recipe.services.ai_ingredients_service import RecipeAiIngredientsService

    ingredient_id, _, is_new = RecipeAiIngredientsService._create_draft_ingredient("Omas Quark", users["creator"])
    ingredient = Ingredient.objects.get(id=ingredient_id)
    assert is_new
    assert (ingredient.status, ingredient.created_by_id) == ("draft", users["creator"].id)


@pytest.mark.django_db
def test_matcher_does_not_propose_private_ingredient_of_other_user(users):
    Ingredient.objects.create(name="Omas Pesto", slug="omas-pesto", owner=users["owner"], created_by=users["owner"])
    result = IngredientMatcher.match("Omas Pesto", users["stranger"])
    assert result.ingredient_id is None
    assert all(candidate.name != "Omas Pesto" for candidate in result.candidates)


@pytest.mark.django_db
def test_matcher_does_not_leak_private_ingredient_to_staff(users):
    Ingredient.objects.create(name="Omas Pesto", slug="omas-pesto", owner=users["owner"], created_by=users["owner"])
    result = IngredientMatcher.match("Omas Pesto", users["staff"])
    assert result.ingredient_id is None


@pytest.mark.django_db
def test_matcher_reuses_system_draft(users):
    draft = Ingredient.objects.create(name="Kidneybohnen aus der Dose", slug="kidney", created_by=users["creator"])
    result = IngredientMatcher.match("Kidneybohnen aus der Dose", users["stranger"])
    assert result.ingredient_id == draft.id


@pytest.mark.django_db
def test_matchable_queryset_contains_system_drafts_and_own_but_not_foreign_private(users):
    system_draft = Ingredient.objects.create(name="Kidney", slug="kidney")
    own = Ingredient.objects.create(
        name="Mein Pesto", slug="mein", owner=users["stranger"], created_by=users["stranger"]
    )
    foreign = Ingredient.objects.create(name="Pesto", slug="pesto", owner=users["owner"], created_by=users["owner"])
    ids = set(matchable_ingredient_queryset(users["stranger"]).values_list("id", flat=True))
    assert {system_draft.id, own.id} <= ids
    assert foreign.id not in ids


# ---------------------------------------------------------------------------
# 6.2 Verification command
# ---------------------------------------------------------------------------


def _use_in_approved_recipe(ingredient: Ingredient, unit: MeasuringUnit, slug: str) -> None:
    portion = Portion.objects.create(ingredient=ingredient, name="100 g", measuring_unit=unit, weight_g=100)
    recipe = Recipe.objects.create(title=f"Rezept {slug}", slug=slug, status="approved")
    RecipeItem.objects.create(recipe=recipe, portion=portion, quantity=1)


@pytest.mark.django_db
def test_verify_command_dry_run_apply_and_idempotence(users, gram_unit):
    system_draft = Ingredient.objects.create(name="Kidneybohnen", slug="kidney")
    owned_draft = Ingredient.objects.create(name="Pesto", slug="pesto", owner=users["owner"], created_by=users["owner"])
    unused_draft = Ingredient.objects.create(name="Unbenutzt", slug="unbenutzt")
    _use_in_approved_recipe(system_draft, gram_unit, "chili")
    _use_in_approved_recipe(owned_draft, gram_unit, "pasta")

    out = io.StringIO()
    call_command("verify_ingredients_in_approved_recipes", stdout=out)
    assert "Betroffene System-Zutaten: 1" in out.getvalue()
    assert "Pesto" in out.getvalue()
    system_draft.refresh_from_db()
    assert system_draft.status == "draft"

    call_command("verify_ingredients_in_approved_recipes", "--apply", stdout=io.StringIO())
    system_draft.refresh_from_db()
    owned_draft.refresh_from_db()
    unused_draft.refresh_from_db()
    assert system_draft.status == "verified"
    assert owned_draft.status == "draft"
    assert unused_draft.status == "draft"
    ct = ContentType.objects.get_for_model(Ingredient)
    log = ChangeAuditLog.objects.get(content_type=ct, object_id=system_draft.id, field_name="status")
    assert log.changed_by_id is None

    out = io.StringIO()
    call_command("verify_ingredients_in_approved_recipes", "--apply", stdout=out)
    assert "Betroffene System-Zutaten: 0" in out.getvalue()


@pytest.mark.django_db
def test_system_actor_is_allowed():
    ingredient = Ingredient.objects.create(name="Mehl", slug="mehl")
    set_ingredient_status(ingredient, "verified", actor=SYSTEM)
    assert Ingredient.objects.get(id=ingredient.id).status == "verified"


# ---------------------------------------------------------------------------
# 4.4 Meal plan reference exception
# ---------------------------------------------------------------------------


def _wizard_items(client, plan, meal, ingredient, unit):
    return client.post(
        f"/api/meal-plans/{plan.id}/meals/{meal.id}/wizard-items/",
        data=json.dumps({"items": [{"ingredient_id": ingredient.id, "quantity": 50, "measuring_unit_id": unit.id}]}),
        content_type="application/json",
    )


@pytest.mark.django_db
def test_meal_plan_accepts_system_draft_by_id(client, users, gram_unit):
    from planner.models import MealItem
    from planner.tests import make_meal, make_meal_plan

    plan = make_meal_plan(created_by=users["stranger"])
    meal = make_meal(meal_plan=plan)
    draft = Ingredient.objects.create(name="Kidneybohnen", slug="kidney")

    resp = _wizard_items(_login(client, users["stranger"]), plan, meal, draft, gram_unit)
    assert resp.status_code == 200, resp.content
    assert MealItem.objects.filter(meal=meal, ingredient=draft).exists()


@pytest.mark.django_db
def test_meal_plan_rejects_private_ingredient_of_other_user(client, users, gram_unit):
    from planner.models import MealItem
    from planner.tests import make_meal, make_meal_plan

    plan = make_meal_plan(created_by=users["stranger"])
    meal = make_meal(meal_plan=plan)
    foreign = Ingredient.objects.create(name="Pesto", slug="pesto", owner=users["owner"], created_by=users["owner"])

    resp = _wizard_items(_login(client, users["stranger"]), plan, meal, foreign, gram_unit)
    assert resp.status_code == 404
    assert not MealItem.objects.filter(meal=meal).exists()
