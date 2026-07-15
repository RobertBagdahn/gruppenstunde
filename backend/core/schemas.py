"""Core schemas shared across apps."""

from ninja import Schema


class HasPermissions(Schema):
    """Mixin providing can_edit and can_delete permission fields.

    All resource schemas (detail + list) that expose editable content
    MUST include these fields. Values are resolved server-side using
    each resource's permission logic.
    """

    can_edit: bool = False
    can_delete: bool = False


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
