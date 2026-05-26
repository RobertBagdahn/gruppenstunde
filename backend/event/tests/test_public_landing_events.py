"""Tests for GET /api/events/public-landing/."""

import datetime

import pytest
from django.utils import timezone

from event.tests import make_event


@pytest.mark.django_db
class TestPublicLandingEvents:
    url = "/api/events/public-landing/"

    def test_returns_empty_list_when_no_public_events(self, api_client):
        """Empty state returns an empty list, not 404/500."""
        response = api_client.get(self.url)
        assert response.status_code == 200
        assert response.json() == []

    def test_returns_only_public_events(self, api_client):
        """Private events MUST NOT appear in the public landing."""
        make_event(name="Public Event", is_public=True)
        make_event(name="Private Event", is_public=False)

        response = api_client.get(self.url)
        assert response.status_code == 200
        data = response.json()
        names = [e["name"] for e in data]
        assert "Public Event" in names
        assert "Private Event" not in names

    def test_excludes_templates(self, api_client):
        """Templates MUST be excluded even if marked public."""
        make_event(name="Real Public", is_public=True, is_template=False)
        make_event(name="Template", is_public=True, is_template=True)

        response = api_client.get(self.url)
        data = response.json()
        names = [e["name"] for e in data]
        assert "Real Public" in names
        assert "Template" not in names

    def test_upcoming_events_ordered_ascending(self, api_client):
        """Upcoming events are returned first, ordered by start_date ascending."""
        now = timezone.now()
        make_event(
            name="Far Future",
            is_public=True,
            start_date=now + datetime.timedelta(days=60),
            end_date=now + datetime.timedelta(days=61),
        )
        make_event(
            name="Near Future",
            is_public=True,
            start_date=now + datetime.timedelta(days=5),
            end_date=now + datetime.timedelta(days=6),
        )
        make_event(
            name="Mid Future",
            is_public=True,
            start_date=now + datetime.timedelta(days=20),
            end_date=now + datetime.timedelta(days=21),
        )

        response = api_client.get(self.url)
        names = [e["name"] for e in response.json()]
        assert names == ["Near Future", "Mid Future", "Far Future"]

    def test_fills_with_past_events_when_upcoming_sparse(self, api_client):
        """When fewer than 12 upcoming events, recent past events fill up the list."""
        now = timezone.now()
        make_event(
            name="Upcoming",
            is_public=True,
            start_date=now + datetime.timedelta(days=10),
            end_date=now + datetime.timedelta(days=11),
        )
        make_event(
            name="Recent Past",
            is_public=True,
            start_date=now - datetime.timedelta(days=5),
            end_date=now - datetime.timedelta(days=4),
        )
        make_event(
            name="Old Past",
            is_public=True,
            start_date=now - datetime.timedelta(days=100),
            end_date=now - datetime.timedelta(days=99),
        )

        response = api_client.get(self.url)
        names = [e["name"] for e in response.json()]
        # Upcoming first, then past events ordered descending (most recent past first)
        assert names == ["Upcoming", "Recent Past", "Old Past"]

    def test_limits_to_twelve_items(self, api_client):
        """Result is capped at 12 items even if more public events exist."""
        now = timezone.now()
        for i in range(15):
            make_event(
                name=f"Public Event {i}",
                is_public=True,
                start_date=now + datetime.timedelta(days=i + 1),
                end_date=now + datetime.timedelta(days=i + 2),
            )

        response = api_client.get(self.url)
        data = response.json()
        assert len(data) == 12

    def test_accessible_without_authentication(self, api_client):
        """Endpoint is accessible to anonymous users (no 401/403)."""
        make_event(name="Public", is_public=True)
        response = api_client.get(self.url)
        assert response.status_code == 200
