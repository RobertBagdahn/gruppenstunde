"""Supply schemas package — re-exports all schemas for backward compatibility."""

from .materials import (
    ContentMaterialItemIn,
    ContentMaterialItemOut,
    MaterialCreateIn,
    MaterialListOut,
    MaterialOut,
    MaterialUpdateIn,
    PaginatedMaterialOut,
)
from .reference import (
    MeasuringUnitOut,
    NutritionalTagOut,
    RetailSectionOut,
)
from .ingredients import (
    AliasCreateIn,
    IngredientAliasOut,
    IngredientCreateIn,
    IngredientDetailOut,
    IngredientListOut,
    IngredientUpdateIn,
    PaginatedIngredientOut,
    PortionCreateIn,
    PortionOut,
    PortionUpdateIn,
)
from .norm_person import (
    DgeReferencePointOut,
    NormPersonCurvePointOut,
    NormPersonCurvesOut,
    NormPersonReferenceOut,
    NormPersonResultOut,
)

__all__ = [
    "AliasCreateIn",
    "ContentMaterialItemIn",
    "ContentMaterialItemOut",
    "DgeReferencePointOut",
    "IngredientAliasOut",
    "IngredientCreateIn",
    "IngredientDetailOut",
    "IngredientListOut",
    "IngredientUpdateIn",
    "MaterialCreateIn",
    "MaterialListOut",
    "MaterialOut",
    "MaterialUpdateIn",
    "MeasuringUnitOut",
    "NormPersonCurvePointOut",
    "NormPersonCurvesOut",
    "NormPersonReferenceOut",
    "NormPersonResultOut",
    "NutritionalTagOut",
    "PaginatedIngredientOut",
    "PaginatedMaterialOut",
    "PortionCreateIn",
    "PortionOut",
    "PortionUpdateIn",
    "RetailSectionOut",
]
