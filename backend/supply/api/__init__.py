"""Supply API package — re-exports all routers for backward compatibility."""

from .materials import router  # noqa: F401 — main supply router (materials + measuring units + nutritional tags)
from .ingredients import ingredient_router  # noqa: F401 — ingredient CRUD router
from .retail_sections import retail_section_router  # noqa: F401 — retail section router
from .norm_person import norm_person_router  # noqa: F401 — norm-person calculation router

__all__ = [
    "ingredient_router",
    "norm_person_router",
    "retail_section_router",
    "router",
]
