"""
Backward-compatibility shim and content router factory.

All helper functions have moved to ``content.api.helpers``.
This file re-exports them so existing imports like
``from content.base_api import toggle_emotion`` still work.

The ``create_content_router`` factory generates shared CRUD routes
(autocomplete, by-slug, comments, emotions, image, materials) for
Content-type subclasses, avoiding ~85% duplicate code in session/blog/game.
"""

import logging
import math
from dataclasses import dataclass, field
from typing import Any

from django.db.models import Q
from django.shortcuts import get_object_or_404
from ninja import Query, Router
from ninja.errors import HttpError

from content.api.helpers import (  # noqa: F401
    create_comment,
    enrich_content_with_interactions,
    enrich_list_with_permissions,
    get_comments,
    get_content_type_for_model,
    get_emotion_counts,
    get_session_key,
    get_user_emotion,
    paginate_queryset,
    record_view,
    toggle_emotion,
)
from content.base_schemas import ContentCommentIn, ContentCommentOut, ContentEmotionIn
from content.choices import ContentStatus
from content.models import Tag
from content.schemas import ImageFromUrlIn
from content.services.image_service import download_and_save_image, validate_image_url

logger = logging.getLogger(__name__)


@dataclass
class ContentRouterConfig:
    model_class: type
    list_schema: type
    detail_schema: type
    create_schema: type
    update_schema: type
    paginated_schema: type
    filter_schema: type
    resource_name: str
    similar_attr: str
    create_fields: list[str]
    update_fields: list[str]
    has_full_materials: bool = False
    tag_label: str = ""


def create_content_router(config: ContentRouterConfig) -> tuple[Router, Any]:
    """Create a Django Ninja Router with standard CRUD routes for a Content subtype.

    Returns a tuple of (router, filter_schema_class) so the caller can use
    the filter schema in their own type-specific handlers if needed.
    """
    router = Router(tags=[config.tag_label or config.resource_name])
    FilterSchema = config.filter_schema
    Model = config.model_class
    ListOut = config.list_schema
    DetailOut = config.detail_schema
    CreateIn = config.create_schema
    UpdateIn = config.update_schema
    PaginatedOut = config.paginated_schema

    # ---------- list ----------
    @router.get("/", response=PaginatedOut)
    def content_list(request, filters: FilterSchema = Query(...)):
        qs = Model.objects.filter(status=ContentStatus.APPROVED)

        search = getattr(filters, "search", None)
        if search:
            qs = qs.filter(
                Q(title__icontains=search) | Q(summary__icontains=search)
            )

        sort = getattr(filters, "sort", None)
        if sort:
            order_prefix = "-" if getattr(filters, "sort_desc", False) else ""
            qs = qs.order_by(f"{order_prefix}{sort}")

        for field_name in getattr(config, "filter_fields", []):
            val = getattr(filters, field_name, None)
            if val:
                qs = qs.filter(**{field_name: val})

        total = qs.count()
        total_pages = max(1, math.ceil(total / filters.page_size))
        offset = (filters.page - 1) * filters.page_size
        items = list(
            qs.prefetch_related("scout_levels", "tags__parent", "authors__profile")
            .select_related("created_by")
            .order_by("-created_at")[offset : offset + filters.page_size]
        )

        enrich_list_with_permissions(items, request.user, Model)
        out_items = [ListOut.from_orm(it) for it in items]
        return {
            "items": out_items,
            "total": total,
            "page": filters.page,
            "page_size": filters.page_size,
            "total_pages": total_pages,
        }

    # ---------- autocomplete ----------
    @router.get("/autocomplete/", response=list[dict])
    def content_autocomplete(request, q: str = ""):
        if len(q.strip()) < 2:
            return []
        results = (
            Model.objects.filter(
                Q(title__icontains=q.strip()),
                status=ContentStatus.APPROVED,
            )
            .values("id", "title", "slug")[:10]
        )
        return list(results)

    # ---------- by-slug ----------
    @router.get("/by-slug/{slug}/", response=DetailOut)
    def content_by_slug(request, slug: str):
        obj = get_object_or_404(
            Model.objects.prefetch_related(
                "scout_levels", "tags__parent", "authors__profile"
            ).select_related("created_by"),
            slug=slug,
            status=ContentStatus.APPROVED,
        )
        record_view(request, obj)
        enrich_content_with_interactions(obj, request.user, config.resource_name)
        setattr(obj, config.similar_attr, [])
        return obj

    # ---------- get by id ----------
    @router.get("/{content_id}/", response=DetailOut)
    def content_detail(request, content_id: int):
        obj = get_object_or_404(
            Model.objects.prefetch_related(
                "scout_levels", "tags__parent", "authors__profile"
            ).select_related("created_by"),
            id=content_id,
            status=ContentStatus.APPROVED,
        )
        record_view(request, obj)
        enrich_content_with_interactions(obj, request.user, config.resource_name)
        setattr(obj, config.similar_attr, [])
        return obj

    # ---------- create ----------
    @router.post("/", response={201: DetailOut})
    def content_create(request, payload: CreateIn):
        if not request.user.is_authenticated:
            raise HttpError(403, "Anmeldung erforderlich")
        create_kwargs = {
            "status": ContentStatus.DRAFT,
            "created_by": request.user,
        }
        for f in config.create_fields:
            create_kwargs[f] = getattr(payload, f, None)
        obj = Model.objects.create(**create_kwargs)

        tag_ids = getattr(payload, "tag_ids", None) or []
        if tag_ids:
            obj.tags.set(Tag.objects.filter(id__in=tag_ids))

        scout_level_ids = getattr(payload, "scout_level_ids", None) or []
        if scout_level_ids:
            from content.models import ScoutLevel
            obj.scout_levels.set(ScoutLevel.objects.filter(id__in=scout_level_ids))

        authors = getattr(payload, "authors", None)
        if authors:
            for author_data in authors:
                obj.authors.get_or_create(
                    display_name=author_data.display_name,
                    defaults={
                        "scout_name": author_data.scout_name,
                        "user": author_data.user,
                    },
                )

        obj.refresh_from_db()
        enrich_content_with_interactions(obj, request.user, config.resource_name)
        return 201, obj

    # ---------- update ----------
    @router.patch("/{content_id}/", response=DetailOut)
    def content_update(request, content_id: int, payload: UpdateIn):
        if not request.user.is_authenticated:
            raise HttpError(403, "Anmeldung erforderlich")
        obj = get_object_or_404(Model, id=content_id)
        if not request.user.is_staff and (
            not hasattr(obj, "created_by") or obj.created_by != request.user
        ):
            raise HttpError(403, "Keine Berechtigung")

        for field_name in config.update_fields:
            val = getattr(payload, field_name, None)
            if val is not None:
                setattr(obj, field_name, val)

        tag_ids = getattr(payload, "tag_ids", None)
        if tag_ids is not None:
            obj.tags.set(Tag.objects.filter(id__in=tag_ids))

        scout_level_ids = getattr(payload, "scout_level_ids", None)
        if scout_level_ids is not None:
            from content.models import ScoutLevel
            obj.scout_levels.set(ScoutLevel.objects.filter(id__in=scout_level_ids))

        obj.save()
        obj.refresh_from_db()
        obj = get_object_or_404(
            Model.objects.prefetch_related(
                "scout_levels", "tags__parent", "authors__profile"
            ).select_related("created_by"),
            id=content_id,
        )
        enrich_content_with_interactions(obj, request.user, config.resource_name)
        return obj

    # ---------- delete ----------
    @router.delete("/{content_id}/", response={204: None})
    def content_delete(request, content_id: int):
        if not request.user.is_authenticated or not request.user.is_staff:
            raise HttpError(
                403, f"Nur Admins dürfen {config.resource_name} löschen"
            )
        obj = get_object_or_404(Model, id=content_id)
        obj.soft_delete()
        return 204, None

    # ---------- comments ----------
    @router.get("/{content_id}/comments/", response=list[ContentCommentOut])
    def content_comments_list(request, content_id: int):
        obj = get_object_or_404(Model, id=content_id)
        comments = obj.comments.filter(parent=None, status="approved").select_related(
            "user"
        )
        for comment in comments:
            comment.replies = comment.replies.filter(
                status="approved"
            ).select_related("user")
        return list(comments)

    @router.post("/{content_id}/comments/", response={201: ContentCommentOut})
    def content_comments_create(request, content_id: int, payload: ContentCommentIn):
        obj = get_object_or_404(Model, id=content_id)
        return 201, create_comment(request, obj, payload)

    # ---------- emotions ----------
    @router.post("/{content_id}/emotions/")
    def content_emotion_toggle(request, content_id: int, payload: ContentEmotionIn):
        obj = get_object_or_404(Model, id=content_id)
        return toggle_emotion(request, obj, payload)

    # ---------- image ----------
    @router.post("/{content_id}/image/", response=DetailOut)
    def content_image_upload(request, content_id: int):
        if not request.user.is_authenticated:
            raise HttpError(403, "Anmeldung erforderlich")
        obj = get_object_or_404(Model, id=content_id)
        if (
            not request.user.is_staff
            and hasattr(obj, "created_by")
            and obj.created_by != request.user
        ):
            raise HttpError(403, "Keine Berechtigung")
        file = request.FILES.get("image")
        if not file:
            raise HttpError(400, "Kein Bild hochgeladen")
        obj.image.save(file.name, file, save=True)
        obj.refresh_from_db()
        enrich_content_with_interactions(obj, request.user, config.resource_name)
        return obj

    @router.delete("/{content_id}/image/", response=DetailOut)
    def content_image_delete(request, content_id: int):
        if not request.user.is_authenticated:
            raise HttpError(403, "Anmeldung erforderlich")
        obj = get_object_or_404(Model, id=content_id)
        if (
            not request.user.is_staff
            and hasattr(obj, "created_by")
            and obj.created_by != request.user
        ):
            raise HttpError(403, "Keine Berechtigung")
        if obj.image:
            obj.image.delete(save=False)
        obj.image = None
        obj.save()
        obj.refresh_from_db()
        enrich_content_with_interactions(obj, request.user, config.resource_name)
        return obj

    @router.post("/{content_id}/image-from-url/", response=DetailOut)
    def content_image_from_url(request, content_id: int, payload: ImageFromUrlIn):
        if not request.user.is_authenticated:
            raise HttpError(403, "Anmeldung erforderlich")
        obj = get_object_or_404(Model, id=content_id)
        if (
            not request.user.is_staff
            and hasattr(obj, "created_by")
            and obj.created_by != request.user
        ):
            raise HttpError(403, "Keine Berechtigung")
        validate_image_url(payload.image_url)
        image = download_and_save_image(payload.image_url)
        if image:
            obj.image.save(image.name, image, save=True)
        obj.refresh_from_db()
        enrich_content_with_interactions(obj, request.user, config.resource_name)
        return obj

    # ---------- materials (optional) ----------
    if config.has_full_materials:
        from django.contrib.contenttypes.models import ContentType
        from supply.models import ContentMaterialItem, Material
        from supply.schemas import ContentMaterialItemIn

        @router.get("/{content_id}/materials/", response=list[dict])
        def content_materials_list(request, content_id: int):
            obj = get_object_or_404(Model, id=content_id)
            content_type = ContentType.objects.get_for_model(Model)
            items = ContentMaterialItem.objects.filter(
                content_type=content_type, object_id=obj.id
            ).select_related("material")
            return [
                {
                    "id": it.id,
                    "material_id": it.material.id,
                    "material_name": it.material.name,
                    "quantity": it.quantity,
                    "unit": it.material.unit,
                }
                for it in items
            ]

        @router.post("/{content_id}/materials/", response={201: dict})
        def content_materials_add(
            request, content_id: int, payload: ContentMaterialItemIn
        ):
            if not request.user.is_authenticated:
                raise HttpError(403, "Anmeldung erforderlich")
            obj = get_object_or_404(Model, id=content_id)
            material = get_object_or_404(Material, id=payload.material_id)
            content_type = ContentType.objects.get_for_model(Model)
            item = ContentMaterialItem.objects.create(
                content_type=content_type,
                object_id=obj.id,
                material=material,
                quantity=payload.quantity,
            )
            return 201, {
                "id": item.id,
                "material_id": item.material.id,
                "material_name": item.material.name,
                "quantity": item.quantity,
                "unit": item.material.unit,
            }

        @router.delete("/{content_id}/materials/{item_id}/", response={204: None})
        def content_materials_delete(request, content_id: int, item_id: int):
            if not request.user.is_authenticated:
                raise HttpError(403, "Anmeldung erforderlich")
            obj = get_object_or_404(Model, id=content_id)
            item = get_object_or_404(
                ContentMaterialItem, id=item_id, object_id=obj.id
            )
            item.delete()
            return 204, None

    return router, FilterSchema

