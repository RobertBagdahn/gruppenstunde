"""
Tests for AI interaction vote endpoint and aggregation stats.

Covers:
- PATCH /api/ai-interactions/{interaction_id}/vote/ (Task 5.4)
- GET /api/admin/ai-interactions/stats/ (Task 5.5)
"""

import uuid

import pytest
from django.contrib.auth import get_user_model

User = get_user_model()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def owner_user(db):
    return User.objects.create_user(
        username="owner",
        email="owner@test.de",
        password="testpass",
    )


@pytest.fixture
def other_user(db):
    return User.objects.create_user(
        username="other",
        email="other@test.de",
        password="testpass",
    )


@pytest.fixture
def staff_user(db):
    return User.objects.create_user(
        username="staff",
        email="staff@test.de",
        password="testpass",
        is_staff=True,
    )


@pytest.fixture
def interaction(db, owner_user):
    from content.models import AiInteraction

    return AiInteraction.objects.create(
        id=uuid.uuid4(),
        context="ingredient_ai_suggest_all",
        prompt={"input": "test"},
        response="test response",
        model="gemini-flash",
        user=owner_user,
        duration_ms=500,
        success=True,
    )


# ---------------------------------------------------------------------------
# Task 5.4: Vote Endpoint
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAiInteractionVote:
    VOTE_URL_TEMPLATE = "/api/content/ai-interactions/{id}/vote/"
    STATS_URL = "/api/content/admin/ai-interactions/stats/"

    def test_owner_can_vote_up(self, client, owner_user, interaction):
        """Happy path: Owner votes thumbs up."""
        client.force_login(owner_user)
        url = self.VOTE_URL_TEMPLATE.format(id=interaction.id)
        res = client.patch(
            url,
            data={"vote": "up"},
            content_type="application/json",
        )
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"

        interaction.refresh_from_db()
        assert interaction.vote == "up"
        assert interaction.voted_at is not None

    def test_owner_can_vote_down(self, client, owner_user, interaction):
        """Owner votes thumbs down."""
        client.force_login(owner_user)
        url = self.VOTE_URL_TEMPLATE.format(id=interaction.id)
        res = client.patch(
            url,
            data={"vote": "down"},
            content_type="application/json",
        )
        assert res.status_code == 200
        interaction.refresh_from_db()
        assert interaction.vote == "down"

    def test_owner_can_change_vote(self, client, owner_user, interaction):
        """Owner can change vote from up to down."""
        interaction.vote = "up"
        interaction.save(update_fields=["vote"])
        client.force_login(owner_user)
        url = self.VOTE_URL_TEMPLATE.format(id=interaction.id)
        res = client.patch(
            url,
            data={"vote": "down"},
            content_type="application/json",
        )
        assert res.status_code == 200
        interaction.refresh_from_db()
        assert interaction.vote == "down"

    def test_unauthenticated_returns_401(self, client, interaction):
        """Unauthenticated user gets 401."""
        url = self.VOTE_URL_TEMPLATE.format(id=interaction.id)
        res = client.patch(
            url,
            data={"vote": "up"},
            content_type="application/json",
        )
        assert res.status_code == 401

    def test_other_user_returns_403(self, client, other_user, interaction):
        """Different authenticated user gets 403."""
        client.force_login(other_user)
        url = self.VOTE_URL_TEMPLATE.format(id=interaction.id)
        res = client.patch(
            url,
            data={"vote": "up"},
            content_type="application/json",
        )
        assert res.status_code == 403

    def test_staff_can_vote_on_any_interaction(self, client, staff_user, interaction):
        """Staff can vote on any interaction regardless of owner."""
        client.force_login(staff_user)
        url = self.VOTE_URL_TEMPLATE.format(id=interaction.id)
        res = client.patch(
            url,
            data={"vote": "up"},
            content_type="application/json",
        )
        assert res.status_code == 200

    def test_nonexistent_interaction_returns_404(self, client, owner_user):
        """Non-existent interaction ID returns 404."""
        client.force_login(owner_user)
        url = self.VOTE_URL_TEMPLATE.format(id=uuid.uuid4())
        res = client.patch(
            url,
            data={"vote": "up"},
            content_type="application/json",
        )
        assert res.status_code == 404

    def test_invalid_vote_value_returns_422(self, client, owner_user, interaction):
        """Invalid vote value returns 422."""
        client.force_login(owner_user)
        url = self.VOTE_URL_TEMPLATE.format(id=interaction.id)
        res = client.patch(
            url,
            data={"vote": "maybe"},
            content_type="application/json",
        )
        assert res.status_code == 422

    def test_invalid_uuid_returns_404(self, client, owner_user):
        """Malformed UUID returns 404."""
        client.force_login(owner_user)
        url = "/api/content/ai-interactions/not-a-uuid/vote/"
        res = client.patch(
            url,
            data={"vote": "up"},
            content_type="application/json",
        )
        assert res.status_code == 404


# ---------------------------------------------------------------------------
# Task 5.5: Aggregation Stats Endpoint
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAiInteractionStats:
    STATS_URL = "/api/content/admin/ai-interactions/stats/"

    def test_staff_gets_stats(self, client, staff_user, interaction):
        """Staff user gets 200 with stats."""
        client.force_login(staff_user)
        res = client.get(self.STATS_URL)
        assert res.status_code == 200
        data = res.json()
        assert "total_calls" in data
        assert "calls_today" in data
        assert "voted_calls" in data
        assert "vote_rate" in data
        assert "by_context" in data
        assert "timeline" in data

    def test_non_staff_returns_403(self, client, owner_user, interaction):
        """Non-staff user gets 403."""
        client.force_login(owner_user)
        res = client.get(self.STATS_URL)
        assert res.status_code == 403

    def test_unauthenticated_returns_403(self, client, interaction):
        """Unauthenticated request returns 403."""
        res = client.get(self.STATS_URL)
        assert res.status_code == 403

    def test_stats_counts_are_correct(self, client, staff_user, db, owner_user):
        """Stats counts reflect actual data."""
        from content.models import AiInteraction

        AiInteraction.objects.create(
            context="ingredient_ai_suggest_all",
            prompt={"input": "a"},
            response="resp a",
            model="gemini-flash",
            user=owner_user,
            success=True,
            vote="up",
        )
        AiInteraction.objects.create(
            context="recipe_ai_create",
            prompt={"input": "b"},
            response="resp b",
            model="gemini-flash",
            user=owner_user,
            success=False,
        )

        client.force_login(staff_user)
        res = client.get(self.STATS_URL)
        assert res.status_code == 200
        data = res.json()

        assert data["total_calls"] >= 2
        assert data["voted_calls"] >= 1
        # by_context should have at least the two contexts created above
        context_names = [c["context"] for c in data["by_context"]]
        assert "ingredient_ai_suggest_all" in context_names
        assert "recipe_ai_create" in context_names

    def test_timeline_format(self, client, staff_user, interaction):
        """Timeline entries have expected keys."""
        client.force_login(staff_user)
        res = client.get(self.STATS_URL)
        data = res.json()
        if data["timeline"]:
            entry = data["timeline"][0]
            assert "date" in entry
            assert "total" in entry
            assert "thumbs_up" in entry
            assert "thumbs_down" in entry
