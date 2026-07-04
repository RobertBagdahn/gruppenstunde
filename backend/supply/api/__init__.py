"""Supply API package — re-exports all routers for backward compatibility."""

from .breakfast_catalog import breakfast_catalog_router
from .breakfast_days import breakfast_days_router
from .dge_references import dge_reference_router
from .ingredient_groups import ingredient_group_router
from .ingredient_statistics import ingredient_statistics_router
from .ingredients import ingredient_router
from .materials import router
from .norm_person import norm_person_router
from .nutritional_tags import nutritional_tag_router
from .retail_sections import retail_section_router
from .unit_conversions import unit_conversion_router

__all__ = [
    "breakfast_catalog_router",
    "breakfast_days_router",
    "dge_reference_router",
    "ingredient_group_router",
    "ingredient_router",
    "ingredient_statistics_router",
    "norm_person_router",
    "nutritional_tag_router",
    "retail_section_router",
    "router",
    "unit_conversion_router",
]
