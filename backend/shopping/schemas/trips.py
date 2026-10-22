"""Schemas of the event shopping plan: trips, allocation rules and the diff after plan changes."""

from datetime import datetime
from typing import Literal

from ninja import Schema
from pydantic import Field

TripStatus = Literal["planned", "created"]
SubjectKind = Literal["ingredient", "material"]


class NextTripOut(Schema):
    list_id: int
    store_name: str
    scheduled_at: datetime


class ShoppingEventOut(Schema):
    """Event as shown in the shopping overview."""

    id: int
    slug: str
    name: str
    start_date: datetime | None = None
    end_date: datetime | None = None
    trips_count: int = 0
    next_trip: NextTripOut | None = None
    can_manage: bool = False


class PaginatedShoppingEventOut(Schema):
    items: list[ShoppingEventOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class ManageableEventOut(Schema):
    """Event the user may link a meal plan to."""

    id: int
    slug: str
    name: str
    start_date: datetime | None = None
    end_date: datetime | None = None


class PaginatedManageableEventOut(Schema):
    items: list[ManageableEventOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class ShoppingTripIn(Schema):
    """Both fields are validated in the endpoint to answer with the friendly German message instead of a schema error."""

    store_id: int | None = None
    scheduled_at: datetime | None = None
    name: str | None = Field(default=None, max_length=255)


class TripSourceOut(Schema):
    recipe_id: int | None = None
    meal_id: int | None = None
    recipe_name: str = ""
    recipe_slug: str = ""
    meal_label: str = ""
    quantity_g: float = 0.0


class TripRowOut(Schema):
    """One line of a trip's preview; mirrors the amounts of the shopping tab of a plan."""

    kind: SubjectKind
    subject_id: int
    name: str
    quantity: float = 0.0
    unit: str = "g"
    total_quantity_g: float = 0.0
    net_quantity_g: float = 0.0
    reserve_quantity_g: float = 0.0
    retail_section_name: str = ""
    estimated_price_eur: float | None = None
    display_text: str = ""
    package_options: list[dict] = []
    package_surplus_g: float | None = None
    sources: list[TripSourceOut] = []
    rule_ids: list[int] = []
    spread_count: int = 1


class PlannedTripOut(Schema):
    list_id: int
    name: str
    store_id: int | None = None
    store_name: str = ""
    scheduled_at: datetime | None = None
    status: TripStatus
    items_count: int = 0
    checked_count: int = 0
    rows: list[TripRowOut] = []


class UncoveredOut(Schema):
    kind: SubjectKind
    subject_id: int
    name: str
    quantity: float
    meal_id: int
    meal_label: str
    reason: Literal["before_first_trip", "no_time", "no_trips"]


class HintOut(Schema):
    kind: Literal["after_meal", "rule_exceeds_demand", "no_time"]
    message: str
    meal_id: int | None = None
    trip_id: int | None = None
    rule_id: int | None = None


class AllocationRuleIn(Schema):
    target_id: int
    ingredient_id: int | None = None
    material_id: int | None = None
    meal_id: int | None = None
    quantity: float | None = Field(default=None, gt=0)


class AllocationRuleOut(Schema):
    id: int
    target_id: int
    ingredient_id: int | None = None
    material_id: int | None = None
    meal_id: int | None = None
    quantity: float | None = None
    name: str = ""


class TripPlanOut(Schema):
    event_id: int
    event_slug: str
    event_name: str
    can_manage: bool = False
    trips: list[PlannedTripOut] = []
    uncovered: list[UncoveredOut] = []
    hints: list[HintOut] = []
    rules: list[AllocationRuleOut] = []
    stamp: str = ""


class TripDiffRowOut(Schema):
    kind: Literal["new", "changed", "removed"]
    subject_kind: SubjectKind
    subject_id: int
    name: str
    unit: str = "g"
    snapshot_open: float = 0.0
    snapshot_checked: float = 0.0
    current: float = 0.0


class TripDiffOut(Schema):
    rows: list[TripDiffRowOut] = []
    has_changes: bool = False
    plan_synced_at: datetime | None = None
