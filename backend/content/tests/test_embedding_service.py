"""Tests for embedding service functionality."""

import pytest
from unittest.mock import Mock, patch
from content.services.embedding_service import (
    build_ingredient_embedding_text,
    _text_hash,
    similarity_to_pct,
    update_ingredient_embedding,
)
from supply.models import Ingredient
from supply.models.reference import RetailSection


@pytest.mark.django_db
class TestBuildIngredientEmbeddingText:
    """Tests for simplified embedding text builder."""

    def test_minimal_ingredient(self):
        """Test with only name (minimal fields)."""
        ing = Mock(spec=Ingredient)
        ing.name = "Tomato"
        ing.description = ""
        ing.retail_section = None

        result = build_ingredient_embedding_text(ing)
        assert result == "Tomato"

    def test_with_description(self):
        """Test with name and description."""
        ing = Mock(spec=Ingredient)
        ing.name = "Tomato"
        ing.description = "Fresh red tomato"
        ing.retail_section = None

        result = build_ingredient_embedding_text(ing)
        assert "Tomato" in result
        assert "Fresh red tomato" in result

    def test_with_retail_section(self):
        """Test with all fields including retail section."""
        retail_section = Mock()
        retail_section.name = "Vegetables"

        ing = Mock(spec=Ingredient)
        ing.name = "Carrot"
        ing.description = "Orange root vegetable"
        ing.retail_section = retail_section

        result = build_ingredient_embedding_text(ing)
        assert "Carrot" in result
        assert "Orange root vegetable" in result
        assert "Abteilung: Vegetables" in result

    def test_no_nutritional_data(self):
        """Verify that nutritional data is NOT included (unlike old version)."""
        ing = Mock(spec=Ingredient)
        ing.name = "Beef"
        ing.description = "Lean beef"
        ing.retail_section = Mock(name="Meat")
        ing.energy_kcal = 250
        ing.protein_g = 26
        ing.fat_g = 15

        result = build_ingredient_embedding_text(ing)

        # Should NOT contain nutritional values (simplified version)
        assert "kcal" not in result
        assert "Eiweiß" not in result
        assert "Fett" not in result


class TestTextHash:
    """Tests for text hashing function."""

    def test_hash_consistency(self):
        """Same text produces same hash."""
        text = "Test ingredient: Tomato"
        hash1 = _text_hash(text)
        hash2 = _text_hash(text)
        assert hash1 == hash2

    def test_hash_length(self):
        """SHA-256 hash is 64 characters."""
        result = _text_hash("test")
        assert len(result) == 64

    def test_hash_different_text(self):
        """Different text produces different hash."""
        hash1 = _text_hash("Tomato")
        hash2 = _text_hash("Potato")
        assert hash1 != hash2

    def test_hash_case_sensitive(self):
        """Hash is case-sensitive."""
        hash1 = _text_hash("Tomato")
        hash2 = _text_hash("tomato")
        assert hash1 != hash2


class TestSimilarityToPct:
    """Tests for sigmoid calibration function."""

    def test_identity_maps_to_high_percent(self):
        """Identical items (similarity=1.0) -> high percentage."""
        result = similarity_to_pct(1.0)
        assert 95 < result <= 100

    def test_orthogonal_maps_to_low_percent(self):
        """Orthogonal items (similarity=0.0) -> low percentage."""
        result = similarity_to_pct(0.0)
        assert 0 <= result < 5

    def test_midpoint_maps_to_50_percent(self):
        """Midpoint (default 0.6) should map to ~50%."""
        result = similarity_to_pct(0.6)  # Default midpoint
        assert 45 < result < 55

    def test_bounds_clamping(self):
        """Values outside [0, 1] are clamped."""
        result_negative = similarity_to_pct(-0.5)
        result_high = similarity_to_pct(1.5)
        assert 0 <= result_negative < 10
        assert 90 < result_high <= 100

    def test_reasonable_similarity_values(self):
        """Test reasonable similarity values."""
        # Low similarity
        low = similarity_to_pct(0.5)
        # High similarity
        high = similarity_to_pct(0.8)
        # Order should be preserved
        assert low < high

    def test_custom_parameters(self):
        """Test with custom sigmoid parameters."""
        # Lower steepness = gentler transition
        result1 = similarity_to_pct(0.5, steepness=5.0, midpoint=0.5)
        # Higher steepness = sharper transition
        result2 = similarity_to_pct(0.5, steepness=20.0, midpoint=0.5)

        # At exactly midpoint, both should be close to 50%
        assert 45 < result1 < 55
        assert 45 < result2 < 55


@pytest.mark.django_db
class TestUpdateIngredientEmbedding:
    """Tests for hash-based change detection in embedding updates."""

    @patch("content.services.embedding_service.create_embedding")
    def test_hash_detects_unchanged_text(self, mock_create):
        """When text hasn't changed, embedding is skipped."""
        ing = Mock(spec=Ingredient)
        ing.pk = 1
        ing.name = "Tomato"
        ing.description = "Fresh"
        ing.retail_section = None
        ing.embedding = [0.1, 0.2]  # Non-None (exists)

        # Hash of the simplified text
        expected_text = "Tomato Fresh"
        expected_hash = _text_hash(expected_text)
        ing.embedding_text_hash = expected_hash  # Hash matches current text

        result = update_ingredient_embedding(ing, force=False)

        # Should return False (not updated)
        assert result is False
        # create_embedding should not be called
        mock_create.assert_not_called()

    @patch("content.services.embedding_service.create_embedding")
    def test_hash_detects_changed_text(self, mock_create):
        """When text changes, embedding is recalculated."""
        mock_create.return_value = [0.5, 0.6, 0.7]

        ing = Mock(spec=Ingredient)
        ing.pk = 2
        ing.name = "Carrot"
        ing.description = "Orange"
        ing.retail_section = Mock(name="Vegetables")
        ing.embedding = None
        ing.embedding_text_hash = "old_hash_value"  # Different from current text
        ing.save = Mock()

        result = update_ingredient_embedding(ing, force=False)

        # Should return True (updated)
        assert result is True
        # create_embedding should be called
        mock_create.assert_called_once()
        # save should be called with new values
        ing.save.assert_called_once()
        # Verify save was called with update_fields
        call_kwargs = ing.save.call_args[1]
        assert "update_fields" in call_kwargs
        update_fields = call_kwargs["update_fields"]
        assert "embedding" in update_fields
        assert "embedding_text_hash" in update_fields

    @patch("content.services.embedding_service.create_embedding")
    def test_force_regenerates_even_if_hash_matches(self, mock_create):
        """With force=True, embedding is regenerated even if text hash matches."""
        mock_create.return_value = [0.8, 0.9]

        ing = Mock(spec=Ingredient)
        ing.pk = 3
        ing.name = "Beef"
        ing.description = "Lean"
        ing.retail_section = Mock(name="Meat")
        ing.embedding = [0.1, 0.2]
        expected_hash = _text_hash("Beef Lean Abteilung: Meat")
        ing.embedding_text_hash = expected_hash  # Hash matches
        ing.save = Mock()

        result = update_ingredient_embedding(ing, force=True)

        # Should return True (updated due to force)
        assert result is True
        # create_embedding should still be called
        mock_create.assert_called_once()
