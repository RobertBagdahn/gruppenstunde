"""
Tests for scope=mine search filter.
"""

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from content.choices import ContentStatus
from event.tests import make_event, make_registration
from profiles.models import GroupMembership, UserGroup

User = get_user_model()


@pytest.fixture
def user_a(db):
    return User.objects.create_user(username="user_a", password="pass")


@pytest.fixture
def user_b(db):
    return User.objects.create_user(username="user_b", password="pass")


@pytest.fixture
def client_a(user_a):
    c = Client()
    c.force_login(user_a)
    c._user = user_a
    return c


@pytest.fixture
def client_b(user_b):
    c = Client()
    c.force_login(user_b)
    c._user = user_b
    return c


@pytest.mark.django_db
class TestScopeMineSession:
    """3.1: scope=mine&type=session returns only user's sessions."""

    def test_mine_returns_created_by(self, client_a, user_a):
        from session.models import GroupSession

        GroupSession.objects.create(
            title="My Session",
            summary="test",
            status=ContentStatus.APPROVED,
            session_type="exploration",
            created_by=user_a,
        )
        GroupSession.objects.create(
            title="Other Session",
            summary="test",
            status=ContentStatus.APPROVED,
            session_type="exploration",
        )
        resp = client_a.get("/api/content/search/?scope=mine&result_types=session")
        data = resp.json()
        titles = [i["title"] for i in data["items"]]
        assert "My Session" in titles
        assert "Other Session" not in titles

    def test_mine_returns_author(self, client_a, user_a):
        from session.models import GroupSession

        session = GroupSession.objects.create(
            title="Authored Session",
            summary="test",
            status=ContentStatus.APPROVED,
            session_type="exploration",
        )
        session.authors.add(user_a)
        resp = client_a.get("/api/content/search/?scope=mine&result_types=session")
        data = resp.json()
        titles = [i["title"] for i in data["items"]]
        assert "Authored Session" in titles


@pytest.mark.django_db
class TestScopeMineEvent:
    """3.2: scope=mine&type=event returns events from all 5 relation paths, deduplicated."""

    def test_mine_event_all_relations(self, client_a, user_a):
        # 1. created_by
        e1 = make_event(name="Created", created_by=user_a)
        # 2. responsible_persons
        e2 = make_event(name="Responsible")
        e2.responsible_persons.add(user_a)
        # 3. invited_users
        e3 = make_event(name="Invited")
        e3.invited_users.add(user_a)
        # 4. invited_groups
        group = UserGroup.objects.create(name="testgroup", slug="testgroup")
        GroupMembership.objects.create(user=user_a, group=group)
        e4 = make_event(name="GroupInvited")
        e4.invited_groups.add(group)
        # 5. registration
        e5 = make_event(name="Registered")
        make_registration(user=user_a, event=e5)
        # Unrelated event
        make_event(name="Unrelated")

        resp = client_a.get("/api/content/search/?scope=mine&result_types=event")
        data = resp.json()
        titles = {i["title"] for i in data["items"]}
        assert {"Created", "Responsible", "Invited", "GroupInvited", "Registered"} <= titles
        assert "Unrelated" not in titles
        # Deduplicated: no duplicate IDs
        ids = [i["id"] for i in data["items"]]
        assert len(ids) == len(set(ids))


@pytest.mark.django_db
class TestDraftLeak:
    """3.3: User B must not see drafts of User A even with scope=mine."""

    def test_no_draft_leak(self, client_b, user_a, user_b):
        from session.models import GroupSession

        GroupSession.objects.create(
            title="A Draft",
            summary="secret",
            status=ContentStatus.DRAFT,
            session_type="exploration",
            created_by=user_a,
        )
        GroupSession.objects.create(
            title="B Draft",
            summary="mine",
            status=ContentStatus.DRAFT,
            session_type="exploration",
            created_by=user_b,
        )
        resp = client_b.get("/api/content/search/?scope=mine&result_types=session")
        data = resp.json()
        titles = [i["title"] for i in data["items"]]
        assert "A Draft" not in titles
        assert "B Draft" in titles


@pytest.mark.django_db
class TestTemplatesExcluded:
    """3.4: Templates are excluded in both scope=all and scope=mine."""

    def test_templates_excluded_all(self, client_a, user_a):
        make_event(name="Real Event", is_template=False)
        make_event(name="Template Event", is_template=True)
        resp = client_a.get("/api/content/search/?result_types=event")
        titles = [i["title"] for i in resp.json()["items"]]
        assert "Template Event" not in titles

    def test_templates_excluded_mine(self, client_a, user_a):
        make_event(name="My Real", is_template=False, created_by=user_a)
        make_event(name="My Template", is_template=True, created_by=user_a)
        resp = client_a.get("/api/content/search/?scope=mine&result_types=event")
        titles = [i["title"] for i in resp.json()["items"]]
        assert "My Template" not in titles


@pytest.mark.django_db
class TestAnonymousScopeMine:
    """3.5: Anonymous user with scope=mine gets same result as scope=all."""

    def test_anonymous_mine_equals_all(self, api_client):
        from session.models import GroupSession

        GroupSession.objects.create(
            title="Public Session",
            summary="test",
            status=ContentStatus.APPROVED,
            session_type="exploration",
        )
        resp_all = api_client.get("/api/content/search/?result_types=session")
        resp_mine = api_client.get("/api/content/search/?scope=mine&result_types=session")
        assert resp_all.json()["items"] == resp_mine.json()["items"]
