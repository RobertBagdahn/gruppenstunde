"""Article list and detail: history, forecast, demand origin, derivation, models, journal (article-views)."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Literal

import duckdb
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from ruebert.api.deps import EntriesDep, ParametersDep, SettingsDep, StoreDep
from ruebert.api.order_plans import build_plan_out
from ruebert.api.pagination import Page, PageParams, page_params, paginate
from ruebert.api.schemas import DerivationOut
from ruebert.data.planning import load_world
from ruebert.domain import calendar, parameters
from ruebert.domain.derivation import format_int
from ruebert.journal import Entry, case_decisions, history

router = APIRouter(prefix="/products", tags=["products"])

Colour = Literal["red", "yellow", "green", "blue"]
COLOUR_RANK = {"red": 0, "yellow": 1, "green": 2, "blue": 3}


class ProductRow(BaseModel):
    sku: str
    title: str
    brand: str | None
    category: str | None
    turnover_class: int | None
    stock: float
    colour: Colour | None
    stockout_label: str | None
    is_special: bool


class Filters(BaseModel):
    brands: list[str]
    categories: list[str]
    turnover_classes: list[int]


class SalesWeek(BaseModel):
    week_start: date
    direct: float
    from_sets: float
    total: float
    excluded: bool


class ForecastPoint(BaseModel):
    week_start: date
    quantity: float
    lower_80: float | None
    upper_80: float | None
    capped: bool


class Marker(BaseModel):
    date: date
    key: str
    label: str


class SetShare(BaseModel):
    set_sku: str
    set_title: str
    units_per_set: int
    units_last_52_weeks: float
    share: float


class ChannelShare(BaseModel):
    channel: str
    share: float
    is_sample: bool


class DemandOrigin(BaseModel):
    direct_units: float
    set_units: float
    set_share: float
    sets: list[SetShare]
    channels: list[ChannelShare]
    channels_are_sample: bool


class ModelRow(BaseModel):
    model: str
    selected: bool
    wape: float | None
    bias: float | None
    coverage: float | None
    evaluated: bool  # False → "nicht bewertet" (fallback or too few cross-validation samples)


class JournalLine(BaseModel):
    id: str
    type: str
    choice: str
    value: str | float | int | bool | None
    reason: str | None
    author: str
    created_at: str


class ProductDetail(BaseModel):
    sku: str
    title: str
    brand: str | None
    category: str | None
    turnover_class: int | None
    is_special: bool
    stock: float
    colour: Colour | None
    stockout_label: str | None
    stockout_week: date | None
    recommendation: str | None
    trend_percent: float | None
    sentence: str | None
    derivation: DerivationOut | None
    quantity: int | None
    history: list[SalesWeek]
    forecast: list[ForecastPoint]
    selected_model: str | None
    markers: list[Marker]
    demand_origin: DemandOrigin
    models: list[ModelRow]
    journal: list[JournalLine]


@router.get("/filters", summary="Auswahl für die Filter der Artikelliste")
def get_filters(store: StoreDep) -> Filters:
    def distinct(column: str) -> list[object]:
        return [
            r[0]
            for r in store.execute(
                f"SELECT DISTINCT {column} FROM articles WHERE NOT ignored AND {column} IS NOT NULL ORDER BY 1"
            ).fetchall()
        ]

    return Filters(
        brands=[str(b) for b in distinct("brand")],
        categories=[str(c) for c in distinct("category")],
        turnover_classes=[int(t) for t in distinct("turnover_class")],  # pyright: ignore[reportArgumentType]
    )


@router.get("", summary="Artikelliste mit Filtern, Suche und Sortierung")
def list_products(
    store: StoreDep,
    entries: EntriesDep,
    values: ParametersDep,
    settings: SettingsDep,
    params: Annotated[PageParams, Depends(page_params)],
    search: Annotated[str | None, Query(description="Name oder SKU enthält")] = None,
    colour: Annotated[Colour | None, Query()] = None,
    brand: Annotated[str | None, Query()] = None,
    category: Annotated[str | None, Query()] = None,
    turnover_class: Annotated[int | None, Query(ge=0, le=10)] = None,
    sort: Annotated[Literal["sku", "title", "stock", "colour"], Query()] = "sku",
    descending: Annotated[bool, Query()] = False,
) -> Page[ProductRow]:
    world = load_world(store, entries, values, settings.reference_date)
    rows: list[ProductRow] = []
    for article in world.articles.values():
        if article.is_set:
            continue
        light = world.lights.get(article.sku)
        row = ProductRow(
            sku=article.sku,
            title=article.title,
            brand=article.brand,
            category=article.category,
            turnover_class=article.turnover_class,
            stock=article.stock,
            colour=light.colour if light else None,
            stockout_label=light.stockout_label if light else None,
            is_special=article.is_special,
        )
        needle = (search or "").strip().casefold()
        if needle and needle not in row.sku.casefold() and needle not in row.title.casefold():
            continue
        if colour and row.colour != colour:
            continue
        if brand and row.brand != brand:
            continue
        if category and row.category != category:
            continue
        if turnover_class is not None and row.turnover_class != turnover_class:
            continue
        rows.append(row)
    rows.sort(key=lambda r: _sort_key(r, sort), reverse=descending)
    return paginate(rows, params)


def _sort_key(row: ProductRow, sort: str) -> tuple[int, float, str]:
    """Sortable (rank, number, text) so every sort field has the same key type."""
    match sort:
        case "title":
            return (0, 0.0, row.title.casefold())
        case "stock":
            return (0, row.stock, row.sku)
        case "colour":
            return (COLOUR_RANK.get(row.colour or "", 9), 0.0, row.sku)
        case _:
            return (0, 0.0, row.sku)


def _journal_lines(entries: list[Entry], sku: str) -> list[JournalLine]:
    related = {e.subject for e in entries if sku in e.subject.split(":")}
    lines: list[Entry] = []
    for subject in related:
        lines.extend(history(entries, subject))
    return [
        JournalLine(
            id=e.id,
            type=e.type,
            choice=e.choice,
            value=e.value,
            reason=e.reason,
            author=e.author,
            created_at=e.created_at.isoformat(),
        )
        for e in sorted(lines, key=lambda x: (x.created_at, x.id), reverse=True)
    ]


@router.get("/{sku}", summary="Artikel-Detail")
def get_product(
    sku: str, store: StoreDep, entries: EntriesDep, values: ParametersDep, settings: SettingsDep
) -> ProductDetail:
    world = load_world(store, entries, values, settings.reference_date)
    article = world.articles.get(sku)
    if article is None or article.is_set:
        raise HTTPException(404, f"Artikel {sku} gibt es nicht.")
    light = world.lights.get(sku)

    excluded_ids = [case_id for case_id, d in case_decisions(entries).items() if d.choice == "ausschließen"]
    excluded_weeks: set[date] = set()
    if excluded_ids:
        marks = ", ".join("?" for _ in excluded_ids)
        excluded_weeks = {
            w
            for (w,) in store.execute(
                f"SELECT week_start FROM cases WHERE sku = ? AND kind = 'anomaly' AND case_id IN ({marks})",
                [sku, *excluded_ids],
            ).fetchall()
        }
    history_rows = store.execute(
        "SELECT week_start, quantity_direct, quantity_from_sets, quantity_total FROM weekly_sales "
        "WHERE sku = ? ORDER BY week_start",
        [sku],
    ).fetchall()
    sales = [
        SalesWeek(week_start=w, direct=d, from_sets=s, total=t, excluded=w in excluded_weeks)
        for w, d, s, t in history_rows
    ]

    forecast_rows = store.execute(
        "SELECT week_start, forecast_qty, lower_80, upper_80, capped, model FROM forecasts "
        "WHERE sku = ? AND is_best AND week_start >= ? ORDER BY week_start",
        [sku, settings.reference_date],
    ).fetchall()
    forecast = [
        ForecastPoint(week_start=w, quantity=q, lower_80=lo, upper_80=hi, capped=bool(c))
        for w, q, lo, hi, c, _ in forecast_rows
    ]
    selected_model = forecast_rows[0][5] if forecast_rows else None
    chart_start = sales[0].week_start if sales else settings.reference_date
    chart_end = forecast[-1].week_start if forecast else settings.reference_date
    markers = [Marker(date=d, key=k, label=lbl) for d, k, lbl in calendar.markers(chart_start, chart_end)]
    markers.append(Marker(date=settings.reference_date, key="today", label="Heute"))
    markers.sort(key=lambda m: m.date)

    last_year = sales[-52:]
    direct = sum(w.direct for w in last_year)
    via_sets = sum(w.from_sets for w in last_year)
    set_shares = _set_shares(store, sku, via_sets)
    channels = [
        ChannelShare(channel=c, share=s, is_sample=bool(sample))
        for c, s, sample in store.execute(
            "SELECT channel, share, is_sample FROM sample_channel_shares WHERE sku = ? ORDER BY share DESC", [sku]
        ).fetchall()
    ]

    models = _models(store, sku, selected_model)

    row = next((r for r in world.plan.rows if r.sku == sku), None)
    plan_out = build_plan_out(world, entries, parameters.target_week(values)) if row else None
    plan_row = next((r for r in plan_out.rows if r.sku == sku), None) if plan_out else None
    sentence = None
    if plan_out and plan_row:
        sentence = (
            f"Rübert schlägt {format_int(plan_row.quantity)} Tüten vor: Prognosebedarf bis "
            f"KW {plan_out.target_week}/{plan_out.target_year} plus {format_int(world.values['min_stock'])} "
            f"Mindestbestand minus Bestand {format_int(article.stock)} ergibt {format_int(plan_row.net_demand)}, "
            "gerundet im 5.000er-Raster."
        )

    recent, previous = sum(w.total for w in sales[-13:]), sum(w.total for w in sales[-26:-13])
    trend = round((recent - previous) / previous * 100, 1) if previous > 0 else None

    return ProductDetail(
        sku=sku,
        title=article.title,
        brand=article.brand,
        category=article.category,
        turnover_class=article.turnover_class,
        is_special=article.is_special,
        stock=article.stock,
        colour=light.colour if light else None,
        stockout_label=light.stockout_label if light else None,
        stockout_week=light.stockout_week if light else None,
        recommendation=light.recommendation.text if light and light.recommendation else None,
        trend_percent=trend,
        sentence=sentence,
        derivation=plan_row.derivation if plan_row else None,
        quantity=plan_row.quantity if plan_row else None,
        history=sales,
        forecast=forecast,
        selected_model=selected_model,
        markers=markers,
        demand_origin=DemandOrigin(
            direct_units=direct,
            set_units=via_sets,
            set_share=via_sets / (direct + via_sets) if direct + via_sets else 0.0,
            sets=set_shares,
            channels=channels,
            channels_are_sample=any(c.is_sample for c in channels),
        ),
        models=models,
        journal=_journal_lines(entries, sku),
    )


def _set_shares(store: duckdb.DuckDBPyConnection, sku: str, via_sets: float) -> list[SetShare]:
    rows = store.execute(
        """
        SELECT c.set_sku, a.title, c.quantity,
               COALESCE((SELECT sum(w.quantity_total) FROM (
                   SELECT quantity_total FROM weekly_sales WHERE sku = c.set_sku ORDER BY week_start DESC LIMIT 52
               ) w), 0) * c.quantity AS units
        FROM set_components c JOIN articles a ON a.sku = c.set_sku
        WHERE c.component_sku = ? ORDER BY units DESC, c.set_sku
        """,
        [sku],
    ).fetchall()
    return [
        SetShare(
            set_sku=set_sku,
            set_title=title,
            units_per_set=int(per_set),
            units_last_52_weeks=float(units),
            share=float(units) / via_sets if via_sets else 0.0,
        )
        for set_sku, title, per_set, units in rows
    ]


def _models(store: duckdb.DuckDBPyConnection, sku: str, selected: str | None) -> list[ModelRow]:
    rows = store.execute(
        "SELECT model, wape, bias, coverage, cv_samples, is_fallback "
        "FROM forecast_metrics WHERE sku = ? ORDER BY model",
        [sku],
    ).fetchall()
    models = [
        ModelRow(
            model=m,
            selected=m == selected,
            wape=wape if evaluated else None,
            bias=bias if evaluated else None,
            coverage=coverage if evaluated else None,
            evaluated=evaluated,
        )
        for m, wape, bias, coverage, cv, fallback in rows
        for evaluated in [not fallback and cv is not None and cv > 0]
    ]
    return sorted(models, key=lambda r: (not r.selected, r.model))
