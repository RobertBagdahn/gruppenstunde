"""Trip data model: legacy-list migration, event deletion and admin (openspec `event-shopping-trips`)."""

import importlib

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.urls import reverse

from event.models import EventMealPlanRelation
from event.tests import make_event
from planner.tests import make_meal_plan
from shopping.models import ShoppingList, SourceType

User = get_user_model()

migration = importlib.import_module("shopping.migrations.0008_link_legacy_plan_lists_to_events")


@pytest.fixture
def owner():
    return User.objects.create_user(username="owner", email="owner@example.com", password="x")


def _plan_list(owner, plan, **kwargs) -> ShoppingList:
    return ShoppingList.objects.create(
        name="Einkauf", owner=owner, source_type=SourceType.MEAL_EVENT, source_id=plan.id, **kwargs
    )


@pytest.mark.django_db
class TestLegacyListMigration:
    def _run(self) -> None:
        from django.apps import apps

        migration.link_legacy_lists(apps, None)

    def test_lists_of_linked_plans_get_event_and_timestamps(self, owner):
        event = make_event()
        linked_plan = make_meal_plan(created_by=owner)
        EventMealPlanRelation.objects.create(event=event, meal_plan=linked_plan)
        free_plan = make_meal_plan(created_by=owner)
        linked = _plan_list(owner, linked_plan)
        free = _plan_list(owner, free_plan)

        self._run()

        linked.refresh_from_db()
        free.refresh_from_db()
        assert linked.event_id == event.id
        assert linked.materialized_at == linked.created_at
        assert linked.plan_synced_at == linked.created_at
        assert linked.source_type == SourceType.MEAL_EVENT
        assert free.event_id is None
        assert free.materialized_at is None

    def test_is_idempotent(self, owner):
        event = make_event()
        plan = make_meal_plan(created_by=owner)
        EventMealPlanRelation.objects.create(event=event, meal_plan=plan)
        shopping_list = _plan_list(owner, plan)

        self._run()
        shopping_list.refresh_from_db()
        first = (shopping_list.event_id, shopping_list.materialized_at, shopping_list.plan_synced_at)
        self._run()
        shopping_list.refresh_from_db()

        assert (shopping_list.event_id, shopping_list.materialized_at, shopping_list.plan_synced_at) == first


@pytest.mark.django_db
class TestEventDeletion:
    def test_planned_trips_are_deleted_and_created_ones_kept(self, owner):
        from django.utils import timezone

        event = make_event()
        planned = ShoppingList.objects.create(
            name="Geplant", owner=owner, event=event, source_type=SourceType.EVENT_TRIP
        )
        created = ShoppingList.objects.create(
            name="Erstellt",
            owner=owner,
            event=event,
            source_type=SourceType.EVENT_TRIP,
            materialized_at=timezone.now(),
        )

        event.delete()

        assert not ShoppingList.objects.filter(pk=planned.pk).exists()
        created.refresh_from_db()
        assert created.event_id is None
        assert created.source_type == SourceType.EVENT_TRIP


@pytest.mark.django_db
def test_admin_changelists_load():
    admin_user = User.objects.create_superuser(username="root", email="root@example.com", password="x")
    client = Client()
    client.force_login(admin_user)
    for name in ("shopping_store_changelist", "shopping_shoppingallocationrule_changelist"):
        assert client.get(reverse(f"admin:{name}")).status_code == 200
