"""Tests for the cleanup_analytics management command."""

from datetime import timedelta
from io import StringIO

import pytest
from django.core.management import call_command
from django.utils import timezone

from content.models import ContentView, SearchLog


@pytest.fixture
def old_views(db):
    """Create ContentView entries older than 12 months."""
    old_date = timezone.now() - timedelta(days=400)
    views = []
    for i in range(5):
        v = ContentView.objects.create(
            content_type_id=1,
            object_id=1,
            session_key=f"sess-{i}",
            ip_hash="abc123",
            user_agent="TestAgent",
        )
        ContentView.objects.filter(pk=v.pk).update(created_at=old_date)
        views.append(v)
    return views


@pytest.fixture
def recent_views(db):
    """Create recent ContentView entries."""
    views = []
    for i in range(3):
        views.append(
            ContentView.objects.create(
                content_type_id=1,
                object_id=1,
                session_key=f"recent-{i}",
                ip_hash="abc123",
                user_agent="TestAgent",
            )
        )
    return views


@pytest.fixture
def old_searches(db):
    """Create SearchLog entries older than 12 months."""
    old_date = timezone.now() - timedelta(days=400)
    logs = []
    for i in range(3):
        s = SearchLog.objects.create(
            query=f"test query {i}",
            results_count=10,
        )
        SearchLog.objects.filter(pk=s.pk).update(created_at=old_date)
        logs.append(s)
    return logs


@pytest.mark.django_db
class TestCleanupAnalytics:
    def test_default_retention_deletes_old(self, old_views, recent_views, old_searches):
        out = StringIO()
        call_command("cleanup_analytics", stdout=out)
        output = out.getvalue()
        assert "5 ContentView" in output or "ContentView" in output
        assert ContentView.objects.count() == 3  # only recent remain
        assert SearchLog.objects.count() == 0  # all old deleted

    def test_custom_retention(self, old_views, recent_views):
        out = StringIO()
        call_command("cleanup_analytics", "--retention-months=6", stdout=out)
        assert ContentView.objects.count() == 3

    def test_dry_run(self, old_views, old_searches):
        out = StringIO()
        call_command("cleanup_analytics", "--dry-run", stdout=out)
        output = out.getvalue()
        assert "DRY RUN" in output
        # Nothing should be deleted
        assert ContentView.objects.count() == 5
        assert SearchLog.objects.count() == 3

    def test_no_old_data(self, recent_views):
        out = StringIO()
        call_command("cleanup_analytics", stdout=out)
        output = out.getvalue()
        assert "0 ContentView-Einträge gelöscht" in output
        assert ContentView.objects.count() == 3
