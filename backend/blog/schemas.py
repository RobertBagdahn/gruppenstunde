"""Pydantic schemas for the blog app (Blog)."""

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


# ---------------------------------------------------------------------------
# Blog List Schema
# ---------------------------------------------------------------------------


class BlogListOut(ContentListOut):
    """Schema for blog list (compact)."""

    blog_type: str
    reading_time_minutes: int
    show_table_of_contents: bool


# ---------------------------------------------------------------------------
# Blog Detail Schema
# ---------------------------------------------------------------------------


class BlogDetailOut(ContentDetailOut):
    """Schema for single blog detail."""

    blog_type: str
    reading_time_minutes: int
    show_table_of_contents: bool
    similar_blogs: list[ContentSimilarOut] = []

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


# ---------------------------------------------------------------------------
# Blog Create / Update Schemas
# ---------------------------------------------------------------------------


class BlogCreateIn(ContentCreateIn):
    """Input schema for creating a Blog."""

    blog_type: str = "guide"
    show_table_of_contents: bool = True


class BlogUpdateIn(ContentUpdateIn):
    """Input schema for updating a Blog. All fields optional."""

    blog_type: str | None = None
    show_table_of_contents: bool | None = None


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------


class PaginatedBlogOut(Schema):
    """Paginated response for blog list."""

    items: list[BlogListOut]
    total: int
    page: int
    page_size: int
    total_pages: int
