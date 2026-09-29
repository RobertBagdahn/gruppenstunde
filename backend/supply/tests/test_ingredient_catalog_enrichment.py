"""Tests for catalog enrichment (retail names, synonyms, packages, portions). No Gemini calls."""

import pytest

from supply.services.ingredient_catalog_enrichment import (
    ENRICH_PROMPT_VERSION,
    EnrichedIngredient,
    apply_enrichment,
)


def make_enriched(ingredient_id: int, **overrides) -> EnrichedIngredient:
    data = {
        "id": ingredient_id,
        "verdict": "corrected",
        "retail_section": "Obst",
        "physical_viscosity": "solid",
        "energy_kcal": 18.0,
        "protein_g": 0.9,
        "fat_g": 0.2,
        "fat_sat_g": 0.0,
        "carbohydrate_g": 2.6,
        "sugar_g": 2.6,
        "fibre_g": 1.2,
        "salt_g": 0.0,
        "price_per_kg": 4.5,
        "description": "Kleine, süße Tomatensorte mit dünner Schale, ideal für Salate und als Snack roh gegessen.",
        "confidence": 0.9,
        "reason": "Name präzisiert, Werte ergänzt",
        "retail_name": "Frische Cocktailtomaten",
        "synonyms": ["Cherrytomaten", "Tomaten klein", "Cocktailtomate"],
        "packages": [{"name": "Schale", "weight_g": 250}],
        "portions": [],
    }
    data.update(overrides)
    return EnrichedIngredient(**data)


@pytest.fixture
def sections(db):
    from supply.models import RetailSection

    return {name: RetailSection.objects.create(name=name, rank=rank) for rank, name in enumerate(["Obst"], start=1)}


@pytest.fixture
def ingredient(db, sections):
    from supply.models import Ingredient

    return Ingredient.objects.create(name="Tomaten", retail_section=sections["Obst"])


@pytest.mark.django_db
def test_apply_enrichment_dry_run_changes_nothing(ingredient, sections):
    proposal = make_enriched(ingredient.id)
    entry = {"slug": ingredient.slug, "source_name": ingredient.name, "proposal": proposal.model_dump(mode="json")}

    report = apply_enrichment([entry], apply=False)

    ingredient.refresh_from_db()
    assert ingredient.name == "Tomaten"
    assert ingredient.packages.count() == 0
    assert report.renamed == 1
    assert report.packages_created == 1


@pytest.mark.django_db
def test_apply_enrichment_renames_adds_alias_and_package(ingredient, sections):
    proposal = make_enriched(ingredient.id)
    entry = {"slug": ingredient.slug, "source_name": ingredient.name, "proposal": proposal.model_dump(mode="json")}

    report = apply_enrichment([entry], apply=True)

    ingredient.refresh_from_db()
    assert ingredient.name == "Frische Cocktailtomaten"
    assert ingredient.slug == "tomaten"  # slug unchanged: backward compatible for existing references
    alias_names = set(ingredient.aliases.values_list("name", flat=True))
    assert "Tomaten" in alias_names  # old name preserved as alias
    assert "Cherrytomaten" in alias_names
    assert ingredient.packages.filter(name="Schale", weight_g=250).exists()
    assert ingredient.energy_kcal == 18.0
    assert report.renamed == 1
    assert report.aliases_created == 4
    assert report.packages_created == 1
    assert ingredient.ai_review_notes["enrich_version"] == ENRICH_PROMPT_VERSION


@pytest.mark.django_db
def test_low_confidence_rename_is_skipped(ingredient, sections):
    proposal = make_enriched(ingredient.id, confidence=0.3)
    entry = {"slug": ingredient.slug, "source_name": ingredient.name, "proposal": proposal.model_dump(mode="json")}

    report = apply_enrichment([entry], apply=True)

    ingredient.refresh_from_db()
    assert ingredient.name == "Tomaten"
    assert report.renames_skipped == 1
    assert report.renamed == 0


@pytest.mark.django_db
def test_rename_clash_with_existing_ingredient_is_skipped(db, ingredient, sections):
    from supply.models import Ingredient

    Ingredient.objects.create(name="Frische Cocktailtomaten", retail_section=sections["Obst"])
    proposal = make_enriched(ingredient.id)
    entry = {"slug": ingredient.slug, "source_name": ingredient.name, "proposal": proposal.model_dump(mode="json")}

    report = apply_enrichment([entry], apply=True)

    ingredient.refresh_from_db()
    assert ingredient.name == "Tomaten"
    assert report.renames_skipped == 1


@pytest.mark.django_db
def test_existing_packages_are_not_touched(ingredient, sections):
    from supply.models import Package

    Package.objects.create(ingredient=ingredient, name="Netz", weight_g=1000, rank=1)
    proposal = make_enriched(ingredient.id)
    entry = {"slug": ingredient.slug, "source_name": ingredient.name, "proposal": proposal.model_dump(mode="json")}

    apply_enrichment([entry], apply=True)

    assert ingredient.packages.filter(deleted_at__isnull=True).count() == 1
    assert not ingredient.packages.filter(name="Schale").exists()


@pytest.mark.django_db
def test_owner_ingredients_are_never_candidates(db, sections, django_user_model):
    from supply.models import Ingredient
    from supply.services.ingredient_catalog_enrichment import enrichment_candidates

    user = django_user_model.objects.create(username="u1")
    Ingredient.objects.create(name="Private Zutat", owner=user, retail_section=sections["Obst"])

    assert enrichment_candidates(done_slugs=set(), limit=None) == []


@pytest.mark.django_db
def test_already_enriched_ingredient_is_excluded(ingredient, sections):
    from supply.services.ingredient_catalog_enrichment import enrichment_candidates

    ingredient.ai_review_notes = {"enrich_version": ENRICH_PROMPT_VERSION}
    ingredient.save(update_fields=["ai_review_notes"])

    assert enrichment_candidates(done_slugs=set(), limit=None) == []


@pytest.mark.django_db
def test_synonym_taken_by_another_ingredient_becomes_generic(db, ingredient, sections):
    from supply.models import Ingredient, IngredientAlias

    Ingredient.objects.create(name="Cherrytomaten", retail_section=sections["Obst"])
    proposal = make_enriched(ingredient.id, retail_name="Tomaten")  # no rename, only synonyms
    entry = {"slug": ingredient.slug, "source_name": ingredient.name, "proposal": proposal.model_dump(mode="json")}

    apply_enrichment([entry], apply=True)

    alias = IngredientAlias.objects.filter(ingredient=ingredient, name="Cherrytomaten").first()
    assert alias is not None
    assert alias.is_generic is True


@pytest.mark.django_db
def test_apply_enrichment_runs_in_batches_and_reports_progress(sections):
    from supply.models import Ingredient

    ingredients = [
        Ingredient.objects.create(name=f"Zutat {name}", retail_section=sections["Obst"])
        for name in ["Alpha", "Beta", "Gamma"]
    ]
    entries = [
        {
            "slug": ingredient.slug,
            "source_name": ingredient.name,
            "proposal": make_enriched(
                ingredient.id, retail_name=f"Frische {ingredient.name}", synonyms=[], packages=[]
            ).model_dump(mode="json"),
        }
        for ingredient in ingredients
    ]
    progress: list[tuple[int, int]] = []

    report = apply_enrichment(entries, apply=True, batch_size=2, on_progress=lambda d, t, _r: progress.append((d, t)))

    assert progress == [(2, 3), (3, 3)]
    assert report.ingredients == 3
    assert report.renamed == 3
    assert Ingredient.objects.filter(name__startswith="Frische Zutat").count() == 3


@pytest.mark.django_db
def test_apply_enrichment_offset_skips_first_ingredients(sections):
    from supply.models import Ingredient

    ingredients = sorted(
        (Ingredient.objects.create(name=f"Zutat {n}", retail_section=sections["Obst"]) for n in ["A", "B", "C"]),
        key=lambda i: i.slug,
    )
    entries = [
        {
            "slug": i.slug,
            "source_name": i.name,
            "proposal": make_enriched(i.id, retail_name=f"Neu {i.name}", synonyms=[], packages=[]).model_dump(
                mode="json"
            ),
        }
        for i in ingredients
    ]

    report = apply_enrichment(entries, apply=True, offset=2)

    assert report.ingredients == 1
    names = {i.slug: i.name for i in Ingredient.objects.filter(id__in=[i.id for i in ingredients])}
    assert names[ingredients[0].slug] == ingredients[0].name
    assert names[ingredients[2].slug] == f"Neu {ingredients[2].name}"


@pytest.mark.django_db
def test_apply_enrichment_skip_renames_keeps_name_but_applies_rest(ingredient, sections):
    proposal = make_enriched(ingredient.id)
    entry = {"slug": ingredient.slug, "source_name": ingredient.name, "proposal": proposal.model_dump(mode="json")}

    report = apply_enrichment([entry], apply=True, skip_renames=True)

    ingredient.refresh_from_db()
    assert ingredient.name == "Tomaten"
    assert report.renamed == 0
    assert report.aliases_created == 3
    assert ingredient.packages.count() == 1
    assert not ingredient.aliases.filter(name="Tomaten").exists()


@pytest.mark.django_db
def test_apply_enrichment_synonym_shared_by_several_ingredients_is_generic(sections):
    from supply.models import Ingredient, IngredientAlias

    ingredients = [
        Ingredient.objects.create(name=name, retail_section=sections["Obst"])
        for name in ["Zartbitterschokolade", "Vollmilchschokolade"]
    ]
    entries = [
        {
            "slug": i.slug,
            "source_name": i.name,
            "proposal": make_enriched(
                i.id, retail_name=i.name, synonyms=["Schokolade", f"{i.name} Tafel"], packages=[]
            ).model_dump(mode="json"),
        }
        for i in ingredients
    ]

    apply_enrichment(entries, apply=True, skip_renames=True)

    shared = IngredientAlias.objects.filter(name="Schokolade")
    assert shared.count() == 2
    assert all(alias.is_generic for alias in shared)
    assert not IngredientAlias.objects.get(name="Zartbitterschokolade Tafel").is_generic


@pytest.mark.django_db
def test_apply_enrichment_skip_renames_and_synonyms(ingredient, sections):
    proposal = make_enriched(ingredient.id)
    entry = {"slug": ingredient.slug, "source_name": ingredient.name, "proposal": proposal.model_dump(mode="json")}

    report = apply_enrichment([entry], apply=True, skip_renames=True, skip_synonyms=True)

    ingredient.refresh_from_db()
    assert ingredient.name == "Tomaten"
    assert ingredient.aliases.count() == 0
    assert report.aliases_created == 0
    assert ingredient.packages.count() == 1
    assert ingredient.ai_review_notes["enrich_version"] == ENRICH_PROMPT_VERSION
