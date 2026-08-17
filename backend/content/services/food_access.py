"""Central access policy for Food resources."""

from __future__ import annotations

from collections.abc import Iterable
from typing import Any

from django.contrib.contenttypes.models import ContentType
from django.db.models import Q
from django.http import Http404
from ninja.errors import HttpError

from content.models import ContentCollaborator, ContentCollaboratorRole


def _is_staff(user: Any) -> bool:
    if not getattr(user, "is_authenticated", False):
        return False
    if getattr(user, "is_staff", False):
        return True
    try:
        return user.profile.role in ("staff", "admin")
    except AttributeError:
        return False


def _owner_ids(resource: Any) -> set[int]:
    return {
        owner_id
        for owner_id in (
            getattr(resource, "owner_id", None),
            getattr(resource, "created_by_id", None),
        )
        if owner_id is not None
    }


def _collaborator_roles(resource: Any, user: Any) -> set[str]:
    if not getattr(user, "is_authenticated", False) or not getattr(resource, "pk", None):
        return set()
    content_type = ContentType.objects.get_for_model(resource, for_concrete_model=False)
    return set(
        ContentCollaborator.objects.filter(
            content_type=content_type,
            object_id=resource.pk,
            user=user,
        ).values_list("role", flat=True)
    )


def _shared_group_ids(resource: Any) -> set[int]:
    manager = getattr(resource, "shared_groups", None)
    if manager is None:
        return set()
    return set(manager.values_list("id", flat=True))


def _active_membership(user: Any, group_ids: Iterable[int]) -> tuple[bool, bool]:
    if not getattr(user, "is_authenticated", False):
        return False, False
    from profiles.models import GroupMembership

    memberships = GroupMembership.objects.filter(
        user=user,
        group_id__in=set(group_ids),
        is_active=True,
    ).values_list("role", flat=True)
    roles = set(memberships)
    return bool(roles), "admin" in roles


def can_read(resource: Any, user: Any, *, transitive: bool = False) -> bool:
    """Return whether ``user`` may read a Food resource."""
    if _is_staff(user):
        return True
    if getattr(resource, "deleted_at", None) is not None:
        return False
    if user_id := getattr(user, "id", None):
        if user_id in _owner_ids(resource):
            return True
    roles = _collaborator_roles(resource, user)
    if roles:
        return True

    group_ids = _shared_group_ids(resource)
    is_member, _ = _active_membership(user, group_ids)
    if is_member:
        return True

    visibility = getattr(resource, "visibility", None)
    if visibility == "public":
        return True
    if getattr(resource, "owner_id", None) is None and getattr(resource, "status", None) in {
        "approved",
        "verified",
    }:
        return True
    if transitive and getattr(user, "is_authenticated", False):
        from content.services.transitive_visibility import (
            ingredient_visible_transitively,
            recipe_visible_transitively,
        )

        if resource.__class__.__name__ == "Recipe":
            return recipe_visible_transitively(resource, user)
        if resource.__class__.__name__ == "Ingredient":
            return ingredient_visible_transitively(resource, user)
    return False


def can_edit(resource: Any, user: Any) -> bool:
    """Return whether ``user`` may modify a Food resource."""
    if _is_staff(user):
        return True
    if getattr(resource, "status", None) == "verified":
        return False
    if not can_read(resource, user):
        return False
    user_id = getattr(user, "id", None)
    if user_id in _owner_ids(resource):
        return True
    if ContentCollaboratorRole.EDITOR in _collaborator_roles(resource, user):
        return True
    if ContentCollaboratorRole.ADMIN in _collaborator_roles(resource, user):
        return True
    group_ids = _shared_group_ids(resource)
    _, is_group_admin = _active_membership(user, group_ids)
    return is_group_admin and getattr(resource, "visibility", None) in {"group", "shared"}


def can_delete(resource: Any, user: Any) -> bool:
    return can_edit(resource, user)


def can_fork(resource: Any, user: Any) -> bool:
    return getattr(user, "is_authenticated", False) and can_read(resource, user)


def can_export(resource: Any, user: Any) -> bool:
    return can_edit(resource, user)


def _active_group_ids(user: Any) -> set[int]:
    if not getattr(user, "is_authenticated", False):
        return set()
    from profiles.models import GroupMembership

    return set(
        GroupMembership.objects.filter(user=user, is_active=True).values_list("group_id", flat=True)
    )


def visible_recipe_queryset(user: Any):
    """Return a prefetched Recipe queryset visible to ``user``."""
    from recipe.models import Recipe

    base = Recipe.objects.select_related("owner", "forked_from").prefetch_related(
        "scout_levels",
        "tags__parent",
        "authors",
        "shared_groups",
    )
    if _is_staff(user):
        return base

    system_q = Q(owner__isnull=True, status__in=("approved", "verified"))
    public_q = Q(owner__isnull=False, visibility="public", status="approved")
    if not getattr(user, "is_authenticated", False):
        return base.filter(system_q | public_q)

    user_group_ids = _active_group_ids(user)
    content_type = ContentType.objects.get_for_model(Recipe, for_concrete_model=False)
    collaborator_ids = ContentCollaborator.objects.filter(
        content_type=content_type,
        user_id=user.id,
    ).values_list("object_id", flat=True)
    group_collaborator_ids = ContentCollaborator.objects.filter(
        content_type=content_type,
        group_id__in=user_group_ids,
    ).values_list("object_id", flat=True)
    own_q = Q(owner_id=user.id) | Q(created_by_id=user.id)
    group_q = Q(shared_groups__id__in=user_group_ids)
    collaborator_q = Q(id__in=collaborator_ids) | Q(id__in=group_collaborator_ids)
    return base.filter(system_q | public_q | own_q | group_q | collaborator_q).distinct()


def get_visible_recipe_or_404(user: Any, recipe_id: int):
    recipe = visible_recipe_queryset(user).filter(id=recipe_id).first()
    if recipe is None:
        raise Http404("Food resource not found")
    return recipe


def visible_ingredient_queryset(user: Any):
    """Return a prefetched Ingredient queryset visible to ``user``."""
    from supply.models import Ingredient

    base = Ingredient.objects.select_related("retail_section", "owner").prefetch_related(
        "groups",
        "shared_groups",
    )
    if _is_staff(user):
        return base

    system_q = Q(owner__isnull=True, status__in=("approved", "verified"))
    public_q = Q(owner__isnull=False, visibility="public", status="approved")
    if not getattr(user, "is_authenticated", False):
        return base.filter(system_q | public_q)

    user_group_ids = _active_group_ids(user)
    content_type = ContentType.objects.get_for_model(Ingredient, for_concrete_model=False)
    collaborator_ids = ContentCollaborator.objects.filter(
        content_type=content_type,
        user_id=user.id,
    ).values_list("object_id", flat=True)
    group_collaborator_ids = ContentCollaborator.objects.filter(
        content_type=content_type,
        group_id__in=user_group_ids,
    ).values_list("object_id", flat=True)
    own_q = Q(owner_id=user.id) | Q(created_by_id=user.id)
    group_q = Q(shared_groups__id__in=user_group_ids)
    collaborator_q = Q(id__in=collaborator_ids) | Q(id__in=group_collaborator_ids)
    return base.filter(system_q | public_q | own_q | group_q | collaborator_q).distinct()


def public_recipe_queryset():
    from recipe.models import Recipe

    return Recipe.objects.filter(
        Q(owner__isnull=True, status__in=("approved", "verified"))
        | Q(owner__isnull=False, visibility="public", status="approved")
    )


def public_ingredient_queryset():
    from supply.models import Ingredient

    return Ingredient.objects.filter(
        Q(owner__isnull=True, status__in=("approved", "verified"))
        | Q(owner__isnull=False, visibility="public", status="approved")
    )


def get_visible_ingredient_or_404(user: Any, ingredient_id: int):
    ingredient = visible_ingredient_queryset(user).filter(id=ingredient_id).first()
    if ingredient is None:
        raise Http404("Food resource not found")
    return ingredient


def get_ingredient_detail_or_404(user: Any, slug: str):
    from supply.models import Ingredient

    ingredient = Ingredient.all_objects.select_related("retail_section", "owner").prefetch_related(
        "nutritional_tags",
        "portions__measuring_unit",
        "packages",
        "aliases",
        "shared_groups",
        "tags",
        "groups",
    ).filter(slug=slug).first()
    if ingredient is None or not can_read(ingredient, user, transitive=True):
        raise Http404("Food resource not found")
    return ingredient


def annotate_permissions(resource: Any, user: Any) -> Any:
    resource.can_edit = can_edit(resource, user)
    resource.can_delete = can_delete(resource, user)
    return resource


def require_read(resource: Any, user: Any, *, transitive: bool = False) -> Any:
    if not can_read(resource, user, transitive=transitive):
        raise Http404("Food resource not found")
    return resource


def require_action(resource: Any, user: Any, action: str) -> Any:
    allowed = {
        "edit": can_edit,
        "delete": can_delete,
        "fork": can_fork,
        "export": can_export,
    }
    checker = allowed.get(action)
    if checker is None:
        raise ValueError(f"Unknown Food access action: {action}")
    if not can_read(resource, user):
        raise Http404("Food resource not found")
    if not checker(resource, user):
        raise HttpError(403, "Not authorized")
    return resource
