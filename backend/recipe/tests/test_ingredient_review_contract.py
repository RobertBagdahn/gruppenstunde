from django.test import SimpleTestCase

from recipe.schemas.ingredient_review import (
    IngredientReviewRowIn,
    RecipeImportSourceIn,
    ReviewPortionOut,
)


class IngredientReviewContractTests(SimpleTestCase):
    def test_confirmed_row_requires_positive_quantity(self):
        with self.assertRaises(ValueError):
            IngredientReviewRowIn(
                key="row-1",
                status="confirmed",
                selected_ingredient_id=1,
                selected_portion_id=2,
                quantity=0,
            )

    def test_source_contract_accepts_urls_and_text(self):
        self.assertEqual(RecipeImportSourceIn(type="url", value="https://example.test").type, "url")
        self.assertEqual(RecipeImportSourceIn(type="text", value="Zutaten\n200 g Mehl").type, "text")

    def test_portion_contract_rejects_non_positive_weight(self):
        with self.assertRaises(ValueError):
            ReviewPortionOut(name="Stück", quantity=1, weight_g=0)
