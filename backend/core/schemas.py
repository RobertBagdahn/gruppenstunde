"""Core schemas shared across apps."""

from datetime import datetime

from ninja import Schema


class HasPermissions(Schema):
    """Mixin providing can_edit and can_delete permission fields.

    All resource schemas (detail + list) that expose editable content
    MUST include these fields. Values are resolved server-side using
    each resource's permission logic.
    """

    can_edit: bool = False
    can_delete: bool = False


class ErrorOut(Schema):
    """Unified error body. `code` is a stable identifier the frontend branches on."""

    detail: str
    code: str
    retry_after_seconds: int | None = None


class UserSimpleOut(Schema):
    """Minimal user info for collaborator selection."""

    id: int
    username: str


class PaginatedUserOut(Schema):
    """Paginated response for user search results."""

    items: list[UserSimpleOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class AuthUserOut(Schema):
    """Authenticated user as seen by both frontends."""

    id: int
    email: str
    first_name: str
    last_name: str
    display_name: str
    is_staff: bool
    is_superuser: bool
    needs_onboarding: bool
    providers: list[str]


class SessionOut(Schema):
    """Session state; always returned with HTTP 200, also for anonymous visitors."""

    is_authenticated: bool
    user: AuthUserOut | None = None


class AuthProviderOut(Schema):
    id: str
    name: str
    login_url: str


class AuthProvidersOut(Schema):
    providers: list[AuthProviderOut]
    dev_login: bool


class SocialConnectionOut(Schema):
    id: int
    provider: str
    provider_name: str
    email: str
    connected_at: datetime
    last_login: datetime | None = None


class DevLoginIn(Schema):
    email: str


class MessageOut(Schema):
    success: bool
    message: str


class AiQuotaOut(Schema):
    """AI budget of the current tier. EUR amounts are only meant for staff UIs."""

    tier: str
    limit_eur: float
    used_eur: float
    remaining_eur: float
    used_percent: int
    resets_at: datetime
    anonymous_features: list[str]
    visitor_remaining_percent: int | None = None
