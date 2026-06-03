"""
Content API — Tags & ScoutLevels endpoints.

Previously in tags_api.py as standalone routers.
"""

from ninja import Router

from content.models import ScoutLevel, Tag
from content.schemas.base import ScoutLevelOut, TagOut

tags_router = Router(tags=["tags"])
scout_levels_router = Router(tags=["scout-levels"])


@tags_router.get("/", response=list[TagOut])
def list_tags(request):
    """List all approved tags (flat list)."""
    tags = Tag.objects.filter(is_approved=True)
    return list(tags)


@scout_levels_router.get("/", response=list[ScoutLevelOut])
def list_scout_levels(request):
    """List all scout levels."""
    return list(ScoutLevel.objects.all())
