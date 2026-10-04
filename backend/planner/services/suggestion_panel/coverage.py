"""Coverage analysis: how many candidates exist per meal type x direction x filter / context."""

from __future__ import annotations

from dataclasses import dataclass, field

from .context import EffectiveContext
from .directions import CARDS_PER_DIRECTION, MEAL_TYPE_CONFIG, directions_for
from .engine import Filters, load_all_candidates, passes_hard, passes_soft

COVERAGE_MEAL_TYPES = ("breakfast", "lunch", "dinner", "snack", "drinks")
SOFT_FILTERS: dict[str, Filters] = {
    "taste=sweet": Filters(taste="sweet"),
    "taste=savory": Filters(taste="savory"),
    "prep=none": Filters(prep="none"),
    "prep=some": Filters(prep="some"),
    "kids": Filters(kids=True),
    "budget=cheap": Filters(budget="cheap"),
    "diet=vegetarian": Filters(diet="vegetarian"),
}
CONTEXT_SCENARIOS: dict[str, EffectiveContext] = {
    "cooking=none": EffectiveContext(cooking_sources=["none"]),
    "cooking=campfire": EffectiveContext(cooking_sources=["campfire"]),
    "cooking=gas_burner": EffectiveContext(cooking_sources=["gas_burner"]),
    "cooling=none": EffectiveContext(cooling="none"),
}


@dataclass
class CoverageRow:
    meal_type: str
    direction: str
    counts: dict[str, int] = field(default_factory=dict)

    def gaps(self, minimum: int = CARDS_PER_DIRECTION) -> list[str]:
        return [name for name, count in self.counts.items() if count < minimum]


def compute_coverage(meal_types: tuple[str, ...] = COVERAGE_MEAL_TYPES) -> list[CoverageRow]:
    rows: list[CoverageRow] = []
    for meal_type in meal_types:
        if meal_type not in MEAL_TYPE_CONFIG:
            continue
        candidates = load_all_candidates(meal_type)
        directions, _ = directions_for(meal_type, with_dessert=meal_type in ("lunch", "dinner"))
        for direction in directions:
            matching = [c for c in candidates if c.kind in direction.kinds and direction.match(c)]
            counts = {"alle": len(matching)}
            for name, filters in SOFT_FILTERS.items():
                counts[name] = sum(1 for c in matching if passes_soft(c, filters, meal_type))
            for name, ctx in CONTEXT_SCENARIOS.items():
                counts[name] = sum(1 for c in matching if passes_hard(c, ctx, set()))
            rows.append(CoverageRow(meal_type, direction.key, counts))
    return rows


def to_markdown(rows: list[CoverageRow], minimum: int = CARDS_PER_DIRECTION) -> str:
    if not rows:
        return "Keine Daten.\n"
    columns = list(rows[0].counts)
    lines = [
        f"# Abdeckung der Vorschläge (Lücke = weniger als {minimum} Treffer)",
        "",
        "| Meal-Typ | Richtung | " + " | ".join(columns) + " |",
        "|---|---|" + "---|" * len(columns),
    ]
    for row in rows:
        cells = [f"**{row.counts[c]}**" if row.counts[c] < minimum else str(row.counts[c]) for c in columns]
        lines.append(f"| {row.meal_type} | {row.direction} | " + " | ".join(cells) + " |")
    lines += ["", "## Seed-Backlog (Lücken)", ""]
    backlog = [f"- {r.meal_type} / {r.direction}: {', '.join(r.gaps(minimum))}" for r in rows if r.gaps(minimum)]
    lines += backlog or ["Keine Lücken."]
    return "\n".join(lines) + "\n"


def find_empty_directions(rows: list[CoverageRow]) -> list[tuple[str, str]]:
    """Directions without any candidate (used by the minimum coverage test)."""
    return [(r.meal_type, r.direction) for r in rows if r.counts["alle"] == 0]
