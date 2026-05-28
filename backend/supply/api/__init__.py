"""Supply API package — re-exports all routers for backward compatibility."""

from .materials import router  # noqa: F401 — main supply router (materials + measuring units)
from .ingredients import ingredient_router  # noqa: F401 — ingredient CRUD router
from .nutritional_tags import nutritional_tag_router  # noqa: F401 — nutritional tag CRUD router
from .retail_sections import retail_section_router  # noqa: F401 — retail section router
from .norm_person import norm_person_router  # noqa: F401 — norm-person calculation router
from .dge_references import dge_reference_router  # noqa: F401 — DGE reference values router
from .unit_conversions import unit_conversion_router  # noqa: F401 — unit conversion router

__all__ = [
    "dge_reference_router",
    "ingredient_router",
    "norm_person_router",
    "nutritional_tag_router",
    "retail_section_router",
    "router",
    "unit_conversion_router",
]
