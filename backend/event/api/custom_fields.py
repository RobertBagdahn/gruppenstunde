"""Custom Fields API endpoints — CRUD for event custom fields and participant values."""

from django.shortcuts import get_object_or_404
from ninja.errors import HttpError

from event.models import CustomField, CustomFieldValue, Event, Participant
from event.schemas import (
    CustomFieldCreateIn,
    CustomFieldOut,
    CustomFieldUpdateIn,
    CustomFieldValueOut,
    CustomFieldValuesIn,
)

from .events import event_router
from .helpers import require_auth, require_event_manager


# ==========================================================================
# Custom Field CRUD (on events)
# ==========================================================================


@event_router.get("/{event_slug}/custom-fields/", response=list[CustomFieldOut])
def list_custom_fields(request, event_slug: str):
    """List custom fields for an event (managers only)."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    return event.custom_fields.all()


@event_router.post("/{event_slug}/custom-fields/", response={201: CustomFieldOut})
def create_custom_field(request, event_slug: str, payload: CustomFieldCreateIn):
    """Create a custom field for an event (managers only)."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    field = CustomField.objects.create(event=event, **payload.dict())
    return 201, field


@event_router.patch("/{event_slug}/custom-fields/{field_id}/", response=CustomFieldOut)
def update_custom_field(request, event_slug: str, field_id: int, payload: CustomFieldUpdateIn):
    """Update a custom field (managers only)."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    field = get_object_or_404(CustomField, id=field_id, event=event)

    data = payload.dict(exclude_unset=True)
    for attr, value in data.items():
        setattr(field, attr, value)
    field.save()

    return field


@event_router.delete("/{event_slug}/custom-fields/{field_id}/")
def delete_custom_field(request, event_slug: str, field_id: int):
    """Delete a custom field (managers only). Also deletes all values."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    field = get_object_or_404(CustomField, id=field_id, event=event)
    field.delete()

    return {"success": True, "message": "Feld gelöscht"}


# ==========================================================================
# Custom Field Values (on participants)
# ==========================================================================


@event_router.patch(
    "/{event_slug}/participants/{participant_id}/custom-fields/",
    response=list[CustomFieldValueOut],
)
def set_custom_field_values(request, event_slug: str, participant_id: int, payload: CustomFieldValuesIn):
    """Set custom field values for a participant (managers only)."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    participant = get_object_or_404(Participant, id=participant_id, registration__event=event)

    results = []
    for entry in payload.values:
        field = get_object_or_404(CustomField, id=entry.custom_field_id, event=event)
        value_obj, _ = CustomFieldValue.objects.update_or_create(
            custom_field=field,
            participant=participant,
            defaults={"value": entry.value},
        )
        results.append(value_obj)

    return results
