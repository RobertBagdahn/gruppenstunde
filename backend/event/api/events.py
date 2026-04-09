"""Event CRUD, booking options, invitations, and AI invitation generation."""

import logging
import math

from django.db.models import Q
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from profiles.models import GroupMembership, UserGroup

from event.choices import GenderChoices, ParticipantVisibilityChoices
from event.models import BookingOption, Event, EventLocation, Participant, Registration
from event.schemas import (
    BookingOptionCreateIn,
    BookingOptionOut,
    BookingOptionUpdateIn,
    ChoiceOut,
    EventCreateIn,
    EventDetailOut,
    EventListOut,
    EventUpdateIn,
    GenerateInvitationIn,
    GenerateInvitationOut,
    InvitationStatusOut,
    InviteGroupIn,
    PaginatedEventListOut,
    PaginatedInvitationStatusOut,
    RegistrationOut,
)

from .helpers import require_auth, require_event_manager

logger = logging.getLogger(__name__)

event_router = Router(tags=["events"])


# ==========================================================================
# My Events (must be before /{event_slug}/ to avoid slug matching)
# ==========================================================================


@event_router.get("/my-invited/", response=list[EventListOut])
def list_my_invited_events(request):
    """List events the current user is invited to (directly or via group)."""
    require_auth(request)
    qs = Event.objects.prefetch_related("booking_options", "registrations")

    user_group_ids = GroupMembership.objects.filter(user=request.user, is_active=True).values_list(
        "group_id", flat=True
    )

    events = list(qs.filter(Q(invited_users=request.user) | Q(invited_groups__in=user_group_ids)).distinct())
    for event in events:
        event._show_system_options = event.user_can_manage(request.user)
    return events


@event_router.get("/my-registered/", response=list[EventListOut])
def list_my_registered_events(request):
    """List events the current user has registered for."""
    require_auth(request)
    registered_event_ids = Registration.objects.filter(user=request.user).values_list("event_id", flat=True)

    events = list(
        Event.objects.filter(id__in=registered_event_ids).prefetch_related("booking_options", "registrations")
    )
    for event in events:
        event._show_system_options = event.user_can_manage(request.user)
    return events


# ==========================================================================
# Choices
# ==========================================================================


@event_router.get("/choices/gender/", response=list[ChoiceOut])
def list_gender_choices(request):
    """List available gender choices."""
    return [{"value": c.value, "label": str(c.label)} for c in GenderChoices]


@event_router.get("/choices/participant-visibility/", response=list[ChoiceOut])
def list_participant_visibility_choices(request):
    """List available participant visibility choices."""
    return [{"value": c.value, "label": str(c.label)} for c in ParticipantVisibilityChoices]


# ==========================================================================
# Events CRUD
# ==========================================================================


@event_router.get("/", response=PaginatedEventListOut)
def list_events(request, page: int = 1, page_size: int = 20):
    """List events visible to the current user (paginated)."""
    qs = Event.objects.prefetch_related("booking_options", "registrations")

    if not request.user.is_authenticated:
        # Anonymous users only see public events
        qs = qs.filter(is_public=True)
    elif request.user.is_staff:
        pass  # staff sees all
    else:
        # Authenticated: public + invited + managed
        user_group_ids = GroupMembership.objects.filter(user=request.user, is_active=True).values_list(
            "group_id", flat=True
        )

        qs = qs.filter(
            Q(is_public=True)
            | Q(responsible_persons=request.user)
            | Q(invited_users=request.user)
            | Q(invited_groups__in=user_group_ids)
        ).distinct()

    total = qs.count()
    total_pages = max(1, math.ceil(total / page_size))
    page = max(1, min(page, total_pages))
    offset = (page - 1) * page_size
    items = list(qs[offset : offset + page_size])

    # Mark system option visibility per event
    for event in items:
        event._show_system_options = request.user.is_authenticated and event.user_can_manage(request.user)

    # Mark registration status for authenticated users
    if request.user.is_authenticated:
        registered_event_ids = set(
            Registration.objects.filter(user=request.user, event_id__in=[e.id for e in items]).values_list(
                "event_id", flat=True
            )
        )
        for event in items:
            event._is_registered = event.id in registered_event_ids
    else:
        for event in items:
            event._is_registered = False

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@event_router.post("/", response=EventListOut)
def create_event(request, payload: EventCreateIn):
    """Create a new event with optional inline booking options."""
    require_auth(request)
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
    require_auth(request)

    from content.services.ai_service import ContentAIService

    ai = ContentAIService()
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
    event._show_system_options = is_manager

    # User registration summary
    if request.user.is_authenticated:
        participant_count = 0
        reg_id = None
        if my_registration:
            reg_id = my_registration.id
            participant_count = my_registration.participants.count()
        event.user_registration = {
            "is_registered": is_registered,
            "registration_id": reg_id,
            "participant_count": participant_count,
        }
    else:
        event.user_registration = None

    # Participant stats based on visibility setting
    event.participant_stats = _build_participant_stats(event, is_manager)

    # Invitation counts (managers only)
    if is_manager:
        event.invitation_counts = _compute_invitation_counts(event)
    else:
        event.invitation_counts = None

    return event


@event_router.patch("/{event_slug}/", response=EventListOut)
def update_event(request, event_slug: str, payload: EventUpdateIn):
    """Update an event (managers only)."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

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
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)
    event.delete()
    return {"success": True, "message": "Event gelöscht"}


# ==========================================================================
# Booking Options
# ==========================================================================


@event_router.post("/{event_slug}/booking-options/", response=BookingOptionOut)
def create_booking_option(request, event_slug: str, payload: BookingOptionCreateIn):
    """Add a booking option to an event."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)
    return BookingOption.objects.create(event=event, **payload.dict())


@event_router.patch("/{event_slug}/booking-options/{option_id}/", response=BookingOptionOut)
def update_booking_option(request, event_slug: str, option_id: int, payload: BookingOptionUpdateIn):
    """Update a booking option."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)
    option = get_object_or_404(BookingOption, id=option_id, event=event)
    if option.is_system:
        raise HttpError(403, "System-Buchungsoptionen koennen nicht bearbeitet werden.")
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(option, field, value)
    option.save()
    return option


@event_router.delete("/{event_slug}/booking-options/{option_id}/")
def delete_booking_option(request, event_slug: str, option_id: int):
    """Delete a booking option."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)
    option = get_object_or_404(BookingOption, id=option_id, event=event)
    if option.is_system:
        raise HttpError(403, "System-Buchungsoptionen koennen nicht geloescht werden.")
    option.delete()
    return {"success": True, "message": "Buchungsoption gelöscht"}


# ==========================================================================
# Invite Groups & Users
# ==========================================================================


@event_router.post("/{event_slug}/invite-group/")
def invite_group(request, event_slug: str, payload: InviteGroupIn):
    """Invite all members of a group to an event."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

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
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    from django.contrib.auth import get_user_model

    User = get_user_model()
    users = User.objects.filter(id__in=user_ids)
    event.invited_users.add(*users)
    return {"success": True, "message": f"{users.count()} Benutzer eingeladen"}


# ==========================================================================
# Invitations (invited users with status)
# ==========================================================================


@event_router.get("/{event_slug}/invitations/", response=PaginatedInvitationStatusOut)
def list_invitations(
    request,
    event_slug: str,
    page: int = 1,
    page_size: int = 20,
    status: str | None = None,
    search: str | None = None,
):
    """List all invited users for an event with their response status."""
    require_auth(request)
    event = get_object_or_404(Event, slug=event_slug)
    require_event_manager(event, request.user)

    invited = _get_all_invited_users(event)

    # Determine registration status
    registered_user_ids = set(Registration.objects.filter(event=event).values_list("user_id", flat=True))

    results = []
    for user_info in invited:
        user_status = "accepted" if user_info["user_id"] in registered_user_ids else "pending"

        if status and user_status != status:
            continue

        if search:
            search_lower = search.lower()
            searchable = f"{user_info['first_name']} {user_info['last_name']} {user_info.get('scout_name', '')} {user_info['email']}".lower()
            if search_lower not in searchable:
                continue

        results.append(
            {
                **user_info,
                "status": user_status,
            }
        )

    total = len(results)
    total_pages = max(1, math.ceil(total / page_size))
    page = max(1, min(page, total_pages))
    offset = (page - 1) * page_size
    items = results[offset : offset + page_size]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


# ==========================================================================
# Helper functions
# ==========================================================================


def _build_participant_stats(event: Event, is_manager: bool) -> dict | None:
    """Build participant stats based on event visibility setting and user role."""
    visibility = event.participant_visibility

    if not is_manager and visibility == ParticipantVisibilityChoices.NONE:
        return None

    participants = Participant.objects.filter(registration__event=event).select_related("booking_option")

    total = participants.count()

    # For managers, always return full stats
    effective_visibility = ParticipantVisibilityChoices.WITH_NAMES if is_manager else visibility

    if effective_visibility == ParticipantVisibilityChoices.TOTAL_ONLY:
        return {"total": total, "by_option": []}

    # Build per-option stats
    booking_options = event.booking_options.all()
    if not is_manager:
        booking_options = booking_options.filter(is_system=False)

    by_option = []
    for option in booking_options:
        option_participants = participants.filter(booking_option=option)
        option_stat = {
            "option_id": option.id,
            "option_name": option.name,
            "count": option_participants.count(),
            "max_participants": option.max_participants,
            "participants": [],
        }

        if effective_visibility == ParticipantVisibilityChoices.WITH_NAMES:
            option_stat["participants"] = list(option_participants.values_list("first_name", flat=True))

        by_option.append(option_stat)

    return {"total": total, "by_option": by_option}


def _compute_invitation_counts(event: Event) -> dict:
    """Compute invitation status counts for an event."""
    invited = _get_all_invited_users(event)
    total = len(invited)
    registered_user_ids = set(Registration.objects.filter(event=event).values_list("user_id", flat=True))
    invited_user_ids = {u["user_id"] for u in invited}
    accepted = len(invited_user_ids & registered_user_ids)
    return {
        "total": total,
        "accepted": accepted,
        "pending": total - accepted,
    }


def _get_all_invited_users(event: Event) -> list[dict]:
    """Get all invited users (direct + via groups) with metadata."""
    from django.contrib.auth import get_user_model

    User = get_user_model()

    seen_user_ids: set[int] = set()
    results: list[dict] = []

    # Direct invitations
    for user in event.invited_users.all():
        if user.id not in seen_user_ids:
            seen_user_ids.add(user.id)
            scout_name = ""
            person = user.persons.filter(is_owner=True).first()
            if person:
                scout_name = person.scout_name
            results.append(
                {
                    "user_id": user.id,
                    "first_name": user.first_name,
                    "last_name": user.last_name,
                    "email": user.email,
                    "scout_name": scout_name,
                    "invited_via": "direct",
                    "group_name": "",
                }
            )

    # Group invitations
    for group in event.invited_groups.all():
        memberships = GroupMembership.objects.filter(group=group, is_active=True).select_related("user")
        for membership in memberships:
            user = membership.user
            if user.id not in seen_user_ids:
                seen_user_ids.add(user.id)
                scout_name = ""
                person = user.persons.filter(is_owner=True).first()
                if person:
                    scout_name = person.scout_name
                results.append(
                    {
                        "user_id": user.id,
                        "first_name": user.first_name,
                        "last_name": user.last_name,
                        "email": user.email,
                        "scout_name": scout_name,
                        "invited_via": "group",
                        "group_name": group.name,
                    }
                )

    return results
