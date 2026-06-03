"""Tests for the backfill_retail_sections management command."""

from __future__ import annotations

import pytest
from django.core.management import call_command

from supply.models import Ingredient, RetailSection


@pytest.mark.django_db
class TestBackfillRetailSectionsCommand:
    """Test suite for the backfill_retail_sections command."""

    @pytest.fixture(autouse=True)
    def setup_data(self):
        """Set up required retail sections and ingredients."""
        # Create retail sections
        self.rs_kaese = RetailSection.objects.get_or_create(name="Milchprodukte & Käse", defaults={"rank": 1})[0]
        self.rs_oele = RetailSection.objects.get_or_create(name="Öle & Soßen", defaults={"rank": 2})[0]
        self.rs_kuehlung = RetailSection.objects.get_or_create(name="Kühlung", defaults={"rank": 3})[0]

        # Create ingredients
        # 1. Ingredient without retail section that can be mapped
        self.ing_schafskaese = Ingredient.objects.create(
            name="Schafskäse",
            slug="schafskaese",
            description="Leckerer Schafskäse aus Kuh- oder Schafsmilch",
        )

        # 2. Another ingredient without retail section that can be mapped
        self.ing_pflanzenoel = Ingredient.objects.create(
            name="Pflanzenöl",
            slug="pflanzenoel",
            description="Pflanzenöl zum Braten",
        )

        # 3. Ingredient without retail section that CANNOT be mapped
        self.ing_bionella = Ingredient.objects.create(
            name="Bionella",
            slug="bionella",
            description="Leckerer Brotaufstrich",
        )

        # 4. Ingredient with ALREADY SET retail section (should not be overwritten)
        self.ing_tomate = Ingredient.objects.create(
            name="Frische Tomaten",
            slug="frische-tomaten",
            description="Tomate aus der Region",
            retail_section=self.rs_kuehlung,  # Manually set to Kühlung for testing protection
        )

    def test_command_dry_run_does_not_save(self):
        """Assert that running with --dry-run does not modify the DB."""
        # Run command in dry-run mode
        call_command("backfill_retail_sections", dry_run=True)

        # Reload from DB and assert they have not changed
        self.ing_schafskaese.refresh_from_db()
        self.ing_pflanzenoel.refresh_from_db()
        self.ing_bionella.refresh_from_db()
        self.ing_tomate.refresh_from_db()

        assert self.ing_schafskaese.retail_section is None
        assert self.ing_pflanzenoel.retail_section is None
        assert self.ing_bionella.retail_section is None
        assert self.ing_tomate.retail_section == self.rs_kuehlung

    def test_command_backfill_and_idempotency(self):
        """Assert that running the command performs correct backfill and is idempotent."""
        # 1. Run the command to perform backfill
        call_command("backfill_retail_sections")

        # Reload from DB and assert the correct sections were assigned
        self.ing_schafskaese.refresh_from_db()
        self.ing_pflanzenoel.refresh_from_db()
        self.ing_bionella.refresh_from_db()
        self.ing_tomate.refresh_from_db()

        assert self.ing_schafskaese.retail_section == self.rs_kaese
        assert self.ing_pflanzenoel.retail_section == self.rs_oele
        assert self.ing_bionella.retail_section is None
        assert self.ing_tomate.retail_section == self.rs_kuehlung  # Not overwritten!

        # 2. Run a second time to verify idempotency (it shouldn't crash or alter anything)
        call_command("backfill_retail_sections")

        # Reload again and assert state is identical
        self.ing_schafskaese.refresh_from_db()
        self.ing_pflanzenoel.refresh_from_db()
        self.ing_bionella.refresh_from_db()
        self.ing_tomate.refresh_from_db()

        assert self.ing_schafskaese.retail_section == self.rs_kaese
        assert self.ing_pflanzenoel.retail_section == self.rs_oele
        assert self.ing_bionella.retail_section is None
        assert self.ing_tomate.retail_section == self.rs_kuehlung
