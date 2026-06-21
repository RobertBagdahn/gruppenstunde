"""ContentCollaborator schemas."""

from ninja import Schema


class ContentCollaboratorOut(Schema):
    id: int
    user_id: int | None = None
    user_display_name: str | None = None
    group_id: int | None = None
    group_name: str | None = None
    role: str
    created_by_id: int | None = None
    created_at: str


class ContentCollaboratorIn(Schema):
    content_type_app: str
    content_type_model: str
    object_id: int
    user_id: int | None = None
    group_id: int | None = None
    role: str = "viewer"


class ContentCollaboratorUpdateIn(Schema):
    role: str
