"""List responses in the shared format `{items, total, page, page_size, total_pages}` (as in gruppenstunde)."""

from __future__ import annotations

import math
from collections.abc import Sequence
from typing import Annotated

from fastapi import Query
from pydantic import BaseModel, Field

DEFAULT_PAGE_SIZE = 20
MAX_PAGE_SIZE = 200


class PageParams(BaseModel):
    """Query parameters of every list endpoint."""

    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=DEFAULT_PAGE_SIZE, ge=1, le=MAX_PAGE_SIZE)

    @property
    def offset(self) -> int:
        return (self.page - 1) * self.page_size


def page_params(
    page: Annotated[int, Query(ge=1, description="Seite, beginnend bei 1")] = 1,
    page_size: Annotated[int, Query(ge=1, le=MAX_PAGE_SIZE, description="Einträge je Seite")] = DEFAULT_PAGE_SIZE,
) -> PageParams:
    """FastAPI dependency for `?page=&page_size=`."""
    return PageParams(page=page, page_size=page_size)


class Page[T](BaseModel):
    items: list[T]
    total: int = Field(ge=0)
    page: int = Field(ge=1)
    page_size: int = Field(ge=1)
    total_pages: int = Field(ge=0)


def total_pages(total: int, page_size: int) -> int:
    return math.ceil(total / page_size) if total else 0


def paginate[T](items: Sequence[T], params: PageParams) -> Page[T]:
    """Slice an in-memory sequence. A page beyond the end is empty, not an error."""
    window = list(items[params.offset : params.offset + params.page_size])
    return Page[T](
        items=window,
        total=len(items),
        page=params.page,
        page_size=params.page_size,
        total_pages=total_pages(len(items), params.page_size),
    )


def page_of[T](items: Sequence[T], total: int, params: PageParams) -> Page[T]:
    """Wrap an already sliced result (e.g. from SQL with LIMIT/OFFSET) with its total count."""
    return Page[T](
        items=list(items),
        total=total,
        page=params.page,
        page_size=params.page_size,
        total_pages=total_pages(total, params.page_size),
    )
