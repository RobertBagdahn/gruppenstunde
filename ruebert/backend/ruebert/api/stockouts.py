"""Stock-out monitor: detected phases are hypotheses until confirmed (Q-101)."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from ruebert.api.deps import EntriesDep, SettingsDep, StoreDep
from ruebert.api.pagination import Page, PageParams, page_params, paginate
from ruebert.journal import current_entries, read_entries, write_entry

router = APIRouter(prefix="/stockouts", tags=["stockouts"])


class PhaseRow(BaseModel):
    phase_id: str
    sku: str
    start_date: date
    end_date: date | None
    duration_days: int
    shipped_during: int
    status: Literal["offen", "bestätigt", "abgelehnt"]
    question_id: str = "Q-101"


def _phases(store: StoreDep, entries: EntriesDep) -> list[PhaseRow]:
    decided = current_entries([e for e in entries if e.type == "stockout"])
    rows: list[PhaseRow] = []
    for phase_id, sku, start, end, days, shipped in store.execute(
        "SELECT phase_id, sku, start_date, end_date, duration_days, shipped_during FROM stockout_phases "
        "ORDER BY start_date DESC, sku"
    ).fetchall():
        entry = decided.get(f"stockout:{phase_id}")
        status: Literal["offen", "bestätigt", "abgelehnt"] = "offen"
        if entry is not None:
            status = "bestätigt" if entry.choice == "confirm" else "abgelehnt"
        rows.append(PhaseRow(phase_id=phase_id, sku=sku, start_date=start, end_date=end, duration_days=days,
                             shipped_during=shipped, status=status))  # fmt: skip
    return rows


@router.get("", summary="OOS-Monitor: Ausverkaufsphasen")
def list_phases(
    store: StoreDep,
    entries: EntriesDep,
    params: Annotated[PageParams, Depends(page_params)],
    status: Annotated[Literal["offen", "bestätigt", "abgelehnt", "alle"], Query()] = "offen",
) -> Page[PhaseRow]:
    rows = _phases(store, entries)
    if status != "alle":
        rows = [r for r in rows if r.status == status]
    return paginate(rows, params)


class PhaseDecisionIn(BaseModel):
    choice: Literal["bestätigen", "ablehnen"]
    reason: str | None = None


@router.post("/{phase_id}/decision", summary="Phase bestätigen oder ablehnen (Journal)")
def decide_phase(
    phase_id: str, body: PhaseDecisionIn, store: StoreDep, entries: EntriesDep, settings: SettingsDep
) -> PhaseRow:
    if store.execute("SELECT 1 FROM stockout_phases WHERE phase_id = ?", [phase_id]).fetchone() is None:
        raise HTTPException(404, f"Ausverkaufsphase {phase_id} gibt es nicht.")
    previous = current_entries([e for e in entries if e.type == "stockout"]).get(f"stockout:{phase_id}")
    write_entry(
        settings.journal_dir,
        type="stockout",
        subject=f"stockout:{phase_id}",
        choice="confirm" if body.choice == "bestätigen" else "reject",
        reason=body.reason,
        author=settings.journal_author,
        supersedes=previous.id if previous else None,
    )
    fresh = read_entries(settings.journal_dir)
    return next(r for r in _phases(store, fresh) if r.phase_id == phase_id)
