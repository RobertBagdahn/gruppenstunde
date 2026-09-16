"""Pydantic schemas for the staff-only portion repair API.

Kept in sync with the Food frontend Zod schemas
(`frontend-food/src/schemas/portionRepair.ts`).
"""

from ninja import Schema


class PortionRepairFindingOut(Schema):
    """A single portion repair finding with audit details."""

    id: int
    portion_id: int
    ingredient_id: int
    ingredient_name: str
    portion_name: str
    detection_reason: str
    status: str
    before_snapshot: dict
    recipe_item_ids: list[int]
    ai_proposal: dict
    confidence: float | None
    prompt_version: str
    threshold: float | None
    applied_portion_id: int | None
    moved_recipe_item_ids: list[int]
    affected_recipe_ids: list[int]
    applied_at: str | None
    rejected_at: str | None
    created_at: str
    repair_path: str = "review"
    suggested_weight_g: float | None = None


class PaginatedPortionRepairFindingOut(Schema):
    """Standard paginated response."""

    items: list[PortionRepairFindingOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class PortionRepairApplyOut(Schema):
    """Result of applying a finding."""

    applied: bool
    finding_id: int
    applied_portion_id: int | None
    moved_recipe_item_ids: list[int]
    affected_recipe_ids: list[int]


class PortionRepairRejectOut(Schema):
    """Result of rejecting a finding."""

    finding_id: int
    status: str
