"""Tests for MealPlanTag CRUD API endpoints."""

import datetime as dt

import pytest
from django.test import TestCase
from django.utils import timezone
from model_bakery import baker

from planner.models import MealPlan, MealPlanTag


@pytest.mark.django_db
class TestMealPlanTagsAPI(TestCase):
    def setUp(self):
        self.user = baker.make("auth.User")
        self.other_user = baker.make("auth.User")
        self.plan = MealPlan.objects.create(
            name="Test Plan",
            norm_portions=10,
            created_by=self.user,
            owner=self.user,
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)),
        )
        self.client.force_login(self.user)

    def test_list_tags_empty(self):
        resp = self.client.get(f"/api/meal-plans/{self.plan.id}/tags/")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_create_tag(self):
        resp = self.client.post(
            f"/api/meal-plans/{self.plan.id}/tags/",
            {"name": "Sommerlager"},
            content_type="application/json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["name"] == "sommerlager"

    def test_create_tag_auto_lowercase(self):
        resp = self.client.post(
            f"/api/meal-plans/{self.plan.id}/tags/",
            {"name": "  LAGERFEUER  "},
            content_type="application/json",
        )
        assert resp.status_code == 201
        assert resp.json()["name"] == "lagerfeuer"

    def test_create_duplicate_tag_returns_409(self):
        MealPlanTag.objects.create(meal_plan=self.plan, name="sommerlager")
        resp = self.client.post(
            f"/api/meal-plans/{self.plan.id}/tags/",
            {"name": "Sommerlager"},
            content_type="application/json",
        )
        assert resp.status_code == 409

    def test_create_tag_requires_auth(self):
        self.client.logout()
        resp = self.client.post(
            f"/api/meal-plans/{self.plan.id}/tags/",
            {"name": "test"},
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_create_tag_requires_edit_permission(self):
        self.client.force_login(self.other_user)
        resp = self.client.post(
            f"/api/meal-plans/{self.plan.id}/tags/",
            {"name": "test"},
            content_type="application/json",
        )
        assert resp.status_code == 404

    def test_delete_tag(self):
        tag = MealPlanTag.objects.create(meal_plan=self.plan, name="sommerlager")
        resp = self.client.delete(f"/api/meal-plans/{self.plan.id}/tags/{tag.id}/")
        assert resp.status_code == 204
        assert MealPlanTag.objects.count() == 0

    def test_delete_tag_not_found_returns_404(self):
        resp = self.client.delete(f"/api/meal-plans/{self.plan.id}/tags/999/")
        assert resp.status_code == 404

    def test_tags_in_meal_plan_detail(self):
        MealPlanTag.objects.create(meal_plan=self.plan, name="sommerlager")
        MealPlanTag.objects.create(meal_plan=self.plan, name="lagerfeuer")
        resp = self.client.get(f"/api/meal-plans/{self.plan.id}/")
        assert resp.status_code == 200
        data = resp.json()
        assert "tags" in data
        tag_names = [t["name"] for t in data["tags"]]
        assert "sommerlager" in tag_names
        assert "lagerfeuer" in tag_names

    def test_tags_in_list_view(self):
        MealPlanTag.objects.create(meal_plan=self.plan, name="sommerlager")
        resp = self.client.get("/api/meal-plans/?origin=mine")
        assert resp.status_code == 200
        assert len(resp.json()) >= 1
        plan_data = [p for p in resp.json() if p["id"] == self.plan.id]
        assert len(plan_data) == 1
        assert "tags" in plan_data[0]
        assert plan_data[0]["tags"][0]["name"] == "sommerlager"

    def test_list_tags_requires_access(self):
        self.client.force_login(self.other_user)
        resp = self.client.get(f"/api/meal-plans/{self.plan.id}/tags/")
        assert resp.status_code == 404
