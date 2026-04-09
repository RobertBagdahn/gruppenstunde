"""Recipe API package — re-exports router for backward compatibility."""

from ninja import Router

from .recipes import router as recipes_router
from .items import router as items_router
from .nutrition import router as nutrition_router

router = Router(tags=["recipes"])
router.add_router("", recipes_router)
router.add_router("", items_router)
router.add_router("", nutrition_router)

__all__ = [
    "router",
]
