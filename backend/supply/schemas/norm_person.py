"""Pydantic schemas for norm-person calculation endpoints."""

from ninja import Schema


class NormPersonResultOut(Schema):
    """Single norm-person calculation result."""

    bmr: float
    tdee: float
    norm_factor: float
    weight_kg: float
    height_cm: float
    age: int
    gender: str
    pal: float
    dge_reference: dict[str, float] | None = None


class NormPersonCurvePointOut(Schema):
    """Single data point in a norm-person curve (one age, both genders)."""

    age: int
    male_tdee: float
    female_tdee: float
    male_norm_factor: float
    female_norm_factor: float


class NormPersonReferenceOut(Schema):
    """Reference norm-person definition."""

    age: int
    gender: str
    pal: float
    tdee: float
    norm_factor: float


class DgeReferencePointOut(Schema):
    """Single DGE reference data point (one age group, one gender)."""

    age_min: int
    age_max: int
    gender: str
    energy_kj: float
    protein_g: float
    fat_g: float
    carbohydrate_g: float
    fibre_g: float


class NormPersonCurvesOut(Schema):
    """Full curve data for graph rendering (ages 0-99, both genders)."""

    pal: float
    reference: NormPersonReferenceOut
    data_points: list[NormPersonCurvePointOut]
    dge_reference: list[DgeReferencePointOut] = []
