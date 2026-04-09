"""Helper functions shared across supply API modules."""

from ninja.errors import HttpError


def require_auth(request):
    """Ensure user is authenticated."""
    if not request.user.is_authenticated:
        raise HttpError(403, "Anmeldung erforderlich")
