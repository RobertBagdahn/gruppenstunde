"""Start page "Entscheidungen": colour counts, open queue, special articles, decisions (order-traffic-light)."""

from __future__ import annotations

from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from ruebert.api.deps import EntriesDep, ParametersDep, SettingsDep, StoreDep
from ruebert.data.planning import World, load_world
from ruebert.domain.derivation import format_int, week_label
from ruebert.domain.traffic_light import TrafficLight
from ruebert.journal import current_entries, read_entries, write_entry

router = APIRouter(prefix="/traffic-light", tags=["traffic-light"])

COLOUR_ORDER = {"red": 0, "yellow": 1, "green": 2, "blue": 3}


class QueueItem(BaseModel):
    sku: str
    title: str
    colour: Literal["red", "yellow", "green", "blue"]
    stock: float
    stockout_label: str
    recommendation: str | None
    suggested_quantity: int | None
    decision: str | None = None


class Rule(BaseModel):
    colour: str
    text: str
    question_id: str | None


class TrafficLightOut(BaseModel):
    counts: dict[str, int]
    queue: list[QueueItem]
    special: list[QueueItem]
    decided: int
    explanation: list[Rule]


class DecisionIn(BaseModel):
    choice: Literal["annehmen", "zurückstellen"]
    reason: str | None = Field(default=None, max_length=500)


def _item(world: World, light: TrafficLight) -> QueueItem:
    article = world.articles[light.sku]
    decision = world.decisions.get(light.sku)
    return QueueItem(
        sku=light.sku,
        title=article.title,
        colour=light.colour,
        stock=article.stock,
        stockout_label=light.stockout_label,
        recommendation=light.recommendation.text if light.recommendation else None,
        suggested_quantity=world.final_quantity(light.sku),
        decision=decision.choice if decision else None,
    )


def open_queue(world: World) -> list[TrafficLight]:
    """Red and yellow regular articles without a decision, most urgent first."""
    queue = [
        light
        for light in world.lights.values()
        if light.colour in ("red", "yellow") and not light.is_special and light.sku not in world.decisions
    ]
    far = max((w for light in queue if (w := light.stockout_week)), default=None)
    return sorted(queue, key=lambda x: (COLOUR_ORDER[x.colour], x.stockout_week or far, x.sku))  # pyright: ignore[reportArgumentType]


def _rules(world: World) -> list[Rule]:
    v = world.values
    lead, window, over = int(v["lead_time_weeks"]), int(v["planning_window_weeks"]), int(v["overstock_weeks"])
    return [
        Rule(
            colour="red",
            text=f"Ausverkauf vor Ablauf der Lieferzeit ({lead} Wochen): bestellte Ware käme zu spät.",
            question_id="Q-080",
        ),
        Rule(
            colour="yellow",
            text=f"Ausverkauf innerhalb des Planungsfensters ({window} Wochen nach der Lieferzeit): jetzt planen.",
            question_id="Q-080",
        ),
        Rule(colour="green", text="Bestand reicht über Lieferzeit und Planungsfenster hinaus.", question_id=None),
        Rule(
            colour="blue",
            text=f"Bestand übersteigt die Prognose der nächsten {over} Wochen ({format_int(over / 52 * 12)} Monate).",
            question_id="Q-080",
        ),
        Rule(
            colour="Bestellung bis",
            text=f"Ausverkaufswoche minus {lead} Wochen Lieferzeit, bezogen auf {week_label(world.reference_date)}.",
            question_id=None,
        ),
    ]


@router.get("", summary="Ampel-Zähler und offene Entscheidungen")
def get_traffic_light(
    store: StoreDep, entries: EntriesDep, values: ParametersDep, settings: SettingsDep
) -> TrafficLightOut:
    world = load_world(store, entries, values, settings.reference_date)
    regular = [light for light in world.lights.values() if not light.is_special]
    counts = {c: len([x for x in regular if x.colour == c]) for c in COLOUR_ORDER}
    queue = open_queue(world)
    return TrafficLightOut(
        counts=counts,
        queue=[_item(world, light) for light in queue],
        special=[_item(world, light) for light in world.lights.values() if light.is_special],
        decided=len([light for light in regular if light.sku in world.decisions]),
        explanation=_rules(world),
    )


@router.post("/{sku}/decision", summary="Empfehlung annehmen oder zurückstellen (schreibt ins Journal)")
def decide(
    sku: str, body: DecisionIn, store: StoreDep, entries: EntriesDep, values: ParametersDep, settings: SettingsDep
) -> QueueItem:
    world = load_world(store, entries, values, settings.reference_date)
    light = world.lights.get(sku)
    if light is None:
        raise HTTPException(404, f"Artikel {sku} hat keine Ampel (kein Artikel oder keine Prognose).")
    previous = current_entries([e for e in entries if e.type == "order"]).get(f"order:{sku}")
    write_entry(
        settings.journal_dir,
        type="order",
        subject=f"order:{sku}",
        choice=body.choice,
        value=world.final_quantity(sku),
        reason=body.reason,
        author=settings.journal_author,
        supersedes=previous.id if previous else None,
    )
    refreshed = load_world(store, read_entries(settings.journal_dir), values, settings.reference_date)
    return _item(refreshed, refreshed.lights[sku])
