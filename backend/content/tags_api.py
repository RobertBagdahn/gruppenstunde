"""
Backward-compatibility shim.

Tags and ScoutLevels routers have moved to ``content.api.tags``.
This file re-exports them so existing imports like
``from content.tags_api import tags_router`` still work.
"""

from content.api.tags import tags_router, scout_levels_router  # noqa: F401
