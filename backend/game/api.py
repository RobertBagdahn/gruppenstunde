"""Django Ninja API routes for games."""

import logging
import math

from django.db.models import Q
from django.shortcuts import get_object_or_404
from ninja import Query, Router, Schema
from ninja.errors import HttpError

from content.base_api import (
    create_comment,
    enrich_content_with_interactions,
    enrich_list_with_permissions,
    get_comments,
    record_view,
    toggle_emotion,
)
from content.base_schemas import ContentCommentIn, ContentCommentOut, ContentEmotionIn
from content.choices import ContentStatus
from content.models import Tag

from .models import Game
from .schemas import (
    GameCreateIn,
    GameDetailOut,
    GameListOut,
    GameUpdateIn,
    PaginatedGameOut,
)

logger = logging.getLogger(__name__)

router = Router(tags=["games"])


# ---------------------------------------------------------------------------
# Filter Schema
# ---------------------------------------------------------------------------


class GameFilterIn(Schema):
    q: str = ""
    game_type: str | None = None
    play_area: str | None = None
    scout_level_ids: str | None = None
    tag_slugs: str | None = None
    difficulty: str | None = None
    sort: str = "newest"
    page: int = 1
    page_size: int = 20


# ---------------------------------------------------------------------------
# List & Search
# ---------------------------------------------------------------------------


@router.get("/", response=PaginatedGameOut)
def list_games(request, filters: Query[GameFilterIn]):
    """List games with filtering, search, sorting, and pagination."""
    qs = Game.objects.filter(status=ContentStatus.APPROVED)

    if filters.q:
        qs = qs.filter(Q(title__icontains=filters.q) | Q(summary__icontains=filters.q))

    if filters.game_type:
        qs = qs.filter(game_type=filters.game_type)
    if filters.play_area:
        qs = qs.filter(play_area=filters.play_area)
    if filters.scout_level_ids:
        level_ids = [int(x) for x in filters.scout_level_ids.split(",") if x.strip()]
        qs = qs.filter(scout_levels__id__in=level_ids)
    if filters.tag_slugs:
        tag_slug_list = [s.strip() for s in filters.tag_slugs.split(",") if s.strip()]
        selected_tags = Tag.objects.filter(slug__in=tag_slug_list)
        expanded_ids = set(selected_tags.values_list("id", flat=True))
        for tag in selected_tags:
            for child in tag.get_descendants():
                expanded_ids.add(child.id)
        qs = qs.filter(tags__id__in=expanded_ids)
    if filters.difficulty:
        qs = qs.filter(difficulty=filters.difficulty)

    qs = qs.distinct()

    sort_map = {
        "newest": "-created_at",
        "oldest": "created_at",
        "most_liked": "-like_score",
        "popular": "-view_count",
        "random": "?",
    }
    qs = qs.order_by(sort_map.get(filters.sort, "-created_at"))

    total = qs.count()
    total_pages = max(1, math.ceil(total / filters.page_size))
    offset = (filters.page - 1) * filters.page_size
    items = list(qs.prefetch_related("scout_levels", "tags__parent", "authors")[offset : offset + filters.page_size])

    enrich_list_with_permissions(request, items)

    return {
        "items": items,
        "total": total,
        "page": filters.page,
        "page_size": filters.page_size,
        "total_pages": total_pages,
    }


@router.get("/autocomplete/", response=list[dict])
def autocomplete_games(request, q: str = ""):
    """Fast typeahead suggestions for games."""
    if not q or len(q) < 2:
        return []
    return list(
        Game.objects.filter(status=ContentStatus.APPROVED, title__icontains=q).values("id", "title", "summary", "slug")[
            :10
        ]
    )


# ---------------------------------------------------------------------------
# Detail (by ID and by slug)
# ---------------------------------------------------------------------------


@router.get("/by-slug/{slug}/", response=GameDetailOut)
def get_game_by_slug(request, slug: str):
    """Get a single game by slug (SEO-friendly)."""
    game = get_object_or_404(
        Game.objects.prefetch_related("scout_levels", "tags__parent", "authors__profile").select_related("created_by"),
        slug=slug,
    )
    enrich_content_with_interactions(request, game, Game)
    game.similar_games = []
    record_view(Game, game.id, request)
    return game


@router.get("/{game_id}/", response=GameDetailOut)
def get_game(request, game_id: int):
    """Get a single game by ID."""
    game = get_object_or_404(
        Game.objects.prefetch_related("scout_levels", "tags__parent", "authors__profile").select_related("created_by"),
        id=game_id,
    )
    enrich_content_with_interactions(request, game, Game)
    game.similar_games = []
    record_view(Game, game.id, request)
    return game


# ---------------------------------------------------------------------------
# Create / Update / Delete
# ---------------------------------------------------------------------------


@router.post("/", response={201: GameDetailOut})
def create_game(request, payload: GameCreateIn):
    """Create a new game."""
    game = Game.objects.create(
        title=payload.title,
        summary=payload.summary,
        summary_long=payload.summary_long,
        description=payload.description,
        costs_rating=payload.costs_rating,
        execution_time=payload.execution_time,
        preparation_time=payload.preparation_time,
        difficulty=payload.difficulty,
        game_type=payload.game_type,
        play_area=payload.play_area,
        min_players=payload.min_players,
        max_players=payload.max_players,
        game_duration_minutes=payload.game_duration_minutes,
        rules=payload.rules,
        status=ContentStatus.DRAFT,
        created_by=request.user if request.user.is_authenticated else None,
    )

    if payload.tag_ids:
        game.tags.set(payload.tag_ids)
    if payload.scout_level_ids:
        game.scout_levels.set(payload.scout_level_ids)
    if request.user.is_authenticated:
        game.authors.add(request.user)

    enrich_content_with_interactions(request, game, Game)
    game.similar_games = []
    return 201, game


@router.patch("/{game_id}/", response=GameDetailOut)
def update_game(request, game_id: int, payload: GameUpdateIn):
    """Update an existing game."""
    game = get_object_or_404(Game, id=game_id)

    can_edit = request.user.is_authenticated and (
        request.user.is_staff or game.authors.filter(id=request.user.id).exists()
    )
    if not can_edit:
        raise HttpError(403, "Keine Berechtigung zum Bearbeiten.")

    update_fields = []
    for field in [
        "title",
        "summary",
        "summary_long",
        "description",
        "costs_rating",
        "execution_time",
        "preparation_time",
        "difficulty",
        "status",
        "game_type",
        "play_area",
        "min_players",
        "max_players",
        "game_duration_minutes",
        "rules",
    ]:
        value = getattr(payload, field, None)
        if value is not None:
            setattr(game, field, value)
            update_fields.append(field)

    if request.user.is_authenticated:
        game.updated_by = request.user
        update_fields.append("updated_by")

    if update_fields:
        game.save(update_fields=update_fields)

    if payload.tag_ids is not None:
        game.tags.set(payload.tag_ids)
    if payload.scout_level_ids is not None:
        game.scout_levels.set(payload.scout_level_ids)

    game.refresh_from_db()
    game = (
        Game.objects.prefetch_related("scout_levels", "tags__parent", "authors__profile")
        .select_related("created_by")
        .get(id=game_id)
    )
    enrich_content_with_interactions(request, game, Game)
    game.similar_games = []
    return game


@router.delete("/{game_id}/", response={204: None})
def delete_game(request, game_id: int):
    """Soft-delete a game (admin only)."""
    if not request.user.is_authenticated or not request.user.is_staff:
        raise HttpError(403, "Nur Admins dürfen Spiele löschen.")

    game = get_object_or_404(Game, id=game_id)
    game.soft_delete()
    return 204, None


# ---------------------------------------------------------------------------
# Comments
# ---------------------------------------------------------------------------


@router.get("/{game_id}/comments/", response=list[ContentCommentOut])
def list_game_comments(request, game_id: int):
    """List approved comments for a game."""
    get_object_or_404(Game, id=game_id)
    comments = get_comments(Game, game_id)
    result = []
    for c in comments:
        result.append(
            {
                "id": c.id,
                "text": c.text,
                "author_name": c.author_name,
                "user_id": c.user_id,
                "user_display_name": c.user.first_name if c.user else None,
                "parent_id": c.parent_id,
                "status": c.status,
                "created_at": c.created_at,
                "replies": [
                    {
                        "id": r.id,
                        "text": r.text,
                        "author_name": r.author_name,
                        "user_id": r.user_id,
                        "user_display_name": r.user.first_name if r.user else None,
                        "parent_id": r.parent_id,
                        "status": r.status,
                        "created_at": r.created_at,
                        "replies": [],
                    }
                    for r in c.replies.filter(status="approved").select_related("user")
                ],
            }
        )
    return result


@router.post("/{game_id}/comments/", response={201: ContentCommentOut})
def create_game_comment(request, game_id: int, payload: ContentCommentIn):
    """Create a comment on a game."""
    get_object_or_404(Game, id=game_id)
    comment = create_comment(
        Game,
        game_id,
        text=payload.text,
        request=request,
        author_name=payload.author_name,
        parent_id=payload.parent_id,
    )
    return 201, {
        "id": comment.id,
        "text": comment.text,
        "author_name": comment.author_name,
        "user_id": comment.user_id,
        "user_display_name": comment.user.first_name if comment.user else None,
        "parent_id": comment.parent_id,
        "status": comment.status,
        "created_at": comment.created_at,
        "replies": [],
    }


# ---------------------------------------------------------------------------
# Emotions
# ---------------------------------------------------------------------------


@router.post("/{game_id}/emotions/", response=dict)
def toggle_game_emotion(request, game_id: int, payload: ContentEmotionIn):
    """Toggle an emotion on a game."""
    get_object_or_404(Game, id=game_id)
    counts = toggle_emotion(Game, game_id, payload.emotion_type, request)
    return {"emotion_counts": counts}


# ---------------------------------------------------------------------------
# Materials (via GenericFK from supply app)
# ---------------------------------------------------------------------------


@router.get("/{game_id}/materials/", response=list[dict])
def list_game_materials(request, game_id: int):
    """List materials for a game."""
    from django.contrib.contenttypes.models import ContentType

    from supply.models import ContentMaterialItem

    game = get_object_or_404(Game, id=game_id)
    ct = ContentType.objects.get_for_model(game)
    items = (
        ContentMaterialItem.objects.filter(content_type=ct, object_id=game.id)
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
# Image Upload
# ---------------------------------------------------------------------------


@router.post("/{game_id}/image/", response=dict)
def upload_game_image(request, game_id: int):
    """Upload a title image for a game."""
    game = get_object_or_404(Game, id=game_id)
    can_edit = request.user.is_authenticated and (
        request.user.is_staff or game.authors.filter(id=request.user.id).exists()
    )
    if not can_edit:
        raise HttpError(403, "Keine Berechtigung.")

    if "image" not in request.FILES:
        raise HttpError(400, "Kein Bild hochgeladen.")

    game.image = request.FILES["image"]
    game.save(update_fields=["image"])
    return {"image_url": game.image.url if game.image else None}
