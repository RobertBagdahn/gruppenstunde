"""Django Ninja API routes for authentication (social login, session-based)."""

import json
import logging
from datetime import UTC, datetime
from typing import Any, cast

from allauth.socialaccount.models import SocialAccount
from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.http import Http404, HttpResponse
from django.middleware.csrf import get_token
from ninja import Router, Status

from core.auth.passwords import register_password_user
from core.auth.providers import configured_providers, provider_name, user_connections
from core.auth.session import auth_user_out, session_out
from core.errors import ApiError
from core.permissions import require_login, require_recent_login
from core.schemas import (
    AuthProviderOut,
    AuthProvidersOut,
    AuthUserOut,
    DevLoginIn,
    MessageOut,
    PaginatedUserOut,
    PasswordLoginIn,
    PasswordRegisterIn,
    SessionOut,
    SocialConnectionOut,
    UserSimpleOut,
)
from profiles.schemas.privacy import DataOverviewSchema, DeleteAccountRequestSchema
from profiles.services.privacy import PrivacyService

logger = logging.getLogger(__name__)

User = get_user_model()

auth_router = Router(tags=["auth"])
users_router = Router(tags=["users"])


# --- Session ---


@auth_router.get("/csrf/", response=dict)
def get_csrf_token(request):
    """Get a CSRF token for subsequent POST requests (also used by the OAuth start form)."""
    return {"csrfToken": get_token(request)}


@auth_router.get("/me/", response=SessionOut)
def get_current_session(request):
    """Current session; anonymous visitors get `is_authenticated: false` with HTTP 200."""
    return session_out(request.user)


@auth_router.get("/providers/", response=AuthProvidersOut)
def list_providers(request):
    """Configured social login providers (unconfigured ones are never offered)."""
    return AuthProvidersOut(
        providers=[AuthProviderOut(id=p.id, name=p.name, login_url=p.login_url) for p in configured_providers()],
        dev_login=settings.AUTH_DEV_LOGIN_ENABLED,
        password_login=settings.AUTH_PASSWORD_LOGIN_ENABLED,
    )


# --- Transitional e-mail/password login (AUTH_PASSWORD_LOGIN_ENABLED) ---


@auth_router.post("/login/", response=AuthUserOut)
def password_login(request, payload: PasswordLoginIn):
    """Log in with e-mail and password while the transition period is active."""
    if not settings.AUTH_PASSWORD_LOGIN_ENABLED:
        raise Http404
    email = payload.email.strip()
    # Legacy accounts may have a mixed-case username even though their email is
    # case-insensitive. Resolve the stored username first, then use Django's backend.
    candidate = User._default_manager.filter(email__iexact=email).first()
    username = candidate.get_username() if candidate is not None else email
    user = authenticate(request, username=username, password=payload.password)
    if user is None:
        raise ApiError(400, "invalid_credentials", "E-Mail-Adresse oder Passwort ist falsch.")
    login(request, user)
    return auth_user_out(user)


@auth_router.post("/register/", response={201: AuthUserOut})
def password_register(request, payload: PasswordRegisterIn):
    """Create an e-mail/password account while the transition period is active."""
    if not settings.AUTH_PASSWORD_LOGIN_ENABLED:
        raise Http404
    user = register_password_user(payload.email, payload.password1, payload.password2)
    login(request, user, backend="django.contrib.auth.backends.ModelBackend")
    return Status(201, auth_user_out(user))


@auth_router.post("/logout/", response=MessageOut)
def logout_user(request):
    """End the session; idempotent for anonymous clients."""
    logout(request)
    return {"success": True, "message": "Du bist abgemeldet."}


@auth_router.post("/dev-login/", response=AuthUserOut)
def dev_login(request, payload: DevLoginIn):
    """Local/test-only login without a provider. Returns 404 unless explicitly enabled."""
    if not settings.AUTH_DEV_LOGIN_ENABLED:
        raise Http404
    email = payload.email.strip().lower()
    if not email or "@" not in email:
        raise ApiError(422, "invalid_input", "Bitte gib eine gültige E-Mail-Adresse ein.")
    user = User.objects.filter(email__iexact=email).first()
    if user is None:
        user = User.objects.create_user(username=email, email=email)
        user.set_unusable_password()
        user.save(update_fields=["password"])
    login(request, user, backend="django.contrib.auth.backends.ModelBackend")
    return auth_user_out(user)


# --- Connected providers ---


@auth_router.get("/connections/", response=list[SocialConnectionOut])
def list_connections(request):
    """Social accounts linked to the current user."""
    user = require_login(request, "um deine Anmeldemöglichkeiten zu sehen")
    return [_connection_out(account) for account in user_connections(user)]


@auth_router.delete("/connections/{connection_id}/", response={204: None})
def delete_connection(request, connection_id: int):
    """Disconnect a provider; the last remaining provider cannot be removed."""
    user = require_login(request)
    account = SocialAccount._default_manager.filter(id=connection_id, user=user).first()
    if account is None:
        raise Http404
    if not user_connections(user).exclude(id=account.id).exists():
        raise ApiError(
            400,
            "last_connection",
            "Du brauchst mindestens eine Anmeldemöglichkeit. Verbinde erst einen weiteren Anbieter.",
        )
    account.delete()
    return Status(204, None)


def _connection_out(account: SocialAccount) -> SocialConnectionOut:
    extra = account.extra_data if isinstance(account.extra_data, dict) else {}
    email = str(extra.get("email") or extra.get("mail") or extra.get("userPrincipalName") or "")
    return SocialConnectionOut(
        id=account.pk,
        provider=cast(str, account.provider),
        provider_name=provider_name(cast(str, account.provider)),
        email=email,
        connected_at=cast(datetime, account.date_joined),
        last_login=cast(datetime | None, account.last_login),
    )


# --- User Search ---


@users_router.get("/search/", response=PaginatedUserOut)
def search_users(
    request,
    q: str = "",
    page: int = 1,
    page_size: int = 20,
):
    """Search users by username for collaborator invite flows."""
    # Validate pagination before auth, like Ninja's former Query(le=50) parameter validation.
    if page < 1 or page_size < 1 or page_size > 50:
        raise ApiError(422, "invalid_input", "Die Seitengröße muss zwischen 1 und 50 liegen.")
    require_login(request)

    qs = User.objects.order_by("username")
    if q:
        qs = qs.filter(username__icontains=q)

    total = qs.count()
    total_pages = max(1, (total + page_size - 1) // page_size)
    offset = (page - 1) * page_size
    users = [
        UserSimpleOut(id=u["id"], username=u["username"])
        for u in qs.values("id", "username")[offset : offset + page_size]
    ]

    return {
        "items": users,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


# --- Privacy Endpoints (GDPR) ---


@auth_router.get("/privacy/data-overview/", response={200: DataOverviewSchema})
def get_data_overview(request):
    """Get a categorized overview of all personal data (GDPR Art. 15)."""
    require_login(request)
    data = PrivacyService.collect_user_data(request.user)
    return data


@auth_router.post("/privacy/data-export/")
def export_data(request):
    """Export all personal data as JSON download (GDPR Art. 20)."""
    require_login(request)

    export = PrivacyService.export_user_data(request.user)
    date_str = datetime.now(UTC).strftime("%Y-%m-%d")
    filename = f"inspi-datenexport-{date_str}.json"

    response = HttpResponse(
        json.dumps(export, ensure_ascii=False, indent=2, default=str).encode("utf-8"),
        content_type="application/json",
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


@auth_router.post("/privacy/delete-account/", response=MessageOut)
def delete_account(request, payload: DeleteAccountRequestSchema):
    """Delete (anonymize) the user account (GDPR Art. 17). Requires a login within 15 minutes."""
    user = require_recent_login(request, minutes=15)
    PrivacyService.anonymize_user(cast(Any, user))
    logout(request)
    return {"success": True, "message": "Dein Konto wurde gelöscht"}
