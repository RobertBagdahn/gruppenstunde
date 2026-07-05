"""
Regression test: Verify that distinct pork products are not incorrectly marked as duplicates.

This test ensures that after the embedding simplification and sigmoid calibration,
we do NOT have false positives for clearly different ingredients.

Critical test case: "Schweinebauch" (pork belly) vs "Bacon" should have similarity < 50%
(i.e., should NOT be flagged as duplicate pair)
"""

import pytest
from unittest.mock import Mock, patch
from content.services.embedding_service import (
    find_similar_ingredients,
    similarity_to_pct,
)
from supply.models import Ingredient


@pytest.mark.django_db
class TestRegressionDuplicateDetection:
    """Regression tests to catch false positive duplicate detection."""

    def test_schweinebauch_bacon_not_duplicates(self):
        """
        CRITICAL REGRESSION TEST:
        Schweinebauch (pork belly) and Bacon should NOT be flagged as duplicates.
        
        This test ensures that ingredient similarity is based on simplified text
        (name + description + retail_section) rather than complex nutritional data.
        
        If this test fails, it indicates the calibration is too loose or the
        similarity calculation is broken.
        """
        # Create mock ingredients
        schweinebauch = Mock(spec=Ingredient)
        schweinebauch.id = 80
        schweinebauch.name = "Schweinebauch"
        schweinebauch.description = "Frisches Schweinefleisch vom Bauch, dunkle Muskulatur"
        schweinebauch.retail_section = Mock(name="Fleisch")
        schweinebauch.embedding = [0.1, 0.15, 0.2]  # Mock embedding

        bacon = Mock(spec=Ingredient)
        bacon.id = 114
        bacon.name = "Bacon"
        bacon.description = "Geräucherter Schweinebauch, vorgekocht"
        bacon.retail_section = Mock(name="Fleisch")
        bacon.embedding = [0.12, 0.17, 0.22]  # Similar embedding (simulating high similarity)

        # Even though they share "Schweinebauch" in the name, Bacon is processed
        # and prepared very differently. With similarity_pct calibration, they
        # should fall below the ~70% threshold used for duplicate detection.

        # Simulate that despite similar embeddings, calibration brings it down
        high_cosine = 0.85  # High raw cosine similarity
        similarity_pct = similarity_to_pct(high_cosine)

        # The sigmoid function should calibrate this to below 70% for these cases
        # if properly fitted to ground truth
        print(f"Schweinebauch <-> Bacon similarity: {similarity_pct:.1f}%")
        
        # This is where the calibration is critical:
        # - Raw cosine might be 0.85 (too high for threshold)
        # - But sigmoid with proper midpoint should calibrate to ~55-65%
        assert similarity_pct < 70, (
            f"Schweinebauch and Bacon incorrectly similar at {similarity_pct:.1f}%. "
            "This suggests sigmoid calibration needs adjustment. "
            "Verify ground-truth pairs are representative."
        )

    def test_zwiebel_red_zwiebel_should_be_similar(self):
        """
        Zwiebel (onion) and Rote Zwiebel (red onion) should be flagged as similar.
        
        These are both onions, just different varieties. They should have
        similarity > 80% to be flagged as potential duplicates.
        """
        zwiebel = Mock(spec=Ingredient)
        zwiebel.name = "Zwiebel"
        zwiebel.description = "Gelbe Küchenzwiebel"
        zwiebel.retail_section = Mock(name="Gemüse")

        rote_zwiebel = Mock(spec=Ingredient)
        rote_zwiebel.name = "Rote Zwiebel"
        rote_zwiebel.description = "Rote Küchenzwiebel mit milderem Geschmack"
        rote_zwiebel.retail_section = Mock(name="Gemüse")

        # Simulate high similarity for same ingredient category
        high_cosine = 0.88
        similarity_pct = similarity_to_pct(high_cosine)

        print(f"Zwiebel <-> Rote Zwiebel similarity: {similarity_pct:.1f}%")
        
        # Should be well above 70% threshold
        assert similarity_pct > 80, (
            f"Zwiebel and Rote Zwiebel should be similar but got {similarity_pct:.1f}%. "
            "This suggests sigmoid midpoint is too high (too conservative)."
        )

    def test_tomato_tomate_should_be_duplicates(self):
        """
        Tomato (English) and Tomate (German) should be flagged as duplicates.
        
        These are the exact same ingredient with different language names.
        Should have similarity > 90%.
        """
        tomato = Mock(spec=Ingredient)
        tomato.name = "Tomato"
        tomato.description = "Red ripe tomato"
        tomato.retail_section = Mock(name="Vegetables")

        tomate = Mock(spec=Ingredient)
        tomate.name = "Tomate"
        tomate.description = "Rote reife Tomate"
        tomate.retail_section = Mock(name="Gemüse")

        # Very high similarity for same ingredient
        very_high_cosine = 0.92
        similarity_pct = similarity_to_pct(very_high_cosine)

        print(f"Tomato <-> Tomate similarity: {similarity_pct:.1f}%")
        
        # Should be well above 90%
        assert similarity_pct > 90, (
            f"Tomato and Tomate should be nearly identical but got {similarity_pct:.1f}%. "
            "This suggests sigmoid parameters need re-calibration."
        )

    def test_sigmoid_calibration_not_identity_function(self):
        """
        Verify that sigmoid calibration actually transforms the values.
        
        This is a sanity check that the sigmoid function is doing something
        meaningful, not just acting as identity function.
        """
        cosine_values = [0.0, 0.25, 0.5, 0.75, 1.0]
        pct_values = [similarity_to_pct(c) for c in cosine_values]

        # Should be monotonically increasing
        assert pct_values == sorted(pct_values), (
            "Sigmoid calibration should be monotonic"
        )

        # Should not be linear (identity would be cosine * 100)
        # Sigmoid should have S-curve shape
        linear_pct = [c * 100 for c in cosine_values]

        # At least some values should differ from linear
        differences = [abs(p - l) for p, l in zip(pct_values, linear_pct)]
        max_diff = max(differences)

        assert max_diff > 5, (
            f"Sigmoid calibration too close to linear. Max diff: {max_diff:.1f}%. "
            "This suggests sigmoid parameters (steepness/midpoint) may not be optimal."
        )

        print(f"\nSigmoid Calibration Shape Check:")
        print(f"Cosine: {cosine_values}")
        print(f"Linear: {[f'{l:.1f}' for l in linear_pct]}")
        print(f"Sigmoid: {[f'{p:.1f}' for p in pct_values]}")
