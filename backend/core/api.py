"""Django Ninja API routes for authentication (session-based)."""

import json
import logging
from datetime import UTC, datetime

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.http import HttpResponse
from django.middleware.csrf import get_token
from ninja import Query, Router, Schema
from ninja.errors import HttpError

from core.schemas import PaginatedUserOut, UserSimpleOut
from profiles.schemas.privacy import DataOverviewSchema, DeleteAccountRequestSchema
from profiles.services.privacy import PrivacyService

logger = logging.getLogger(__name__)

User = get_user_model()

auth_router = Router(tags=["auth"])
users_router = Router(tags=["users"])


# --- Schemas ---


class LoginIn(Schema):
    email: str
    password: str


class RegisterIn(Schema):
    email: str
    password1: str
    password2: str


class UserOut(Schema):
    id: int
    email: str
    first_name: str
    last_name: str
    is_staff: bool
    is_superuser: bool


class MessageOut(Schema):
    success: bool
    message: str


# --- Endpoints ---


@auth_router.get("/csrf/", response=dict)
def get_csrf_token(request):
    """Get a CSRF token for subsequent POST requests."""
    return {"csrfToken": get_token(request)}


@auth_router.get("/me/", response={200: UserOut, 403: MessageOut})
def get_current_user(request):
    """Get the currently authenticated user."""
    if not request.user.is_authenticated:
        raise HttpError(403, "Nicht angemeldet")
    return request.user


@auth_router.post("/login/", response={200: UserOut, 400: MessageOut})
def login_user(request, payload: LoginIn):
    """Log in with email and password (session-based)."""
    user = authenticate(request, username=payload.email, password=payload.password)
    if user is None:
        raise HttpError(400, "Ungültige Anmeldedaten")
    login(request, user)
    return user


@auth_router.post("/register/", response={201: UserOut, 400: MessageOut})
def register_user(request, payload: RegisterIn):
    """Register a new user account."""
    if payload.password1 != payload.password2:
        raise HttpError(400, "Passwörter stimmen nicht überein")

    if len(payload.password1) < 8:
        raise HttpError(400, "Passwort muss mindestens 8 Zeichen lang sein")

    if User.objects.filter(email=payload.email).exists():
        raise HttpError(400, "Diese E-Mail-Adresse ist bereits registriert")

    user = User.objects.create_user(
        username=payload.email,
        email=payload.email,
        password=payload.password1,
    )
    login(request, user, backend="django.contrib.auth.backends.ModelBackend")
    return 201, user


@auth_router.post("/logout/", response=MessageOut)
def logout_user(request):
    """Log out the current user."""
    logout(request)
    return {"success": True, "message": "Erfolgreich abgemeldet"}


# --- User Search ---


@users_router.get("/search/", response=PaginatedUserOut)
def search_users(
    request,
    q: str = "",
    page: int = 1,
    page_size: int = Query(default=20, le=50),
):
    """Search users by username for collaborator invite flows."""
    if not request.user.is_authenticated:
        raise HttpError(403, "Anmeldung erforderlich")

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
    if not request.user.is_authenticated:
        raise HttpError(403, "Anmeldung erforderlich")
    data = PrivacyService.collect_user_data(request.user)
    return data


@auth_router.post("/privacy/data-export/")
def export_data(request):
    """Export all personal data as JSON download (GDPR Art. 20)."""
    if not request.user.is_authenticated:
        raise HttpError(403, "Anmeldung erforderlich")

    export = PrivacyService.export_user_data(request.user)
    date_str = datetime.now(UTC).strftime("%Y-%m-%d")
    filename = f"inspi-datenexport-{date_str}.json"

    response = HttpResponse(
        json.dumps(export, ensure_ascii=False, indent=2, default=str),
        content_type="application/json",
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    return response


@auth_router.post("/privacy/delete-account/", response={200: MessageOut, 400: MessageOut})
def delete_account(request, payload: DeleteAccountRequestSchema):
    """Delete (anonymize) the user account (GDPR Art. 17)."""
    if not request.user.is_authenticated:
        raise HttpError(401, "Nicht authentifiziert")

    user = request.user

    # Validate password for accounts that have one
    if user.has_usable_password():
        if not payload.password:
            raise HttpError(400, "Passwort erforderlich")
        if not user.check_password(payload.password):
            raise HttpError(400, "Falsches Passwort")

    # Anonymize all data
    PrivacyService.anonymize_user(user)

    # End the session
    logout(request)

    return {"success": True, "message": "Dein Konto wurde gelöscht"}
