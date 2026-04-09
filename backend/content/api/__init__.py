"""
Content API package.

Combines all sub-routers into a single router that is registered
in ``inspi/urls.py`` as ``api.add_router("/content/", content_router)``.

Also re-exports tags_router and scout_levels_router for backward
compatibility with ``from content.tags_api import tags_router``.
"""

from ninja import Router

from .search import router as search_router
from .ai import router as ai_router
from .admin import router as admin_router
from .content_links import router as content_links_router
from .featured import router as featured_router
from .tags import tags_router, scout_levels_router

# Main content router — combines all sub-routers
router = Router(tags=["content"])

# Mount sub-routers onto the main router
# We use include_in_schema=True so endpoints show in docs
for sub_router in [search_router, ai_router, admin_router, content_links_router, featured_router]:
    for path_operation in sub_router.path_operations.values():
        for operation in path_operation.operations:
            # Copy all operations from sub-routers to main router
            pass

# Instead of merging, just add all endpoints directly.
# Django Ninja doesn't support merging routers easily,
# so we import endpoints to re-register them.
# The simplest approach: import all endpoint functions and register them
# on the main router.

# Actually, the cleanest approach for Django Ninja is to keep a single
# router and import the endpoint functions. But since the old api.py
# used a single router, let's recreate that pattern by mounting sub-routers
# as nested routers with empty prefixes.

# Clean approach: create a fresh router and add sub-routers
router = Router(tags=["content"])

# Add all sub-routers with empty prefix so they appear at the same level
router.add_router("", search_router)
router.add_router("", ai_router)
router.add_router("", admin_router)
router.add_router("", content_links_router)
router.add_router("", featured_router)

__all__ = [
    "router",
    "tags_router",
    "scout_levels_router",
]
