"""How journal entries act on derived views: case status, settings and orphaned subjects.

Subjects are plain strings with a prefix: ``case:<case id>``, ``quantity:<sku>``, ``order:<sku>``,
``stockout:<sku>:<first date>``, ``setting:<key>``, ``event:<id>``, ``feedback:<id>``.
Nothing here reads the derived store; callers pass the ids that currently exist.
"""

from __future__ import annotations

from collections.abc import Collection
from dataclasses import dataclass

from ruebert.journal.store import Entry, Scalar, current_entries

_CASE_PREFIX = "case:"
_SETTING_PREFIX = "setting:"
_SKU_PREFIXES = ("quantity:", "order:", "stockout:")


@dataclass(frozen=True)
class OrphanedEntry:
    entry: Entry
    reason: str


def case_decisions(entries: list[Entry]) -> dict[str, Entry]:
    """Current decision per case id (the case id without the ``case:`` prefix)."""
    return {
        subject.removeprefix(_CASE_PREFIX): entry
        for subject, entry in current_entries([e for e in entries if e.type == "case"]).items()
        if subject.startswith(_CASE_PREFIX)
    }


def setting_values(entries: list[Entry]) -> dict[str, Scalar]:
    """Current value per setting key; a setting reset to default is recorded as choice ``zurücksetzen``."""
    values: dict[str, Scalar] = {}
    for subject, entry in current_entries([e for e in entries if e.type == "setting"]).items():
        if subject.startswith(_SETTING_PREFIX) and entry.choice != "zurücksetzen":
            values[subject.removeprefix(_SETTING_PREFIX)] = entry.value
    return values


def find_orphans(entries: list[Entry], *, case_ids: Collection[str], skus: Collection[str]) -> list[OrphanedEntry]:
    """Entries whose case or article no longer exists after a rebuild. They are kept, never deleted."""
    orphans: list[OrphanedEntry] = []
    for entry in entries:
        if entry.subject.startswith(_CASE_PREFIX):
            if entry.subject.removeprefix(_CASE_PREFIX) not in case_ids:
                orphans.append(OrphanedEntry(entry, "Der Fall wird beim Neuaufbau nicht mehr erzeugt."))
        elif entry.subject.startswith(_SKU_PREFIXES):
            sku = entry.subject.split(":")[1]
            if sku not in skus:
                orphans.append(OrphanedEntry(entry, f"Der Artikel {sku} existiert im Datenstand nicht mehr."))
    return orphans
