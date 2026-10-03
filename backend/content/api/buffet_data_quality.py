"""Staff-only API for buffet catalog proposals and dry-run review."""

from __future__ import annotations

from typing import Any

from django.db.models import QuerySet
from django.http import HttpRequest
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Router
from ninja.errors import HttpError

from content.schemas.data_quality import (
    BuffetDataProposalCreateIn,
    BuffetDataProposalExportOut,
    BuffetDataProposalMappingOut,
    BuffetDataProposalOut,
    BuffetDataProposalPreviewOut,
    BuffetDataProposalReviewIn,
    BuffetDataProposalSuggestionIn,
    BuffetDataProposalSuggestionOut,
    BuffetDataProposalUpdateIn,
    BuffetDataQualityReportOut,
    PaginatedBuffetCandidateOut,
    PaginatedBuffetDataProposalOut,
)
from core.permissions import require_staff
from supply.choices import RecipeTypeChoices
from supply.models import BuffetDataProposal
from supply.services.buffet_catalog import BUFFET_ROLE_SLUGS
from supply.services.buffet_data_quality import (
    append_audit,
    buffet_data_quality_report,
    list_buffet_candidates,
    preview_buffet_proposal,
)

router = Router(tags=["Buffet Data Quality"])


def _proposal_out(proposal: BuffetDataProposal) -> dict[str, Any]:
    preview_result = proposal.preview_result or {}
    preview_current = False
    if proposal.preview_fingerprint:
        current_preview = preview_buffet_proposal(proposal)
        preview_current = current_preview["fingerprint"] == proposal.preview_fingerprint
    return {
        "id": proposal.id,
        "action": proposal.action,
        "item_kind": proposal.item_kind,
        "source_id": proposal.source_id,
        "source_expected_name": proposal.source_expected_name,
        "target_id": proposal.target_id,
        "target_expected_name": proposal.target_expected_name,
        "role_slugs": proposal.role_slugs,
        "proposed_data": proposal.proposed_data,
        "origin": proposal.origin,
        "ai_confidence": proposal.ai_confidence,
        "rationale": proposal.rationale,
        "status": proposal.status,
        "created_by_name": proposal.created_by.get_username() if proposal.created_by else None,
        "reviewed_by_name": proposal.reviewed_by.get_username() if proposal.reviewed_by else None,
        "review_note": proposal.review_note,
        "preview_current": preview_current,
        "preview_result": preview_result,
        "created_at": proposal.created_at,
        "updated_at": proposal.updated_at,
        "reviewed_at": proposal.reviewed_at,
    }


def _validate_role_slugs(role_slugs: list[str]) -> None:
    unknown = sorted(set(role_slugs) - set(BUFFET_ROLE_SLUGS))
    if unknown:
        raise HttpError(422, f"Unbekannte Buffet-Rolle: {', '.join(unknown)}")


def _proposal_queryset() -> QuerySet[BuffetDataProposal]:
    return BuffetDataProposal.objects.select_related("created_by", "reviewed_by")


@router.get("/report/", response=BuffetDataQualityReportOut)
def buffet_quality_report(request: HttpRequest, page: int = 1, page_size: int = 20) -> dict[str, Any]:
    require_staff(request)
    return buffet_data_quality_report(page=page, page_size=page_size)


@router.get("/candidates/", response=PaginatedBuffetCandidateOut)
def buffet_candidates(
    request: HttpRequest,
    q: str = "",
    action: str | None = None,
    kind: str | None = None,
    role_slug: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    require_staff(request)
    valid_actions = set(BuffetDataProposal.Action.values)
    valid_kinds = set(BuffetDataProposal.ItemKind.values)
    if action is not None and action not in valid_actions:
        raise HttpError(422, "Unbekannte Vorschlagsaktion.")
    if kind is not None and kind not in valid_kinds:
        raise HttpError(422, "Unbekannter Inhaltstyp.")
    if role_slug is not None and role_slug not in BUFFET_ROLE_SLUGS:
        raise HttpError(422, "Unbekannte Buffet-Rolle.")
    return list_buffet_candidates(
        q=q,
        action=action,
        kind=kind,
        role_slug=role_slug,
        page=page,
        page_size=page_size,
    )


@router.post("/proposals/suggest/", response=BuffetDataProposalSuggestionOut)
def suggest_buffet_item(
    request: HttpRequest, payload: BuffetDataProposalSuggestionIn
) -> BuffetDataProposalSuggestionOut:
    """Generate editable ingredient or recipe draft data without creating domain records."""
    require_staff(request)
    if len(payload.name.strip()) < 2:
        raise HttpError(422, "Bitte mindestens zwei Zeichen eingeben.")
    _validate_role_slugs(payload.role_slugs)
    if payload.item_kind == "recipe" and payload.recipe_type is not None:
        if payload.recipe_type not in RecipeTypeChoices.values:
            raise HttpError(422, "Unbekannter Rezepttyp.")
    if payload.item_kind == "ingredient":
        from supply.services.ingredient_ai_suggest_service import generate_ingredient_draft

        draft, interaction_id = generate_ingredient_draft(payload.name, user=request.user)
        proposed_data = draft.model_dump(mode="json")
        name = draft.name
    else:
        from recipe.services.recipe_ai_suggest_service import _map_recipe_type, generate_recipe_draft

        prompt = payload.name
        if payload.recipe_type:
            prompt = f"{payload.name}. Gewünschter Rezepttyp: {payload.recipe_type}."
        draft, interaction_id = generate_recipe_draft(prompt, user=request.user)
        proposed_data = draft.model_dump(mode="json")
        proposed_data["recipe_type"] = _map_recipe_type(draft.recipe_type)
        name = draft.title

    return BuffetDataProposalSuggestionOut(
        item_kind=payload.item_kind,
        name=name,
        proposed_data=proposed_data,
        ai_confidence=None,
        rationale="KI-Vorschlag – bitte fachlich prüfen und bei Bedarf manuell ergänzen.",
        ai_interaction_id=interaction_id,
    )


@router.get("/proposals/export/", response=BuffetDataProposalExportOut)
def export_buffet_proposals(request: HttpRequest) -> BuffetDataProposalExportOut:
    require_staff(request)
    proposals = _proposal_queryset().filter(status=BuffetDataProposal.Status.APPROVED).order_by("id")
    items = []
    for proposal in proposals:
        items.append(
            BuffetDataProposalMappingOut(
                action=proposal.action,
                item_kind=proposal.item_kind,
                source_id=proposal.source_id,
                source_name=proposal.source_expected_name
                or str(proposal.proposed_data.get("name") or proposal.proposed_data.get("title") or ""),
                target_id=proposal.target_id,
                target_name=proposal.target_expected_name,
                role_slugs=proposal.role_slugs,
                proposed_data=proposal.proposed_data,
            )
        )
    return BuffetDataProposalExportOut(items=items, exported_at=timezone.now())


@router.get("/proposals/", response=PaginatedBuffetDataProposalOut)
def list_buffet_proposals(
    request: HttpRequest,
    status: str | None = None,
    action: str | None = None,
    kind: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> PaginatedBuffetDataProposalOut:
    require_staff(request)
    if status is not None and status not in BuffetDataProposal.Status.values:
        raise HttpError(422, "Unbekannter Vorschlagsstatus.")
    if action is not None and action not in BuffetDataProposal.Action.values:
        raise HttpError(422, "Unbekannte Vorschlagsaktion.")
    if kind is not None and kind not in BuffetDataProposal.ItemKind.values:
        raise HttpError(422, "Unbekannter Inhaltstyp.")

    page = max(1, page)
    page_size = max(1, min(page_size, 50))
    proposals = _proposal_queryset()
    if status:
        proposals = proposals.filter(status=status)
    if action:
        proposals = proposals.filter(action=action)
    if kind:
        proposals = proposals.filter(item_kind=kind)
    total = proposals.count()
    total_pages = max(1, (total + page_size - 1) // page_size)
    start = (page - 1) * page_size
    return PaginatedBuffetDataProposalOut(
        items=[_proposal_out(proposal) for proposal in proposals[start : start + page_size]],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.post("/proposals/", response=BuffetDataProposalOut)
def create_buffet_proposal(request: HttpRequest, payload: BuffetDataProposalCreateIn) -> dict[str, Any]:
    require_staff(request)
    _validate_role_slugs(payload.role_slugs)
    if payload.action == "create":
        if payload.source_id is not None or payload.target_id is not None:
            raise HttpError(422, "Ein Neuanlage-Vorschlag darf keine vorhandenen Quell- oder Ziel-IDs enthalten.")
    elif payload.source_id is None or not payload.source_expected_name.strip():
        raise HttpError(422, "Bestehende Quell-Items benötigen ID und erwarteten Namen.")
    if payload.action == "merge_into" and (payload.target_id is None or not payload.target_expected_name.strip()):
        raise HttpError(422, "Ein Merge-Vorschlag benötigt Ziel-ID und erwarteten Namen.")
    if payload.action != "merge_into" and payload.target_id is not None:
        raise HttpError(422, "Nur ein Merge-Vorschlag darf eine Ziel-ID enthalten.")

    proposal = BuffetDataProposal.objects.create(
        action=payload.action,
        item_kind=payload.item_kind,
        source_id=payload.source_id,
        source_expected_name=payload.source_expected_name.strip(),
        target_id=payload.target_id,
        target_expected_name=payload.target_expected_name.strip(),
        role_slugs=payload.role_slugs,
        proposed_data=payload.proposed_data,
        origin=payload.origin,
        ai_confidence=payload.ai_confidence,
        rationale=payload.rationale,
        created_by=request.user,
    )
    append_audit(proposal, action="created", user=request.user, details={"origin": proposal.origin})
    proposal.save(update_fields=["audit_log", "updated_at"])
    return _proposal_out(proposal)


@router.patch("/proposals/{proposal_id}/", response=BuffetDataProposalOut)
def update_buffet_proposal(
    request: HttpRequest, proposal_id: int, payload: BuffetDataProposalUpdateIn
) -> dict[str, Any]:
    require_staff(request)
    proposal = get_object_or_404(_proposal_queryset(), id=proposal_id)
    if proposal.status != BuffetDataProposal.Status.PENDING:
        raise HttpError(409, "Nur ausstehende Vorschläge können geändert werden.")
    updates = payload.model_dump(exclude_unset=True)
    if "role_slugs" in updates:
        updates["role_slugs"] = updates["role_slugs"] or []
        _validate_role_slugs(updates["role_slugs"])
    for field_name in ("source_expected_name", "target_expected_name", "rationale"):
        if updates.get(field_name) is None:
            updates[field_name] = ""
    if updates.get("proposed_data") is None:
        updates["proposed_data"] = {}
    old_previewed = bool(proposal.preview_fingerprint)
    for field_name, value in updates.items():
        setattr(proposal, field_name, value)
    proposal.preview_fingerprint = ""
    proposal.previewed_at = None
    proposal.preview_result = {}
    append_audit(
        proposal,
        action="updated",
        user=request.user,
        details={"fields": sorted(updates), "preview_invalidated": old_previewed},
    )
    proposal.save()
    return _proposal_out(proposal)


@router.post("/proposals/{proposal_id}/preview/", response=BuffetDataProposalPreviewOut)
def preview_buffet_proposal_endpoint(request: HttpRequest, proposal_id: int) -> dict[str, Any]:
    require_staff(request)
    proposal = get_object_or_404(_proposal_queryset(), id=proposal_id)
    if proposal.status != BuffetDataProposal.Status.PENDING:
        raise HttpError(409, "Nur ausstehende Vorschläge können getestet werden.")
    result = preview_buffet_proposal(proposal)
    proposal.preview_fingerprint = result["fingerprint"]
    proposal.previewed_at = timezone.now()
    result["previewed_at"] = proposal.previewed_at.isoformat()
    proposal.preview_result = result
    append_audit(proposal, action="previewed", user=request.user, details={"can_approve": result["can_approve"]})
    proposal.save(update_fields=["preview_fingerprint", "previewed_at", "preview_result", "audit_log", "updated_at"])
    return result


@router.post("/proposals/{proposal_id}/review/", response=BuffetDataProposalOut)
def review_buffet_proposal(
    request: HttpRequest, proposal_id: int, payload: BuffetDataProposalReviewIn
) -> dict[str, Any]:
    require_staff(request)
    proposal = get_object_or_404(_proposal_queryset(), id=proposal_id)
    if proposal.status != BuffetDataProposal.Status.PENDING:
        raise HttpError(409, "Der Vorschlag wurde bereits geprüft.")

    if payload.decision == "approve":
        current_preview = preview_buffet_proposal(proposal)
        if not proposal.preview_fingerprint or current_preview["fingerprint"] != proposal.preview_fingerprint:
            raise HttpError(409, "Der Mapping-Test ist veraltet. Bitte erneut testen.")
        if not current_preview["can_approve"]:
            raise HttpError(409, "Der Mapping-Test enthält blockierende Fehler.")
        proposal.status = BuffetDataProposal.Status.APPROVED
    else:
        proposal.status = BuffetDataProposal.Status.REJECTED

    proposal.reviewed_by = request.user
    proposal.reviewed_at = timezone.now()
    proposal.review_note = payload.note
    append_audit(proposal, action=payload.decision, user=request.user, details={"note": payload.note})
    proposal.save(update_fields=["status", "reviewed_by", "reviewed_at", "review_note", "audit_log", "updated_at"])
    return _proposal_out(proposal)
