"""Pydantic schemas for the game app (Game)."""

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
# Game List Schema
# ---------------------------------------------------------------------------


class GameListOut(ContentListOut):
    """Schema for game list (compact)."""

    game_type: str
    play_area: str
    min_players: int | None
    max_players: int | None
    game_duration_minutes: int | None


# ---------------------------------------------------------------------------
# Game Detail Schema
# ---------------------------------------------------------------------------


class GameDetailOut(ContentDetailOut):
    """Schema for single game detail."""

    game_type: str
    play_area: str
    min_players: int | None
    max_players: int | None
    game_duration_minutes: int | None
    rules: str
    materials: list[ContentMaterialItemOut] = []
    similar_games: list[ContentSimilarOut] = []

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
# Game Create / Update Schemas
# ---------------------------------------------------------------------------


class GameCreateIn(ContentCreateIn):
    """Input schema for creating a Game."""

    game_type: str = "group_game"
    play_area: str = "any"
    min_players: int | None = None
    max_players: int | None = None
    game_duration_minutes: int | None = None
    rules: str = ""


class GameUpdateIn(ContentUpdateIn):
    """Input schema for updating a Game. All fields optional."""

    game_type: str | None = None
    play_area: str | None = None
    min_players: int | None = None
    max_players: int | None = None
    game_duration_minutes: int | None = None
    rules: str | None = None


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------


class PaginatedGameOut(Schema):
    """Paginated response for game list."""

    items: list[GameListOut]
    total: int
    page: int
    page_size: int
    total_pages: int
