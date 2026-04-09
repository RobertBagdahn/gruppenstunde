"""
Content API — Featured content endpoints.
"""

from datetime import date

from django.contrib.contenttypes.models import ContentType
from ninja import Router
from ninja.errors import HttpError

from content.models import FeaturedContent
from content.schemas.base import FeaturedContentIn
from content.schemas.content_links import FeaturedContentDetailOut

router = Router(tags=["content"])

# URL prefix mapping for content types
_URL_PREFIXES = {
    "groupsession": "/sessions/",
    "blog": "/blogs/",
    "game": "/games/",
    "recipe": "/recipes/",
}


def _resolve_featured(fc: FeaturedContent) -> dict:
    """Resolve a FeaturedContent to a detail dict."""
    ct = fc.content_type
    try:
        obj = ct.get_object_for_this_type(pk=fc.object_id)
        title = getattr(obj, "title", getattr(obj, "name", ""))
        slug = getattr(obj, "slug", "")
        summary = getattr(obj, "summary", "")[:300]
        image_url = obj.image.url if hasattr(obj, "image") and obj.image else None
    except Exception:
        title, slug, summary, image_url = "", "", "", None

    url_prefix = _URL_PREFIXES.get(ct.model, f"/{ct.model}/")
    return {
        "id": fc.id,
        "content_type": ct.model,
        "object_id": fc.object_id,
        "content_title": title,
        "content_slug": slug,
        "content_summary": summary,
        "content_image_url": image_url,
        "content_url": f"{url_prefix}{slug}",
        "featured_from": fc.featured_from.isoformat(),
        "featured_until": fc.featured_until.isoformat(),
        "reason": fc.reason,
        "created_at": fc.created_at.isoformat(),
    }


@router.get(
    "/featured/",
    response=list[FeaturedContentDetailOut],
    url_name="content_featured_list",
)
def list_featured_content(request):
    """List currently active featured content."""
    today = date.today()
    featured = (
        FeaturedContent.objects.filter(
            featured_from__lte=today,
            featured_until__gte=today,
        )
        .select_related("content_type")
        .order_by("-featured_from")[:10]
    )
    return [_resolve_featured(fc) for fc in featured]


@router.post(
    "/featured/",
    response={201: FeaturedContentDetailOut},
    url_name="content_featured_create",
)
def create_featured_content(request, payload: FeaturedContentIn):
    """Feature a content item (admin only)."""
    if not request.user.is_authenticated or not request.user.is_staff:
        raise HttpError(403, "Nur Admins")

    try:
        ct = ContentType.objects.get(model=payload.content_type)
    except ContentType.DoesNotExist:
        raise HttpError(400, "Ungültiger Content-Typ")

    fc = FeaturedContent.objects.create(
        content_type=ct,
        object_id=payload.object_id,
        featured_from=payload.featured_from,
        featured_until=payload.featured_until,
        reason=payload.reason,
        created_by=request.user,
    )
    return 201, _resolve_featured(fc)
