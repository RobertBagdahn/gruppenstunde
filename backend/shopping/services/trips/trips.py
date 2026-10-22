"""Creating and renaming event trips (a trip is a ShoppingList with event, store and time)."""

from __future__ import annotations

import datetime as dt
from zoneinfo import ZoneInfo

from django.utils import timezone
from ninja.errors import HttpError

from shopping.models import ShoppingList, SourceType, Store

BERLIN = ZoneInfo("Europe/Berlin")
WEEKDAYS = ("Mo", "Di", "Mi", "Do", "Fr", "Sa", "So")

MISSING_STORE_MESSAGE = "Bitte wähle einen Laden aus."
MISSING_TIME_MESSAGE = "Bitte gib an, wann eingekauft wird."


def as_aware(value: dt.datetime) -> dt.datetime:
    """Naive input is read as Berlin local time, like everything the people on site type in."""
    return value if timezone.is_aware(value) else value.replace(tzinfo=BERLIN)


def trip_name(store_name: str, scheduled_at: dt.datetime) -> str:
    local = as_aware(scheduled_at).astimezone(BERLIN)
    return f"{store_name} · {WEEKDAYS[local.weekday()]} {local:%d.%m. %H:%M}"


def create_trip(
    *, owner, event, store: Store | None, scheduled_at: dt.datetime | None, name: str | None = None
) -> ShoppingList:
    if store is None:
        raise HttpError(422, MISSING_STORE_MESSAGE)
    if scheduled_at is None:
        raise HttpError(422, MISSING_TIME_MESSAGE)
    when = as_aware(scheduled_at)
    custom_name = " ".join((name or "").split())
    return ShoppingList.objects.create(
        name=custom_name or trip_name(store.name, when),
        owner=owner,
        event=event,
        store=store,
        scheduled_at=when,
        source_type=SourceType.EVENT_TRIP,
    )
