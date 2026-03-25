"""Pydantic schemas for the Profile API (Django Ninja)."""

from datetime import date, datetime

from ninja import Schema

from idea.schemas import NutritionalTagOut


# --- User Profile Schemas ---


class UserProfileOut(Schema):
    id: int
    scout_name: str
    first_name: str
    last_name: str
    gender: str
    birthday: date | None
    about_me: str
    nutritional_tags: list[NutritionalTagOut]
    profile_picture_url: str | None = None
    created_at: datetime
    updated_at: datetime

    @staticmethod
    def resolve_profile_picture_url(obj) -> str | None:
        if obj.profile_picture:
            return obj.profile_picture.url
        return None

    @staticmethod
    def resolve_nutritional_tags(obj) -> list:
        return obj.nutritional_tags.all()


class UserProfileUpdateIn(Schema):
    scout_name: str | None = None
    first_name: str | None = None
    last_name: str | None = None
    gender: str | None = None
    birthday: date | None = None
    about_me: str | None = None
    nutritional_tag_ids: list[int] | None = None


# --- Public User Profile (with ideas) ---


class PublicIdeaOut(Schema):
    """Compact idea info for public profile."""

    id: int
    title: str
    slug: str
    idea_type: str
    summary: str
    image_url: str | None = None
    created_at: datetime

    @staticmethod
    def resolve_image_url(obj) -> str | None:
        if obj.image:
            return obj.image.url
        return None


class MyIdeaOut(Schema):
    """Compact idea info for the current user's profile (includes status)."""

    id: int
    title: str
    slug: str
    idea_type: str
    summary: str
    status: str
    image_url: str | None = None
    created_at: datetime
    updated_at: datetime

    @staticmethod
    def resolve_image_url(obj) -> str | None:
        if obj.image:
            return obj.image.url
        return None


class PublicUserProfileOut(Schema):
    """Public user profile with authored ideas."""

    id: int
    scout_name: str
    first_name: str
    about_me: str
    profile_picture_url: str | None = None
    created_at: datetime
    ideas: list[PublicIdeaOut] = []

    @staticmethod
    def resolve_profile_picture_url(obj) -> str | None:
        if obj.profile_picture:
            return obj.profile_picture.url
        return None


# --- User Preference Schemas ---


class UserPreferenceOut(Schema):
    id: int
    preferred_scout_level_id: int | None
    preferred_group_size_min: int | None
    preferred_group_size_max: int | None
    preferred_difficulty: str
    preferred_location: str


class UserPreferenceIn(Schema):
    preferred_scout_level_id: int | None = None
    preferred_group_size_min: int | None = None
    preferred_group_size_max: int | None = None
    preferred_difficulty: str | None = None
    preferred_location: str | None = None


# --- Group Schemas ---


class GroupParentOut(Schema):
    id: int
    name: str
    slug: str


class UserGroupOut(Schema):
    id: int
    name: str
    slug: str
    description: str
    is_visible: bool
    free_to_join: bool
    member_count: int = 0
    parent: GroupParentOut | None = None
    created_at: datetime

    @staticmethod
    def resolve_member_count(obj) -> int:
        return obj.memberships.filter(is_active=True).count()

    @staticmethod
    def resolve_parent(obj) -> dict | None:
        if obj.parent:
            return {"id": obj.parent.id, "name": obj.parent.name, "slug": obj.parent.slug}
        return None


class UserGroupDetailOut(Schema):
    id: int
    name: str
    slug: str
    description: str
    is_visible: bool
    free_to_join: bool
    join_code: str
    member_count: int = 0
    parent: GroupParentOut | None = None
    children: list["UserGroupChildOut"] = []
    ancestors: list[GroupParentOut] = []
    created_by_id: int | None
    created_at: datetime
    updated_at: datetime
    members: list["GroupMemberOut"] = []
    inherited_member_count: int = 0

    @staticmethod
    def resolve_member_count(obj) -> int:
        return obj.memberships.filter(is_active=True).count()

    @staticmethod
    def resolve_parent(obj) -> dict | None:
        if obj.parent:
            return {"id": obj.parent.id, "name": obj.parent.name, "slug": obj.parent.slug}
        return None

    @staticmethod
    def resolve_children(obj) -> list:
        return obj.children.filter(is_deleted=False).order_by("name")

    @staticmethod
    def resolve_ancestors(obj) -> list:
        return [
            {"id": a.id, "name": a.name, "slug": a.slug}
            for a in obj.get_ancestors()
        ]

    @staticmethod
    def resolve_members(obj) -> list:
        return obj.memberships.filter(is_active=True).select_related("user")

    @staticmethod
    def resolve_inherited_member_count(obj) -> int:
        return len(obj.get_all_member_ids())


class UserGroupChildOut(Schema):
    id: int
    name: str
    slug: str
    description: str
    member_count: int = 0

    @staticmethod
    def resolve_member_count(obj) -> int:
        return obj.memberships.filter(is_active=True).count()


class UserGroupCreateIn(Schema):
    name: str
    description: str = ""
    is_visible: bool = True
    free_to_join: bool = False
    join_code: str = ""
    parent_id: int | None = None


class UserGroupUpdateIn(Schema):
    name: str | None = None
    description: str | None = None
    is_visible: bool | None = None
    free_to_join: bool | None = None
    join_code: str | None = None
    parent_id: int | None = None


# --- Membership Schemas ---


class GroupMemberOut(Schema):
    id: int
    user_id: int
    user_email: str
    user_first_name: str
    user_last_name: str
    role: str
    date_joined: datetime
    is_active: bool

    @staticmethod
    def resolve_user_email(obj) -> str:
        return obj.user.email

    @staticmethod
    def resolve_user_first_name(obj) -> str:
        return obj.user.first_name

    @staticmethod
    def resolve_user_last_name(obj) -> str:
        return obj.user.last_name


class AddMemberIn(Schema):
    user_id: int
    role: str = "member"


class UpdateMemberIn(Schema):
    role: str | None = None
    is_active: bool | None = None


# --- Join Request Schemas ---


class JoinRequestOut(Schema):
    id: int
    user_id: int
    user_email: str
    group_id: int
    group_name: str
    message: str
    approved: bool | None
    date_requested: datetime
    date_checked: datetime | None

    @staticmethod
    def resolve_user_email(obj) -> str:
        return obj.user.email

    @staticmethod
    def resolve_group_name(obj) -> str:
        return obj.group.name


class JoinRequestIn(Schema):
    message: str = ""


class JoinByCodeIn(Schema):
    join_code: str


class JoinRequestDecisionIn(Schema):
    approved: bool
