"""The load-test seed command builds a shared list a guest can join."""

import json
from io import StringIO

import pytest
from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import Client

from shopping.models import ShoppingList


def _run(*args: str) -> dict[str, str]:
    out = StringIO()
    call_command("seed_loadtest_shopping_list", *args, stdout=out)
    return dict(line.split("=", 1) for line in out.getvalue().split())


@pytest.mark.django_db
def test_seeds_shared_list_that_guests_can_join():
    result = _run("--items", "5", "--sources-per-item", "2", "--force")

    shopping_list = ShoppingList.objects.get(id=int(result["list_id"]))
    assert shopping_list.items.count() == 5
    assert shopping_list.items.first().sources.count() == 2
    assert str(shopping_list.share_token) == result["invite_token"]
    joined = Client().post(
        f"/api/shopping-lists/shared/{result['invite_token']}/join/",
        json.dumps({"name": "Lasttest 1"}),
        content_type="application/json",
    )
    assert joined.status_code == 200
    detail = Client().get(f"/api/shopping-lists/{result['list_id']}/", HTTP_X_GUEST_TOKEN=joined.json()["guest_token"])
    assert len(detail.json()["items"]) == 5


@pytest.mark.django_db
def test_rerun_replaces_the_list():
    first = _run("--items", "3", "--force")
    second = _run("--items", "4", "--force")

    assert first["list_id"] != second["list_id"]
    assert ShoppingList.objects.filter(name="Lasttest Gruppeneinkauf").count() == 1


@pytest.mark.django_db
def test_refuses_without_force_when_debug_is_off(settings):
    settings.DEBUG = False
    with pytest.raises(CommandError, match="DEBUG off"):
        _run("--items", "3")


@pytest.mark.django_db
def test_event_option_builds_a_planable_event():
    from event.models import Event
    from shopping.models import SourceType
    from shopping.services.trips.plan import build_shopping_plan

    result = _run("--items", "6", "--event-meals", "7", "--force")

    event = Event.objects.get(slug=result["event_slug"])
    assert result["planner_email"] == event.created_by.email
    assert ShoppingList.objects.filter(event=event, source_type=SourceType.EVENT_TRIP).count() == 3
    plan = build_shopping_plan(event)
    assert len(plan.trips) == 3
    assert sum(len(trip.rows) for trip in plan.trips) > 0
