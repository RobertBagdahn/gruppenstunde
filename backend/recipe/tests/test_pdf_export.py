"""Tests for Recipe PDF export service and API endpoint."""

import pytest

from recipe.services.pdf_export import _get_allergens, _parse_markdown_steps, generate_recipe_pdf
from recipe.tests import make_recipe, make_recipe_item
from supply.models import NutritionalTag


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
