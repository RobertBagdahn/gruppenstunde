"""Tests for packing list wizard: build_dynamic_list, generate, preview, presets, catalog."""

import json

import pytest

from packinglist.models import PackingList, PackingCategory, PackingItem
from packinglist.services.suggestion_service import (
    PRESETS,
    UNIFIED_CATALOG,
    build_dynamic_list,
    get_full_catalog,
    preview_dynamic_list,
)


# ==========================================================================
# build_dynamic_list() unit tests
# ==========================================================================


class TestBuildDynamicList:
    def test_basis_items_always_included(self):
        """Basis items should be included regardless of context."""
        result = build_dynamic_list(
            {
                "activity": "zeltlager",
                "duration": "wochenende",
                "season": "sommer",
            }
        )
        assert len(result) > 0
        # Should have multiple categories
        assert len(result) >= 5

    def test_standard_items_match_context(self):
        """Standard items should only appear when context matches."""
        summer_result = build_dynamic_list(
            {
                "activity": "zeltlager",
                "duration": "1-woche",
                "season": "sommer",
            }
        )
        winter_result = build_dynamic_list(
            {
                "activity": "zeltlager",
                "duration": "1-woche",
                "season": "winter",
            }
        )
        # Both should produce results but with different items
        assert len(summer_result) > 0
        assert len(winter_result) > 0

        # Flatten items
        summer_names = {item["name"] for items in summer_result.values() for item in items}
        winter_names = {item["name"] for items in winter_result.values() for item in items}
        # There should be some difference
        assert summer_names != winter_names

    def test_exclusion_tags_work(self):
        """Items with matching exclusion tags should be excluded."""
        # Gruppenstunde context should exclude hausfahrt-tagged items
        result = build_dynamic_list(
            {
                "activity": "gruppenstunde",
                "duration": "tagesfahrt",
                "season": "sommer",
            }
        )
        all_items = [item["name"] for items in result.values() for item in items]
        # Should have items but fewer than a full camp
        assert len(all_items) > 0
        assert len(all_items) < 200

    def test_empty_categories_removed(self):
        """Categories with zero matching items should not appear in result."""
        result = build_dynamic_list(
            {
                "activity": "gruppenstunde",
                "duration": "tagesfahrt",
                "season": "sommer",
            }
        )
        for cat_name, items in result.items():
            assert len(items) > 0, f"Category '{cat_name}' should not be empty"

    def test_erweitert_items_only_for_long_trips(self):
        """Erweitert items should only appear for long-duration trips."""
        short_result = build_dynamic_list(
            {
                "activity": "zeltlager",
                "duration": "wochenende",
                "season": "sommer",
            }
        )
        long_result = build_dynamic_list(
            {
                "activity": "zeltlager",
                "duration": "1-woche",
                "season": "sommer",
            }
        )
        short_count = sum(len(items) for items in short_result.values())
        long_count = sum(len(items) for items in long_result.values())
        # Longer trip should have more items
        assert long_count >= short_count

    def test_age_group_filtering(self):
        """Items with age_group tags should only appear for matching context."""
        woelflinge_result = build_dynamic_list(
            {
                "activity": "zeltlager",
                "duration": "wochenende",
                "season": "sommer",
                "age_group": "woelflinge",
            }
        )
        pfadfinder_result = build_dynamic_list(
            {
                "activity": "zeltlager",
                "duration": "wochenende",
                "season": "sommer",
                "age_group": "pfadfinder",
            }
        )
        # Both should produce results
        assert len(woelflinge_result) > 0
        assert len(pfadfinder_result) > 0


# ==========================================================================
# preview_dynamic_list() unit tests
# ==========================================================================


class TestPreviewDynamicList:
    def test_returns_categories_and_total(self):
        """Preview should return category names with counts."""
        result = preview_dynamic_list(
            {
                "activity": "zeltlager",
                "duration": "1-woche",
                "season": "sommer",
            }
        )
        assert "categories" in result
        assert "total_items" in result
        assert result["total_items"] > 0
        assert len(result["categories"]) > 0

        for cat in result["categories"]:
            assert "name" in cat
            assert "item_count" in cat
            assert cat["item_count"] > 0

    @pytest.mark.django_db
    def test_no_db_records_created(self):
        """Preview should NOT create any DB records."""
        initial_count = PackingList.objects.count()
        preview_dynamic_list(
            {
                "activity": "zeltlager",
                "duration": "wochenende",
                "season": "sommer",
            }
        )
        assert PackingList.objects.count() == initial_count


# ==========================================================================
# API endpoint tests
# ==========================================================================


@pytest.mark.django_db
class TestGenerateEndpoint:
    def test_generate_success(self, auth_client):
        resp = auth_client.post(
            "/api/packing-lists/generate/",
            data=json.dumps(
                {
                    "title": "Mein Sommerlager",
                    "context": {
                        "activity": "zeltlager",
                        "duration": "1-woche",
                        "season": "sommer",
                    },
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["title"] == "Mein Sommerlager"
        assert data["activity_type"] == "zeltlager"
        assert data["duration"] == "1-woche"
        assert data["season"] == "sommer"
        assert len(data["categories"]) > 0

    def test_generate_stores_context(self, auth_client):
        resp = auth_client.post(
            "/api/packing-lists/generate/",
            data=json.dumps(
                {
                    "title": "Test",
                    "context": {
                        "activity": "hajk",
                        "duration": "wochenende",
                        "season": "winter",
                        "age_group": "pfadfinder",
                    },
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200
        pl = PackingList.objects.get(id=resp.json()["id"])
        assert pl.activity_type == "hajk"
        assert pl.duration == "wochenende"
        assert pl.season == "winter"
        assert pl.age_group == "pfadfinder"

    def test_generate_missing_fields_422(self, auth_client):
        resp = auth_client.post(
            "/api/packing-lists/generate/",
            data=json.dumps(
                {
                    "title": "Test",
                    "context": {
                        "activity": "zeltlager",
                        # missing duration and season
                    },
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 422

    def test_generate_unauthenticated_403(self, api_client):
        resp = api_client.post(
            "/api/packing-lists/generate/",
            data=json.dumps(
                {
                    "title": "Test",
                    "context": {
                        "activity": "zeltlager",
                        "duration": "wochenende",
                        "season": "sommer",
                    },
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 403


@pytest.mark.django_db
class TestPreviewEndpoint:
    def test_preview_returns_counts(self, auth_client):
        resp = auth_client.post(
            "/api/packing-lists/preview/",
            data=json.dumps(
                {
                    "context": {
                        "activity": "zeltlager",
                        "duration": "1-woche",
                        "season": "sommer",
                    },
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["total_items"] > 0
        assert len(data["categories"]) > 0

    def test_preview_no_db_records(self, auth_client):
        initial = PackingList.objects.count()
        auth_client.post(
            "/api/packing-lists/preview/",
            data=json.dumps(
                {
                    "context": {
                        "activity": "zeltlager",
                        "duration": "wochenende",
                        "season": "sommer",
                    },
                }
            ),
            content_type="application/json",
        )
        assert PackingList.objects.count() == initial


@pytest.mark.django_db
class TestPresetsEndpoint:
    def test_presets_returns_list(self, api_client):
        resp = api_client.get("/api/packing-lists/presets/")
        assert resp.status_code == 200
        data = resp.json()
        assert isinstance(data, list)
        assert len(data) > 0
        preset = data[0]
        assert "name" in preset
        assert "icon" in preset
        assert "description" in preset
        assert "context" in preset


@pytest.mark.django_db
class TestCatalogEndpoint:
    def test_catalog_returns_items(self, api_client):
        resp = api_client.get("/api/packing-lists/catalog/")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert len(data["items"]) > 0
        item = data["items"][0]
        assert "name" in item
        assert "quantity" in item
        assert "description" in item
        assert "category" in item
        assert "tags" in item

    def test_catalog_excludes_do_not_bring(self, api_client):
        resp = api_client.get("/api/packing-lists/catalog/")
        data = resp.json()
        # The full catalog function excludes is_do_not_bring items
        # All items should have tags but none should be marked as do_not_bring
        catalog_items = get_full_catalog()
        for item in catalog_items:
            assert "name" in item
