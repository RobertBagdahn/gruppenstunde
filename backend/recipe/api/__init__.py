"""Recipe API package — re-exports router for backward compatibility."""

from ninja import Router

from .recipes import router as recipes_router
from .items import router as items_router
from .nutrition import router as nutrition_router
from .folders import folder_router
from .type_stats import router as type_stats_router

router = Router(tags=["recipes"])
router.add_router("", recipes_router)
router.add_router("", items_router)
router.add_router("", nutrition_router)
router.add_router("", type_stats_router)

__all__ = [
    "folder_router",
    "router",
]
