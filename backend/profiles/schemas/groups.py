"""Pydantic schemas for groups, memberships, and join requests."""

from datetime import datetime

from ninja import Schema


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


class UserGroupChildOut(Schema):
    id: int
    name: str
    slug: str
    description: str
    member_count: int = 0

    @staticmethod
    def resolve_member_count(obj) -> int:
        return obj.memberships.filter(is_active=True).count()


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
    children: list[UserGroupChildOut] = []
    ancestors: list[GroupParentOut] = []
    created_by_id: int | None
    created_at: datetime
    updated_at: datetime
    members: list[GroupMemberOut] = []
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
        return [{"id": a.id, "name": a.name, "slug": a.slug} for a in obj.get_ancestors()]

    @staticmethod
    def resolve_members(obj) -> list:
        return obj.memberships.filter(is_active=True).select_related("user")

    @staticmethod
    def resolve_inherited_member_count(obj) -> int:
        return len(obj.get_all_member_ids())


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


class AddMemberIn(Schema):
    user_id: int
    role: str = "member"


class UpdateMemberIn(Schema):
    role: str | None = None
    is_active: bool | None = None


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
