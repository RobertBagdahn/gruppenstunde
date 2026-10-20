"""Journal storage: one YAML file per entry, written atomically, never modified or deleted here.

Layout: ``<journal_dir>/<type>/<YYYY-MM-DD>T<HHMMSS>-<short id>.yaml``. The file stem is the entry id.
The current state of a subject is the newest entry; ``supersedes`` names the entry it replaces.
"""

from __future__ import annotations

import contextlib
import logging
import os
import uuid
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any, Final, Literal, get_args

import yaml
from pydantic import BaseModel, ConfigDict, ValidationError

logger = logging.getLogger(__name__)

EntryType = Literal["case", "quantity", "order", "setting", "stockout", "event", "feedback"]
ENTRY_TYPES: Final[tuple[str, ...]] = get_args(EntryType)

Scalar = str | int | float | bool | None


class JournalError(RuntimeError):
    """The journal cannot be read; the message is German and names the file."""


class JournalWriteError(JournalError):
    """An entry could not be written; the decision must not be shown as done."""


class Entry(BaseModel):
    """One human decision. `id` is the file stem and is not stored inside the file."""

    model_config = ConfigDict(frozen=True)

    id: str
    type: EntryType
    subject: str
    choice: str
    value: Scalar = None
    reason: str | None = None
    details: dict[str, Any] | None = None  # structured payload, e.g. every quantity of an approved plan
    author: str
    created_at: datetime
    supersedes: str | None = None
    is_sample: bool = False

    def value_date(self) -> date:
        """The date an event entry refers to (stored as ISO text in `value`)."""
        return date.fromisoformat(str(self.value))


def write_entry(
    journal_dir: Path,
    *,
    type: EntryType,
    subject: str,
    choice: str,
    author: str,
    value: Scalar = None,
    reason: str | None = None,
    details: dict[str, Any] | None = None,
    supersedes: str | None = None,
    is_sample: bool = False,
    now: datetime | None = None,
) -> Entry:
    """Write a new entry atomically (temporary file, then rename) and return it."""
    created_at = (now or datetime.now(UTC)).replace(microsecond=0)
    entry_id = f"{created_at:%Y-%m-%dT%H%M%S}-{uuid.uuid4().hex[:8]}"
    entry = Entry(
        id=entry_id,
        type=type,
        subject=subject,
        choice=choice,
        value=value,
        reason=reason,
        details=details,
        author=author,
        created_at=created_at,
        supersedes=supersedes,
        is_sample=is_sample,
    )
    target = journal_dir / type / f"{entry_id}.yaml"
    temporary = target.with_name(f".{target.name}.tmp")
    document = entry.model_dump(mode="json", exclude={"id"}, exclude_none=True)
    try:
        target.parent.mkdir(parents=True, exist_ok=True)
        temporary.write_text(
            yaml.safe_dump(document, allow_unicode=True, sort_keys=False),
            encoding="utf-8",
        )
        os.replace(temporary, target)
    except OSError as error:
        with contextlib.suppress(OSError):
            temporary.unlink(missing_ok=True)
        logger.exception("Journal entry could not be written: %s", target)
        raise JournalWriteError(
            "Die Entscheidung konnte nicht gespeichert werden. Bitte Schreibrechte für den Journal-Ordner prüfen."
        ) from error
    return entry


def read_entries(journal_dir: Path) -> list[Entry]:
    """All entries, oldest first. Unreadable files raise `JournalError` naming the file."""
    entries: list[Entry] = []
    for path in sorted(journal_dir.glob("*/*.yaml")):
        if path.parent.name not in ENTRY_TYPES:
            continue
        try:
            document = yaml.safe_load(path.read_text(encoding="utf-8"))
            if not isinstance(document, dict):
                raise ValueError("kein Mapping")
            entries.append(Entry(id=path.stem, **document))  # pyright: ignore[reportUnknownArgumentType]
        except (OSError, yaml.YAMLError, ValueError, TypeError, ValidationError) as error:
            raise JournalError(f"Journal-Eintrag {path.parent.name}/{path.name} ist nicht lesbar.") from error
    return ordered(entries)


def ordered(entries: list[Entry]) -> list[Entry]:
    """Oldest first. Within one second a superseding entry sorts after the entry it replaces."""
    by_id = {e.id: e for e in entries}

    def depth(entry: Entry) -> int:
        count, seen = 0, set[str]()
        while entry.supersedes in by_id and entry.supersedes not in seen:
            seen.add(entry.supersedes)
            entry = by_id[entry.supersedes]
            count += 1
        return count

    return sorted(entries, key=lambda e: (e.created_at, depth(e), e.id))


def current_entries(entries: list[Entry]) -> dict[str, Entry]:
    """Current entry per subject: not superseded by another entry, and newest among those."""
    superseded = {e.supersedes for e in entries if e.supersedes}
    by_subject: dict[str, Entry] = {}
    for entry in ordered(entries):
        if entry.id not in superseded:
            by_subject[entry.subject] = entry
    return by_subject


def history(entries: list[Entry], subject: str) -> list[Entry]:
    """All entries of one subject, newest first."""
    return [e for e in reversed(ordered(entries)) if e.subject == subject]
