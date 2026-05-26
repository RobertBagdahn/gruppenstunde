"""Pydantic models for YAML-based registration PDF configuration."""

from __future__ import annotations

import datetime
from pathlib import Path
from typing import Union

import yaml
from pydantic import BaseModel, Field, field_validator, model_validator


class EventConfig(BaseModel):
    name: str
    type: str = "default"
    location: str = ""
    area: str = ""
    theme: str | None = None
    start_date: datetime.date
    start_time: str | None = None
    end_date: datetime.date
    end_time: str | None = None
    meeting_point: str
    return_point: str | None = None
    fee: float
    fee_note: str | None = None
    registration_deadline: datetime.date
    registration_method: str = ""

    @model_validator(mode="after")
    def set_return_point_default(self) -> "EventConfig":
        if self.return_point is None:
            self.return_point = self.meeting_point
        return self


class GroupConfig(BaseModel):
    name: str = ""
    logo: str = "assets/logos/stamm_logo.png"


class ParticipantsConfig(BaseModel):
    type: str = "Pfadfinder"


class TextsConfig(BaseModel):
    greeting: str = "default"
    additional_info: str = "default"
    consent: str = "default"


class LayoutConfig(BaseModel):
    pages: int = Field(default=1, ge=1, le=4)


class FormFieldConfig(BaseModel):
    type: str  # text_line, checkboxes, text_area
    label: str
    same_line_with: str | None = None
    options: list[str] | None = None
    has_other: bool = False
    other_label: str = "sonstiges"
    lines: int = 1


class RegistrationConfig(BaseModel):
    event: EventConfig
    group: GroupConfig = GroupConfig()
    participants: ParticipantsConfig = ParticipantsConfig()
    texts: TextsConfig = TextsConfig()
    layout: LayoutConfig = LayoutConfig()
    packlist: Union[str, list[str]] = "wanderung"
    packlist_extra: list[str] = Field(default_factory=list)
    form_fields: Union[str, list[FormFieldConfig]] = "standard"
    consent: str = "default"
    signup_note: str = ""


def load_defaults(base_dir: Path) -> dict:
    """Load all default preset files from the defaults/ directory."""
    defaults_dir = base_dir / "defaults"
    result: dict = {}
    for yaml_file in defaults_dir.glob("*.yaml"):
        with open(yaml_file, "r", encoding="utf-8") as f:
            result[yaml_file.stem] = yaml.safe_load(f)
    return result


def resolve_packlist(
    value: Union[str, list[str]],
    extra: list[str],
    defaults: dict,
) -> list[str]:
    """Resolve packlist from preset key or inline list."""
    if isinstance(value, list):
        return value + extra

    presets = defaults.get("packlists", {})
    if value not in presets:
        available = ", ".join(sorted(presets.keys()))
        raise ValueError(
            f"Unbekannter Packlisten-Preset: '{value}'. "
            f"Verfügbare Presets: {available}"
        )
    return presets[value] + extra


def resolve_form_fields(
    value: Union[str, list[FormFieldConfig]],
    defaults: dict,
) -> list[FormFieldConfig]:
    """Resolve form fields from preset key or inline list."""
    if isinstance(value, list):
        return value

    presets = defaults.get("form_fields", {})
    if value not in presets:
        available = ", ".join(sorted(presets.keys()))
        raise ValueError(
            f"Unbekannter Formularfeld-Preset: '{value}'. "
            f"Verfügbare Presets: {available}"
        )
    return [FormFieldConfig(**field) for field in presets[value]]


def load_config(yaml_path: Path, base_dir: Path) -> RegistrationConfig:
    """Load and validate a registration YAML config file."""
    if not yaml_path.exists():
        raise FileNotFoundError(f"Datei nicht gefunden: {yaml_path}")

    with open(yaml_path, "r", encoding="utf-8") as f:
        raw = yaml.safe_load(f)

    if not isinstance(raw, dict):
        raise ValueError("YAML-Datei muss ein Dictionary sein")

    try:
        config = RegistrationConfig(**raw)
    except Exception as e:
        raise ValueError(f"YAML-Validierungsfehler: {e}") from e

    # Validate logo path
    logo_path = base_dir / config.group.logo
    if not logo_path.exists():
        raise FileNotFoundError(f"Datei nicht gefunden: {logo_path}")

    return config
