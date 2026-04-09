"""
Search-related schemas (extracted from api.py inline schemas).
"""

from ninja import Schema


class UnifiedSearchFilterIn(Schema):
    q: str = ""
    result_types: str = ""  # Comma-separated: "session,blog,game,recipe,tag,event"
    sort: str = "relevant"
    page: int = 1
    page_size: int = 20


class UnifiedSearchResultOut(Schema):
    result_type: str
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
    type_counts: dict[str, int]


class AutocompleteResultOut(Schema):
    result_type: str
    id: int
    title: str
    slug: str
    url: str
    score: float
