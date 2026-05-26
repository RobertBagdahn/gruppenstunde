"""Planner app privacy data collector."""

from __future__ import annotations

from typing import Any

from django.contrib.auth import get_user_model

from profiles.services.privacy import PrivacyDataCollector

User = get_user_model()


class PlannerPrivacyCollector(PrivacyDataCollector):
    """Collects and anonymizes Planner, PlannerCollaborator, MealPlan data."""

    def collect(self, user: User) -> dict[str, Any]:
        from planner.models import MealPlan, Planner, PlannerCollaborator

        planners = list(Planner.objects.filter(owner=user).values("id", "title", "created_at"))
        for p in planners:
            p["created_at"] = str(p["created_at"])

        collaborations = list(
            PlannerCollaborator.objects.filter(user=user)
            .select_related("planner")
            .values("planner__title", "role", "invited_at")
        )
        for c in collaborations:
            c["invited_at"] = str(c["invited_at"])

        meal_plans = list(MealPlan.objects.filter(created_by=user).values("id", "name", "slug", "created_at"))
        for m in meal_plans:
            m["created_at"] = str(m["created_at"])

        items = [
            *[{"type": "planner", **p} for p in planners],
            *[{"type": "collaboration", **c} for c in collaborations],
            *[{"type": "meal_event", **m} for m in meal_plans],
        ]

        return {
            "planning": {"count": len(items), "items": items},
        }

    def anonymize(self, user: User) -> None:
        from planner.models import MealPlan, Planner, PlannerCollaborator

        Planner.objects.filter(owner=user).delete()
        PlannerCollaborator.objects.filter(user=user).delete()
        MealPlan.objects.filter(created_by=user).delete()
