"""Tests for tiered AI budgets (EUR, DB-backed) and the quota endpoint."""

from datetime import timedelta
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from django.test import Client, RequestFactory, override_settings
from django.utils import timezone

from content.choices import AiTierChoices
from content.models import AiInteraction
from core.errors import ApiError
from core.middleware import current_anon_key
from core.services import ai_budget, gemini

User = get_user_model()


def _fake_client(prompt_tokens: int = 1000, output_tokens: int = 500) -> MagicMock:
    response = SimpleNamespace(
        text="ok",
        usage_metadata=SimpleNamespace(
            prompt_token_count=prompt_tokens,
            candidates_token_count=output_tokens,
            total_token_count=prompt_tokens + output_tokens,
            thoughts_token_count=None,
        ),
    )
    client = MagicMock()
    client.models.generate_content.return_value = response
    return client


@pytest.fixture
def fake_gemini(monkeypatch: pytest.MonkeyPatch) -> MagicMock:
    client = _fake_client()
    monkeypatch.setattr(gemini, "_get_client", lambda: client)
    return client


@pytest.fixture
def anon_key() -> object:
    token = current_anon_key.set("a" * 64)
    yield "a" * 64
    current_anon_key.reset(token)


def _record(
    tier: str,
    cost: str | None,
    *,
    user: object = None,
    anon_key: str = "",
    reserved: str | None = None,
    age: timedelta = timedelta(0),
) -> AiInteraction:
    interaction = AiInteraction.objects.create(
        context="recipe_smart_input",
        prompt="x",
        model="gemini-3.5-flash-lite",
        tier=tier,
        cost_eur=Decimal(cost) if cost else None,
        reserved_cost_eur=Decimal(reserved) if reserved else None,
        user=user,
        anon_key=anon_key,
    )
    if age:
        AiInteraction.objects.filter(id=interaction.id).update(created_at=timezone.now() - age)
    return interaction


class TestTierResolution:
    def test_tiers(self) -> None:
        assert ai_budget.resolve_ai_tier(None) == AiTierChoices.ANONYMOUS
        assert ai_budget.resolve_ai_tier(AnonymousUser()) == AiTierChoices.ANONYMOUS
        assert ai_budget.resolve_ai_tier(SimpleNamespace(is_authenticated=True, is_staff=False)) == "user"
        assert ai_budget.resolve_ai_tier(SimpleNamespace(is_authenticated=True, is_staff=True)) == "staff"
        assert ai_budget.resolve_ai_tier(None, bypass_limits=True) == "system"


class TestAnonKey:
    def test_no_raw_ip_and_daily_rotation(self) -> None:
        request = RequestFactory().get("/", REMOTE_ADDR="203.0.113.7", HTTP_USER_AGENT="Firefox")
        now = timezone.now()
        key_today = ai_budget.compute_anon_key(request, now)
        assert len(key_today) == 64
        assert "203.0.113.7" not in key_today
        assert key_today == ai_budget.compute_anon_key(request, now)
        assert key_today != ai_budget.compute_anon_key(request, now + timedelta(days=1))

    @override_settings(AI_CLIENT_IP_TRUSTED_HOPS=3)
    def test_client_ip_ignores_spoofed_prefix(self) -> None:
        request = RequestFactory().get(
            "/", HTTP_X_FORWARDED_FOR="1.1.1.1, 203.0.113.7, 169.254.1.1, 10.0.0.1", REMOTE_ADDR="10.0.0.2"
        )
        assert ai_budget.client_ip(request) == "203.0.113.7"


@pytest.mark.django_db
class TestAnonymousBudget:
    def test_non_allowlisted_feature_requires_login(self, fake_gemini: MagicMock, anon_key: str) -> None:
        with pytest.raises(ApiError) as exc:
            gemini.gemini_call(user=None, model="x", contents="hi", context="recipe_suggest_all")
        assert exc.value.status_code == 401
        assert exc.value.code == "ai_login_required"
        fake_gemini.models.generate_content.assert_not_called()

    def test_anonymous_without_request_context_requires_login(self, fake_gemini: MagicMock) -> None:
        with pytest.raises(ApiError) as exc:
            gemini.gemini_call(user=None, model="x", contents="hi", context="recipe_smart_input")
        assert exc.value.code == "ai_login_required"

    def test_allowlisted_call_is_recorded_as_anonymous(self, fake_gemini: MagicMock, anon_key: str) -> None:
        response, interaction_id = gemini.gemini_call(
            user=None, model="x", contents="Rezepttext", context="recipe_smart_input"
        )
        assert response.text == "ok"
        interaction = AiInteraction.objects.get(id=interaction_id)
        assert interaction.tier == "anonymous"
        assert interaction.anon_key == anon_key
        assert interaction.cost_eur is not None and interaction.cost_eur > 0
        assert interaction.reserved_cost_eur is not None
        config = fake_gemini.models.generate_content.call_args.kwargs["config"]
        assert config.max_output_tokens == 4096

    def test_shared_pot_exhausted(self, fake_gemini: MagicMock, anon_key: str) -> None:
        _record("anonymous", "0.049", anon_key="b" * 64)
        with pytest.raises(ApiError) as exc:
            gemini.gemini_call(user=None, model="x", contents="Rezepttext", context="recipe_smart_input")
        assert exc.value.status_code == 429
        assert exc.value.code == "ai_public_budget_exhausted"
        assert exc.value.retry_after_seconds and exc.value.retry_after_seconds > 0
        fake_gemini.models.generate_content.assert_not_called()

    def test_old_usage_leaves_window(self, fake_gemini: MagicMock, anon_key: str) -> None:
        _record("anonymous", "0.049", anon_key="b" * 64, age=timedelta(hours=2))
        gemini.gemini_call(user=None, model="x", contents="Rezepttext", context="recipe_smart_input")

    def test_visitor_limit(self, fake_gemini: MagicMock, anon_key: str) -> None:
        _record("anonymous", "0.019", anon_key=anon_key)
        with pytest.raises(ApiError) as exc:
            gemini.gemini_call(user=None, model="x", contents="Rezepttext", context="recipe_smart_input")
        assert exc.value.code == "ai_visitor_limit"

    def test_open_reservations_count(self, anon_key: str) -> None:
        _record("anonymous", None, reserved="0.045", anon_key="c" * 64)
        assert ai_budget.anonymous_usage(timezone.now()) == Decimal("0.045")

    def test_stale_reservations_expire(self) -> None:
        _record("anonymous", None, reserved="0.045", anon_key="c" * 64, age=timedelta(minutes=20))
        assert ai_budget.anonymous_usage(timezone.now()) == Decimal("0")

    def test_sequential_reservations_do_not_overdraw(self, anon_key: str) -> None:
        created: list[AiInteraction] = []

        def create(**fields: object) -> AiInteraction:
            interaction = AiInteraction.objects.create(context="recipe_smart_input", prompt="x", model="m", **fields)
            created.append(interaction)
            return interaction

        estimate = Decimal("0.004")
        accepted = 0
        for index in range(20):
            try:
                ai_budget.reserve(
                    tier="anonymous",
                    user=None,
                    anon_key=f"{index:064d}",
                    context="recipe_smart_input",
                    estimate_eur=estimate,
                    create_interaction=create,
                )
                accepted += 1
            except ApiError:
                break
        assert accepted == 12  # 12 × 0.004 = 0.048 ≤ 0.05 < 0.052
        assert sum(i.reserved_cost_eur for i in created) <= Decimal("0.05")


@pytest.mark.django_db
class TestUserBudgets:
    def test_user_daily_quota(self, fake_gemini: MagicMock) -> None:
        user = User.objects.create_user(username="u@x.de", email="u@x.de")
        _record("user", "0.30", user=user)
        with pytest.raises(ApiError) as exc:
            gemini.gemini_call(user=user, model="x", contents="hi", context="recipe_suggest_all")
        assert exc.value.code == "ai_quota_exceeded"
        assert exc.value.retry_after_seconds and exc.value.retry_after_seconds <= 24 * 3600

    def test_staff_has_three_euros(self, fake_gemini: MagicMock) -> None:
        staff = User.objects.create_user(username="s@x.de", email="s@x.de", is_staff=True)
        _record("staff", "2.50", user=staff)
        _response, interaction_id = gemini.gemini_call(
            user=staff, model="x", contents="hi", context="recipe_suggest_all"
        )
        assert AiInteraction.objects.get(id=interaction_id).tier == "staff"

    def test_system_calls_not_counted(self, fake_gemini: MagicMock) -> None:
        user = User.objects.create_user(username="u@x.de", email="u@x.de")
        _record("system", "5.00", user=user)
        assert ai_budget.user_usage_today(user, timezone.now()) == Decimal("0")

    def test_bypass_is_system_tier(self, fake_gemini: MagicMock) -> None:
        _response, interaction_id = gemini.gemini_call(
            user=None, model="x", contents="hi", context="ingredient_parser", bypass_limits=True
        )
        assert AiInteraction.objects.get(id=interaction_id).tier == "system"


@pytest.mark.django_db
class TestQuotaEndpoint:
    def test_anonymous_quota(self, api_client: Client) -> None:
        body = api_client.get("/api/ai/quota/").json()
        assert body["tier"] == "anonymous"
        assert body["limit_eur"] == 0.05
        assert body["anonymous_features"] == ["recipe_recognize", "ingredient_recognize"]
        assert body["visitor_remaining_percent"] == 100

    def test_user_quota(self) -> None:
        user = User.objects.create_user(username="u@x.de", email="u@x.de")
        _record("user", "0.12", user=user)
        client = Client()
        client.force_login(user)
        body = client.get("/api/ai/quota/").json()
        assert body["tier"] == "user"
        assert body["limit_eur"] == 0.3
        assert body["used_percent"] == 40
