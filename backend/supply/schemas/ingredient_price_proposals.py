"""Schemas for ingredient price proposals."""

from datetime import datetime

from ninja import Schema


def _display_name(user) -> str | None:
    if user is None:
        return None
    profile = getattr(user, "profile", None)
    if profile:
        return profile.scout_name or profile.full_name or user.username
    return user.username


class IngredientPriceProposalOut(Schema):
    """Reviewable AI price proposal for an ingredient."""

    id: int
    ingredient_id: int
    proposed_price_per_kg: float
    confidence: float
    rationale: str
    source: str
    status: str
    requested_by_name: str | None = None
    reviewed_by_name: str | None = None
    reviewed_at: datetime | None = None
    ai_interaction_id: str | None = None
    created_at: datetime
    updated_at: datetime

    @staticmethod
    def resolve_requested_by_name(obj) -> str | None:
        return _display_name(obj.requested_by)

    @staticmethod
    def resolve_reviewed_by_name(obj) -> str | None:
        return _display_name(obj.reviewed_by)


class IngredientPriceProposalAcceptIn(Schema):
    """Accept payload; replace=True explicitly allows overwriting an existing positive price."""

    replace: bool = False


class IngredientPriceProposalListOut(Schema):
    items: list[IngredientPriceProposalOut]
    total: int
    page: int
    page_size: int
    total_pages: int
