"""Derivation: the one structure that explains a number, shared by sentences, waterfall charts and tests."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date


def format_int(value: float | int) -> str:
    """15000 → "15.000"; half away from zero."""
    rounded = int(abs(value) + 0.5) * (1 if value >= 0 else -1)
    return f"{rounded:,}".replace(",", ".")


def week_label(value: date) -> str:
    """date(2026, 7, 20) → "KW 30/2026"."""
    year, week, _ = value.isocalendar()
    return f"KW {week}/{year}"


@dataclass(frozen=True)
class DerivationStep:
    """One line of a derivation. `delta` moves the running value (waterfall bar); `value` is the result."""

    key: str
    label: str
    delta: float
    value: float
    note: str = ""
    question_id: str | None = None


@dataclass(frozen=True)
class Derivation:
    steps: tuple[DerivationStep, ...]

    @property
    def result(self) -> float:
        return self.steps[-1].value if self.steps else 0.0

    def extended(self, step: DerivationStep) -> Derivation:
        return Derivation((*self.steps, step))
