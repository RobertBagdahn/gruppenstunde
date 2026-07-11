"""Schemas for Gemini-based ingredient enrichment."""

from pydantic import BaseModel, Field


class GeminiNewIngredient(BaseModel):
    """Full ingredient data for creation via Gemini + Grounding.

    Reusable across all flows — extracted from url_import_service.py.
    Name does NOT include Zustandsform (parser handles that separately).
    """

    name: str = Field(description="Canonical German name (ohne Zustandsform)")
    aliases: list[str] = Field(default_factory=list, description="Alternative names")
    energy_kcal: float = Field(0, description="Energy per 100g in kcal")
    protein_g: float = Field(0, description="Protein per 100g")
    fat_g: float = Field(0, description="Fat per 100g")
    fat_sat_g: float | None = Field(None, description="Saturated fat per 100g")
    carbohydrate_g: float = Field(0, description="Carbohydrates per 100g")
    sugar_g: float = Field(0, description="Sugar per 100g")
    fibre_g: float = Field(0, description="Fibre per 100g")
    salt_g: float = Field(0, description="Salt per 100g")
    child_score: int = Field(5, ge=1, le=10, description="Child-friendliness 1-10")
    scout_score: int = Field(5, ge=1, le=10, description="Scout-suitability 1-10")
    environmental_score: int = Field(5, ge=1, le=10, description="Environmental impact 1-10")
    nova_score: int = Field(1, ge=1, le=4, description="NOVA processing level 1-4")
    nutri_score: int | None = Field(None, description="Nutri-Score points")
    nutri_class: int | None = Field(None, ge=1, le=5, description="Nutri-Score class 1=A to 5=E")
    physical_density: float = Field(1.0, description="Density g/ml")
    physical_viscosity: str = Field("solid", description="solid or beverage")
    portion_name: str = Field("Stück", description="Default portion name")
    portion_weight_g: float = Field(100, description="Weight of one portion in grams")
