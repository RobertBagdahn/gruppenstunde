import pytest
from django.core.management import call_command

from recipe.models import Rule


@pytest.mark.django_db
class TestSeedRules:
    def test_seed_rules_creates_extended_scope_rules_idempotently(self):
        call_command("seed_rules")
        first_count = Rule.objects.count()

        call_command("seed_rules")

        assert Rule.objects.count() == first_count

        expected_rules = [
            ("recipe", "price_total"),
            ("recipe", "weight_g"),
            ("recipe", "nutri_class"),
            ("meal", "price_total"),
            ("meal", "weight_g"),
            ("meal", "nutri_class"),
            ("day", "price_total"),
            ("day", "weight_g"),
            ("day", "nutri_class"),
            ("meal_event", "price_total"),
            ("meal_event", "nutri_class"),
        ]
        for scope, parameter in expected_rules:
            assert Rule.objects.filter(scope=scope, parameter=parameter).exists()
