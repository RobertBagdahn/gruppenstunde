"""Helper functions shared across event API modules."""

from ninja.errors import HttpError

from event.models import Event


def require_auth(request):
    """Ensure user is authenticated."""
    if not request.user.is_authenticated:
        raise HttpError(403, "Anmeldung erforderlich")


def require_event_manager(event: Event, user):
    """Check that the user can manage this event."""
    if not event.user_can_manage(user):
        raise HttpError(403, "Nur Verantwortliche können diese Aktion ausführen")
