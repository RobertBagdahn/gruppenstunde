"""Fixed catalog of standard kitchen measures.

Display-only reference data for the portion picker: entries are never
persisted as `Portion` rows. Volume-based entries are converted to grams via
the ingredient's physical density (generic 1 g/ml fallback).
"""

from dataclasses import dataclass


@dataclass(frozen=True)
class StandardMeasure:
    key: str
    name: str
    volume_ml: float | None = None
    grams: float | None = None
    unit_name: str = "g"


STANDARD_MEASURES: list[StandardMeasure] = [
    StandardMeasure(key="el", name="1 EL", volume_ml=15),
    StandardMeasure(key="tl", name="1 TL", volume_ml=5),
    StandardMeasure(key="tasse", name="1 Tasse", volume_ml=200),
    StandardMeasure(key="prise", name="1 Prise", grams=0.5),
    StandardMeasure(key="msp", name="1 Msp", grams=0.2),
]
