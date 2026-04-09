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
    """List all approved root tags with nested children."""
    tags = Tag.objects.filter(parent__isnull=True, is_approved=True).prefetch_related("children")
    return list(tags)


@scout_levels_router.get("/", response=list[ScoutLevelOut])
def list_scout_levels(request):
    """List all scout levels."""
    return list(ScoutLevel.objects.all())
