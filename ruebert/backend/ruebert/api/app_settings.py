"""Business parameters: read with status and open question, change through the journal."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Path
from pydantic import BaseModel

from ruebert.api.deps import EntriesDep, ParametersDep, SettingsDep
from ruebert.api.errors import FieldValidationError
from ruebert.domain import parameters
from ruebert.journal import current_entries, write_entry

router = APIRouter(prefix="/settings", tags=["settings"])


class ParameterOut(BaseModel):
    key: str
    label: str
    help: str
    unit: str
    value: float
    default: float
    minimum: float
    maximum: float
    status: str  # "bestätigt" or "offen Q-xxx"
    question_id: str | None
    changed_by: str | None
    changed_at: str | None


class ParameterChange(BaseModel):
    value: float
    reason: str | None = None


def _out(definition: parameters.ParameterDef, values: dict[str, parameters.Value], entries: EntriesDep) -> ParameterOut:
    current = current_entries([e for e in entries if e.type == "setting"]).get(f"setting:{definition.key}")
    changed = current if current and current.choice != "zurücksetzen" else None
    return ParameterOut(
        key=definition.key,
        label=definition.label,
        help=definition.help,
        unit=definition.unit,
        value=float(values[definition.key]),
        default=float(definition.default),
        minimum=float(definition.minimum),
        maximum=float(definition.maximum),
        status=f"offen {definition.question_id}" if definition.question_id else "bestätigt",
        question_id=definition.question_id,
        changed_by=changed.author if changed else None,
        changed_at=changed.created_at.isoformat() if changed else None,
    )


@router.get("", summary="Alle Einstellungen mit Status")
def list_settings(values: ParametersDep, entries: EntriesDep) -> list[ParameterOut]:
    return [_out(p, values, entries) for p in parameters.PARAMETERS]


@router.put("/{key}", summary="Einstellung ändern (schreibt ins Journal)")
def change_setting(
    key: Annotated[str, Path()], body: ParameterChange, settings: SettingsDep, entries: EntriesDep
) -> ParameterOut:
    if key not in parameters.BY_KEY:
        raise FieldValidationError("key", f"Unbekannte Einstellung „{key}“.")
    try:
        value = parameters.validate(key, body.value)
    except parameters.InvalidParameterError as error:
        raise FieldValidationError("value", str(error)) from error
    previous = current_entries([e for e in entries if e.type == "setting"]).get(f"setting:{key}")
    write_entry(
        settings.journal_dir,
        type="setting",
        subject=f"setting:{key}",
        choice="ändern",
        value=value,
        reason=body.reason,
        author=settings.journal_author,
        supersedes=previous.id if previous else None,
    )
    return _reload(key, settings)


@router.delete("/{key}", summary="Auf Vorgabe zurücksetzen (neuer Journal-Eintrag)")
def reset_setting(key: Annotated[str, Path()], settings: SettingsDep, entries: EntriesDep) -> ParameterOut:
    if key not in parameters.BY_KEY:
        raise FieldValidationError("key", f"Unbekannte Einstellung „{key}“.")
    previous = current_entries([e for e in entries if e.type == "setting"]).get(f"setting:{key}")
    if previous and previous.choice != "zurücksetzen":
        write_entry(
            settings.journal_dir,
            type="setting",
            subject=f"setting:{key}",
            choice="zurücksetzen",
            author=settings.journal_author,
            supersedes=previous.id,
        )
    return _reload(key, settings)


def _reload(key: str, settings: SettingsDep) -> ParameterOut:
    from ruebert.journal import read_entries, setting_values

    entries = read_entries(settings.journal_dir)
    values = parameters.effective_values(setting_values(entries))
    return _out(parameters.BY_KEY[key], values, entries)
