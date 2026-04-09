"""Payment API endpoints — create, list, delete payments for event participants."""

from django.shortcuts import get_object_or_404
from ninja.errors import HttpError

from event.choices import PaymentMethodChoices
from event.models import Event, Participant, Payment
from event.schemas import ChoiceOut, PaymentCreateIn, PaymentOut
from event.services.payment import PaymentService

from .events import event_router
from .helpers import require_auth, require_event_manager


@event_router.get("/{event_slug}/payments/", response=list[PaymentOut])
def list_payments(
    request,
    event_slug: str,
    participant_id: int | None = None,
    page: int = 1,
    page_size: int = 50,
):
    """List payments for an event (managers only)."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    qs = Payment.objects.filter(participant__registration__event=event).select_related("participant", "created_by")

    if participant_id is not None:
        qs = qs.filter(participant_id=participant_id)

    offset = (page - 1) * page_size
    return qs[offset : offset + page_size]


@event_router.post("/{event_slug}/payments/", response={201: PaymentOut})
def create_payment(request, event_slug: str, payload: PaymentCreateIn):
    """Create a payment for a participant (managers only)."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    participant = get_object_or_404(Participant, id=payload.participant_id, registration__event=event)

    payment = PaymentService.create_payment(
        participant=participant,
        amount=payload.amount,
        method=payload.method,
        received_at=payload.received_at,
        created_by=request.user,
        location=payload.location,
        note=payload.note,
    )

    return 201, payment


@event_router.delete("/{event_slug}/payments/{payment_id}/")
def delete_payment(request, event_slug: str, payment_id: int):
    """Delete a payment (managers only)."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    payment = get_object_or_404(Payment, id=payment_id, participant__registration__event=event)

    PaymentService.delete_payment(payment=payment, deleted_by=request.user)

    return {"success": True, "message": "Zahlung entfernt"}


@event_router.get("/choices/payment-methods/", response=list[ChoiceOut])
def list_payment_methods(request):
    """List available payment method choices."""
    return [{"value": choice.value, "label": str(choice.label)} for choice in PaymentMethodChoices]
