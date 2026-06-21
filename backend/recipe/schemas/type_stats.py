"""Pydantic schemas for RecipeTypeStats."""

from datetime import datetime
from typing import Optional

from ninja import Schema


class RecipeTypeStatsOut(Schema):
    recipe_type: str
    count: int
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    price_avg: Optional[float] = None
    price_median: Optional[float] = None
    energy_min: Optional[float] = None
    energy_max: Optional[float] = None
    energy_avg: Optional[float] = None
    energy_median: Optional[float] = None
    protein_avg: Optional[float] = None
    fat_avg: Optional[float] = None
    carbs_avg: Optional[float] = None
    weight_min: Optional[float] = None
    weight_max: Optional[float] = None
    weight_avg: Optional[float] = None
    weight_median: Optional[float] = None
    nutri_score_dist: dict = {}
    updated_at: datetime


class RecipeTypeStatsRequest(Schema):
    recipe_type: str
