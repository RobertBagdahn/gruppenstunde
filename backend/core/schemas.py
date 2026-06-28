"""Core schemas shared across apps."""

from ninja import Schema


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
