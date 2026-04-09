"""Participant management endpoints."""

from django.db.models import F, Q, Sum
from django.shortcuts import get_object_or_404
from ninja.errors import HttpError

from event.models import BookingOption, Event, Participant, Person, Registration
from event.choices import TimelineActionChoices
from event.schemas import (
    PaginatedParticipantOut,
    ParticipantOut,
    ParticipantUpdateIn,
    RegisterIn,
    RegistrationOut,
)
from event.services.timeline import TimelineService

from .events import event_router
from .helpers import require_auth, require_event_manager


# ==========================================================================
# Registration & Participants
# ==========================================================================


@event_router.post("/{event_slug}/register/", response=RegistrationOut)
def register_for_event(request, event_slug: str, payload: RegisterIn):
    """Register persons for an event. Creates a Registration and clones Person data."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)

    if not event.user_is_invited(request.user):
        raise HttpError(403, "Du bist nicht für dieses Event eingeladen")

    # Get or create registration
    registration, _ = Registration.objects.get_or_create(user=request.user, event=event)

    for entry in payload.persons:
        person = get_object_or_404(Person, id=entry.person_id)

        # Verify person belongs to user (or user is admin)
        if person.user != request.user and not request.user.is_staff:
            raise HttpError(403, f"Zugriff auf Person {entry.person_id} verweigert")

        # Check if person is already registered
        if Participant.objects.filter(registration=registration, person=person).exists():
            continue

        booking_option = None
        if entry.booking_option_id:
            booking_option = get_object_or_404(BookingOption, id=entry.booking_option_id, event=event)
            if booking_option.is_system:
                raise HttpError(400, "Diese Buchungsoption ist nicht verfuegbar.")
            if booking_option.is_full:
                raise HttpError(400, f"Buchungsoption '{booking_option.name}' ist voll")

        Participant.create_from_person(registration, person, booking_option)

        # Log timeline
        TimelineService.log(
            event=event,
            action_type=TimelineActionChoices.REGISTERED,
            description=f"{person.first_name} {person.last_name} angemeldet",
            participant=Participant.objects.filter(registration=registration, person=person).first(),
            user=request.user,
        )

    return Registration.objects.prefetch_related("participants__booking_option").get(pk=registration.pk)


@event_router.post("/{event_slug}/register-admin/", response=RegistrationOut)
def register_admin(request, event_slug: str, payload: RegisterIn):
    """Admin: Register any person for an event."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    for entry in payload.persons:
        person = get_object_or_404(Person, id=entry.person_id)

        # Find or create registration for the person's owner
        registration, _ = Registration.objects.get_or_create(user=person.user, event=event)

        if Participant.objects.filter(registration=registration, person=person).exists():
            continue

        booking_option = None
        if entry.booking_option_id:
            booking_option = get_object_or_404(BookingOption, id=entry.booking_option_id, event=event)
            # Managers bypass is_full check — they can assign any option including system options

        Participant.create_from_person(registration, person, booking_option)

    # Return the first registration for response
    reg = Registration.objects.filter(event=event).prefetch_related("participants__booking_option").first()
    return reg


@event_router.delete("/{event_slug}/participants/{participant_id}/")
def remove_participant(request, event_slug: str, participant_id: int):
    """Remove a participant from an event."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    participant = get_object_or_404(Participant, id=participant_id, registration__event=event)

    # User can remove own participants, managers can remove any
    if participant.registration.user != request.user and not event.user_can_manage(request.user):
        raise HttpError(403, "Zugriff verweigert")

    registration = participant.registration

    # Log timeline before deletion
    TimelineService.log(
        event=event,
        action_type=TimelineActionChoices.UNREGISTERED,
        description=f"{participant.first_name} {participant.last_name} abgemeldet",
        participant=None,  # participant is about to be deleted
        user=request.user,
        metadata={
            "participant_name": f"{participant.first_name} {participant.last_name}",
        },
    )

    participant.delete()

    # Clean up empty registration
    if not registration.participants.exists():
        registration.delete()

    return {"success": True, "message": "Teilnehmer entfernt"}


@event_router.patch("/{event_slug}/participants/{participant_id}/", response=ParticipantOut)
def update_participant(request, event_slug: str, participant_id: int, payload: ParticipantUpdateIn):
    """Update a participant (payment status, booking option, etc.)."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    participant = get_object_or_404(Participant, id=participant_id, registration__event=event)

    # User can update own participants, managers can update any
    is_own = participant.registration.user == request.user
    is_manager = event.user_can_manage(request.user)

    if not is_own and not is_manager:
        raise HttpError(403, "Zugriff verweigert")

    data = payload.dict(exclude_unset=True)

    # Track booking option change for timeline
    old_booking_name = participant.booking_option.name if participant.booking_option else None

    # Handle booking_option_id separately
    if "booking_option_id" in data:
        option_id = data.pop("booking_option_id")
        if option_id is not None:
            new_option = get_object_or_404(BookingOption, id=option_id, event=event)
            # Non-managers cannot assign system options
            if new_option.is_system and not is_manager:
                raise HttpError(400, "Diese Buchungsoption ist nicht verfuegbar.")
            # Non-managers cannot assign full options
            if new_option.is_full and not is_manager:
                raise HttpError(400, f"Buchungsoption '{new_option.name}' ist voll")
            participant.booking_option = new_option
        else:
            participant.booking_option = None

    # Handle nutritional_tag_ids M2M
    tag_ids = data.pop("nutritional_tag_ids", None)

    for field, value in data.items():
        setattr(participant, field, value)
    participant.save()

    if tag_ids is not None:
        participant.nutritional_tags.set(tag_ids)

    # Log booking_changed if booking option was modified
    new_booking_name = participant.booking_option.name if participant.booking_option else None
    if "booking_option_id" in payload.dict(exclude_unset=True) and old_booking_name != new_booking_name:
        TimelineService.log(
            event=event,
            action_type=TimelineActionChoices.BOOKING_CHANGED,
            description=f"Buchungsoption von {participant.first_name} {participant.last_name} geändert: {old_booking_name or 'keine'} → {new_booking_name or 'keine'}",
            participant=participant,
            user=request.user,
            metadata={
                "old_booking": old_booking_name,
                "new_booking": new_booking_name,
            },
        )

    # Log timeline for participant update
    TimelineService.log(
        event=event,
        action_type=TimelineActionChoices.PARTICIPANT_UPDATED,
        description=f"{participant.first_name} {participant.last_name} aktualisiert",
        participant=participant,
        user=request.user,
        metadata={"updated_fields": list(payload.dict(exclude_unset=True).keys())},
    )

    return participant


# ==========================================================================
# Event Participant List (for managers)
# ==========================================================================


@event_router.get("/{event_slug}/participants/", response=PaginatedParticipantOut)
def list_event_participants(
    request,
    event_slug: str,
    is_paid: bool | None = None,
    booking_option_id: int | None = None,
    label_id: int | None = None,
    search: str | None = None,
    page: int = 1,
    page_size: int = 50,
):
    """List all participants of an event (managers only). Supports filtering and pagination."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    qs = (
        Participant.objects.filter(registration__event=event)
        .select_related("booking_option", "registration__user")
        .prefetch_related("nutritional_tags", "labels", "custom_field_values__custom_field", "payments")
    )

    # Filter: booking option
    if booking_option_id is not None:
        qs = qs.filter(booking_option_id=booking_option_id)

    # Filter: label
    if label_id is not None:
        qs = qs.filter(labels__id=label_id)

    # Filter: search (name, email, scout name)
    if search:
        qs = qs.filter(
            Q(first_name__icontains=search)
            | Q(last_name__icontains=search)
            | Q(email__icontains=search)
            | Q(scout_name__icontains=search)
        )

    # Filter: is_paid (computed — filter in Python since it's a property)
    if is_paid is not None:
        # We need to evaluate in Python since is_paid is a @property
        # For efficiency, annotate with payment sum
        qs = qs.annotate(payment_total=Sum("payments__amount"))
        if is_paid:
            # Paid: payment_total >= booking_option.price OR no booking option
            qs = qs.filter(
                Q(booking_option__isnull=True)
                | Q(booking_option__price__lte=0)
                | Q(payment_total__gte=F("booking_option__price"))
            )
        else:
            # Unpaid: has booking option with price and payment_total < price
            qs = qs.filter(
                booking_option__isnull=False,
                booking_option__price__gt=0,
            ).filter(Q(payment_total__isnull=True) | Q(payment_total__lt=F("booking_option__price")))

    # Pagination
    import math

    total = qs.count()
    total_pages = math.ceil(total / page_size) if page_size > 0 else 1
    offset = (page - 1) * page_size
    items = list(qs[offset : offset + page_size])

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }
