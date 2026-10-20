"""Forecast quality, sets and bundles, data and runs (analysis-views)."""

from __future__ import annotations

import json
from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ruebert.api.deps import EntriesDep, SettingsDep, StoreDep
from ruebert.api.pagination import Page, PageParams, page_params, paginate
from ruebert.data.build import report_path_for
from ruebert.journal import find_orphans, read_entries
from ruebert.journal.views import OrphanedEntry

router = APIRouter(tags=["analysis"])


class ModelQuality(BaseModel):
    model: str
    articles_evaluated: int
    articles_not_evaluated: int
    wape_mean: float | None
    bias_mean: float | None
    coverage_mean: float | None


class WorstArticle(BaseModel):
    sku: str
    title: str
    model: str
    wape: float


class QualityOut(BaseModel):
    models: list[ModelQuality]
    worst: list[WorstArticle]


class SetRow(BaseModel):
    set_sku: str
    title: str
    components: int
    units_bound_52_weeks: float


class ComponentOut(BaseModel):
    sku: str
    title: str
    quantity: int
    share_from_set: float


class SetDetail(SetRow):
    components_detail: list[ComponentOut]


class RunOut(BaseModel):
    run_id: int
    started_at: str | None
    finished_at: str | None
    status: str | None
    sku_count: int | None
    model_counts: str | None
    is_current: bool


class DataOut(BaseModel):
    source_path: str
    source_last_booking: str | None
    last_rebuild: str | None
    checksum: str | None
    source_sha256: str | None
    reference_date: str
    real_date: str
    time_machine: bool
    runs: list[RunOut]
    comparison: dict[str, object] | None
    orphans: list[dict[str, str]]


@router.get("/forecast-quality", summary="Prognosegüte je Modell (Lauf 25)")
def forecast_quality(store: StoreDep) -> QualityOut:
    rows = store.execute(
        "SELECT model, sku, wape, bias, coverage, cv_samples, is_fallback FROM forecast_metrics ORDER BY model, sku"
    ).fetchall()
    by_model: dict[str, list[tuple[str, float, float, float]]] = {}
    not_evaluated: dict[str, int] = {}
    for model, sku, wape, bias, coverage, cv, fallback in rows:
        if fallback or not cv or wape is None:
            not_evaluated[model] = not_evaluated.get(model, 0) + 1
            continue
        by_model.setdefault(model, []).append((sku, float(wape), float(bias or 0), float(coverage or 0)))
    models = sorted(set(by_model) | set(not_evaluated))
    summary: list[ModelQuality] = []
    for m in models:
        values = by_model.get(m, [])
        n = len(values)
        summary.append(
            ModelQuality(
                model=m,
                articles_evaluated=n,
                articles_not_evaluated=not_evaluated.get(m, 0),
                wape_mean=sum(v[1] for v in values) / n if n else None,
                bias_mean=sum(v[2] for v in values) / n if n else None,
                coverage_mean=sum(v[3] for v in values) / n if n else None,
            )
        )
    chosen: list[tuple[str]] = store.execute("SELECT DISTINCT model FROM forecasts WHERE is_best").fetchall()
    worst_rows = store.execute(
        """
        SELECT m.sku, a.title, m.model, m.wape FROM forecast_metrics m JOIN articles a USING (sku)
        WHERE m.model = ? AND m.wape IS NOT NULL AND NOT m.is_fallback AND m.cv_samples > 0
        ORDER BY m.wape DESC, m.sku LIMIT 10
        """,
        [chosen[0][0] if chosen else "MSTL"],
    ).fetchall()
    return QualityOut(
        models=summary,
        worst=[WorstArticle(sku=str(s), title=str(t), model=str(m), wape=float(w)) for s, t, m, w in worst_rows],
    )


_BOUND_SQL = """
    SELECT c.set_sku, sum(COALESCE(w.units, 0) * c.quantity) AS bound
    FROM set_components c
    LEFT JOIN (
        SELECT sku, sum(quantity_total) AS units FROM weekly_sales
        WHERE week_start >= (SELECT max(week_start) FROM weekly_sales) - INTERVAL 364 DAY GROUP BY sku
    ) w ON w.sku = c.component_sku
    GROUP BY c.set_sku
"""


def _bound_by_set(store: StoreDep) -> dict[str, float]:
    """Component units bound by each set: component sales of the last 52 weeks × quantity per set."""
    return {sku: float(bound or 0) for sku, bound in store.execute(_BOUND_SQL).fetchall()}


@router.get("/sets", summary="Sets und Bundles, nach gebundenen Komponenten-Einheiten sortiert")
def list_sets(store: StoreDep, params: Annotated[PageParams, Depends(page_params)]) -> Page[SetRow]:
    counts = dict(store.execute("SELECT set_sku, count(*) FROM set_components GROUP BY set_sku").fetchall())
    bound = _bound_by_set(store)
    titles = dict(store.execute("SELECT sku, title FROM articles WHERE is_set").fetchall())
    items = [
        SetRow(
            set_sku=sku, title=titles[sku], components=int(counts.get(sku, 0)), units_bound_52_weeks=bound.get(sku, 0.0)
        )
        for sku in sorted(titles, key=lambda k: (-bound.get(k, 0.0), k))
    ]
    return paginate(items, params)


@router.get("/sets/{set_sku}", summary="Set mit Komponenten und Anteil am Komponenten-Absatz")
def get_set(set_sku: str, store: StoreDep) -> SetDetail:
    head = store.execute("SELECT title FROM articles WHERE sku = ? AND is_set", [set_sku]).fetchone()
    if head is None:
        raise HTTPException(404, f"Set {set_sku} gibt es nicht.")
    comps = store.execute(
        """
        SELECT c.component_sku, a.title, c.quantity,
               COALESCE((SELECT sum(quantity_from_sets) FROM weekly_sales WHERE sku = c.component_sku), 0),
               COALESCE((SELECT sum(quantity_total) FROM weekly_sales WHERE sku = c.component_sku), 0)
        FROM set_components c JOIN articles a ON a.sku = c.component_sku
        WHERE c.set_sku = ? ORDER BY c.component_sku
        """,
        [set_sku],
    ).fetchall()
    detail: list[ComponentOut] = []
    for sku, title, qty, from_sets, total in comps:
        share = float(from_sets) / float(total) if total else 0.0
        detail.append(ComponentOut(sku=sku, title=title, quantity=int(qty), share_from_set=share))
    return SetDetail(
        set_sku=set_sku,
        title=head[0],
        components=len(detail),
        units_bound_52_weeks=_bound_by_set(store).get(set_sku, 0.0),
        components_detail=detail,
    )


@router.get("/runs", summary="Daten & Läufe: Quelle, Neuaufbau, Prognoseläufe, Vergleich, verwaiste Einträge")
def data_and_runs(store: StoreDep, entries: EntriesDep, settings: SettingsDep) -> DataOut:

    build = dict(store.execute("SELECT key, value FROM build_info").fetchall())
    last_booked = store.execute("SELECT max(last_booked_at) FROM stock").fetchone()
    runs = store.execute(
        "SELECT run_id, started_at, finished_at, status, sku_count, model_counts "
        "FROM forecast_runs ORDER BY run_id DESC"
    ).fetchall()
    report_file = report_path_for(settings.derived_db_path)
    comparison = (
        json.loads(report_file.read_text(encoding="utf-8")).get("comparison") if report_file.is_file() else None
    )
    case_ids = {c for (c,) in store.execute("SELECT case_id FROM cases").fetchall()}
    skus = {s for (s,) in store.execute("SELECT sku FROM articles").fetchall()}
    orphans: list[OrphanedEntry] = find_orphans(read_entries(settings.journal_dir), case_ids=case_ids, skus=skus)
    real: date = date.today()
    return DataOut(
        source_path=build.get("source_path", str(settings.v1_duckdb_path)),
        source_last_booking=last_booked[0].isoformat() if last_booked and last_booked[0] else None,
        last_rebuild=build.get("built_at"),
        checksum=build.get("content_checksum"),
        source_sha256=build.get("source_sha256"),
        reference_date=settings.reference_date.isoformat(),
        real_date=real.isoformat(),
        time_machine=real != settings.reference_date,
        runs=[
            RunOut(
                run_id=r[0],
                started_at=r[1].isoformat() if r[1] else None,
                finished_at=r[2].isoformat() if r[2] else None,
                status=r[3],
                sku_count=r[4],
                model_counts=r[5],
                is_current=i == 0,
            )
            for i, r in enumerate(runs)
        ],
        comparison=comparison,
        orphans=[{"id": o.entry.id, "subject": o.entry.subject, "reason": o.reason} for o in orphans],
    )
