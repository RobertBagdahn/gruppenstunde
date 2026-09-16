"""Staff-only API for portion repair findings.

Business logic lives in `supply.services.portion_repair`; these endpoints
only handle auth, pagination and serialization.
"""

import math

from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from supply.models import PortionRepairFinding
from supply.schemas.portion_repair import (
    PaginatedPortionRepairFindingOut,
    PortionRepairApplyOut,
    PortionRepairFindingOut,
    PortionRepairRejectOut,
)

portion_repair_router = Router(tags=["Portion Repair"])


def _require_staff(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        raise HttpError(403, "Nur für Administratoren")


def _to_out(finding: PortionRepairFinding) -> PortionRepairFindingOut:
    return PortionRepairFindingOut(
        id=finding.id,
        portion_id=finding.portion_id,
        ingredient_id=finding.ingredient_id,
        ingredient_name=finding.ingredient.name,
        portion_name=finding.portion.name,
        detection_reason=finding.detection_reason,
        status=finding.status,
        before_snapshot=finding.before_snapshot or {},
        recipe_item_ids=finding.recipe_item_ids or [],
        ai_proposal=finding.ai_proposal or {},
        confidence=finding.confidence,
        prompt_version=finding.prompt_version,
        threshold=finding.threshold,
        applied_portion_id=finding.applied_portion_id,
        moved_recipe_item_ids=finding.moved_recipe_item_ids or [],
        affected_recipe_ids=finding.affected_recipe_ids or [],
        applied_at=finding.applied_at.isoformat() if finding.applied_at else None,
        rejected_at=finding.rejected_at.isoformat() if finding.rejected_at else None,
        created_at=finding.created_at.isoformat(),
    )


@portion_repair_router.get("/", response=PaginatedPortionRepairFindingOut)
def list_findings(request, page: int = 1, page_size: int = 20, status: str | None = None):
    """Paginated list of portion repair findings (staff only)."""
    _require_staff(request)
    page_size = min(max(page_size, 1), 100)
    qs = PortionRepairFinding.objects.select_related("portion", "ingredient").order_by("-created_at")
    if status:
        qs = qs.filter(status=status)

    total = qs.count()
    total_pages = max(1, math.ceil(total / page_size))
    offset = (page - 1) * page_size
    items = [_to_out(finding) for finding in qs[offset : offset + page_size]]
    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@portion_repair_router.get("/{finding_id}", response=PortionRepairFindingOut)
def get_finding(request, finding_id: int):
    """Detail view of a single finding (staff only)."""
    _require_staff(request)
    finding = get_object_or_404(
        PortionRepairFinding.objects.select_related("portion", "ingredient"),
        id=finding_id,
    )
    return _to_out(finding)


@portion_repair_router.post("/{finding_id}/apply/", response=PortionRepairApplyOut)
def apply_finding_endpoint(request, finding_id: int):
    """Apply a ready finding (staff only)."""
    _require_staff(request)
    from supply.choices import PortionRepairStatus
    from supply.services.portion_repair import apply_finding

    finding = get_object_or_404(PortionRepairFinding, id=finding_id)
    if finding.status != PortionRepairStatus.READY and finding.status != PortionRepairStatus.PENDING_REVIEW:
        raise HttpError(409, f"Befund {finding_id} kann nicht angewendet werden (Status: {finding.status}).")

    result = apply_finding(finding, applied_by=request.user)
    return {
        "applied": result["applied"],
        "finding_id": finding.id,
        "applied_portion_id": result["applied_portion_id"],
        "moved_recipe_item_ids": result["moved_recipe_item_ids"],
        "affected_recipe_ids": result["affected_recipe_ids"],
    }


@portion_repair_router.post("/{finding_id}/reject/", response=PortionRepairRejectOut)
def reject_finding_endpoint(request, finding_id: int):
    """Reject a finding (staff only, no data changes)."""
    _require_staff(request)
    from supply.services.portion_repair import reject_finding

    finding = get_object_or_404(PortionRepairFinding, id=finding_id)
    try:
        reject_finding(finding, rejected_by=request.user)
    except ValueError as exc:
        raise HttpError(409, str(exc)) from exc
    return {"finding_id": finding.id, "status": finding.status}
