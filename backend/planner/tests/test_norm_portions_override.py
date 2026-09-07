"""Tests for persistent manual norm-portion overrides on event meal plans."""

import datetime as dt
import json

import pytest
from django.test import Client
from django.utils import timezone

from event.models import Event
from event.tests import make_participant, make_person, make_registration
from planner.models import MealPlan, MealPlanGroupMember
from planner.tests import make_meal_plan


def make_event(user):
    return Event.objects.create(
        name="Sommerlager",
        created_by=user,
        start_date=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)),
        end_date=timezone.make_aware(dt.datetime(2026, 7, 12, 18, 0)),
    )


@pytest.mark.django_db
class TestNormPortionsOverride:
    def setup_method(self):
        from django.contrib.auth import get_user_model

        self.user = get_user_model().objects.create_user(
            username="norm-portions-owner",
            email="norm-portions-owner@example.com",
            password="password",
        )
        self.client = Client()
        self.client.force_login(self.user)

    def make_event_plan(self, **kwargs) -> MealPlan:
        event = make_event(self.user)
        kwargs.setdefault(
            "start_datetime",
            timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)),
        )
        return make_meal_plan(
            created_by=self.user,
            event=event,
            **kwargs,
        )

    def patch_plan(self, plan: MealPlan, payload: dict):
        return self.client.patch(
            f"/api/meal-plans/{plan.id}/",
            data=json.dumps(payload),
            content_type="application/json",
        )

    def test_event_plan_can_enable_manual_norm_portions(self):
        plan = self.make_event_plan(norm_portions=8)

        response = self.patch_plan(
            plan,
            {"norm_portions_manual": True, "norm_portions": 12},
        )

        assert response.status_code == 200
        plan.refresh_from_db()
        assert plan.norm_portions_manual is True
        assert plan.norm_portions == 12
        assert response.json()["norm_portions_manual"] is True

    def test_manual_norm_portions_are_rejected_for_standalone_plans(self):
        plan = make_meal_plan(created_by=self.user, norm_portions=8)

        response = self.patch_plan(
            plan,
            {"norm_portions_manual": True, "norm_portions": 12},
        )

        assert response.status_code == 400
        assert "eventgebundene" in response.json()["detail"]

    @pytest.mark.parametrize("value", [0, -1, 12.5])
    def test_manual_norm_portions_must_be_positive_whole_numbers(self, value: float):
        plan = self.make_event_plan(norm_portions=8)

        response = self.patch_plan(
            plan,
            {"norm_portions_manual": True, "norm_portions": value},
        )

        assert response.status_code == 422

    def test_manual_value_survives_group_member_changes_and_event_sync(self):
        plan = self.make_event_plan(norm_portions=8, norm_portions_manual=True)
        plan.norm_portions = 12
        plan.save(update_fields=["norm_portions"])

        create_response = self.client.post(
            f"/api/meal-plans/{plan.id}/group-members/",
            data=json.dumps({"age": 10, "gender": "female"}),
            content_type="application/json",
        )
        assert create_response.status_code == 200

        sync_response = self.client.post(
            f"/api/meal-plans/{plan.id}/sync-event-participants/",
            data="{}",
            content_type="application/json",
        )
        assert sync_response.status_code == 200

        plan.refresh_from_db()
        assert plan.norm_portions_manual is True
        assert plan.norm_portions == 12
        assert MealPlanGroupMember.objects.filter(meal_plan=plan).count() == 1

    def test_disabling_manual_mode_without_members_restores_previous_value(self):
        plan = self.make_event_plan(norm_portions=8)

        enable_response = self.patch_plan(
            plan,
            {"norm_portions_manual": True, "norm_portions": 12},
        )
        assert enable_response.status_code == 200

        disable_response = self.patch_plan(plan, {"norm_portions_manual": False})

        assert disable_response.status_code == 200
        plan.refresh_from_db()
        assert plan.norm_portions_manual is False
        assert plan.norm_portions == 8

    def test_null_manual_flag_is_rejected(self):
        plan = self.make_event_plan(norm_portions=8)

        response = self.patch_plan(plan, {"norm_portions_manual": None})

        assert response.status_code == 422

    def test_standalone_activity_factor_keeps_direct_norm_portions(self):
        plan = make_meal_plan(created_by=self.user, norm_portions=8)

        response = self.patch_plan(plan, {"activity_factor": 2.0})

        assert response.status_code == 200
        plan.refresh_from_db()
        assert plan.activity_factor == 2.0
        assert plan.norm_portions == 8

    def test_nullable_end_datetime_can_be_cleared(self):
        plan = self.make_event_plan(
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)),
            end_datetime=timezone.make_aware(dt.datetime(2026, 7, 12, 18, 0)),
        )

        response = self.patch_plan(plan, {"end_datetime": None})

        assert response.status_code == 200
        plan.refresh_from_db()
        assert plan.end_datetime is None

    def test_end_datetime_before_start_is_rejected(self):
        plan = self.make_event_plan(
            start_datetime=timezone.make_aware(dt.datetime(2026, 7, 10, 8, 0)),
            end_datetime=timezone.make_aware(dt.datetime(2026, 7, 12, 18, 0)),
        )

        response = self.patch_plan(plan, {"end_datetime": "2026-07-09T18:00:00"})

        assert response.status_code == 400
        assert "Endzeit" in response.json()["detail"]

    def test_activity_factor_does_not_change_manual_value(self):
        plan = self.make_event_plan(norm_portions=12, norm_portions_manual=True)

        response = self.patch_plan(plan, {"activity_factor": 2.0})

        assert response.status_code == 200
        plan.refresh_from_db()
        assert plan.activity_factor == 2.0
        assert plan.norm_portions == 12

    def test_disabling_manual_mode_recalculates_from_group_members(self):
        plan = self.make_event_plan(norm_portions=12, norm_portions_manual=True)
        MealPlanGroupMember.objects.create(
            meal_plan=plan,
            age=8,
            gender="female",
        )

        response = self.patch_plan(plan, {"norm_portions_manual": False})

        assert response.status_code == 200
        plan.refresh_from_db()
        assert plan.norm_portions_manual is False
        assert plan.norm_portions != 12
        assert plan.norm_portions > 0

    def test_enabling_manual_mode_requires_a_value(self):
        plan = self.make_event_plan(norm_portions=8)

        response = self.patch_plan(plan, {"norm_portions_manual": True})

        assert response.status_code == 400
        assert "ganze Anzahl" in response.json()["detail"]

    def test_event_sync_is_idempotent_and_preserves_manual_members(self):
        plan = self.make_event_plan(norm_portions=8)
        registration = make_registration(user=self.user, event=plan.event_relation.event)
        person = make_person(user=self.user, first_name="Anna")
        participant = make_participant(registration=registration, person=person, first_name="Anna")
        manual_member = MealPlanGroupMember.objects.create(
            meal_plan=plan,
            name="Manuell",
            age=11,
            gender="female",
            synced_from_event=False,
        )

        first_response = self.client.post(
            f"/api/meal-plans/{plan.id}/sync-event-participants/",
            data="{}",
            content_type="application/json",
        )
        second_response = self.client.post(
            f"/api/meal-plans/{plan.id}/sync-event-participants/",
            data="{}",
            content_type="application/json",
        )

        assert first_response.status_code == 200
        assert second_response.status_code == 200
        assert MealPlanGroupMember.objects.filter(meal_plan=plan, synced_from_event=True).count() == 1
        assert MealPlanGroupMember.objects.filter(meal_plan=plan, person_id=participant.person_id).count() == 1
        assert MealPlanGroupMember.objects.filter(id=manual_member.id).exists()

        participant.delete()
        self.client.post(
            f"/api/meal-plans/{plan.id}/sync-event-participants/",
            data="{}",
            content_type="application/json",
        )

        assert not MealPlanGroupMember.objects.filter(meal_plan=plan, synced_from_event=True).exists()
        assert MealPlanGroupMember.objects.filter(id=manual_member.id).exists()
