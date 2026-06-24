"""Pydantic schemas for RecipeTypeStats."""

from datetime import datetime

from ninja import Schema


class BucketOut(Schema):
    """Histogram bucket with min, max, and count."""

    min: float
    max: float
    count: int


class RecipeTypeStatsOut(Schema):
    recipe_type: str
    count: int
    price_min: float | None = None
    price_max: float | None = None
    price_avg: float | None = None
    price_median: float | None = None
    energy_min: float | None = None
    energy_max: float | None = None
    energy_avg: float | None = None
    energy_median: float | None = None
    protein_avg: float | None = None
    fat_avg: float | None = None
    carbs_avg: float | None = None
    weight_min: float | None = None
    weight_max: float | None = None
    weight_avg: float | None = None
    weight_median: float | None = None
    nutri_score_dist: dict = {}
    price_buckets: list[BucketOut] = []
    energy_buckets: list[BucketOut] = []
    protein_buckets: list[BucketOut] = []
    updated_at: datetime


class RecipeTypeStatsRequest(Schema):
    recipe_type: str


# Backward compatibility alias for frontend schema sync
BucketSchema = BucketOut
