"""Schemas for shops (`Store`) the shopping trips refer to."""

from datetime import datetime

from ninja import Schema
from pydantic import Field


class StoreIn(Schema):
    name: str = Field(min_length=1, max_length=80)


class StoreOut(Schema):
    id: int
    name: str
    created_at: datetime


class PaginatedStoreOut(Schema):
    items: list[StoreOut]
    total: int
    page: int
    page_size: int
    total_pages: int
