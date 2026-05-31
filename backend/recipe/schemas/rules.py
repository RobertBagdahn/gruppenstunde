"""Rule schemas — CRUD for the unified Rule model."""

from ninja import Schema


class RuleOut(Schema):
    id: int
    name: str
    description: str
    parameter: str
    scope: str
    rule_type: str
    min_green: float | None
    min_yellow: float | None
    max_green: float | None
    max_yellow: float | None
    unit: str
    hint_level: str
    tip_text: str
    improvement_text: str
    is_active: bool
    sort_order: int


class RuleIn(Schema):
    name: str
    description: str = ""
    parameter: str
    scope: str
    rule_type: str = "nutrition"
    min_green: float | None = None
    min_yellow: float | None = None
    max_green: float | None = None
    max_yellow: float | None = None
    unit: str = ""
    hint_level: str = "warn"
    tip_text: str = ""
    improvement_text: str = ""
    is_active: bool = True
    sort_order: int = 0


class RuleUpdateIn(Schema):
    name: str | None = None
    description: str | None = None
    parameter: str | None = None
    scope: str | None = None
    rule_type: str | None = None
    min_green: float | None = None
    min_yellow: float | None = None
    max_green: float | None = None
    max_yellow: float | None = None
    unit: str | None = None
    hint_level: str | None = None
    tip_text: str | None = None
    improvement_text: str | None = None
    is_active: bool | None = None
    sort_order: int | None = None
