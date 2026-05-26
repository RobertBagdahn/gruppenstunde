"""Budget API endpoints."""

from django.shortcuts import get_object_or_404

from event.api.events import event_router
from event.api.helpers import require_auth, require_event_manager
from event.models import BudgetItem, Event
from event.schemas import (
    BudgetItemCreateIn,
    BudgetItemOut,
    BudgetItemUpdateIn,
    BudgetSummaryOut,
)


@event_router.get("/{event_slug}/budget/", response=BudgetSummaryOut)
def get_budget_summary(request, event_slug: str):
    """Get budget summary for an event."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    from event.services.budget import BudgetService

    return BudgetService.compute_summary(event)


@event_router.post("/{event_slug}/budget/items/", response={201: BudgetItemOut})
def create_budget_item(request, event_slug: str, payload: BudgetItemCreateIn):
    """Create a budget item."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    item = BudgetItem.objects.create(
        event=event,
        created_by=request.user,
        **payload.dict(),
    )
    return 201, item


@event_router.patch("/{event_slug}/budget/items/{item_id}/", response=BudgetItemOut)
def update_budget_item(request, event_slug: str, item_id: int, payload: BudgetItemUpdateIn):
    """Update a budget item."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    item = get_object_or_404(BudgetItem, id=item_id, event=event)
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(item, field, value)
    item.save()
    return item


@event_router.delete("/{event_slug}/budget/items/{item_id}/")
def delete_budget_item(request, event_slug: str, item_id: int):
    """Delete a budget item."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    item = get_object_or_404(BudgetItem, id=item_id, event=event)
    item.delete()
    return {"success": True, "message": "Budget-Posten gelöscht"}
