"""Contracts for the ingredient portion magic wand."""

from ninja import Schema

from .ingredients import PortionOut


class PortionMagicOperationOut(Schema):
    operation_id: str
    operation: str
    source_portion_id: int | None = None
    name: str
    quantity: float
    measuring_unit_name: str
    rank: int
    proposed_weight_g: float | None = None
    confidence: float | None = None
    rationale: str = ""
    suggestion_provenance: str = "ai_estimate"
    selected: bool = False
    requires_manual_weight: bool = False
    delete_without_replacement: bool = False


class PortionMagicPreviewOut(Schema):
    preview_token: str
    ai_interaction_id: str | None = None
    operations: list[PortionMagicOperationOut]


class PortionMagicApplyIn(Schema):
    preview_token: str
    operations: list[PortionMagicOperationOut]


class PortionMagicApplyOut(Schema):
    portions: list[PortionOut]
    replaced_portion_ids: list[int]
    created_portion_ids: list[int]
    deleted_portion_ids: list[int]
