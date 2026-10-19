"""Shared helpers: a saved plan list is now a created event trip of the plan's event."""

import datetime as dt

from django.test import Client

from event.models import EventMealPlanRelation
from event.tests import make_event
from shopping.models import ShoppingList, SourceType, Store

EARLY = dt.datetime(2000, 1, 1, tzinfo=dt.UTC)


def create_plan_trip(client: Client, user, plan, *, event=None, scheduled_at: dt.datetime = EARLY) -> ShoppingList:
    """Plan a trip before every meal of `plan` (linked to a new event unless given) and create its list."""
    if event is None:
        event = make_event(created_by=user)
    EventMealPlanRelation.objects.get_or_create(event=event, meal_plan=plan)
    store, _ = Store.objects.get_or_create(owner=user, name="Testladen")
    trip = ShoppingList.objects.create(
        name=f"Einkauf {plan.name}",
        owner=user,
        event=event,
        store=store,
        scheduled_at=scheduled_at,
        source_type=SourceType.EVENT_TRIP,
    )
    response = client.post(f"/api/shopping-lists/{trip.id}/materialize/")
    assert response.status_code == 200, response.content
    trip.refresh_from_db()
    return trip


def materialize_detail(client: Client, user, plan, **kwargs) -> dict:
    """Detail JSON of the created trip, as the old plan export returned it."""
    trip = create_plan_trip(client, user, plan, **kwargs)
    return client.get(f"/api/shopping-lists/{trip.id}/").json()


def create_legacy_plan_list(user, plan, *, include_consumables: bool = True) -> ShoppingList:
    """A list from the time before event trips: `meal_event` source, no event, a plain snapshot."""
    from shopping.services.item_creation import add_ingredient_items
    from shopping.services.material_items import add_consumable_items
    from supply.services.material_aggregation import aggregate_materials, meal_plan_material_entries
    from supply.services.shopping_service import generate_shopping_list

    shopping_list = ShoppingList.objects.create(
        name=f"Einkaufsliste: {plan.name}", owner=user, source_type=SourceType.MEAL_EVENT, source_id=plan.id
    )
    added = add_ingredient_items(shopping_list, generate_shopping_list(plan))
    if include_consumables:
        add_consumable_items(shopping_list, aggregate_materials(meal_plan_material_entries(plan)), added)
    return shopping_list


def recipe_body(user, **extra) -> str:
    """JSON body that buys a recipe on a new list at a shop, Thursday 16:00 Berlin time."""
    import json

    store, _ = Store.objects.get_or_create(owner=user, name="Rewe")
    return json.dumps({"store_id": store.id, "scheduled_at": "2026-10-22T16:00:00+02:00", **extra})
