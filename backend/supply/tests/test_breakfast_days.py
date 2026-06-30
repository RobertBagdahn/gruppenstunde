"""Tests for BreakfastDay CRUD API and catalog tag_ids filter."""

import json

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from model_bakery import baker

from content.models import Tag
from recipe.models import Recipe

User = get_user_model()


def _auth_client():
    user = baker.make(User)
    c = Client()
    c.force_login(user)
    return c


def _make_breakfast_day(name: str, slug: str | None = None) -> Tag:
    tag, _ = Tag.objects.get_or_create(
        slug=slug or f"test-{name.lower().replace(' ', '-')}",
        defaults={"name": name, "group": "breakfast_day"},
    )
    return tag


@pytest.mark.django_db
class TestBreakfastDaysList:
    def test_list_empty(self):
        c = _auth_client()
        r = c.get("/api/supply/breakfast-days/")
        assert r.status_code == 200
        assert r.json() == []

    def test_list_with_tags(self):
        _make_breakfast_day("Tag 1")
        _make_breakfast_day("Tag 2")
        c = _auth_client()
        r = c.get("/api/supply/breakfast-days/")
        data = r.json()
        assert len(data) == 2
        names = {d["name"] for d in data}
        assert names == {"Tag 1", "Tag 2"}

    def test_list_filters_out_non_breakfast_day_tags(self):
        Tag.objects.create(name="General", slug="general", group="general")
        _make_breakfast_day("Tag 1")
        c = _auth_client()
        r = c.get("/api/supply/breakfast-days/")
        assert len(r.json()) == 1


@pytest.mark.django_db
class TestBreakfastDaysCreate:
    def test_create(self):
        c = _auth_client()
        r = c.post(
            "/api/supply/breakfast-days/",
            json.dumps({"name": "Tag 3"}),
            content_type="application/json",
        )
        assert r.status_code == 200
        data = r.json()
        assert data["name"] == "Tag 3"
        assert Tag.objects.filter(name="Tag 3", group="breakfast_day").exists()

    def test_create_generates_unique_slug(self):
        # Pre-create a tag with slug "tag-3" to force dedup
        Tag.objects.create(name="Existing", slug="tag-3", group="breakfast_day")
        c = _auth_client()
        r = c.post(
            "/api/supply/breakfast-days/",
            json.dumps({"name": "Tag 3"}),
            content_type="application/json",
        )
        assert r.status_code == 200
        assert r.json()["slug"] == "tag-3-1"


@pytest.mark.django_db
class TestBreakfastDaysUpdate:
    def test_rename(self):
        tag = _make_breakfast_day("Tag 1")
        c = _auth_client()
        r = c.put(
            f"/api/supply/breakfast-days/{tag.id}/",
            json.dumps({"name": "Erster Tag"}),
            content_type="application/json",
        )
        assert r.status_code == 200
        tag.refresh_from_db()
        assert tag.name == "Erster Tag"

    def test_rename_nonexistent(self):
        c = _auth_client()
        r = c.put(
            "/api/supply/breakfast-days/999/",
            json.dumps({"name": "Nope"}),
            content_type="application/json",
        )
        assert r.status_code == 404


@pytest.mark.django_db
class TestBreakfastDaysDelete:
    def test_delete_unused(self):
        tag = _make_breakfast_day("Tag 2")
        c = _auth_client()
        r = c.delete(f"/api/supply/breakfast-days/{tag.id}/")
        assert r.status_code == 200
        data = r.json()
        assert data["deleted"] is True
        assert not Tag.objects.filter(id=tag.id).exists()

    def test_delete_with_recipes_blocks(self):
        tag = _make_breakfast_day("Tag 2")
        recipe = baker.make(Recipe)
        recipe.tags.add(tag)
        c = _auth_client()
        r = c.delete(f"/api/supply/breakfast-days/{tag.id}/")
        assert r.status_code == 200
        data = r.json()
        assert data["deleted"] is False
        assert data["recipe_count"] >= 1

    def test_delete_with_recipes_force(self):
        tag = _make_breakfast_day("Tag 2")
        recipe = baker.make(Recipe)
        recipe.tags.add(tag)
        c = _auth_client()
        r = c.delete(f"/api/supply/breakfast-days/{tag.id}/?force=true")
        assert r.status_code == 200
        assert r.json()["deleted"] is True
        assert not Tag.objects.filter(id=tag.id).exists()


@pytest.mark.django_db
class TestBreakfastCatalogTagFilter:
    def test_catalog_drink_filter_by_tag_id(self):
        drink_tag = Tag.objects.create(slug="breakfast-drink", name="breakfast-drink")
        day_tag = Tag.objects.create(slug="breakfast-day-1", name="Tag 1", group="breakfast_day")
        recipe1 = baker.make(Recipe, recipe_type="drink", status="approved")
        recipe1.tags.add(drink_tag)
        recipe1.tags.add(day_tag)
        recipe2 = baker.make(Recipe, recipe_type="drink", status="approved")
        recipe2.tags.add(drink_tag)

        c = Client()
        r = c.get(f"/api/supply/breakfast-catalog/?tag_ids={day_tag.id}")
        assert r.status_code == 200
        data = r.json()
        drink_ids = [d["id"] for d in data["drink_recipes"]]
        assert recipe1.id in drink_ids
        assert recipe2.id not in drink_ids

    def test_catalog_drink_filter_no_tag(self):
        drink_tag = Tag.objects.create(slug="breakfast-drink", name="breakfast-drink")
        recipe = baker.make(Recipe, recipe_type="drink", status="approved")
        recipe.tags.add(drink_tag)

        c = Client()
        r = c.get("/api/supply/breakfast-catalog/")
        assert r.status_code == 200
        data = r.json()
        assert len(data["drink_recipes"]) >= 1

    def test_catalog_drink_filter_invalid_tag_id(self):
        drink_tag = Tag.objects.create(slug="breakfast-drink", name="breakfast-drink")
        recipe = baker.make(Recipe, recipe_type="drink", status="approved")
        recipe.tags.add(drink_tag)

        c = Client()
        r = c.get("/api/supply/breakfast-catalog/?tag_ids=invalid")
        assert r.status_code == 200
        data = r.json()
        assert len(data["drink_recipes"]) >= 1
