"""Ingredient price proposal endpoints (create, list, accept, reject)."""

import math

from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from supply.models import Ingredient, IngredientPriceProposal
from supply.schemas import (
    IngredientPriceProposalAcceptIn,
    IngredientPriceProposalListOut,
    IngredientPriceProposalOut,
)
from supply.services.ingredient_price_proposal_service import (
    accept_proposal,
    create_price_proposal,
    reject_proposal,
)

from .helpers import require_auth
from .ingredients import _can_edit_ingredient, _is_staff_or_admin_user

price_proposal_router = Router(tags=["ingredient-price-proposals"])


def _get_ingredient_for_user(request, slug: str) -> Ingredient:
    from content.services.food_access import get_ingredient_detail_or_404

    return get_ingredient_detail_or_404(request.user, slug)


def _check_proposal_permission(ingredient: Ingredient, request) -> None:
    """Only users with edit permission on the ingredient or staff may create/approve proposals."""
    require_auth(request)
    if not _can_edit_ingredient(ingredient, request.user) and not _is_staff_or_admin_user(request.user):
        raise HttpError(403, "Keine Berechtigung, Preisvorschläge für diese Zutat zu verwalten")


@price_proposal_router.post("/{slug}/price-proposals/", response=IngredientPriceProposalOut)
def create_price_proposal_endpoint(request, slug: str):
    """Create an AI price proposal for an ingredient with a missing price.

    Idempotent: returns the existing pending proposal when present.
    Rejects ingredients that already have a positive price.
    """
    ingredient = _get_ingredient_for_user(request, slug)
    _check_proposal_permission(ingredient, request)

    proposal = create_price_proposal(ingredient, request.user)
    return proposal


@price_proposal_router.get("/{slug}/price-proposals/", response=IngredientPriceProposalListOut)
def list_price_proposals(request, slug: str, page: int = 1, page_size: int = 20):
    """List price proposals for an ingredient (newest first)."""
    ingredient = _get_ingredient_for_user(request, slug)
    _check_proposal_permission(ingredient, request)

    qs = (
        IngredientPriceProposal.objects.filter(ingredient=ingredient)
        .select_related("requested_by", "requested_by__profile", "reviewed_by", "reviewed_by__profile")
        .order_by("-created_at")
    )
    total = qs.count()
    total_pages = max(1, math.ceil(total / page_size))
    offset = (page - 1) * page_size

    return {
        "items": list(qs[offset : offset + page_size]),
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@price_proposal_router.post("/{slug}/price-proposals/{proposal_id}/accept/", response=IngredientPriceProposalOut)
def accept_price_proposal(request, slug: str, proposal_id: int, payload: IngredientPriceProposalAcceptIn):
    """Accept a pending proposal and apply its price to the ingredient."""
    ingredient = _get_ingredient_for_user(request, slug)
    _check_proposal_permission(ingredient, request)

    proposal = get_object_or_404(IngredientPriceProposal, id=proposal_id, ingredient=ingredient)
    return accept_proposal(proposal, request.user, replace=payload.replace)


@price_proposal_router.post("/{slug}/price-proposals/{proposal_id}/reject/", response=IngredientPriceProposalOut)
def reject_price_proposal(request, slug: str, proposal_id: int):
    """Reject a pending proposal without changing the ingredient price."""
    ingredient = _get_ingredient_for_user(request, slug)
    _check_proposal_permission(ingredient, request)

    proposal = get_object_or_404(IngredientPriceProposal, id=proposal_id, ingredient=ingredient)
    return reject_proposal(proposal, request.user)
