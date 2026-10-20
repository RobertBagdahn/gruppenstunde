"""Case inbox: data findings and anomalies are decided in the journal, never deleted (data-cases)."""

from __future__ import annotations

from collections.abc import Sequence
from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, Field

from ruebert.api.deps import EntriesDep, SettingsDep, StoreDep
from ruebert.api.pagination import Page, PageParams, page_params, paginate
from ruebert.journal import case_decisions, read_entries, write_entry

router = APIRouter(prefix="/cases", tags=["cases"])

KIND_LABELS = {
    "anomaly": "Absatz-Ausreißer",
    "bulk_shipping": "Sammelbuchung",
    "fba_bookings": "FBA-Buchung",
    "negative_stock": "Negativer Bestand",
    "missing_forecast": "Ohne Prognose",
}


class CaseRow(BaseModel):
    case_id: str
    kind: str
    kind_label: str
    sku: str
    title: str
    week_start: date | None
    question_id: str | None
    decision: str | None
    decided_by: str | None


class CaseDetail(CaseRow):
    summary: str
    actual_qty: float | None
    expected_qty: float | None
    booking_count: int | None
    options: list[str]
    first_date: date | None
    last_date: date | None
    note: str | None


class CaseDecisionIn(BaseModel):
    choice: str
    reason: str | None = Field(default=None, max_length=500)


def _rows(store: StoreDep, entries: EntriesDep, where: str, params: Sequence[object]) -> list[CaseRow]:
    decided = case_decisions(entries)
    found = store.execute(
        f"SELECT case_id, kind, sku, title, week_start, question_id FROM cases WHERE {where} ORDER BY case_id",
        params,
    ).fetchall()
    rows: list[CaseRow] = []
    for case_id, kind, sku, title, week, question in found:
        entry = decided.get(case_id)
        rows.append(
            CaseRow(
                case_id=case_id,
                kind=kind,
                kind_label=KIND_LABELS.get(kind, kind or "Fall"),
                sku=sku,
                title=title,
                week_start=week,
                question_id=question,
                decision=entry.choice if entry else None,
                decided_by=entry.author if entry else None,
            )
        )
    return rows


@router.get("", summary="Fall-Inbox")
def list_cases(
    store: StoreDep,
    entries: EntriesDep,
    params: Annotated[PageParams, Depends(page_params)],
    status: Annotated[Literal["open", "decided", "all"], Query()] = "open",
    kind: Annotated[str | None, Query()] = None,
) -> Page[CaseRow]:
    where, args = ("kind = ?", [kind]) if kind else ("TRUE", [])
    rows = _rows(store, entries, where, args)
    if status == "open":
        rows = [r for r in rows if r.decision is None]
    elif status == "decided":
        rows = [r for r in rows if r.decision is not None]
    return paginate(rows, params)


@router.get("/{case_id}", summary="Fall-Detail")
def get_case(case_id: str, store: StoreDep, entries: EntriesDep) -> CaseDetail:
    found = store.execute(
        "SELECT summary, actual_qty, expected_qty, booking_count, options, first_date, last_date "
        "FROM cases WHERE case_id = ?",
        [case_id],
    ).fetchone()
    if found is None:
        raise HTTPException(404, f"Fall {case_id} gibt es nicht.")
    row = _rows(store, entries, "case_id = ?", [case_id])[0]
    decision = case_decisions(entries).get(case_id)
    summary, actual, expected, bookings, options, first, last = found
    return CaseDetail(
        **row.model_dump(),
        summary=summary,
        actual_qty=actual,
        expected_qty=expected,
        booking_count=bookings,
        options=list(options),
        first_date=first,
        last_date=last,
        note=decision.reason if decision else None,
    )


@router.post("/{case_id}/decision", summary="Fall entscheiden (schreibt ins Journal, löscht nichts)")
def decide_case(case_id: str, body: CaseDecisionIn, store: StoreDep, settings: SettingsDep) -> CaseRow:
    found = store.execute("SELECT options FROM cases WHERE case_id = ?", [case_id]).fetchone()
    if found is None:
        raise HTTPException(404, f"Fall {case_id} gibt es nicht.")
    if body.choice not in found[0]:
        raise HTTPException(422, f"Erlaubt sind: {', '.join(found[0])}.")
    entries = read_entries(settings.journal_dir)
    previous = case_decisions(entries).get(case_id)
    write_entry(
        settings.journal_dir,
        type="case",
        subject=f"case:{case_id}",
        choice=body.choice,
        reason=body.reason,
        author=settings.journal_author,
        supersedes=previous.id if previous else None,
    )
    return _rows(store, read_entries(settings.journal_dir), "case_id = ?", [case_id])[0]
