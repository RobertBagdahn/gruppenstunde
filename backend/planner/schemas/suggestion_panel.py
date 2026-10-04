"""Schemas for the meal suggestion panel (16 cards in 4 directions) and the magic wand."""

from __future__ import annotations

from typing import Literal

from ninja import Schema
from pydantic import Field

from .meal_plan import AgeGroup, CookingSource, PlanCooling, PlanSeasonHint, PlanSetting


class SuggestionFilters(Schema):
    taste: Literal["sweet", "savory"] | None = None
    prep: Literal["none", "some"] | None = None
    kids: bool | None = None
    budget: Literal["cheap"] | None = None
    diet: Literal["vegetarian"] | None = None
    with_dessert: bool = False


class SuggestionPanelIn(Schema):
    filters: SuggestionFilters = Field(default_factory=SuggestionFilters)
    seed: int | None = None


class SuggestionCardOut(Schema):
    kind: Literal["recipe", "ingredient"]
    id: int
    title: str
    slug: str = ""
    type_label: str
    reason_text: str = ""
    price_per_person: float | None = None
    recipe_type: str | None = None
    badge: str = "community"
    is_new: bool = False
    portion_id: int | None = None
    measuring_unit_id: int | None = None
    quantity: float | None = None


class SuggestionDirectionOut(Schema):
    key: str
    label: str
    hint: str = ""
    cards: list[SuggestionCardOut] = []


class PlanSuggestionContextOut(Schema):
    age_groups: list[AgeGroup] = []
    age_derived: bool = False
    setting: PlanSetting = ""
    cooking_sources: list[CookingSource] = []
    cooling: PlanCooling = ""
    season_hint: PlanSeasonHint = "mild"
    season_derived: bool = True


class SuggestionPanelOut(Schema):
    meal_type: str
    directions: list[SuggestionDirectionOut]
    total: int
    relaxed_filters: list[str] = []
    missing_context: list[str] = []
    context: PlanSuggestionContextOut
    filters: SuggestionFilters
    ai_used: bool = False
    seed: int | None = None


class MagicWandIn(Schema):
    free_text: str = Field(min_length=2, max_length=300)
    filters: SuggestionFilters = Field(default_factory=SuggestionFilters)
    seed: int | None = None
