"""API tests for the data offensive cockpit."""

import pytest

BASE = "/api/admin/data-quality/offensive"


@pytest.fixture
def section(db):
    from supply.models import RetailSection

    return RetailSection.objects.create(name="Milch & Pflanzendrinks", rank=8)


@pytest.fixture
def complete_ingredient(db, section):
    from supply.models import Ingredient

    return Ingredient.objects.create(
        name="Milch",
        status="draft",
        energy_kcal=64,
        protein_g=3.3,
        fat_g=3.5,
        fat_sat_g=2.2,
        carbohydrate_g=4.7,
        sugar_g=4.7,
        fibre_g=0,
        salt_g=0.1,
        sodium_mg=40,
        price_per_kg=1.15,
        retail_section=section,
        ai_review_verdict="ok",
    )


@pytest.fixture
def broken_ingredient(db):
    # Legacy REWE import data; the import gate would repair it on create.
    from supply.tests import make_legacy_ingredient

    return make_legacy_ingredient(
        "Skyr Vanille",
        status="draft",
        energy_kcal=330,
        protein_g=8.8,
        fat_g=0,
        fat_sat_g=0.1,
        carbohydrate_g=0,
        sugar_g=8.7,
    )


@pytest.mark.django_db
def test_requires_staff(auth_client):
    assert auth_client.get(f"{BASE}/summary/").status_code == 403


@pytest.mark.django_db
def test_summary_counts_issues(admin_client, complete_ingredient, broken_ingredient):
    data = admin_client.get(f"{BASE}/summary/").json()
    assert data["total"] == 2
    assert data["issue_counts"]["nutrition_implausible"] == 1
    assert data["publishable"] == 1
    assert data["nutrition_issue_labels"]["broken_import"]


@pytest.mark.django_db
def test_list_filters_by_issue(admin_client, complete_ingredient, broken_ingredient):
    data = admin_client.get(f"{BASE}/ingredients/?issue=nutrition_implausible").json()
    assert [item["name"] for item in data["items"]] == ["Skyr Vanille"]
    assert "broken_import" in data["items"][0]["nutrition_issues"]
    ids = admin_client.get(f"{BASE}/ingredients/ids/?issue=nutrition_implausible").json()
    assert ids == [broken_ingredient.id]


@pytest.mark.django_db
def test_patch_sets_manual_section(admin_client, broken_ingredient, section):
    response = admin_client.patch(
        f"{BASE}/ingredients/{broken_ingredient.id}/",
        data={"retail_section_id": section.id, "fat_g": 0.2},
        content_type="application/json",
    )
    assert response.status_code == 200
    broken_ingredient.refresh_from_db()
    assert broken_ingredient.retail_section_source == "manual"
    assert broken_ingredient.fat_g == 0.2


@pytest.mark.django_db
def test_publish_only_plausible_ingredients(admin_client, complete_ingredient, broken_ingredient):
    data = admin_client.post(f"{BASE}/publish/", data={"ids": []}, content_type="application/json").json()
    assert data["changed"] == 1
    complete_ingredient.refresh_from_db()
    broken_ingredient.refresh_from_db()
    assert complete_ingredient.status == "verified"
    assert broken_ingredient.status == "draft"


@pytest.mark.django_db
def test_repair_nutrition_endpoint(admin_client, broken_ingredient):
    data = admin_client.post(f"{BASE}/repair-nutrition/", data={"ids": []}, content_type="application/json").json()
    assert data["changed"] == 1
    broken_ingredient.refresh_from_db()
    assert broken_ingredient.energy_kcal is None
    assert broken_ingredient.fat_g is None


@pytest.mark.django_db
def test_merge_exact_duplicates(admin_client, complete_ingredient):
    from supply.models import Ingredient

    # Case-only duplicates are blocked by `uniq_system_ingredient_name`; legacy
    # data can still differ by surrounding whitespace.
    duplicate = Ingredient.objects.create(name="Milch Duplikat", status="draft")
    Ingredient.objects.filter(pk=duplicate.pk).update(name="milch ")
    data = admin_client.post(f"{BASE}/merge-exact-duplicates/").json()
    assert data["changed"] == 1
    duplicate.refresh_from_db()
    assert duplicate.is_deleted
    assert complete_ingredient.aliases.filter(name="milch").count() == 0


@pytest.mark.django_db
def test_soft_delete_keeps_used_ingredients(admin_client, broken_ingredient):
    data = admin_client.post(
        f"{BASE}/soft-delete/", data={"ids": [broken_ingredient.id]}, content_type="application/json"
    ).json()
    assert data["changed"] == 1


@pytest.mark.django_db
def test_junk_recipes_are_listed_and_archived(admin_client):
    from recipe.models import Recipe

    junk = Recipe.objects.create(title="E2E Rezept", status="draft")
    real = Recipe.objects.create(title="Kaiserschmarrn", status="approved")
    listed = admin_client.get(f"{BASE}/recipes/junk/").json()
    assert [item["id"] for item in listed] == [junk.id]
    admin_client.post(f"{BASE}/recipes/archive/", data={"ids": []}, content_type="application/json")
    junk.refresh_from_db()
    real.refresh_from_db()
    assert junk.status == "archived"
    assert real.status == "approved"


@pytest.mark.django_db
def test_patch_name_resolves_rename_suggestion(admin_client, broken_ingredient):
    broken_ingredient.ai_review_verdict = "rename"
    broken_ingredient.ai_review_notes = {"suggested_name": "Skyr Vanille natur", "suggestions": {"fat_g": 0.2}}
    broken_ingredient.save()
    admin_client.patch(
        f"{BASE}/ingredients/{broken_ingredient.id}/",
        data={"name": "Skyr Vanille natur", "fat_g": 0.2},
        content_type="application/json",
    )
    broken_ingredient.refresh_from_db()
    assert broken_ingredient.ai_review_verdict == "corrected"
    assert broken_ingredient.ai_review_notes["suggested_name"] is None
    assert broken_ingredient.ai_review_notes["suggestions"] == {}


def test_similarity_key_keeps_bracketed_variants():
    from supply.services.ingredient_merge import similarity_key

    assert similarity_key("Tomaten") == similarity_key("Tomate")
    assert similarity_key("Gouda Bio") == similarity_key("Gouda")
    assert similarity_key("Zwiebel (rot)") != similarity_key("Zwiebel")
