"""Events timeline: calendar markers, example events (marked as sample) and events added by people (journal)."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Query
from pydantic import BaseModel, Field

from ruebert.api.deps import EntriesDep, SettingsDep, StoreDep
from ruebert.domain import calendar
from ruebert.journal import write_entry

router = APIRouter(prefix="/events", tags=["events"])


class EventOut(BaseModel):
    id: str
    date: date
    kind: str
    title: str
    sku: str | None
    source: Literal["kalender", "beispiel", "journal"]
    is_sample: bool


class EventIn(BaseModel):
    date: date
    kind: str = Field(min_length=1, max_length=40)
    title: str = Field(min_length=1, max_length=200)
    sku: str | None = None


@router.get("", summary="Ereignisse im Zeitraum")
def list_events(
    store: StoreDep,
    entries: EntriesDep,
    settings: SettingsDep,
    start: Annotated[date | None, Query()] = None,
    end: Annotated[date | None, Query()] = None,
) -> list[EventOut]:
    start = start or date(settings.reference_date.year - 1, 1, 1)
    end = end or date(settings.reference_date.year + 1, 12, 31)
    out = [
        EventOut(
            id=f"cal:{key}:{d.isoformat()}",
            date=d,
            kind="Kalender",
            title=label,
            sku=None,
            source="kalender",
            is_sample=False,
        )
        for d, key, label in calendar.markers(start, end)
    ]
    out += [
        EventOut(id=eid, date=d, kind=kind, title=title, sku=sku, source="beispiel", is_sample=True)
        for eid, d, kind, title, sku in store.execute(
            "SELECT event_id, event_date, kind, title, sku FROM sample_events WHERE event_date BETWEEN ? AND ?",
            [start, end],
        ).fetchall()
    ]
    out += [
        EventOut(
            id=e.id,
            date=e.value_date(),
            kind=e.choice,
            title=e.reason or "",
            sku=e.subject.removeprefix("event:") or None,
            source="journal",
            is_sample=e.is_sample,
        )
        for e in entries
        if e.type == "event" and start <= e.value_date() <= end
    ]
    return sorted(out, key=lambda x: (x.date, x.id))


@router.post("", status_code=201, summary="Ereignis hinzufügen (Journal)")
def add_event(body: EventIn, settings: SettingsDep) -> EventOut:
    entry = write_entry(
        settings.journal_dir,
        type="event",
        subject=f"event:{body.sku or 'allgemein'}",
        choice=body.kind,
        value=body.date.isoformat(),
        reason=body.title,
        author=settings.journal_author,
    )
    return EventOut(
        id=entry.id, date=body.date, kind=body.kind, title=body.title, sku=body.sku, source="journal", is_sample=False
    )
