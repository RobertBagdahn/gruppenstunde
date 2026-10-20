"""Pipeline stages and navigation counters for the top bar and sidebar (analysis-views)."""

from __future__ import annotations

from datetime import UTC, date, datetime, timedelta
from typing import Literal

from fastapi import APIRouter
from pydantic import BaseModel

from ruebert.api.deps import EntriesDep, ParametersDep, SettingsDep, StoreDep
from ruebert.api.traffic_light import open_queue
from ruebert.data.planning import load_world
from ruebert.journal import case_decisions, current_entries

router = APIRouter(prefix="/status", tags=["status"])

STALE_DAYS = 7


class Stage(BaseModel):
    key: str
    label: str
    finished_at: str | None
    status: Literal["ok", "warn", "error"]


class User(BaseModel):
    name: str
    role: str


class StatusOut(BaseModel):
    reference_date: date
    iso_week: int
    stages: list[Stage]
    badges: dict[str, int]
    user: User | None = None


def _iso(value: object) -> str | None:
    if isinstance(value, datetime):
        return (value if value.tzinfo else value.replace(tzinfo=UTC)).isoformat().replace("+00:00", "Z")
    return None


@router.get("", summary="Datenfluss, Stichtag und Zähler für die Navigation")
def get_status(settings: SettingsDep, store: StoreDep, entries: EntriesDep, values: ParametersDep) -> StatusOut:
    reference = settings.reference_date
    last_booking = store.execute("SELECT max(last_booked_at) FROM stock").fetchone()
    last_booked = last_booking[0] if last_booking else None
    stale = last_booked is None or reference - last_booked.date() > timedelta(days=STALE_DAYS)
    build = dict(store.execute("SELECT key, value FROM build_info").fetchall())
    run = store.execute("SELECT run_id, finished_at, status FROM forecast_runs ORDER BY run_id DESC LIMIT 1").fetchone()
    built_at = build.get("built_at")
    stages = [
        Stage(
            key="source",
            label="Altdaten",
            finished_at=_iso(last_booked),
            status="warn" if stale else "ok",
        ),
        Stage(key="import", label="Neuaufbau", finished_at=built_at, status="ok"),
        Stage(
            key="forecast",
            label=f"Forecast #{run[0]}" if run else "Forecast",
            finished_at=_iso(run[1]) if run else None,
            status="ok" if run and run[2] == "success" else "error",
        ),
        Stage(key="traffic_light", label="Ampel", finished_at=built_at, status="ok"),
    ]

    world = load_world(store, entries, values, reference)
    decided_cases = case_decisions(entries)
    open_cases = store.execute("SELECT case_id FROM cases").fetchall()
    decided_phases = current_entries([e for e in entries if e.type == "stockout"])
    phases = store.execute("SELECT phase_id FROM stockout_phases").fetchall()
    suppliers = store.execute("SELECT count(*) FROM sample_suppliers").fetchone()
    badges = {
        "openDecisions": len(open_queue(world)),
        "activeProducts": len([a for a in world.articles.values() if not a.is_set]),
        "openSupplierProposals": int(suppliers[0]) if suppliers else 0,
        "openCases": len([c for (c,) in open_cases if c not in decided_cases]),
        "openStockouts": len([p for (p,) in phases if f"stockout:{p}" not in decided_phases]),
    }
    return StatusOut(
        reference_date=reference,
        iso_week=reference.isocalendar().week,
        stages=stages,
        badges=badges,
        user=User(name=settings.journal_author, role="Prototyp"),
    )
