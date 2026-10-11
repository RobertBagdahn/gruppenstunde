"""Guards that keep recipes at portions=1 with per-person quantities."""

from io import StringIO
from types import SimpleNamespace
from unittest.mock import patch

import pytest
from django.core.management import call_command

from recipe.models import Recipe


@pytest.mark.django_db
def test_admin_recipe_form_does_not_offer_portions(admin_client):
    resp = admin_client.get("/admin/recipe/recipe/add/")

    assert resp.status_code == 200
    assert 'name="portions"' not in resp.content.decode()


@pytest.mark.django_db
def test_chefkoch_import_stores_source_servings_and_per_person_quantities(admin_client):
    """admin_client provides the superuser the command imports as."""
    from supply.tests import make_portion

    portion = make_portion(name="Gramm", quantity=1, weight_g=1)
    result = SimpleNamespace(
        title="Nudeln für vier",
        steps=["Kochen"],
        summary="",
        recipe_type="warm_meal",
        execution_time="less_30",
        preparation_time="none",
        difficulty="easy",
        source_url="https://www.chefkoch.de/rezepte/1/nudeln.html",
        scout_level_ids=[],
        tag_ids=[],
        servings=4,
        recipe_items=[SimpleNamespace(portion_id=portion.id, quantity=500, note="")],
    )

    with patch("recipe.services.url_import_service.import_recipe_from_url", return_value=result):
        call_command("import_chefkoch_urls", "--limit=1", "--delay=0", stdout=StringIO(), stderr=StringIO())

    recipe = Recipe.objects.get(title="Nudeln für vier")
    assert recipe.portions == 1
    assert recipe.source_servings == 4
    assert [item.quantity for item in recipe.recipe_items.all()] == [125]
