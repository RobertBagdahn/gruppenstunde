"""Django Ninja API routes for the Event module."""

import logging

from django.db.models import Q
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from profiles.models import GroupMembership, UserGroup

from .choices import GenderChoices
from .models import BookingOption, Event, EventLocation, Participant, Person, Registration
from .schemas import (
    BookingOptionCreateIn,
    BookingOptionOut,
    BookingOptionUpdateIn,
    ChoiceOut,
    EventCreateIn,
    EventDetailOut,
    EventListOut,
    EventUpdateIn,
    EventLocationCreateIn,
    EventLocationOut,
    EventLocationUpdateIn,
    GenerateInvitationIn,
    GenerateInvitationOut,
    InviteGroupIn,
    ParticipantOut,
    ParticipantUpdateIn,
    PersonCreateIn,
    PersonOut,
    PersonUpdateIn,
    RegisterIn,
    RegistrationOut,
)

logger = logging.getLogger(__name__)

event_router = Router(tags=["events"])
person_router = Router(tags=["persons"])
location_router = Router(tags=["locations"])


def _require_auth(request):
    if not request.user.is_authenticated:
        raise HttpError(403, "Anmeldung erforderlich")


def _require_event_manager(event: Event, user):
    """Check that the user can manage this event."""
    if not event.user_can_manage(user):
        raise HttpError(403, "Nur Verantwortliche können diese Aktion ausführen")


# ==========================================================================
# My Events (must be before /{event_slug}/ to avoid slug matching)
# ==========================================================================


@event_router.get("/my-invited/", response=list[EventListOut])
def list_my_invited_events(request):
    """List events the current user is invited to (directly or via group)."""
    _require_auth(request)
    qs = Event.objects.prefetch_related("booking_options", "registrations")

    user_group_ids = GroupMembership.objects.filter(user=request.user, is_active=True).values_list(
        "group_id", flat=True
    )

    return qs.filter(Q(invited_users=request.user) | Q(invited_groups__in=user_group_ids)).distinct()


@event_router.get("/my-registered/", response=list[EventListOut])
def list_my_registered_events(request):
    """List events the current user has registered for."""
    _require_auth(request)
    registered_event_ids = Registration.objects.filter(user=request.user).values_list("event_id", flat=True)

    return Event.objects.filter(id__in=registered_event_ids).prefetch_related("booking_options", "registrations")


# ==========================================================================
# Choices
# ==========================================================================


@event_router.get("/choices/gender/", response=list[ChoiceOut])
def list_gender_choices(request):
    """List available gender choices."""
    return [{"value": c.value, "label": str(c.label)} for c in GenderChoices]


# ==========================================================================
# Person CRUD
# ==========================================================================


@person_router.get("/", response=list[PersonOut])
def list_persons(request):
    """List persons of the current user. Admins see all."""
    _require_auth(request)
    if request.user.is_staff:
        return Person.objects.select_related("user").prefetch_related("nutritional_tags").all()
    return Person.objects.filter(user=request.user).prefetch_related("nutritional_tags")


@person_router.post("/", response=PersonOut)
def create_person(request, payload: PersonCreateIn):
    """Create a new person for the current user."""
    _require_auth(request)
    data = payload.dict(exclude={"nutritional_tag_ids"})
    person = Person.objects.create(user=request.user, **data)
    if payload.nutritional_tag_ids:
        person.nutritional_tags.set(payload.nutritional_tag_ids)
    return person


@person_router.get("/{person_id}/", response=PersonOut)
def get_person(request, person_id: int):
    """Get a person by ID."""
    _require_auth(request)
    person = get_object_or_404(Person, id=person_id)
    if person.user != request.user and not request.user.is_staff:
        raise HttpError(403, "Zugriff verweigert")
    return person


@person_router.patch("/{person_id}/", response=PersonOut)
def update_person(request, person_id: int, payload: PersonUpdateIn):
    """Update a person."""
    _require_auth(request)
    person = get_object_or_404(Person, id=person_id)
    if person.user != request.user and not request.user.is_staff:
        raise HttpError(403, "Zugriff verweigert")
    data = payload.dict(exclude_unset=True)
    tag_ids = data.pop("nutritional_tag_ids", None)
    for field, value in data.items():
        setattr(person, field, value)
    person.save()
    if tag_ids is not None:
        person.nutritional_tags.set(tag_ids)
    return person


@person_router.delete("/{person_id}/")
def delete_person(request, person_id: int):
    """Delete a person."""
    _require_auth(request)
    person = get_object_or_404(Person, id=person_id)
    if person.user != request.user and not request.user.is_staff:
        raise HttpError(403, "Zugriff verweigert")
    person.delete()
    return {"success": True, "message": "Person gelöscht"}


# ==========================================================================
# Events
# ==========================================================================


@event_router.get("/", response=list[EventListOut])
def list_events(request):
    """List events visible to the current user."""
    qs = Event.objects.prefetch_related("booking_options", "registrations")

    if not request.user.is_authenticated:
        # Anonymous users only see public events
        return qs.filter(is_public=True)

    if request.user.is_staff:
        return qs.all()

    # Authenticated: public + invited + managed
    user_group_ids = GroupMembership.objects.filter(user=request.user, is_active=True).values_list(
        "group_id", flat=True
    )

    return qs.filter(
        Q(is_public=True)
        | Q(responsible_persons=request.user)
        | Q(invited_users=request.user)
        | Q(invited_groups__in=user_group_ids)
    ).distinct()


@event_router.post("/", response=EventListOut)
def create_event(request, payload: EventCreateIn):
    """Create a new event with optional inline booking options."""
    _require_auth(request)
    data = payload.dict(exclude={"booking_options"})

    # Handle event_location_id
    event_location_id = data.pop("event_location_id", None)
    if event_location_id:
        location_obj = get_object_or_404(EventLocation, id=event_location_id)
        data["event_location"] = location_obj

    event = Event.objects.create(created_by=request.user, **data)
    event.responsible_persons.add(request.user)

    # Create inline booking options if provided
    if payload.booking_options:
        for opt in payload.booking_options:
            BookingOption.objects.create(event=event, **opt.dict())

    return event


# ==========================================================================
# AI Invitation Text Generation
# (Must be defined BEFORE /{event_slug}/ routes to avoid 405 conflicts)
# ==========================================================================


@event_router.post("/generate-invitation/", response=GenerateInvitationOut)
def generate_invitation_text(request, payload: GenerateInvitationIn):
    """Generate an invitation text using AI."""
    _require_auth(request)

    from idea.services.ai_service import AIService

    ai = AIService()
    client = ai._get_client()

    if not client:
        # Fallback when AI is not available
        return {"invitation_text": _build_fallback_invitation(payload)}

    booking_info = ""
    if payload.booking_options:
        booking_info = "Buchungsoptionen: " + ", ".join(payload.booking_options)

    location_info = ""
    if payload.location_name:
        location_info = f"Ort: {payload.location_name}"
        if payload.location_address:
            location_info += f" ({payload.location_address})"

    prompt = (
        "Du bist ein freundlicher Pfadfinder-Gruppenleiter. "
        "Erstelle einen einladenden, motivierenden Einladungstext für ein Event. "
        "Der Text soll für Jugendliche und deren Eltern ansprechend sein.\n\n"
        "Regeln:\n"
        "- Schreibe in deutscher Sprache, freundlich und einladend\n"
        "- Formatiere als Markdown (Überschriften mit ##, **fett**, Listen mit -, Absätze durch Leerzeilen)\n"
        "- Kein HTML verwenden\n"
        "- Erwähne alle relevanten Details (Name, Datum, Ort, Optionen)\n"
        "- Baue die Besonderheiten ein, falls vorhanden\n"
        "- Schließe mit einer motivierenden Aufforderung zur Anmeldung\n"
        "- Der Text soll 150-400 Wörter lang sein\n\n"
        f"Event-Name: {payload.name}\n"
        f"Beschreibung: {payload.description}\n"
        f"Startdatum: {payload.start_date or 'noch offen'}\n"
        f"Enddatum: {payload.end_date or 'noch offen'}\n"
        f"{location_info}\n"
        f"{booking_info}\n"
        f"Besonderheiten: {payload.special_notes or 'keine'}\n"
    )

    try:
        from google.genai import types
        from pydantic import BaseModel, Field

        class InvitationOutput(BaseModel):
            text: str = Field(min_length=100, max_length=5000)

        response = client.models.generate_content(
            model="gemini-2.5-flash",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=InvitationOutput,
            ),
        )
        result = InvitationOutput.model_validate_json(response.text)
        return {"invitation_text": result.text}
    except Exception:
        logger.exception("AI invitation generation failed")
        return {"invitation_text": _build_fallback_invitation(payload)}


def _build_fallback_invitation(payload: GenerateInvitationIn) -> str:
    """Build a simple fallback invitation when AI is unavailable."""
    parts = [f"## Einladung: {payload.name}"]
    if payload.description:
        parts.append(f"\n{payload.description}")
    if payload.start_date:
        parts.append(f"\n**Datum:** {payload.start_date}")
    if payload.location_name:
        loc = payload.location_name
        if payload.location_address:
            loc += f" ({payload.location_address})"
        parts.append(f"\n**Ort:** {loc}")
    if payload.special_notes:
        parts.append(f"\n{payload.special_notes}")
    parts.append("\nWir freuen uns auf euch!")
    return "\n".join(parts)


@event_router.get("/{event_slug}/", response=EventDetailOut)
def get_event(request, event_slug: str):
    """Get event detail. Response varies by user role."""
    event = get_object_or_404(
        Event.objects.prefetch_related(
            "booking_options",
            "registrations__participants__booking_option",
            "registrations__user",
        ),
        slug=event_slug,
    )

    # Public events are visible to everyone, non-public require invitation
    if not event.is_public:
        if not request.user.is_authenticated:
            raise HttpError(404, "Event nicht gefunden")
        if not event.user_is_invited(request.user):
            raise HttpError(404, "Event nicht gefunden")

    # Build response with context-dependent fields
    is_manager = request.user.is_authenticated and event.user_can_manage(request.user)
    is_registered = False
    my_registration = None
    registrations = None

    if request.user.is_authenticated:
        try:
            my_registration = Registration.objects.prefetch_related("participants__booking_option").get(
                user=request.user, event=event
            )
            is_registered = True
        except Registration.DoesNotExist:
            pass

        if is_manager:
            registrations = list(
                Registration.objects.filter(event=event)
                .prefetch_related("participants__booking_option")
                .select_related("user")
            )

    event.is_manager = is_manager
    event.is_registered = is_registered
    event.my_registration = my_registration
    event.all_registrations = registrations
    return event


@event_router.patch("/{event_slug}/", response=EventListOut)
def update_event(request, event_slug: str, payload: EventUpdateIn):
    """Update an event (managers only)."""
    _require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    _require_event_manager(event, request.user)

    data = payload.dict(exclude_unset=True)

    # Handle event_location_id separately
    if "event_location_id" in data:
        loc_id = data.pop("event_location_id")
        if loc_id is not None:
            event.event_location = get_object_or_404(EventLocation, id=loc_id)
        else:
            event.event_location = None

    for field, value in data.items():
        setattr(event, field, value)
    event.save()
    return event


@event_router.delete("/{event_slug}/")
def delete_event(request, event_slug: str):
    """Delete an event (managers only)."""
    _require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    _require_event_manager(event, request.user)
    event.delete()
    return {"success": True, "message": "Event gelöscht"}


# ==========================================================================
# Booking Options
# ==========================================================================


@event_router.post("/{event_slug}/booking-options/", response=BookingOptionOut)
def create_booking_option(request, event_slug: str, payload: BookingOptionCreateIn):
    """Add a booking option to an event."""
    _require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    _require_event_manager(event, request.user)
    return BookingOption.objects.create(event=event, **payload.dict())


@event_router.patch("/{event_slug}/booking-options/{option_id}/", response=BookingOptionOut)
def update_booking_option(request, event_slug: str, option_id: int, payload: BookingOptionUpdateIn):
    """Update a booking option."""
    _require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    _require_event_manager(event, request.user)
    option = get_object_or_404(BookingOption, id=option_id, event=event)
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(option, field, value)
    option.save()
    return option


@event_router.delete("/{event_slug}/booking-options/{option_id}/")
def delete_booking_option(request, event_slug: str, option_id: int):
    """Delete a booking option."""
    _require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    _require_event_manager(event, request.user)
    option = get_object_or_404(BookingOption, id=option_id, event=event)
    option.delete()
    return {"success": True, "message": "Buchungsoption gelöscht"}


# ==========================================================================
# Registration & Participants
# ==========================================================================


@event_router.post("/{event_slug}/register/", response=RegistrationOut)
def register_for_event(request, event_slug: str, payload: RegisterIn):
    """Register persons for an event. Creates a Registration and clones Person data."""
    _require_auth(request)
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
            if booking_option.is_full:
                raise HttpError(400, f"Buchungsoption '{booking_option.name}' ist voll")

        Participant.create_from_person(registration, person, booking_option)

    return Registration.objects.prefetch_related("participants__booking_option").get(pk=registration.pk)


@event_router.post("/{event_slug}/register-admin/", response=RegistrationOut)
def register_admin(request, event_slug: str, payload: RegisterIn):
    """Admin: Register any person for an event."""
    _require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    _require_event_manager(event, request.user)

    for entry in payload.persons:
        person = get_object_or_404(Person, id=entry.person_id)

        # Find or create registration for the person's owner
        registration, _ = Registration.objects.get_or_create(user=person.user, event=event)

        if Participant.objects.filter(registration=registration, person=person).exists():
            continue

        booking_option = None
        if entry.booking_option_id:
            booking_option = get_object_or_404(BookingOption, id=entry.booking_option_id, event=event)

        Participant.create_from_person(registration, person, booking_option)

    # Return the first registration for response
    reg = Registration.objects.filter(event=event).prefetch_related("participants__booking_option").first()
    return reg


@event_router.delete("/{event_slug}/participants/{participant_id}/")
def remove_participant(request, event_slug: str, participant_id: int):
    """Remove a participant from an event."""
    _require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    participant = get_object_or_404(Participant, id=participant_id, registration__event=event)

    # User can remove own participants, managers can remove any
    if participant.registration.user != request.user and not event.user_can_manage(request.user):
        raise HttpError(403, "Zugriff verweigert")

    registration = participant.registration
    participant.delete()

    # Clean up empty registration
    if not registration.participants.exists():
        registration.delete()

    return {"success": True, "message": "Teilnehmer entfernt"}


@event_router.patch("/{event_slug}/participants/{participant_id}/", response=ParticipantOut)
def update_participant(request, event_slug: str, participant_id: int, payload: ParticipantUpdateIn):
    """Update a participant (payment status, booking option, etc.)."""
    _require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    participant = get_object_or_404(Participant, id=participant_id, registration__event=event)

    # User can update own participants, managers can update any
    is_own = participant.registration.user == request.user
    is_manager = event.user_can_manage(request.user)

    if not is_own and not is_manager:
        raise HttpError(403, "Zugriff verweigert")

    data = payload.dict(exclude_unset=True)

    # Only managers can update payment status
    if "is_paid" in data and not is_manager:
        raise HttpError(403, "Nur Verantwortliche können den Bezahlstatus ändern")

    # Handle booking_option_id separately
    if "booking_option_id" in data:
        option_id = data.pop("booking_option_id")
        if option_id is not None:
            participant.booking_option = get_object_or_404(BookingOption, id=option_id, event=event)
        else:
            participant.booking_option = None

    # Handle nutritional_tag_ids M2M
    tag_ids = data.pop("nutritional_tag_ids", None)

    for field, value in data.items():
        setattr(participant, field, value)
    participant.save()

    if tag_ids is not None:
        participant.nutritional_tags.set(tag_ids)

    return participant


# ==========================================================================
# Invite Groups
# ==========================================================================


@event_router.post("/{event_slug}/invite-group/")
def invite_group(request, event_slug: str, payload: InviteGroupIn):
    """Invite all members of a group to an event."""
    _require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    _require_event_manager(event, request.user)

    group = get_object_or_404(UserGroup, slug=payload.group_slug, is_deleted=False)
    event.invited_groups.add(group)

    member_count = GroupMembership.objects.filter(group=group, is_active=True).count()
    return {
        "success": True,
        "message": f"Gruppe '{group.name}' eingeladen ({member_count} Mitglieder)",
    }


@event_router.post("/{event_slug}/invite-users/")
def invite_users(request, event_slug: str, user_ids: list[int]):
    """Invite specific users to an event."""
    _require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    _require_event_manager(event, request.user)

    from django.contrib.auth import get_user_model

    User = get_user_model()
    users = User.objects.filter(id__in=user_ids)
    event.invited_users.add(*users)
    return {"success": True, "message": f"{users.count()} Benutzer eingeladen"}


# ==========================================================================
# Event Participant List (for managers)
# ==========================================================================


@event_router.get("/{event_slug}/participants/", response=list[ParticipantOut])
def list_event_participants(request, event_slug: str):
    """List all participants of an event (managers only)."""
    _require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    _require_event_manager(event, request.user)

    return Participant.objects.filter(registration__event=event).select_related("booking_option", "registration__user")


# ==========================================================================
# Event Location CRUD
# ==========================================================================


@location_router.get("/", response=list[EventLocationOut])
def list_locations(request):
    """List all event locations."""
    return EventLocation.objects.all()


@location_router.post("/", response=EventLocationOut)
def create_location(request, payload: EventLocationCreateIn):
    """Create a new event location."""
    _require_auth(request)
    return EventLocation.objects.create(created_by=request.user, **payload.dict())


@location_router.get("/{location_id}/", response=EventLocationOut)
def get_location(request, location_id: int):
    """Get a location by ID."""
    return get_object_or_404(EventLocation, id=location_id)


@location_router.patch("/{location_id}/", response=EventLocationOut)
def update_location(request, location_id: int, payload: EventLocationUpdateIn):
    """Update a location."""
    _require_auth(request)
    location = get_object_or_404(EventLocation, id=location_id)
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(location, field, value)
    location.save()
    return location


@location_router.delete("/{location_id}/")
def delete_location(request, location_id: int):
    """Delete a location."""
    _require_auth(request)
    location = get_object_or_404(EventLocation, id=location_id)
    location.delete()
    return {"success": True, "message": "Veranstaltungsort gelöscht"}
