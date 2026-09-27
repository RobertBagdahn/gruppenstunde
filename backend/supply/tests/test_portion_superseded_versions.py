"""Tests for portion versioning on weight correction (openspec change
`portion-superseded-versions`): supersede instead of "(neu)" duplication,
hiding superseded portions, and the recipe-side adoption flow.
"""

import json

import pytest
from django.contrib.contenttypes.models import ContentType
from django.core.management import call_command
from django.db import IntegrityError, transaction

from content.models import ChangeAuditLog
from recipe.models import Recipe, RecipeItem
from recipe.services.recipe_checks import get_recipe_nutritional_values, get_recipe_total_weight_g
from supply.choices import PortionWeightSource, PortionWeightStatus
from supply.management.commands.merge_neu_portion_duplicates import apply_merge, find_neu_duplicates
from supply.models import Ingredient, MeasuringUnit, Portion
from supply.services.portion_integrity import (
    is_referenced_by_recipe_items,
    rebind_dead_portion_references,
    supersede_portion,
)
from supply.tests import make_ingredient

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def gram_unit(db):
    return MeasuringUnit.objects.create(name="Gramm", unit="g", quantity=1.0)


@pytest.fixture
def piece_unit(db):
    return MeasuringUnit.objects.create(name="Stück", unit="stk", quantity=1.0)


@pytest.fixture
def egg(db):
    return make_ingredient(name="Hühnerei", slug="huehnerei", energy_kcal=155.0, protein_g=13.0)


@pytest.fixture
def egg_piece(db, egg, piece_unit):
    return Portion.objects.create(
        ingredient=egg,
        name="Stück",
        measuring_unit=piece_unit,
        quantity=1,
        weight_g=50.0,
        rank=1,
        weight_status=PortionWeightStatus.CONFIRMED,
        weight_source=PortionWeightSource.MANUAL,
    )


def _recipe_with_item(ingredient_slug_owner, portion, quantity, *, staff=None, owner=None):
    recipe = Recipe.objects.create(
        title=f"Test {portion.name}",
        status="approved",
        owner=owner,
        created_by=owner,
    )
    item = RecipeItem.objects.create(recipe=recipe, portion=portion, quantity=quantity)
    return recipe, item


# ---------------------------------------------------------------------------
# 5.1 Model / constraints
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_same_name_allowed_after_supersede(egg, egg_piece):
    supersede_portion(egg_piece, weight_g=60.0)
    egg_piece.refresh_from_db()

    # A second, unrelated active "Stück" now coexists with the superseded one.
    assert Portion.objects.filter(ingredient=egg, name="Stück").count() == 2
    assert Portion.objects.active().filter(ingredient=egg, name="Stück").count() == 1


@pytest.mark.django_db
def test_second_active_rank1_portion_rejected(egg, egg_piece, gram_unit):
    with pytest.raises(IntegrityError), transaction.atomic():
        Portion.objects.create(ingredient=egg, name="Portion", measuring_unit=gram_unit, quantity=100, rank=1)


@pytest.mark.django_db
def test_rank1_reusable_after_supersede(egg, egg_piece, gram_unit):
    successor = supersede_portion(egg_piece, weight_g=60.0)
    assert successor.rank == 1
    # The now-superseded original no longer blocks a fresh rank=1 elsewhere —
    # already proven implicitly by `supersede_portion` succeeding, but assert
    # explicitly that a *third* attempt at rank=1 is still rejected.
    with pytest.raises(IntegrityError), transaction.atomic():
        Portion.objects.create(ingredient=egg, name="Andere", measuring_unit=gram_unit, quantity=1, rank=1)


# ---------------------------------------------------------------------------
# 5.2 supersede_portion
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_supersede_portion_keeps_name_and_rank(egg, egg_piece):
    successor = supersede_portion(egg_piece, weight_g=60.0)

    assert successor.name == "Stück"
    assert successor.rank == 1
    assert successor.weight_g == 60.0
    assert "(neu)" not in successor.name

    egg_piece.refresh_from_db()
    assert egg_piece.superseded_by_id == successor.id
    assert egg_piece.superseded_at is not None
    assert egg_piece.deleted_at is None
    assert egg_piece.weight_g == 50.0  # untouched


@pytest.mark.django_db
def test_supersede_portion_path_compression(egg, egg_piece):
    b = supersede_portion(egg_piece, weight_g=60.0)
    c = supersede_portion(b, weight_g=55.0)

    egg_piece.refresh_from_db()
    b.refresh_from_db()
    assert egg_piece.superseded_by_id == c.id
    assert b.superseded_by_id == c.id


@pytest.mark.django_db
def test_supersede_portion_writes_audit_log(egg, egg_piece, django_user_model):
    staff = django_user_model.objects.create_user(username="staff", is_staff=True)
    successor = supersede_portion(egg_piece, weight_g=60.0, actor=staff)

    ct = ContentType.objects.get_for_model(Portion)
    log = ChangeAuditLog.objects.get(content_type=ct, object_id=egg_piece.id, field_name="superseded_by")
    assert log.new_value == str(successor.id)
    assert log.changed_by_id == staff.id


# ---------------------------------------------------------------------------
# 5.3 API update_portion
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_update_referenced_portion_weight_supersedes(admin_client, egg, egg_piece):
    _recipe_with_item(None, egg_piece, 2)
    resp = admin_client.patch(
        f"/api/ingredients/{egg.slug}/portions/{egg_piece.id}/",
        data=json.dumps({"weight_g": 60.0}),
        content_type="application/json",
    )
    assert resp.status_code == 200, resp.content
    data = resp.json()
    assert data["name"] == "Stück"
    assert data["weight_g"] == 60.0
    assert data["replaced_portion_id"] == egg_piece.id
    assert data["referencing_recipe_count"] == 1

    egg_piece.refresh_from_db()
    assert egg_piece.superseded_by_id == data["id"]


@pytest.mark.django_db
def test_update_unreferenced_portion_is_in_place(admin_client, egg, egg_piece):
    resp = admin_client.patch(
        f"/api/ingredients/{egg.slug}/portions/{egg_piece.id}/",
        data=json.dumps({"weight_g": 60.0}),
        content_type="application/json",
    )
    assert resp.status_code == 200
    assert resp.json()["id"] == egg_piece.id
    assert resp.json()["replaced_portion_id"] is None
    egg_piece.refresh_from_db()
    assert egg_piece.weight_g == 60.0
    assert egg_piece.superseded_by_id is None


@pytest.mark.django_db
def test_update_name_only_stays_in_place_even_when_referenced(admin_client, egg, egg_piece):
    _recipe_with_item(None, egg_piece, 2)
    resp = admin_client.patch(
        f"/api/ingredients/{egg.slug}/portions/{egg_piece.id}/",
        data=json.dumps({"name": "Stück (Ei)"}),
        content_type="application/json",
    )
    assert resp.status_code == 200
    assert resp.json()["id"] == egg_piece.id
    egg_piece.refresh_from_db()
    assert egg_piece.name == "Stück (Ei)"
    assert egg_piece.superseded_by_id is None


@pytest.mark.django_db
def test_update_portion_anonymous_is_forbidden(api_client, egg, egg_piece):
    resp = api_client.patch(
        f"/api/ingredients/{egg.slug}/portions/{egg_piece.id}/",
        data=json.dumps({"weight_g": 60.0}),
        content_type="application/json",
    )
    assert resp.status_code == 403
    egg_piece.refresh_from_db()
    assert egg_piece.weight_g == 50.0


@pytest.mark.django_db
def test_update_portion_without_edit_right(client, django_user_model, egg, egg_piece):
    stranger = django_user_model.objects.create_user(username="stranger")
    client.force_login(stranger)
    resp = client.patch(
        f"/api/ingredients/{egg.slug}/portions/{egg_piece.id}/",
        data=json.dumps({"weight_g": 60.0}),
        content_type="application/json",
    )
    assert resp.status_code in (403, 404)
    egg_piece.refresh_from_db()
    assert egg_piece.weight_g == 50.0


@pytest.mark.django_db
def test_owner_cannot_change_weight_of_verified_ingredient(client, django_user_model, gram_unit):
    owner = django_user_model.objects.create_user(username="owner")
    ingredient = Ingredient.objects.create(name="Pesto", slug="pesto", owner=owner, created_by=owner, status="verified")
    portion = Portion.objects.create(ingredient=ingredient, name="Glas", measuring_unit=gram_unit, weight_g=190)
    _recipe_with_item(None, portion, 1)

    client.force_login(owner)
    resp = client.patch(
        f"/api/ingredients/{ingredient.slug}/portions/{portion.id}/",
        data=json.dumps({"weight_g": 200.0}),
        content_type="application/json",
    )
    assert resp.status_code == 403
    portion.refresh_from_db()
    assert portion.weight_g == 190
    assert portion.superseded_by_id is None


@pytest.mark.django_db
def test_staff_can_supersede_verified_ingredient_portion(admin_client, gram_unit):
    ingredient = Ingredient.objects.create(name="Pesto", slug="pesto", status="verified")
    portion = Portion.objects.create(ingredient=ingredient, name="Glas", measuring_unit=gram_unit, weight_g=190)
    _recipe_with_item(None, portion, 1)

    resp = admin_client.patch(
        f"/api/ingredients/{ingredient.slug}/portions/{portion.id}/",
        data=json.dumps({"weight_g": 200.0}),
        content_type="application/json",
    )
    assert resp.status_code == 200
    ingredient.refresh_from_db()
    assert ingredient.status == "verified"


# ---------------------------------------------------------------------------
# 5.4 Listing / detail / picker exclude superseded
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_portion_list_endpoint_hides_superseded(admin_client, egg, egg_piece):
    successor = supersede_portion(egg_piece, weight_g=60.0)
    resp = admin_client.get(f"/api/ingredients/{egg.slug}/portions/")
    assert resp.status_code == 200
    ids = [p["id"] for p in resp.json()]
    assert successor.id in ids
    assert egg_piece.id not in ids
    assert ids.count(successor.id) == 1


@pytest.mark.django_db
def test_ingredient_detail_portions_hide_superseded(admin_client, egg, egg_piece):
    successor = supersede_portion(egg_piece, weight_g=60.0)
    resp = admin_client.get(f"/api/ingredients/{egg.slug}/")
    assert resp.status_code == 200
    portion_ids = [p["id"] for p in resp.json()["portions"]]
    assert successor.id in portion_ids
    assert egg_piece.id not in portion_ids


@pytest.mark.django_db
def test_recipe_item_portion_picker_list_hides_superseded(admin_client, egg, egg_piece):
    successor = supersede_portion(egg_piece, weight_g=60.0)
    recipe, _item = _recipe_with_item(None, egg_piece, 2)
    resp = admin_client.get(f"/api/recipes/{recipe.id}/recipe-items/")
    assert resp.status_code == 200
    body = resp.json()[0]
    portion_ids = [p["id"] for p in body["ingredient_portions"]]
    assert successor.id in portion_ids
    assert egg_piece.id not in portion_ids
    # The item itself still resolves via the superseded portion.
    assert body["portion_id"] == egg_piece.id
    assert body["current_portion"] == {"id": successor.id, "name": "Stück", "weight_g": 60.0}


# ---------------------------------------------------------------------------
# 5.5 Nutrition/cost unaffected + rebind_dead_portion_references ignores superseded
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_recipe_nutrition_unaffected_by_supersede(egg, egg_piece):
    recipe, item = _recipe_with_item(None, egg_piece, 2)
    before = get_recipe_total_weight_g(recipe)
    assert before == 100.0  # 2 * 50g

    supersede_portion(egg_piece, weight_g=60.0)
    item.refresh_from_db()

    after = get_recipe_total_weight_g(recipe)
    assert after == 100.0  # unchanged — still resolves via the (now superseded) portion

    values = get_recipe_nutritional_values(recipe)
    assert values["energy_kcal"] == pytest.approx(egg.energy_kcal)  # per-100g, 100g total


@pytest.mark.django_db
def test_rebind_dead_portion_references_ignores_superseded(egg, egg_piece):
    successor = supersede_portion(egg_piece, weight_g=60.0)
    _recipe, item = _recipe_with_item(None, egg_piece, 2)

    changes = rebind_dead_portion_references()
    assert changes == []
    item.refresh_from_db()
    assert item.portion_id == egg_piece.id
    assert successor.id != egg_piece.id


# ---------------------------------------------------------------------------
# 5.6 adopt-current-portions
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_adopt_current_portion_single_item(admin_client, egg, egg_piece):
    recipe, item = _recipe_with_item(None, egg_piece, 2)
    supersede_portion(egg_piece, weight_g=60.0)

    resp = admin_client.post(
        f"/api/recipes/{recipe.id}/recipe-items/adopt-current-portions/",
        data=json.dumps({"item_ids": [item.id]}),
        content_type="application/json",
    )
    assert resp.status_code == 200, resp.content
    data = resp.json()
    assert data["updated_count"] == 1
    assert data["items"][0]["current_portion"] is None

    item.refresh_from_db()
    recipe.refresh_from_db()
    assert item.portion.name == "Stück"
    assert item.portion.weight_g == 60.0
    assert item.quantity == 2  # count unchanged
    assert get_recipe_total_weight_g(recipe) == 120.0


@pytest.mark.django_db
def test_adopt_current_portion_all_items(admin_client, egg, egg_piece, gram_unit):
    recipe = Recipe.objects.create(title="Zwei Zutaten", status="approved")
    item1 = RecipeItem.objects.create(recipe=recipe, portion=egg_piece, quantity=2)

    salt = make_ingredient(name="Salz", slug="salz")
    salt_portion = Portion.objects.create(ingredient=salt, name="Prise", measuring_unit=gram_unit, weight_g=1.0)
    item2 = RecipeItem.objects.create(recipe=recipe, portion=salt_portion, quantity=1)

    supersede_portion(egg_piece, weight_g=60.0)
    supersede_portion(salt_portion, weight_g=2.0)

    resp = admin_client.post(
        f"/api/recipes/{recipe.id}/recipe-items/adopt-current-portions/",
        data=json.dumps({}),
        content_type="application/json",
    )
    assert resp.status_code == 200
    assert resp.json()["updated_count"] == 2

    item1.refresh_from_db()
    item2.refresh_from_db()
    assert item1.portion.weight_g == 60.0
    assert item2.portion.weight_g == 2.0


@pytest.mark.django_db
def test_adopt_current_portions_anonymous_forbidden(api_client, egg, egg_piece):
    recipe, _item = _recipe_with_item(None, egg_piece, 2)
    supersede_portion(egg_piece, weight_g=60.0)
    resp = api_client.post(
        f"/api/recipes/{recipe.id}/recipe-items/adopt-current-portions/",
        data=json.dumps({}),
        content_type="application/json",
    )
    assert resp.status_code == 403


@pytest.mark.django_db
def test_adopt_current_portions_without_edit_right(client, django_user_model, egg, egg_piece):
    recipe, item = _recipe_with_item(None, egg_piece, 2)
    supersede_portion(egg_piece, weight_g=60.0)
    stranger = django_user_model.objects.create_user(username="stranger2")
    client.force_login(stranger)
    resp = client.post(
        f"/api/recipes/{recipe.id}/recipe-items/adopt-current-portions/",
        data=json.dumps({}),
        content_type="application/json",
    )
    assert resp.status_code == 403
    item.refresh_from_db()
    assert item.portion_id == egg_piece.id


# ---------------------------------------------------------------------------
# 5.7 delete_portion rebinds predecessors of the deleted successor
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_delete_successor_rebinds_predecessor_items(admin_client, egg, gram_unit):
    old = Portion.objects.create(
        ingredient=egg,
        name="Stück",
        measuring_unit=gram_unit,
        quantity=1,
        weight_g=50.0,
        rank=1,
        weight_status=PortionWeightStatus.CONFIRMED,
        weight_source=PortionWeightSource.MANUAL,
    )
    _recipe_with_item(None, old, 2)
    successor = supersede_portion(old, weight_g=60.0)
    other = Portion.objects.create(
        ingredient=egg, name="Anderes", measuring_unit=gram_unit, quantity=1, weight_g=10.0, rank=2
    )

    # Promote `other` to rank=1 so it's a valid rebind target once `successor`
    # (currently rank=1) is deleted.
    successor.rank = 3
    successor.save(update_fields=["rank"])
    other.rank = 1
    other.save(update_fields=["rank"])

    resp = admin_client.delete(f"/api/ingredients/{egg.slug}/portions/{successor.id}/")
    assert resp.status_code == 200, resp.content

    old.refresh_from_db()
    assert RecipeItem.objects.filter(portion=old).count() == 0
    item = RecipeItem.objects.get(recipe__title__startswith="Test Stück")
    assert item.portion_id == other.id


# ---------------------------------------------------------------------------
# 5.9 merge_neu_portion_duplicates
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_merge_neu_duplicates_dry_run_and_apply(egg, gram_unit):
    old = Portion.objects.create(
        ingredient=egg, name="100g Ei", measuring_unit=gram_unit, quantity=100, weight_g=100.0, rank=2
    )
    dup = Portion.objects.create(
        ingredient=egg, name="100g Ei (neu)", measuring_unit=gram_unit, quantity=100, weight_g=110.0, rank=3
    )
    _recipe, _item = _recipe_with_item(None, old, 1)

    pairs = find_neu_duplicates()
    assert len(pairs) == 1
    assert pairs[0].old_portion.id == old.id
    assert pairs[0].new_portion.id == dup.id

    apply_merge(pairs[0])

    old.refresh_from_db()
    dup.refresh_from_db()
    assert old.superseded_by_id == dup.id
    assert dup.name == "100g Ei"
    assert dup.rank == old.rank == 2
    assert Portion.objects.active().filter(ingredient=egg, name="100g Ei").count() == 1

    assert find_neu_duplicates() == []


@pytest.mark.django_db
def test_merge_neu_duplicates_via_command(egg, gram_unit, capsys):
    Portion.objects.create(
        ingredient=egg, name="100g Ei", measuring_unit=gram_unit, quantity=100, weight_g=100.0, rank=2
    )
    Portion.objects.create(
        ingredient=egg, name="100g Ei (neu)", measuring_unit=gram_unit, quantity=100, weight_g=110.0, rank=3
    )

    call_command("merge_neu_portion_duplicates")
    assert Portion.objects.active().filter(ingredient=egg).exclude(name="g").count() == 2  # dry-run: nothing changed

    call_command("merge_neu_portion_duplicates", "--apply")
    assert Portion.objects.active().filter(ingredient=egg).exclude(name="g").count() == 1

    call_command("merge_neu_portion_duplicates")
    out = capsys.readouterr().out
    assert "Keine" in out


# ---------------------------------------------------------------------------
# is_referenced_by_recipe_items sanity (used throughout)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_is_referenced_by_recipe_items(egg, egg_piece):
    assert not is_referenced_by_recipe_items(egg_piece)
    _recipe_with_item(None, egg_piece, 1)
    assert is_referenced_by_recipe_items(egg_piece)


# ---------------------------------------------------------------------------
# 5.8 Grep test: no new bare `deleted_at__isnull=True` on Portion querysets
# ---------------------------------------------------------------------------


def _iter_backend_py_files():
    import pathlib

    backend_root = pathlib.Path(__file__).resolve().parents[2]
    for sub in ("supply", "recipe", "planner", "content", "core", "bin"):
        base = backend_root / sub
        if not base.exists():
            continue
        for path in base.rglob("*.py"):
            if "/migrations/" in str(path) or "/tests/" in str(path):
                continue
            yield path


# A line that already reasons about `superseded_by` explicitly (the recipe
# `-checks.py`/`ingredient_price_proposal_service.py` exceptions from design.md
# D2, or any new code following the same pattern) is exempt — it isn't a
# forgotten filter, it's a deliberate reference-evaluation check.
_EXEMPT_TOKEN = "superseded_by"
# Matches the recipe's own `deleted_at` (unrelated to Portion soft-delete).
_UNRELATED_SUBSTRING = "recipe__deleted_at__isnull=True"


@pytest.mark.parametrize("path", list(_iter_backend_py_files()), ids=lambda p: str(p))
def test_no_bare_portion_deleted_at_filter(path):
    lines = path.read_text(encoding="utf-8").splitlines()
    window = 3  # a multi-line `.filter(...)` call may spread the exempt token onto a nearby line
    for i, line in enumerate(lines):
        if "deleted_at__isnull=True" not in line:
            continue
        if not any(token in line for token in ("Portion", "portion", ".portions")):
            continue
        if _UNRELATED_SUBSTRING in line:
            continue
        nearby = lines[max(0, i - window) : i + window + 1]
        if any(_EXEMPT_TOKEN in nearby_line for nearby_line in nearby):
            continue
        pytest.fail(f"{path}: bare Portion deleted_at filter, use .active() instead:\n  {line.strip()}")
