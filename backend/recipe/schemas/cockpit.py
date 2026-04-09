"""HealthRule and cockpit evaluation schemas."""

from ninja import Schema


class HealthRuleOut(Schema):
    """Schema for a single health rule."""

    id: int
    name: str
    description: str
    parameter: str
    scope: str
    threshold_green: float
    threshold_yellow: float
    unit: str
    tip_text: str
    is_active: bool
    sort_order: int


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
