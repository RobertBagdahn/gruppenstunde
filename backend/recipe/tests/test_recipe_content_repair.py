"""Tests for the recipe content repair service (Gemini is mocked)."""

import json
from unittest.mock import MagicMock, patch

import pytest
from django.core.management import call_command

from content.models import Tag
from recipe.models import RecipeStep
from recipe.services import recipe_content_repair as repair
from recipe.tests import make_recipe, make_recipe_item
from supply.tests import make_ingredient, make_portion


def _response(payload: dict) -> MagicMock:
    resp = MagicMock()
    resp.text = json.dumps(payload)
    return resp


def _recipe_with_item(**kwargs):
    recipe = make_recipe(**kwargs)
    ing = make_ingredient(name="Mehl")
    make_recipe_item(recipe=recipe, portion=make_portion(ingredient=ing, weight_g=1.0, name="1g"), ingredient=ing)
    return recipe


def test_strip_cooklang_markers_keeps_headings():
    text = "## Vorbereitung\nIn einer #Schüssel mischen, im #Ofen backen."
    assert repair.strip_cooklang_markers(text) == "## Vorbereitung\nIn einer Schüssel mischen, im Ofen backen."


@pytest.mark.django_db
def test_clean_markers_dry_run_and_apply():
    recipe = make_recipe(description="In der #Schüssel mischen.")
    assert repair.clean_cooklang_markers(ids=None, apply=False).changed == 1
    recipe.refresh_from_db()
    assert "#" in recipe.description
    repair.clean_cooklang_markers(ids=None, apply=True)
    recipe.refresh_from_db()
    assert recipe.description == "In der Schüssel mischen."


@pytest.mark.django_db
def test_placeholder_summary_replaced():
    recipe = make_recipe(summary="Importiert aus Cooklang (03 Vegan)")
    other = make_recipe(summary="Echte Beschreibung")
    resp = _response({"items": [{"id": recipe.id, "summary": "Herzhafter Burger aus Zucchini und Möhren."}]})
    with patch.object(repair, "gemini_call", return_value=(resp, "x")):
        result = repair.fix_placeholder_summaries(ids=None, apply=True)
    recipe.refresh_from_db()
    other.refresh_from_db()
    assert result.changed == 1
    assert recipe.summary == "Herzhafter Burger aus Zucchini und Möhren."
    assert other.summary == "Echte Beschreibung"


@pytest.mark.django_db
def test_placeholder_summary_dry_run_saves_nothing():
    recipe = make_recipe(summary="Importiert aus Cooklang (03 Vegan)")
    resp = _response({"items": [{"id": recipe.id, "summary": "Herzhafter Burger aus Zucchini."}]})
    with patch.object(repair, "gemini_call", return_value=(resp, "x")):
        repair.fix_placeholder_summaries(ids=None, apply=False)
    recipe.refresh_from_db()
    assert recipe.summary.startswith("Importiert aus Cooklang")


@pytest.mark.django_db
def test_missing_steps_converted_from_description():
    recipe = _recipe_with_item(description="Mehl in der #Schüssel mischen.")
    steps = [
        {
            "sort_order": 0,
            "instruction": "Mehl mischen.",
            "duration_minutes": None,
            "section": "",
            "step_ingredients": [
                {
                    "recipe_item_id": recipe.recipe_items.first().id,
                    "quantity_modifier": 1.0,
                    "preparation": "",
                    "sort_order": 0,
                }
            ],
        }
    ]
    with patch.object(repair.AiStepService, "convert_markdown_to_steps", return_value=steps) as convert:
        result = repair.fix_missing_steps(ids=None, apply=True)
    assert result.changed == 1
    assert convert.call_args.args[1] == "Mehl in der Schüssel mischen."
    assert RecipeStep.objects.filter(recipe=recipe).count() == 1
    assert RecipeStep.objects.get(recipe=recipe).step_ingredients.count() == 1


@pytest.mark.django_db
def test_missing_steps_generated_when_no_description_and_skips_without_items():
    recipe = _recipe_with_item(description="")
    empty = make_recipe(description="")
    steps = [
        {"sort_order": 0, "instruction": "Mehl backen.", "duration_minutes": 5, "section": "", "step_ingredients": []}
    ]
    with patch.object(repair.AiStepService, "generate_steps_from_items", return_value=(steps, None)):
        result = repair.fix_missing_steps(ids=None, apply=True)
    assert result.changed == 1
    assert RecipeStep.objects.filter(recipe=recipe).count() == 1
    assert RecipeStep.objects.filter(recipe=empty).count() == 0


@pytest.mark.django_db
def test_missing_tags_only_catalog_slugs():
    recipe = make_recipe()
    tagged = make_recipe()
    vegan = Tag.objects.create(name="Vegan", slug="vegan")
    tagged.tags.add(vegan)
    resp = _response({"items": [{"id": recipe.id, "tag_slugs": ["vegan", "erfunden"]}]})
    with patch.object(repair, "gemini_call", return_value=(resp, "x")):
        result = repair.fix_missing_tags(ids=None, apply=True)
    assert result.changed == 1
    assert list(recipe.tags.all()) == [vegan]


@pytest.mark.django_db
def test_command_dry_run_does_not_write():
    recipe = make_recipe(summary="Importiert aus Cooklang (03 Vegan)", description="#Pfanne nutzen.")
    resp = _response({"items": [{"id": recipe.id, "summary": "Pfannengericht für Gruppen."}]})
    with patch.object(repair, "gemini_call", return_value=(resp, "x")):
        call_command("repair_recipe_content", steps="markers,summary")
    recipe.refresh_from_db()
    assert recipe.summary.startswith("Importiert aus Cooklang")
    assert recipe.description == "#Pfanne nutzen."
