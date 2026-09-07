import pytest

from recipe.models import Recipe, Rule
from recipe.services.verification_service import check_verification_readiness


@pytest.mark.django_db
def test_verification_evaluates_scaled_portions():
    """Verify that rules are evaluated using per-serving values instead of raw per-100g cached values."""
    # Recipe with 1 serving, weight = 400g, energy per 100g = 150 kcal.
    # Total energy per serving = 150 * 4 = 600 kcal.
    recipe = Recipe.objects.create(
        title="Schoko-Porridge",
        portions=1,
        cached_weight_g=400.0,
        cached_energy_kcal=150.0,
        description="Leckeres Frühstück",
    )

    # Rule requires at least 500 kcal per serving
    Rule.objects.create(
        name="Mindestkalorien",
        parameter="energy_kcal",
        scope="recipe",
        min_green=500.0,
        min_yellow=400.0,
        is_active=True,
    )

    result = check_verification_readiness(recipe)

    # If raw 150.0 was used, this would fail (status red) and rules_passed would be 0.
    # With scaled value (600.0), status is green and rules_passed is 1.
    assert result.rules_passed == 1
    # Check that there are no warnings for this rule
    rule_warnings = [w for w in result.warnings if w.get("rule_name") == "Mindestkalorien"]
    assert len(rule_warnings) == 0
