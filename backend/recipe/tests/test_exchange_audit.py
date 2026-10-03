"""The exchange audit reports malformed rows without changing them."""

from io import StringIO

import pytest
from django.core.management import call_command

from recipe.models import RecipeItem, RecipeItemExchangeGroup
from recipe.tests import make_recipe, make_recipe_item


@pytest.mark.django_db
def test_audit_reports_portionless_exchange_member_without_modifying_data() -> None:
    recipe = make_recipe()
    source = make_recipe_item(recipe=recipe)
    group = RecipeItemExchangeGroup.objects.create(recipe=recipe)
    source.exchange_group = group
    source.exchange_position = 0
    source.save(update_fields=["exchange_group", "exchange_position"])
    malformed = RecipeItem.objects.create(
        recipe=recipe,
        portion=None,
        quantity=100,
        exchange_group=group,
        exchange_position=1,
        sort_order=1,
    )
    output = StringIO()

    call_command("audit_exchange_alternatives", stdout=output)

    report = output.getvalue()
    assert "missing portion" in report
    assert "found 1 issues" in report
    assert RecipeItemExchangeGroup.objects.filter(recipe=recipe).count() == 1
    assert RecipeItem.objects.filter(recipe=recipe, exchange_position=0, portion__isnull=False).count() == 1
    assert RecipeItem.objects.filter(recipe=recipe, exchange_position=1, portion__isnull=True).count() == 1
