"""Profile and preference API endpoints."""

from django.db.models import Q
from django.shortcuts import get_object_or_404
from ninja import File, Router
from ninja.errors import HttpError
from ninja.files import UploadedFile

from django.core.validators import validate_slug
from django.core.exceptions import ValidationError

from profiles.models import GroupMembership, UserPreference, UserProfile
from profiles.schemas import (
    MyContentOut,
    ProfilePictureOut,
    PublicMealPlanOut,
    PublicRecipeOut,
    PublicShoppingListOut,
    PublicUserFoodProfileOut,
    PublicUserProfileOut,
    UserGroupOut,
    JoinRequestOut,
    UserPreferenceIn,
    UserPreferenceOut,
    UserProfileOut,
    UserProfileUpdateIn,
)

profile_router = Router(tags=["profile"])

MAX_PROFILE_PICTURE_SIZE = 500 * 1024  # 500KB
ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}


def _require_auth(request):
    if not request.user.is_authenticated:
        raise HttpError(403, "Anmeldung erforderlich")


@profile_router.get("/me/", response=UserProfileOut)
def get_my_profile(request):
    """Get the current user's profile."""
    _require_auth(request)
    profile, _ = UserProfile.objects.prefetch_related("nutritional_tags").get_or_create(user=request.user)
    return profile


@profile_router.patch("/me/", response=UserProfileOut)
def update_my_profile(request, payload: UserProfileUpdateIn):
    """Update the current user's profile."""
    _require_auth(request)
    profile, _ = UserProfile.objects.prefetch_related("nutritional_tags").get_or_create(user=request.user)
    data = payload.dict(exclude_unset=True)
    tag_ids = data.pop("nutritional_tag_ids", None)

    slug_value = data.get("slug")
    if slug_value is not None:
        if slug_value == "":
            data["slug"] = None
        else:
            try:
                validate_slug(slug_value)
            except ValidationError:
                raise HttpError(422, "Ungültiges Slug-Format. Erlaubt: Kleinbuchstaben, Zahlen, Bindestriche und Unterstriche.")
            if UserProfile.objects.filter(slug=slug_value).exclude(pk=profile.pk).exists():
                raise HttpError(422, "Dieser Slug ist bereits vergeben")

    for field, value in data.items():
        setattr(profile, field, value)
    profile.save()
    if tag_ids is not None:
        profile.nutritional_tags.set(tag_ids)
    return profile


@profile_router.post("/me/picture/", response=ProfilePictureOut)
def upload_profile_picture(request, file: UploadedFile = File(...)):
    """Upload a profile picture (max 500KB, jpeg/png/webp)."""
    _require_auth(request)

    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HttpError(422, "Nur JPEG, PNG und WebP Bilder sind erlaubt")

    if file.size and file.size > MAX_PROFILE_PICTURE_SIZE:
        raise HttpError(422, "Maximale Dateigröße: 500 KB")

    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    if profile.profile_picture:
        profile.profile_picture.delete(save=False)
    profile.profile_picture.save(file.name, file, save=True)
    return {"profile_picture_url": profile.profile_picture.url}


@profile_router.delete("/me/picture/", response=ProfilePictureOut)
def delete_profile_picture(request):
    """Remove the current user's profile picture."""
    _require_auth(request)
    profile, _ = UserProfile.objects.get_or_create(user=request.user)

    if profile.profile_picture:
        profile.profile_picture.delete(save=False)
    profile.profile_picture = ""
    profile.save(update_fields=["profile_picture"])
    return {"profile_picture_url": None}


@profile_router.get("/me/preferences/", response=UserPreferenceOut)
def get_my_preferences(request):
    """Get the current user's preferences."""
    _require_auth(request)
    prefs, _ = UserPreference.objects.get_or_create(user=request.user)
    return prefs


@profile_router.patch("/me/preferences/", response=UserPreferenceOut)
def update_my_preferences(request, payload: UserPreferenceIn):
    """Update the current user's preferences."""
    _require_auth(request)
    prefs, _ = UserPreference.objects.get_or_create(user=request.user)
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(prefs, field, value)
    prefs.save()
    return prefs


@profile_router.get("/me/content/", response=list[MyContentOut])
def get_my_content(request):
    """List all content authored by the current user (all statuses)."""
    _require_auth(request)

    from blog.models import Blog
    from game.models import Game
    from session.models import GroupSession

    results = []
    for Model, content_type in [
        (GroupSession, "session"),
        (Blog, "blog"),
        (Game, "game"),
    ]:
        qs = (
            Model.objects.filter(Q(authors=request.user) | Q(created_by=request.user))
            .distinct()
            .order_by("-updated_at")
        )
        for obj in qs:
            obj.content_type = content_type
        results.extend(qs)

    results.sort(key=lambda x: x.updated_at, reverse=True)
    return results


# Legacy alias — will be removed in a future release
@profile_router.get("/me/ideas/", response=list[MyContentOut], include_in_schema=False)
def get_my_ideas_legacy(request):
    """Legacy alias for get_my_content."""
    return get_my_content(request)


@profile_router.get("/by-slug/{slug}/", response=PublicUserFoodProfileOut)
def get_public_user_food_profile(request, slug: str):
    """Get a user's public profile with recipes, shopping lists, and meal plans."""
    profile = UserProfile.objects.filter(slug=slug).first()
    if profile is None and slug.isdigit():
        profile = UserProfile.objects.filter(user_id=int(slug)).first()

    if profile is None:
        raise HttpError(404, "Profil nicht gefunden")

    is_own_profile = request.user.is_authenticated and request.user.id == profile.user_id
    if not profile.is_public and not is_own_profile:
        raise HttpError(404, "Profil nicht gefunden")

    from content.choices import ContentStatus
    from recipe.models import RecipeVisibility
    from recipe.models import Recipe

    profile.recipes = list(
        Recipe.objects.filter(
            Q(owner_id=profile.user_id) | Q(authors__id=profile.user_id),
            visibility=RecipeVisibility.PUBLIC,
            status=ContentStatus.APPROVED,
        ).distinct().order_by("-created_at")[:20]
    )

    from shopping.models import ShoppingList

    profile.shopping_lists = list(
        ShoppingList.objects.filter(
            owner_id=profile.user_id,
        ).order_by("-created_at")[:20]
    )

    from planner.models.meal_plan import MealPlan

    profile.meal_plans = list(
        MealPlan.objects.filter(
            created_by_id=profile.user_id,
        ).order_by("-created_at")[:20]
    )

    return profile


@profile_router.get("/{user_id}/", response=PublicUserProfileOut)
def get_user_profile(request, user_id: int):
    """Get another user's public profile with their published content."""
    profile = get_object_or_404(UserProfile, user_id=user_id)

    # Respect is_public flag (owner can always view their own profile)
    is_own_profile = request.user.is_authenticated and request.user.id == user_id
    if not profile.is_public and not is_own_profile:
        raise HttpError(404, "Profil nicht gefunden")
    from content.choices import ContentStatus

    from blog.models import Blog
    from game.models import Game
    from session.models import GroupSession

    results = []
    for Model, content_type in [
        (GroupSession, "session"),
        (Blog, "blog"),
        (Game, "game"),
    ]:
        qs = (
            Model.objects.filter(
                status=ContentStatus.APPROVED,
            )
            .filter(Q(authors__id=user_id) | Q(created_by_id=user_id))
            .distinct()
            .order_by("-created_at")[:20]
        )
        for obj in qs:
            obj.content_type = content_type
        results.extend(qs)

    results.sort(key=lambda x: x.created_at, reverse=True)
    profile.contents = results[:20]
    return profile


@profile_router.get("/me/groups/", response=list[UserGroupOut])
def get_my_groups(request):
    """List groups the current user is a member of."""
    _require_auth(request)
    from profiles.models import UserGroup

    group_ids = GroupMembership.objects.filter(
        user=request.user,
        is_active=True,
    ).values_list("group_id", flat=True)
    return UserGroup.objects.filter(id__in=group_ids, is_deleted=False)


@profile_router.get("/me/requests/", response=list[JoinRequestOut])
def get_my_join_requests(request):
    """List the current user's pending join requests."""
    _require_auth(request)
    from profiles.models import GroupJoinRequest

    return GroupJoinRequest.objects.filter(
        user=request.user,
        approved__isnull=True,
    ).select_related("group")
