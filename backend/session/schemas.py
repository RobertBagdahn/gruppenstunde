"""Pydantic schemas for the session app (GroupSession)."""

from datetime import datetime

from ninja import Schema

from content.base_schemas import (
    ContentAuthorOut,
    ContentCreateIn,
    ContentDetailOut,
    ContentListOut,
    ContentSimilarOut,
    ContentUpdateIn,
    ScoutLevelOut,
    TagOut,
)
from supply.schemas import ContentMaterialItemOut


# ---------------------------------------------------------------------------
# GroupSession List Schema
# ---------------------------------------------------------------------------


class GroupSessionListOut(ContentListOut):
    """Schema for session list (compact)."""

    session_type: str
    location_type: str
    min_participants: int | None
    max_participants: int | None


# ---------------------------------------------------------------------------
# GroupSession Detail Schema
# ---------------------------------------------------------------------------


class GroupSessionDetailOut(ContentDetailOut):
    """Schema for single session detail."""

    session_type: str
    location_type: str
    min_participants: int | None
    max_participants: int | None
    materials: list[ContentMaterialItemOut] = []
    similar_sessions: list[ContentSimilarOut] = []

    @staticmethod
    def resolve_authors(obj) -> list:
        authors = obj.authors.select_related("profile").all()
        if authors:
            result = []
            for user in authors:
                profile = getattr(user, "profile", None)
                display = ""
                scout_name = ""
                pic_url = None
                if profile:
                    scout_name = profile.scout_name or ""
                    display = scout_name or profile.full_name or user.first_name or user.email.split("@")[0]
                    if profile.profile_picture:
                        pic_url = profile.profile_picture.url
                else:
                    display = user.first_name or user.email.split("@")[0]
                result.append(
                    {
                        "id": user.id,
                        "display_name": display,
                        "scout_name": scout_name,
                        "profile_picture_url": pic_url,
                        "is_registered": True,
                    }
                )
            return result
        if obj.created_by_id:
            user = obj.created_by
            profile = getattr(user, "profile", None)
            display = ""
            scout_name = ""
            pic_url = None
            if profile:
                scout_name = profile.scout_name or ""
                display = scout_name or profile.full_name or user.first_name or user.email.split("@")[0]
                if profile.profile_picture:
                    pic_url = profile.profile_picture.url
            else:
                display = user.first_name or user.email.split("@")[0]
            return [
                {
                    "id": user.id,
                    "display_name": display,
                    "scout_name": scout_name,
                    "profile_picture_url": pic_url,
                    "is_registered": True,
                }
            ]
        return []

    @staticmethod
    def resolve_materials(obj) -> list:
        from django.contrib.contenttypes.models import ContentType

        from supply.models import ContentMaterialItem

        ct = ContentType.objects.get_for_model(obj)
        items = (
            ContentMaterialItem.objects.filter(content_type=ct, object_id=obj.id)
            .select_related("material")
            .order_by("sort_order")
        )
        return [
            {
                "id": item.id,
                "material_id": item.material_id,
                "material_name": item.material.name,
                "material_slug": item.material.slug,
                "material_category": item.material.material_category,
                "quantity": item.quantity,
                "quantity_type": item.quantity_type,
                "sort_order": item.sort_order,
            }
            for item in items
        ]


# ---------------------------------------------------------------------------
# GroupSession Create / Update Schemas
# ---------------------------------------------------------------------------


class GroupSessionCreateIn(ContentCreateIn):
    """Input schema for creating a GroupSession."""

    session_type: str = "scout_skills"
    location_type: str = "both"
    min_participants: int | None = None
    max_participants: int | None = None


class GroupSessionUpdateIn(ContentUpdateIn):
    """Input schema for updating a GroupSession. All fields optional."""

    session_type: str | None = None
    location_type: str | None = None
    min_participants: int | None = None
    max_participants: int | None = None


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------


class PaginatedGroupSessionOut(Schema):
    """Paginated response for session list."""

    items: list[GroupSessionListOut]
    total: int
    page: int
    page_size: int
    total_pages: int
