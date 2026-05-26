"""Privacy-related Pydantic schemas for data overview, export, and account deletion."""

from __future__ import annotations

from typing import Any

from ninja import Schema
from pydantic import field_validator


# --- Data Overview Sub-Schemas ---


class CategorySchema(Schema):
    """Generic category with count and items list."""

    count: int
    items: list[dict[str, Any]]


class AnalyticsDataSchema(Schema):
    """Summary of analytics data (no individual records)."""

    view_count: int
    search_count: int


class DataOverviewSchema(Schema):
    """Complete overview of all personal data stored for a user."""

    profile: dict[str, Any]
    preferences: dict[str, Any] | None = None
    groups: CategorySchema
    persons: CategorySchema
    events: CategorySchema
    content: CategorySchema
    comments: CategorySchema
    interactions: CategorySchema
    planning: CategorySchema
    packing_lists: CategorySchema
    shopping_lists: CategorySchema
    analytics: AnalyticsDataSchema


# --- Account Deletion ---


class DeleteAccountRequestSchema(Schema):
    """Request to delete (anonymize) user account."""

    password: str | None = None
    confirmation: str

    @field_validator("confirmation")
    @classmethod
    def validate_confirmation(cls, v: str) -> str:
        if v != "KONTO LÖSCHEN":
            raise ValueError("Bitte bestätige die Löschung mit 'KONTO LÖSCHEN'")
        return v
