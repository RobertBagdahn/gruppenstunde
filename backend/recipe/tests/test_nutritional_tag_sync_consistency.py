"""Tests for the nutritional-tag AND-intersection sync correctness.

The sync must ignore exchange alternatives (position > 0) and soft-deleted
portions, so that inactive ingredients cannot break the tag intersection
(which the ingredient radar relies on).
"""

import pytest
from model_bakery import baker

from recipe.models import RecipeItemExchangeGroup
from recipe.services.recipe_checks import sync_recipe_nutritional_tags
from recipe.tests import make_recipe, make_recipe_item
from supply.models import NutritionalTag
from supply.tests import make_ingredient, make_portion


@pytest.mark.django_db
class TestNutritionalTagSyncConsistency:
    def _vegan_tag(self) -> NutritionalTag:
        return baker.make(NutritionalTag, name="Vegan")

    def test_exchange_alternative_does_not_break_intersection(self):
        vegan = self._vegan_tag()

        ing_a = make_ingredient(name="Tomate")
        ing_a.nutritional_tags.add(vegan)
        ing_b = make_ingredient(name="Käse")  # exchange default (pos 0), vegan tag present
        ing_b.nutritional_tags.add(vegan)
        ing_c = make_ingredient(name="Hefeflocken")  # exchange alt (pos 1), NOT tagged -> must be ignored

        recipe = make_recipe(portions=1)
        make_recipe_item(recipe=recipe, portion=make_portion(ingredient=ing_a, weight_g=100.0), quantity=1.0)
        item_b = make_recipe_item(recipe=recipe, portion=make_portion(ingredient=ing_b, weight_g=100.0), quantity=1.0)
        item_c = make_recipe_item(recipe=recipe, portion=make_portion(ingredient=ing_c, weight_g=100.0), quantity=1.0)

        group = RecipeItemExchangeGroup.objects.create(recipe=recipe, name="Käse-Ersatz")
        item_b.exchange_group = group
        item_b.exchange_position = 0
        item_b.save()
        item_c.exchange_group = group
        item_c.exchange_position = 1
        item_c.save()

        sync_recipe_nutritional_tags(recipe)

        tag_names = set(recipe.nutritional_tags.values_list("name", flat=True))
        assert "Vegan" in tag_names

    def test_soft_deleted_portion_does_not_break_intersection(self):
        vegan = self._vegan_tag()

        ing_a = make_ingredient(name="Tomate")
        ing_a.nutritional_tags.add(vegan)
        ing_b = make_ingredient(name="Käse")  # NOT tagged, but portion soft-deleted -> ignored

        recipe = make_recipe(portions=1)
        make_recipe_item(recipe=recipe, portion=make_portion(ingredient=ing_a, weight_g=100.0), quantity=1.0)
        item_b = make_recipe_item(recipe=recipe, portion=make_portion(ingredient=ing_b, weight_g=100.0), quantity=1.0)
        item_b.portion.soft_delete()

        sync_recipe_nutritional_tags(recipe)

        tag_names = set(recipe.nutritional_tags.values_list("name", flat=True))
        assert "Vegan" in tag_names
