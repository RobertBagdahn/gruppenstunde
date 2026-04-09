"""
Content API — Search endpoints.
"""

import math

from ninja import Query, Router
from ninja.errors import HttpError

from content.schemas.search import (
    AutocompleteResultOut,
    PaginatedSearchOut,
    UnifiedSearchFilterIn,
)
from content.services.search_service import log_search, unified_autocomplete, unified_search

router = Router(tags=["content"])


@router.get("/search/", response=PaginatedSearchOut, url_name="content_search")
def search_endpoint(request, filters: Query[UnifiedSearchFilterIn]):
    """Unified search across all content types."""
    result_types = [t.strip() for t in filters.result_types.split(",") if t.strip()] or None

    items, total, type_counts = unified_search(
        q=filters.q,
        result_types=result_types,
        page=filters.page,
        page_size=filters.page_size,
        sort=filters.sort,
    )

    # Log search
    if filters.q:
        user = request.user if request.user.is_authenticated else None
        log_search(filters.q, total, user)

    total_pages = max(1, math.ceil(total / filters.page_size))

    return {
        "items": items,
        "total": total,
        "page": filters.page,
        "page_size": filters.page_size,
        "total_pages": total_pages,
        "type_counts": type_counts,
    }


@router.get(
    "/autocomplete/",
    response=list[AutocompleteResultOut],
    url_name="content_autocomplete",
)
def autocomplete_endpoint(request, q: str = ""):
    """Fast typeahead autocomplete across all content types."""
    return unified_autocomplete(q)
