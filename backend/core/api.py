"""Django Ninja API routes for authentication (session-based) and unified search."""

import logging
import math

from django.contrib.auth import authenticate, get_user_model, login, logout
from django.middleware.csrf import get_token
from ninja import Query, Router, Schema
from ninja.errors import HttpError

logger = logging.getLogger(__name__)

User = get_user_model()

auth_router = Router(tags=["auth"])
search_router = Router(tags=["search"])


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


# ==========================================================================
# Unified Search
# ==========================================================================


class UnifiedSearchResultOut(Schema):
    result_type: str  # 'idea', 'recipe', 'tag', 'event'
    id: int
    title: str
    slug: str
    summary: str
    image_url: str | None
    url: str
    score: float
    created_at: str
    extra: dict


class PaginatedSearchOut(Schema):
    items: list[UnifiedSearchResultOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class UnifiedSearchFilterIn(Schema):
    q: str | None = None
    result_types: list[str] | None = None  # 'idea', 'recipe', 'tag', 'event'
    sort: str = "relevant"
    page: int = 1
    page_size: int = 20


class AutocompleteResultOut(Schema):
    result_type: str
    id: int
    title: str
    slug: str
    url: str
    score: float


@search_router.get("/autocomplete/", response=list[AutocompleteResultOut])
def unified_autocomplete_endpoint(request, q: str = ""):
    """Fast autocomplete across Ideas, Recipes, Tags, and Events."""
    from .search_service import unified_autocomplete

    return unified_autocomplete(q=q, limit=8)


@search_router.get("/", response=PaginatedSearchOut)
def unified_search_endpoint(request, filters: Query[UnifiedSearchFilterIn]):
    """Search across Ideas, Recipes, Tags, and Events."""
    from .search_service import unified_search

    results, total = unified_search(
        q=filters.q or "",
        result_types=filters.result_types,
        page=filters.page,
        page_size=filters.page_size,
        sort=filters.sort,
    )
    total_pages = math.ceil(total / filters.page_size) if total > 0 else 1

    return {
        "items": results,
        "total": total,
        "page": filters.page,
        "page_size": filters.page_size,
        "total_pages": total_pages,
    }
