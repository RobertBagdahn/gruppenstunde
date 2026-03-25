"""Pydantic schemas for the Idea API (Django Ninja)."""

from datetime import date, datetime

from ninja import Schema


# --- Tag Schemas (hierarchical) ---


class TagOut(Schema):
    id: int
    name: str
    slug: str
    icon: str
    sort_order: int
    parent_id: int | None
    parent_name: str | None = None
    children: list["TagOut"] = []

    class Config:
        from_attributes = True


class TagTreeOut(Schema):
    """Flat tag with child count for tree rendering."""

    id: int
    name: str
    slug: str
    icon: str
    sort_order: int
    parent_id: int | None
    idea_count: int = 0


class TagSuggestIn(Schema):
    name: str
    parent_id: int | None = None


class ScoutLevelOut(Schema):
    id: int
    name: str
    icon: str


class NutritionalTagOut(Schema):
    id: int
    name: str
    name_opposite: str
    description: str
    rank: int
    is_dangerous: bool


# --- Author Schemas ---


class IdeaAuthorOut(Schema):
    """Author info exposed on idea detail."""

    id: int | None = None
    display_name: str
    scout_name: str = ""
    profile_picture_url: str | None = None
    is_registered: bool = False


# --- Material Schemas ---


class MaterialItemOut(Schema):
    id: int
    quantity: str
    material_name: str | None
    material_name_id: int | None = None
    material_name_slug: str | None = None
    material_unit: str | None
    quantity_type: str


class MaterialItemIn(Schema):
    quantity: str = ""
    material_name_id: int | None = None
    material_unit_id: int | None = None
    quantity_type: str = "once"


# --- Idea Schemas ---


class IdeaListOut(Schema):
    """Schema for idea list (compact)."""

    id: int
    title: str
    slug: str
    idea_type: str
    summary: str
    costs_rating: str
    execution_time: str
    difficulty: str
    image_url: str | None
    like_score: int
    view_count: int
    created_at: datetime
    scout_levels: list[ScoutLevelOut]
    tags: list[TagOut]

    @staticmethod
    def resolve_image_url(obj) -> str | None:
        if obj.image:
            return obj.image.url
        return None

    @staticmethod
    def resolve_tags(obj) -> list:
        return [
            {
                "id": t.id,
                "name": t.name,
                "slug": t.slug,
                "icon": t.icon,
                "sort_order": t.sort_order,
                "parent_id": t.parent_id,
                "parent_name": t.parent.name if t.parent else None,
            }
            for t in obj.tags.select_related("parent").all()
        ]


class IdeaSimilarOut(Schema):
    """Compact schema for similar ideas."""

    id: int
    title: str
    slug: str
    summary: str
    image_url: str | None
    difficulty: str
    execution_time: str

    @staticmethod
    def resolve_image_url(obj) -> str | None:
        if obj.image:
            return obj.image.url
        return None


class IdeaDetailOut(Schema):
    """Schema for single idea detail."""

    id: int
    title: str
    slug: str
    idea_type: str
    summary: str
    summary_long: str
    description: str
    costs_rating: str
    execution_time: str
    preparation_time: str
    difficulty: str
    status: str
    image_url: str | None
    like_score: int
    view_count: int
    created_at: datetime
    updated_at: datetime
    scout_levels: list[ScoutLevelOut]
    tags: list[TagOut]
    materials: list[MaterialItemOut]
    authors: list[IdeaAuthorOut] = []
    emotion_counts: dict[str, int] = {}
    user_emotion: str | None = None
    can_edit: bool = False
    next_best_ideas: list[IdeaSimilarOut] = []

    @staticmethod
    def resolve_image_url(obj) -> str | None:
        if obj.image:
            return obj.image.url
        return None

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
                result.append({
                    "id": user.id,
                    "display_name": display,
                    "scout_name": scout_name,
                    "profile_picture_url": pic_url,
                    "is_registered": True,
                })
            return result
        # Fallback: use created_by
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
            return [{
                "id": user.id,
                "display_name": display,
                "scout_name": scout_name,
                "profile_picture_url": pic_url,
                "is_registered": True,
            }]
        return []

    @staticmethod
    def resolve_tags(obj) -> list:
        return [
            {
                "id": t.id,
                "name": t.name,
                "slug": t.slug,
                "icon": t.icon,
                "sort_order": t.sort_order,
                "parent_id": t.parent_id,
                "parent_name": t.parent.name if t.parent else None,
            }
            for t in obj.tags.select_related("parent").all()
        ]

    @staticmethod
    def resolve_materials(obj) -> list:
        return [
            {
                "id": m.id,
                "quantity": m.quantity,
                "material_name": m.material_name.name if m.material_name else None,
                "material_name_id": m.material_name.id if m.material_name else None,
                "material_name_slug": m.material_name.slug if m.material_name else None,
                "material_unit": m.material_unit.name if m.material_unit else None,
                "quantity_type": m.quantity_type,
            }
            for m in obj.materials.select_related("material_name", "material_unit").all()
        ]


class MaterialCreateIn(Schema):
    quantity: str = ""
    material_name: str = ""
    material_unit: str = ""
    quantity_type: str = "once"


class IdeaCreateIn(Schema):
    """Schema for creating an idea (anonymous or authenticated)."""

    idea_type: str = "idea"
    title: str
    summary: str = ""
    summary_long: str = ""
    description: str = ""
    costs_rating: str = "free"
    execution_time: str = "less_30"
    preparation_time: str = "none"
    difficulty: str = "easy"
    scout_level_ids: list[int] = []
    tag_ids: list[int] = []
    materials: list[MaterialCreateIn] = []
    # Bot protection fields
    website: str = ""  # honeypot – must be empty
    form_loaded_at: float = 0  # JS timestamp – must be > 5s ago


class IdeaUpdateIn(Schema):
    """Schema for updating an idea."""

    idea_type: str | None = None
    title: str | None = None
    summary: str | None = None
    summary_long: str | None = None
    description: str | None = None
    costs_rating: str | None = None
    execution_time: str | None = None
    preparation_time: str | None = None
    difficulty: str | None = None
    status: str | None = None
    scout_level_ids: list[int] | None = None
    tag_ids: list[int] | None = None
    materials: list[MaterialCreateIn] | None = None


# --- Comment Schemas (with moderation) ---


class CommentOut(Schema):
    id: int
    text: str
    author_name: str
    user_id: int | None
    created_at: datetime
    parent_id: int | None
    status: str


class CommentIn(Schema):
    text: str
    author_name: str = ""
    parent_id: int | None = None


# --- Emotion Schemas ---


class EmotionOut(Schema):
    id: int
    emotion_type: str
    created_at: datetime


class EmotionIn(Schema):
    emotion_type: str


# --- Idea of the Week ---


class IdeaOfTheWeekOut(Schema):
    id: int
    idea: IdeaListOut
    release_date: date
    description: str


# --- Search/Filter ---


class IdeaFilterIn(Schema):
    q: str | None = None
    idea_type: str | None = None
    scout_level_ids: list[int] | None = None
    tag_slugs: list[str] | None = None
    difficulty: str | None = None
    costs_rating: str | None = None
    execution_time: str | None = None
    sort: str = "newest"
    page: int = 1
    page_size: int = 20


# --- Pagination ---


class PaginatedIdeaOut(Schema):
    items: list[IdeaListOut]
    total: int
    page: int
    page_size: int
    total_pages: int


# --- AI Schemas ---


class AiImproveTextIn(Schema):
    text: str
    context: str = ""


class AiImproveTextOut(Schema):
    improved_text: str


class AiSuggestTagsIn(Schema):
    text: str


class AiSuggestTagsOut(Schema):
    tag_ids: list[int]
    tag_names: list[str]


class AiRefurbishIn(Schema):
    raw_text: str


class SuggestedMaterialOut(Schema):
    quantity: str
    material_name: str
    material_unit: str
    quantity_type: str = "per_person"


class AiRefurbishOut(Schema):
    title: str
    summary: str
    summary_long: str
    description: str
    idea_type: str = "idea"
    suggested_tag_ids: list[int]
    suggested_tag_names: list[str]
    suggested_tags: list[TagOut] = []
    costs_rating: str
    execution_time: str
    preparation_time: str
    difficulty: str
    suggested_scout_level_ids: list[int] = []
    suggested_materials: list[SuggestedMaterialOut] = []


# --- Admin Schemas ---


class AdminSetAuthorIn(Schema):
    user_id: int


class AdminIdeaOfTheWeekIn(Schema):
    idea_id: int
    description: str = ""
    release_date: str | None = None


class ModerationActionIn(Schema):
    action: str  # "approve" or "reject"


# --- User Preferences ---


class UserPreferencesOut(Schema):
    preferred_scout_level_id: int | None
    preferred_group_size_min: int | None
    preferred_group_size_max: int | None
    preferred_difficulty: str
    preferred_location: str


class UserPreferencesIn(Schema):
    preferred_scout_level_id: int | None = None
    preferred_group_size_min: int | None = None
    preferred_group_size_max: int | None = None
    preferred_difficulty: str = ""
    preferred_location: str = ""


# --- Autocomplete ---


class AutocompleteOut(Schema):
    id: int
    title: str
    slug: str
    summary: str


# --- Material Detail Schemas ---


class MaterialIdeaOut(Schema):
    """Compact idea info shown on material detail page."""

    id: int
    title: str
    slug: str
    summary: str
    image_url: str | None = None


class MaterialNameDetailOut(Schema):
    id: int
    name: str
    slug: str
    description: str
    default_unit: str | None = None
    ideas: list[MaterialIdeaOut] = []


class MaterialNameListOut(Schema):
    id: int
    name: str
    slug: str
    default_unit: str | None = None


class MaterialUnitOut(Schema):
    id: int
    name: str
    description: str = ""
    quantity: float = 1
    unit: str = ""


class PaginatedMaterialNameOut(Schema):
    items: list[MaterialNameListOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class MaterialNameAdminIn(Schema):
    name: str
    description: str = ""
    default_unit_id: int | None = None


class MaterialUnitAdminIn(Schema):
    name: str
    description: str = ""
    quantity: float = 1
    unit: str = "ma"
