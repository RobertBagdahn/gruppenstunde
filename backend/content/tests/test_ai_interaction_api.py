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


# ---------------------------------------------------------------------------
# Pricing Endpoint
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAiPricing:
    PRICING_URL = "/api/content/admin/ai-pricing/"

    def test_staff_gets_pricing(self, client, staff_user):
        client.force_login(staff_user)
        res = client.get(self.PRICING_URL)
        assert res.status_code == 200
        data = res.json()
        assert "pricing" in data
        assert "usd_to_eur" in data
        assert isinstance(data["pricing"], list)
        assert len(data["pricing"]) >= 1
        entry = data["pricing"][0]
        assert "model" in entry
        assert "type" in entry
        assert "input_per_1m_usd" in entry

    def test_non_staff_returns_403(self, client, owner_user):
        client.force_login(owner_user)
        res = client.get(self.PRICING_URL)
        assert res.status_code == 403

    def test_unauthenticated_returns_403(self, client):
        res = client.get(self.PRICING_URL)
        assert res.status_code == 403


# ---------------------------------------------------------------------------
# Stats Endpoint with Date Filtering
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAiInteractionStatsWithDateFilter:
    STATS_URL = "/api/content/admin/ai-interactions/stats/"

    def test_date_from_filters_old_entries(self, client, staff_user):
        from datetime import date, timedelta

        from content.models import AiInteraction

        old_date = date.today() - timedelta(days=60)
        old = AiInteraction.objects.create(
            context="ingredient_ai_suggest_all",
            prompt={"input": "old"},
            response="old resp",
            model="gemini-flash",
            success=True,
        )
        AiInteraction.objects.filter(id=old.id).update(created_at=old_date)

        new = AiInteraction.objects.create(
            context="recipe_ai_create",
            prompt={"input": "new"},
            response="new resp",
            model="gemini-flash",
            success=True,
        )
        AiInteraction.objects.filter(id=new.id).update(created_at=date.today())

        client.force_login(staff_user)
        res = client.get(self.STATS_URL + "?date_from=" + (date.today() - timedelta(days=7)).isoformat())
        assert res.status_code == 200
        data = res.json()
        assert data["total_calls"] == 1

    def test_date_to_filters_future_entries(self, client, staff_user, owner_user):
        from datetime import date

        from content.models import AiInteraction

        AiInteraction.objects.create(
            context="ingredient_ai_suggest_all",
            prompt={"input": "today"},
            response="resp",
            model="gemini-flash",
            user=owner_user,
            success=True,
        )

        client.force_login(staff_user)
        past_date = (date.today() - date.resolution).isoformat()
        res = client.get(self.STATS_URL + "?date_to=" + past_date)
        assert res.status_code == 200
        data = res.json()
        assert data["total_calls"] == 0

    def test_invalid_date_format_returns_400(self, client, staff_user):
        client.force_login(staff_user)
        res = client.get(self.STATS_URL + "?date_from=invalid-date")
        assert res.status_code == 400

    def test_date_from_and_date_to_together(self, client, staff_user, owner_user):
        from datetime import date, timedelta

        from content.models import AiInteraction

        for days_ago in [1, 5, 10, 20]:
            d = date.today() - timedelta(days=days_ago)
            obj = AiInteraction.objects.create(
                context="recipe_ai_create",
                prompt={"input": f"day{days_ago}"},
                response="resp",
                model="gemini-flash",
                user=owner_user,
                success=True,
            )
            AiInteraction.objects.filter(id=obj.id).update(created_at=d)

        client.force_login(staff_user)
        res = client.get(
            self.STATS_URL
            + "?date_from=" + (date.today() - timedelta(days=7)).isoformat()
            + "&date_to=" + (date.today() - timedelta(days=3)).isoformat()
        )
        assert res.status_code == 200
        data = res.json()
        assert data["total_calls"] == 1

    def test_backward_compatible_no_date_params(self, client, staff_user, interaction):
        client.force_login(staff_user)
        res = client.get(self.STATS_URL)
        assert res.status_code == 200
        data = res.json()
        assert "total_calls" in data


# ---------------------------------------------------------------------------
# User-Costs Endpoint with Filtering
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestAiUserCosts:
    USER_COSTS_URL = "/api/content/admin/ai-interactions/user-costs/"

    def test_staff_gets_user_costs(self, client, staff_user, owner_user):
        from content.models import AiInteraction

        AiInteraction.objects.create(
            context="ingredient_ai_suggest_all",
            prompt={"input": "test"},
            response="resp",
            model="gemini-flash",
            user=owner_user,
            success=True,
            total_tokens=100,
            cost_eur=0.05,
        )

        client.force_login(staff_user)
        res = client.get(self.USER_COSTS_URL)
        assert res.status_code == 200
        data = res.json()
        assert isinstance(data, list)
        assert len(data) >= 1
        entry = data[0]
        assert entry["user_name"] == "owner"
        assert "total_calls" in entry
        assert "total_tokens" in entry
        assert "total_cost_eur" in entry
        assert "cost_30d_eur" in entry
        assert "vote_rate" in entry

    def test_include_background(self, client, staff_user, owner_user):
        from content.models import AiInteraction

        AiInteraction.objects.create(
            context="embedding",
            prompt={"input": "bg"},
            response="resp",
            model="gemini-embedding-001",
            user=owner_user,
            success=True,
            is_background=True,
            total_tokens=50,
            cost_eur=0.01,
        )
        AiInteraction.objects.create(
            context="ingredient_ai_suggest_all",
            prompt={"input": "fg"},
            response="resp",
            model="gemini-flash",
            user=owner_user,
            success=True,
            is_background=False,
            total_tokens=100,
            cost_eur=0.05,
        )

        client.force_login(staff_user)

        res_no_bg = client.get(self.USER_COSTS_URL)
        assert res_no_bg.status_code == 200
        data_no_bg = res_no_bg.json()
        user_entry = next(e for e in data_no_bg if e["user_name"] == "owner")
        assert user_entry["total_calls"] == 1

        res_with_bg = client.get(self.USER_COSTS_URL + "?include_background=true")
        assert res_with_bg.status_code == 200
        data_with_bg = res_with_bg.json()
        user_entry_bg = next(e for e in data_with_bg if e["user_name"] == "owner")
        assert user_entry_bg["total_calls"] == 2

    def test_date_filter(self, client, staff_user, owner_user):
        from datetime import date, timedelta

        from content.models import AiInteraction

        old_date = date.today() - timedelta(days=60)
        old = AiInteraction.objects.create(
            context="ingredient_ai_suggest_all",
            prompt={"input": "old"},
            response="resp",
            model="gemini-flash",
            user=owner_user,
            success=True,
        )
        AiInteraction.objects.filter(id=old.id).update(created_at=old_date)

        new = AiInteraction.objects.create(
            context="recipe_ai_create",
            prompt={"input": "new"},
            response="resp",
            model="gemini-flash",
            user=owner_user,
            success=True,
        )
        AiInteraction.objects.filter(id=new.id).update(created_at=date.today())

        client.force_login(staff_user)
        res = client.get(self.USER_COSTS_URL + "?date_from=" + (date.today() - timedelta(days=7)).isoformat())
        assert res.status_code == 200
        data = res.json()
        user_entry = next(e for e in data if e["user_name"] == "owner")
        assert user_entry["total_calls"] == 1

    def test_non_staff_returns_403(self, client, owner_user):
        client.force_login(owner_user)
        res = client.get(self.USER_COSTS_URL)
        assert res.status_code == 403
