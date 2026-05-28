"""HealthRule and cockpit evaluation schemas."""

from ninja import Schema


class HealthRuleOut(Schema):
    """Schema for a single health rule."""

    id: int
    name: str
    description: str
    parameter: str
    scope: str
    min_green: float | None
    min_yellow: float | None
    max_green: float | None
    max_yellow: float | None
    unit: str
    tip_text: str
    is_active: bool
    sort_order: int


class HealthRuleIn(Schema):
    """Input schema for creating a health rule."""

    name: str
    description: str = ""
    parameter: str
    scope: str
    min_green: float | None = None
    min_yellow: float | None = None
    max_green: float | None = None
    max_yellow: float | None = None
    unit: str = ""
    tip_text: str = ""
    is_active: bool = True
    sort_order: int = 0


class HealthRuleUpdateIn(Schema):
    """Partial update schema for a health rule."""

    name: str | None = None
    description: str | None = None
    parameter: str | None = None
    scope: str | None = None
    min_green: float | None = None
    min_yellow: float | None = None
    max_green: float | None = None
    max_yellow: float | None = None
    unit: str | None = None
    tip_text: str | None = None
    is_active: bool | None = None
    sort_order: int | None = None


class CockpitEvaluationOut(Schema):
    """Schema for a single cockpit evaluation result."""

    rule_id: int
    rule_name: str
    parameter: str
    current_value: float
    status: str  # "green", "yellow", "red"
    tip_text: str
    unit: str


class CockpitDashboardOut(Schema):
    """Schema for a complete cockpit dashboard response."""

    evaluations: list[CockpitEvaluationOut]
    summary_status: str  # worst status across all evaluations
    green_count: int
    yellow_count: int
    red_count: int
