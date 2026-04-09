"""Person CRUD endpoints."""

import math

from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from event.models import Person
from event.schemas import (
    PaginatedPersonOut,
    PersonCreateIn,
    PersonOut,
    PersonUpdateIn,
)

from .helpers import require_auth

person_router = Router(tags=["persons"])


# ==========================================================================
# Person CRUD
# ==========================================================================


@person_router.get("/", response=PaginatedPersonOut)
def list_persons(request, page: int = 1, page_size: int = 20):
    """List persons of the current user (paginated). Admins see all."""
    require_auth(request)
    if request.user.is_staff:
        qs = Person.objects.select_related("user").prefetch_related("nutritional_tags").all()
    else:
        qs = Person.objects.filter(user=request.user).prefetch_related("nutritional_tags")

    total = qs.count()
    total_pages = max(1, math.ceil(total / page_size))
    page = max(1, min(page, total_pages))
    offset = (page - 1) * page_size
    items = list(qs[offset : offset + page_size])

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@person_router.post("/", response=PersonOut)
def create_person(request, payload: PersonCreateIn):
    """Create a new person for the current user."""
    require_auth(request)
    data = payload.dict(exclude={"nutritional_tag_ids"})
    person = Person.objects.create(user=request.user, **data)
    if payload.nutritional_tag_ids:
        person.nutritional_tags.set(payload.nutritional_tag_ids)
    return person


@person_router.get("/{person_id}/", response=PersonOut)
def get_person(request, person_id: int):
    """Get a person by ID."""
    require_auth(request)
    person = get_object_or_404(Person, id=person_id)
    if person.user != request.user and not request.user.is_staff:
        raise HttpError(403, "Zugriff verweigert")
    return person


@person_router.patch("/{person_id}/", response=PersonOut)
def update_person(request, person_id: int, payload: PersonUpdateIn):
    """Update a person."""
    require_auth(request)
    person = get_object_or_404(Person, id=person_id)
    if person.user != request.user and not request.user.is_staff:
        raise HttpError(403, "Zugriff verweigert")
    data = payload.dict(exclude_unset=True)
    tag_ids = data.pop("nutritional_tag_ids", None)
    for field, value in data.items():
        setattr(person, field, value)
    person.save()
    if tag_ids is not None:
        person.nutritional_tags.set(tag_ids)
    return person


@person_router.delete("/{person_id}/")
def delete_person(request, person_id: int):
    """Delete a person."""
    require_auth(request)
    person = get_object_or_404(Person, id=person_id)
    if person.user != request.user and not request.user.is_staff:
        raise HttpError(403, "Zugriff verweigert")
    person.delete()
    return {"success": True, "message": "Person gelöscht"}
