"""Tests for RecipeTypeStats: signal/service + API endpoint."""

import pytest
from django.test import Client

from content.choices import ContentStatus
from recipe.models import RecipeTypeStats
from recipe.tests import make_recipe


@pytest.mark.django_db
class TestRecipeTypeStatsService:
    def test_signal_creates_stats_on_save(self):
        make_recipe(recipe_type="warm_meal", status=ContentStatus.APPROVED, portions=4)
        for _ in range(9):
            make_recipe(recipe_type="warm_meal", status=ContentStatus.APPROVED, portions=4)

        stats = RecipeTypeStats.objects.filter(recipe_type="warm_meal").first()
        assert stats is not None
        assert stats.count >= 10

    def test_signal_skips_fewer_than_10(self):
        for _ in range(5):
            make_recipe(recipe_type="breakfast", status=ContentStatus.APPROVED, portions=4)

        stats = RecipeTypeStats.objects.filter(recipe_type="breakfast").first()
        assert stats is None

    def test_signal_excludes_draft_recipes(self):
        for _ in range(10):
            make_recipe(recipe_type="warm_meal", status=ContentStatus.APPROVED, portions=4)
        make_recipe(recipe_type="warm_meal", status=ContentStatus.DRAFT, portions=4)

        stats = RecipeTypeStats.objects.get(recipe_type="warm_meal")
        assert stats.count == 10

    def test_signal_excludes_recipes_without_portions(self):
        for _ in range(10):
            make_recipe(recipe_type="warm_meal", status=ContentStatus.APPROVED, portions=4)
        make_recipe(recipe_type="warm_meal", status=ContentStatus.APPROVED, portions=None)

        stats = RecipeTypeStats.objects.get(recipe_type="warm_meal")
        assert stats.count == 10

    def test_signal_recalculates_on_status_change(self, db):
        for _ in range(9):
            make_recipe(recipe_type="dessert", status=ContentStatus.APPROVED, portions=4)
        draft = make_recipe(recipe_type="dessert", status=ContentStatus.DRAFT, portions=4)

        # No stats yet (<10)
        assert RecipeTypeStats.objects.filter(recipe_type="dessert").count() == 0

        # Publish the draft
        draft.status = ContentStatus.APPROVED
        draft.save()

        stats = RecipeTypeStats.objects.get(recipe_type="dessert")
        assert stats.count == 10

    def test_delete_recipe_recalculates(self, db):
        recipes = []
        for _ in range(11):
            r = make_recipe(recipe_type="cold_meal", status=ContentStatus.APPROVED, portions=4)
            recipes.append(r)

        stats = RecipeTypeStats.objects.get(recipe_type="cold_meal")
        assert stats.count == 11

        # Delete one recipe
        recipes[0].delete()

        stats = RecipeTypeStats.objects.get(recipe_type="cold_meal")
        assert stats.count == 10

    def test_delete_drops_below_10_removes_stats(self, db):
        recipes = []
        for _ in range(10):
            r = make_recipe(recipe_type="recipe_part", status=ContentStatus.APPROVED, portions=4)
            recipes.append(r)

        assert RecipeTypeStats.objects.filter(recipe_type="recipe_part").exists()

        recipes[0].delete()

        assert not RecipeTypeStats.objects.filter(recipe_type="recipe_part").exists()


@pytest.mark.django_db
class TestRecipeTypeStatsAPI:
    def test_get_stats_returns_correct_structure(self):
        for _ in range(10):
            make_recipe(recipe_type="warm_meal", status=ContentStatus.APPROVED, portions=4)

        client = Client()
        response = client.get("/api/recipes/type-stats/warm_meal/")
        assert response.status_code == 200

        data = response.json()
        assert data["recipe_type"] == "warm_meal"
        assert data["count"] >= 10
        assert "price_avg" in data
        assert "energy_avg" in data
        assert "nutri_score_dist" in data
        assert "updated_at" in data

    def test_get_stats_without_10_returns_404(self):
        for _ in range(3):
            make_recipe(recipe_type="breakfast", status=ContentStatus.APPROVED, portions=4)

        client = Client()
        response = client.get("/api/recipes/type-stats/breakfast/")
        assert response.status_code == 404

    def test_get_stats_includes_buckets(self):
        """Test that API response includes histogram buckets."""
        for _ in range(10):
            make_recipe(recipe_type="warm_meal", status=ContentStatus.APPROVED, portions=4)

        client = Client()
        response = client.get("/api/recipes/type-stats/warm_meal/")
        assert response.status_code == 200

        data = response.json()
        assert "price_buckets" in data
        assert "energy_buckets" in data
        assert "protein_buckets" in data
        # Each bucket should have min, max, count
        if data["price_buckets"]:
            bucket = data["price_buckets"][0]
            assert "min" in bucket
            assert "max" in bucket
            assert "count" in bucket


@pytest.mark.django_db
class TestRecipeTypeStatsBuckets:
    def test_buckets_generated_correctly(self):
        """Test that bucket generation works correctly."""
        from recipe.services.type_stats_service import _create_buckets

        values = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
        buckets = _create_buckets(values, num_buckets=5)

        assert len(buckets) == 5
        assert all("min" in b and "max" in b and "count" in b for b in buckets)
        assert sum(b["count"] for b in buckets) == len(values)

    def test_buckets_handle_empty_list(self):
        """Test that empty list returns empty buckets."""
        from recipe.services.type_stats_service import _create_buckets

        buckets = _create_buckets([], num_buckets=5)
        assert buckets == []

    def test_buckets_handle_single_value(self):
        """Test that single value creates one bucket."""
        from recipe.services.type_stats_service import _create_buckets

        buckets = _create_buckets([42.0], num_buckets=5)
        assert len(buckets) == 1
        assert buckets[0]["min"] == 42.0
        assert buckets[0]["max"] == 42.0
        assert buckets[0]["count"] == 1
