"""Pydantic schemas for user profile and preferences."""

from datetime import date, datetime

from ninja import Schema

from supply.schemas import NutritionalTagOut


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


class PublicContentOut(Schema):
    """Compact content info for public profile."""

    id: int
    title: str
    slug: str
    content_type: str
    summary: str
    image_url: str | None = None
    created_at: datetime

    @staticmethod
    def resolve_image_url(obj) -> str | None:
        if obj.image:
            return obj.image.url
        return None


# Backwards-compatible aliases
PublicIdeaOut = PublicContentOut


class MyContentOut(Schema):
    """Compact content info for the current user's profile (includes status)."""

    id: int
    title: str
    slug: str
    content_type: str
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


# Backwards-compatible alias
MyIdeaOut = MyContentOut


class PublicUserProfileOut(Schema):
    """Public user profile with authored content."""

    id: int
    scout_name: str
    first_name: str
    about_me: str
    profile_picture_url: str | None = None
    created_at: datetime
    contents: list[PublicContentOut] = []

    @staticmethod
    def resolve_profile_picture_url(obj) -> str | None:
        if obj.profile_picture:
            return obj.profile_picture.url
        return None


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
