"""Shops a person buys at; names are unique per owner, ignoring case and surrounding whitespace."""

from __future__ import annotations

from django.db import IntegrityError, transaction
from django.db.models import Q, QuerySet
from ninja.errors import HttpError

from shopping.models import Store

EMPTY_NAME_MESSAGE = "Bitte gib einen Namen für den Laden ein."


def clean_store_name(raw: str) -> str:
    name = " ".join(raw.split())
    if not name:
        raise HttpError(422, EMPTY_NAME_MESSAGE)
    return name


def get_or_create_store(owner, raw_name: str) -> tuple[Store, bool]:
    """The owner's store with this name (case-insensitive); creates it when missing."""
    name = clean_store_name(raw_name)
    existing = Store.objects.filter(owner=owner, name__iexact=name).first()
    if existing is not None:
        return existing, False
    try:
        with transaction.atomic():
            return Store.objects.create(owner=owner, name=name), True
    except IntegrityError:
        # A parallel request created the same name between the lookup and the insert
        return Store.objects.get(owner=owner, name__iexact=name), False


def selectable_stores(user, search: str = "", event=None) -> QuerySet[Store]:
    """Own stores, plus the ones used by trips of `event` when the caller may see that event."""
    scope = Q(owner=user)
    if event is not None:
        scope |= Q(shopping_lists__event=event)
    stores = Store.objects.filter(scope).distinct()
    term = search.strip()
    if term:
        stores = stores.filter(name__icontains=term)
    return stores.order_by("name", "id")
