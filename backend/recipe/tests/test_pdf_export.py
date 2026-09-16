"""Tests for Recipe PDF export service and API endpoint."""

import pytest
from django.contrib.contenttypes.models import ContentType

from recipe.models import Recipe, RecipeItem, RecipeStep, RecipeStepIngredient
from recipe.services.pdf_export import (
    RecipePdfExport,
    _get_allergens,
    _get_recipe_materials,
    _parse_markdown_steps,
    generate_recipe_pdf,
)
from recipe.tests import make_recipe, make_recipe_item
from supply.models import ContentMaterialItem, Material, MeasuringUnit, NutritionalTag, Portion
from supply.tests import make_ingredient


class TestRecipePdfService:
    @pytest.mark.django_db
    def test_generates_recipe_pdf(self):
        recipe = make_recipe(title="Testkuchen")
        make_recipe_item(recipe=recipe, quantity=300)
        pdf = generate_recipe_pdf(recipe)
        assert isinstance(pdf, bytes)
        assert len(pdf) > 0

    @pytest.mark.django_db
    def test_recipe_pdf_with_allergens(self):
        tag = NutritionalTag.objects.create(name="Gluten", is_dangerous=True)
        recipe = make_recipe(title="Gluten-Kuchen")
        ri = make_recipe_item(recipe=recipe, quantity=300)
        ri.portion.ingredient.nutritional_tags.add(tag)
        allergens = _get_allergens(recipe)
        assert "Gluten" in allergens

    @pytest.mark.django_db
    def test_recipe_pdf_without_allergens(self):
        recipe = make_recipe(title="Reiner Kuchen")
        make_recipe_item(recipe=recipe, quantity=300)
        allergens = _get_allergens(recipe)
        assert allergens == []

    @pytest.mark.django_db
    def test_recipe_pdf_without_image(self):
        recipe = make_recipe(title="Bildloser Kuchen")
        make_recipe_item(recipe=recipe, quantity=200)
        pdf = generate_recipe_pdf(recipe)
        assert isinstance(pdf, bytes)

    @pytest.mark.django_db
    def test_recipe_pdf_collects_materials(self):
        recipe = make_recipe(title="Spieße")
        make_recipe_item(recipe=recipe, quantity=200)
        material = Material.objects.create(name="Zahnstocher", material_category="kitchen")
        ct = ContentType.objects.get_for_model(recipe.__class__)
        ContentMaterialItem.objects.create(
            content_type=ct,
            object_id=recipe.id,
            material=material,
            quantity="30 Stück",
            sort_order=0,
        )
        materials = _get_recipe_materials(recipe)
        assert materials == [{"name": "Zahnstocher", "quantity": "30 Stück"}]
        pdf = generate_recipe_pdf(recipe)
        assert isinstance(pdf, bytes)

    @pytest.mark.django_db
    def test_markdown_step_parsing(self):
        steps = _parse_markdown_steps("1. Mehl sieben\n2. Eier verrühren\n3. Backen")
        assert len(steps) == 3
        assert steps[0] == "Mehl sieben"

    @pytest.mark.django_db
    def test_markdown_step_parsing_empty(self):
        steps = _parse_markdown_steps("")
        assert steps == []

    @pytest.mark.django_db
    def test_markdown_step_parsing_none(self):
        steps = _parse_markdown_steps(None)
        assert steps == []


class TestRecipePdfServingScaling:
    @pytest.mark.django_db
    def test_four_servings_scales_ingredient_quantities(self):
        recipe = make_recipe(portions=1)
        make_recipe_item(recipe=recipe, quantity=125)
        export = RecipePdfExport.build(recipe, servings=4)
        assert any("500 Gramm Testzutat" in row["display"] for row in export.ingredients)

    @pytest.mark.django_db
    def test_export_does_not_persist_scale(self):
        recipe = make_recipe(portions=1)
        item = make_recipe_item(recipe=recipe, quantity=125)
        RecipePdfExport.build(recipe, servings=4)
        item.refresh_from_db()
        assert item.quantity == 125
        recipe.refresh_from_db()
        assert recipe.portions == 1

    @pytest.mark.django_db
    def test_direct_gram_item_scaled(self):
        recipe = make_recipe(portions=1)
        RecipeItem.objects.create(recipe=recipe, portion=None, quantity=200)
        export = RecipePdfExport.build(recipe, servings=4)
        assert any(row["display"] == "800g" for row in export.ingredients)

    @pytest.mark.django_db
    def test_named_portion_display_includes_gram_value(self):
        ingredient = make_ingredient(name="Zwiebel")
        unit = MeasuringUnit.objects.get_or_create(name="Stück", defaults={"quantity": 1.0, "unit": "stk"})[0]
        portion = Portion.objects.create(
            ingredient=ingredient,
            measuring_unit=unit,
            name="kleine Zwiebeln",
            quantity=1.5,
            weight_g=60,
            weight_status="confirmed",
        )
        recipe = make_recipe(portions=1)
        make_recipe_item(recipe=recipe, portion=portion, quantity=2)
        export = RecipePdfExport.build(recipe, servings=2)
        assert any("4 kleine Zwiebeln (240g)" in row["display"] for row in export.ingredients)

    @pytest.mark.django_db
    def test_nutrition_per_portion_uses_target_servings(self):
        recipe = make_recipe(portions=1)
        make_recipe_item(recipe=recipe, quantity=100)
        Recipe.objects.filter(pk=recipe.pk).update(
            cached_protein_g=10.0,
            cached_weight_g=400.0,
            cached_energy_total_kcal=800.0,
        )
        export = RecipePdfExport.build(Recipe.objects.get(pk=recipe.pk), servings=4)
        assert export.nutrition["protein_per_portion"] == "10,0"
        assert export.nutrition["energy_kcal_per_portion"] == "200"


class TestRecipePdfStructuredSteps:
    @pytest.mark.django_db
    def test_structured_steps_resolved_with_placeholders(self):
        recipe = make_recipe(portions=1, description="1. Alte Anleitung")
        item = make_recipe_item(recipe=recipe, quantity=100)
        RecipeStep.objects.create(
            recipe=recipe,
            sort_order=0,
            instruction="Mische {Testzutat} gründlich",
            duration_minutes=5,
            section="Teig",
        )
        export = RecipePdfExport.build(recipe, servings=4)
        assert len(export.steps) == 1
        assert export.steps[0]["instruction"] == "Mische 400g Testzutat gründlich"
        assert export.steps[0]["duration_minutes"] == 5
        assert export.steps[0]["section"] == "Teig"

    @pytest.mark.django_db
    def test_step_ingredients_resolved_and_scaled(self):
        recipe = make_recipe(portions=1)
        item = make_recipe_item(recipe=recipe, quantity=100)
        step = RecipeStep.objects.create(recipe=recipe, sort_order=0, instruction="Nimm {Testzutat}")
        RecipeStepIngredient.objects.create(step=step, recipe_item=item, quantity_modifier=0.5)
        export = RecipePdfExport.build(recipe, servings=2)
        assert export.steps[0]["ingredient_labels"] == ["100 g Testzutat"]

    @pytest.mark.django_db
    def test_markdown_fallback_without_structured_steps(self):
        recipe = make_recipe(portions=1, description="1. Mehl sieben\n2. Backen")
        make_recipe_item(recipe=recipe, quantity=100)
        export = RecipePdfExport.build(recipe, servings=1)
        assert [s["instruction"] for s in export.steps] == ["Mehl sieben", "Backen"]

    @pytest.mark.django_db
    def test_description_rendered_separately_from_steps(self):
        recipe = make_recipe(
            portions=1,
            description="Ein Klassiker für die Gruppenstunde.",
        )
        make_recipe_item(recipe=recipe, quantity=100)
        RecipeStep.objects.create(recipe=recipe, sort_order=0, instruction="Alles mischen")
        export = RecipePdfExport.build(recipe, servings=1)
        html = export.render_html()
        assert "Beschreibung" in html
        assert "Ein Klassiker für die Gruppenstunde." in html
        assert "Zubereitungsschritte" in html
        assert "Alles mischen" in html

    @pytest.mark.django_db
    def test_meta_labels_and_page_format_in_html(self):
        recipe = make_recipe(
            portions=1,
            recipe_type="warm_meal",
            difficulty="easy",
            preparation_time="less_15",
        )
        make_recipe_item(recipe=recipe, quantity=100)
        export = RecipePdfExport.build(recipe, servings=4, page_format="letter")
        html = export.render_html()
        assert "4 Portionen" in html
        assert "15 Min. Vorbereitung" in html
        assert "size: letter" in html


class TestRecipePdfAPI:
    @pytest.mark.django_db
    def test_export_recipe_pdf_requires_auth(self, api_client):
        resp = api_client.get("/api/recipes/by-slug/nonexistent/export/pdf/")
        assert resp.status_code == 403

    @pytest.mark.django_db
    def test_export_recipe_pdf_slug_not_found(self, auth_client):
        resp = auth_client.get("/api/recipes/by-slug/nonexistent/export/pdf/")
        assert resp.status_code == 404

    @pytest.mark.django_db
    def test_export_recipe_pdf_success(self, auth_client):
        recipe = make_recipe(title="PDF Rezept", status="approved")
        make_recipe_item(recipe=recipe, quantity=100)
        resp = auth_client.get(f"/api/recipes/by-slug/{recipe.slug}/export/pdf/")
        assert resp.status_code == 200
        assert resp["Content-Type"] == "application/pdf"
        assert "inline" in resp["Content-Disposition"]

    @pytest.mark.django_db
    def test_export_recipe_pdf_invalid_page_format(self, auth_client):
        recipe = make_recipe(title="PDF Rezept", status="approved")
        resp = auth_client.get(f"/api/recipes/by-slug/{recipe.slug}/export/pdf/?page_format=A3")
        assert resp.status_code == 422

    @pytest.mark.django_db
    def test_export_recipe_pdf_with_servings(self, auth_client):
        recipe = make_recipe(title="PDF Rezept", status="approved", portions=1)
        make_recipe_item(recipe=recipe, quantity=100)
        resp = auth_client.get(f"/api/recipes/by-slug/{recipe.slug}/export/pdf/?servings=4")
        assert resp.status_code == 200
        assert resp["Content-Type"] == "application/pdf"

    @pytest.mark.django_db
    @pytest.mark.parametrize("servings", ["0", "101", "abc", "-3"])
    def test_export_recipe_pdf_invalid_servings(self, auth_client, servings):
        recipe = make_recipe(title="PDF Rezept", status="approved")
        resp = auth_client.get(f"/api/recipes/by-slug/{recipe.slug}/export/pdf/?servings={servings}")
        assert resp.status_code == 422
