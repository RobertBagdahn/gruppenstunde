"""Suggestion schemas — response types for the meal plan suggestions API."""

from ninja import Schema


class RecipeSuggestionOut(Schema):
    """A recipe suggested to fill an empty meal slot."""

    id: int
    title: str
    slug: str
    image_url: str | None = None
    recipe_type: str


class SuggestionOut(Schema):
    """A single suggestion/evaluation result."""

    category: str  # "completeness" | "duplicate" | "nutrition" | "budget"
    scope: str  # "event" | "day" | "meal"
    scope_label: str  # e.g. "Tag 1 Mittagessen"
    status: str  # "green" | "yellow" | "red"
    priority: int  # 1=completeness, 2=budget, 3=nutrition, 4=duplicate
    message: str  # Human-readable description
    current_value: float | None = None
    target_range: str | None = None  # e.g. "max 8€/Person/Tag"
    tip: str | None = None
    recipe_suggestions: list[RecipeSuggestionOut] = []
    price_coverage_pct: float | None = None  # Only for budget suggestions


class SuggestionDashboardOut(Schema):
    """Full suggestion dashboard response."""

    suggestions: list[SuggestionOut]
    summary_status: str  # Worst color across all suggestions
    red_count: int
    yellow_count: int
    green_count: int
    total_count: int
