"""Who is acting on a shopping list: a member with an account or a guest from an invitation link."""

from dataclasses import dataclass
from uuid import UUID

from django.http import HttpRequest
from ninja.errors import HttpError

from core.permissions import optional_user, require_login
from shopping.models import CollaboratorRole, ShoppingList, ShoppingListCollaborator, ShoppingListGuest

GUEST_TOKEN_HEADER = "HTTP_X_GUEST_TOKEN"
GUEST_ROLE = "guest"
MAX_GUESTS_PER_LIST = 100


@dataclass(frozen=True)
class Actor:
    """The effective identity of a request for one list."""

    role: str
    user: object | None = None
    guest: ShoppingListGuest | None = None

    @property
    def is_guest(self) -> bool:
        return self.guest is not None

    @property
    def can_edit(self) -> bool:
        return self.role in ("owner", CollaboratorRole.ADMIN, CollaboratorRole.EDITOR, GUEST_ROLE)

    @property
    def can_manage(self) -> bool:
        return self.role in ("owner", CollaboratorRole.ADMIN)

    def owns_claim(self, item) -> bool:
        """Whether this actor is the one who took over the item."""
        if self.guest is not None:
            return item.claimed_by_guest_id == self.guest.id
        return self.user is not None and item.claimed_by_id == getattr(self.user, "id", None)

    @property
    def display_name(self) -> str:
        if self.guest is not None:
            return self.guest.name
        from core.services.user_directory import public_display_name

        return public_display_name(self.user)


def member_role(shopping_list: ShoppingList, user) -> str | None:
    """Role of an account for a list: 'owner', a collaborator role, or None."""
    if shopping_list.owner_id == user.id:
        return "owner"
    collab = ShoppingListCollaborator.objects.filter(shopping_list=shopping_list, user=user).first()
    if collab is not None:
        return collab.role
    return "owner" if getattr(user, "is_staff", False) else None


def guest_from_request(request: HttpRequest, shopping_list: ShoppingList) -> ShoppingListGuest | None:
    """The guest the request's token belongs to; only valid while the link is active."""
    raw = request.META.get(GUEST_TOKEN_HEADER, "")
    if not raw or shopping_list.share_token is None:
        return None
    try:
        token = UUID(raw)
    except ValueError:
        return None
    return ShoppingListGuest.objects.filter(token=token, shopping_list=shopping_list).first()


def has_guest_header(request: HttpRequest) -> bool:
    return bool(request.META.get(GUEST_TOKEN_HEADER))


def require_login_unless_guest(request: HttpRequest, login_action: str | None = None) -> None:
    """Anonymous visitors without a guest token get the usual 401 before the list is even looked up."""
    if not has_guest_header(request):
        require_login(request, login_action)


def resolve_actor(request: HttpRequest, shopping_list: ShoppingList) -> Actor:
    """Member (or staff) first, then guest; everyone else sees a 404."""
    user = optional_user(request)
    if user is not None:
        role = member_role(shopping_list, user)
        if role is not None:
            return Actor(role=role, user=user)
    guest = guest_from_request(request, shopping_list)
    if guest is not None:
        return Actor(role=GUEST_ROLE, guest=guest)
    raise HttpError(404, "Einkaufsliste nicht gefunden")


def require_actor_edit(actor: Actor) -> Actor:
    if not actor.can_edit:
        raise HttpError(403, "Keine Berechtigung zum Bearbeiten")
    return actor
