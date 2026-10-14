"""Contracts for human review of AI-derived recipe ingredients."""

from typing import Any, Literal

from pydantic import BaseModel, Field

from .import_schemas import RecipeDraftOut

ReviewStatus = Literal["open", "changed", "confirmed", "unresolved"]
SourceType = Literal["url", "text"]


class RecipeImportSourceIn(BaseModel):
    """A source submitted for a combined recipe analysis."""

    type: SourceType
    value: str = Field(min_length=1, max_length=20_000)


class ReviewSourceOut(BaseModel):
    """Source reference retained for one extracted ingredient row."""

    type: SourceType
    label: str
    value: str


class IngredientMatchCandidateOut(BaseModel):
    id: int
    name: str
    slug: str = ""
    confidence: float = Field(ge=0, le=1)


class ReviewTechnicalDetailsOut(BaseModel):
    method: str
    confidence: float = Field(ge=0, le=1)
    candidates: list[IngredientMatchCandidateOut] = Field(default_factory=list)


class ReviewPortionOut(BaseModel):
    id: int | None = None
    name: str
    quantity: float = Field(gt=0)
    weight_g: float | None = Field(default=None, gt=0)
    measuring_unit_id: int | None = None
    measuring_unit_name: str | None = None
    is_new: bool = False


class TemporaryIngredientDraftOut(BaseModel):
    """Complete ingredient data shown in the existing ingredient editor."""

    name: str
    description: str = ""
    status: str = "draft"
    values: dict[str, Any] = Field(default_factory=dict)
    portions: list[ReviewPortionOut] = Field(default_factory=list)
    quantity: float | None = Field(default=None, gt=0, description="Suggested portion count from the import")


class IngredientDraftRequestIn(BaseModel):
    """'Zutat anlegen' for one review row: the source line and its parsed amount."""

    source_text: str = Field(min_length=1, max_length=500)
    quantity: float | None = Field(default=None, gt=0)
    unit: str = Field(default="", max_length=40)


class IngredientDraftOut(BaseModel):
    """AI-enriched draft for a new ingredient plus existing ingredients it may duplicate."""

    draft: TemporaryIngredientDraftOut
    duplicates: list[IngredientMatchCandidateOut] = Field(default_factory=list)
    # False when the AI enrichment was unavailable: only name and amount are filled.
    is_enriched: bool = True


class IngredientReviewRowOut(BaseModel):
    """One immutable source row plus the current human-review proposal."""

    key: str
    source_text: str
    sources: list[ReviewSourceOut] = Field(default_factory=list)
    selected_ingredient_id: int | None = None
    selected_ingredient_slug: str = ""
    selected_ingredient_name: str = ""
    suggested_ingredient_id: int | None = None
    suggested_ingredient_name: str = ""
    candidates: list[IngredientMatchCandidateOut] = Field(default_factory=list)
    selected_portion: ReviewPortionOut | None = None
    suggested_portion: ReviewPortionOut | None = None
    quantity: float | None = Field(default=None, gt=0)
    suggested_quantity: float | None = Field(default=None, gt=0)
    # The amount is a default for "nach Belieben" (e.g. 1 Prise), not from the source.
    quantity_estimated: bool = False
    # Original line when one source line was split into several rows ("Salz und Pfeffer").
    source_line: str = ""
    # Query the matcher searched for; sent back on save so confirmed choices are learned.
    match_query: str = ""
    reason: str = ""
    # Addition dropped by the matcher ("mit Kohlensäure"); shown so the user can judge the match.
    note: str = ""
    technical_details: ReviewTechnicalDetailsOut | None = None
    conflicts: list[str] = Field(default_factory=list)
    new_ingredient_draft: TemporaryIngredientDraftOut | None = None
    status: ReviewStatus = "open"


class IngredientReviewPreviewOut(BaseModel):
    """Common preview response for imports and existing-recipe AI actions."""

    rows: list[IngredientReviewRowOut] = Field(default_factory=list)
    sources: list[ReviewSourceOut] = Field(default_factory=list)
    ai_interaction_id: str | None = None
    recipe_draft: RecipeDraftOut
    # True when the page was unreachable and the data was reconstructed via
    # search grounding. The UI must ask the user to verify it.
    is_reconstructed: bool = False


class IngredientReviewRowIn(BaseModel):
    """Confirmed client-side state sent for final persistence."""

    key: str
    status: Literal["confirmed"]
    selected_ingredient_id: int | None = None
    selected_portion_id: int | None = None
    quantity: float = Field(gt=0)
    temporary_ingredient: TemporaryIngredientDraftOut | None = None
    match_query: str = Field(default="", max_length=255)


class IngredientReviewFinalizeIn(BaseModel):
    rows: list[IngredientReviewRowIn] = Field(min_length=1)


class ReviewFieldErrorOut(BaseModel):
    path: str
    message: str


class IngredientReviewErrorOut(BaseModel):
    message: str
    fields: list[ReviewFieldErrorOut] = Field(default_factory=list)
