"""Deterministic portion repair scanning, idempotent finding creation and
safe repair application.

The scanner (Task 1.2/1.3) is deliberately deterministic and explainable:
it selects candidate portions using piece-like names, 1-g placeholders,
missing weights, unit mismatches and implausible rank-1 weights BEFORE any
AI call. AI evaluation happens in `portion_repair_ai.py`; safe application
logic lives at the bottom of this module (Task 2.3/2.4).
"""

from __future__ import annotations

import hashlib
import json
import logging
import re
from typing import TYPE_CHECKING

from django.db import transaction
from django.utils import timezone

from supply.choices import PortionRepairDetectionReason, PortionRepairStatus

if TYPE_CHECKING:
    from supply.models import Portion, PortionRepairFinding

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Scanner configuration
# ---------------------------------------------------------------------------

# Rank-1 portions below 0.1 g or above 2 kg per serving are implausible.
# Weights between 0.1 and 1 g (e.g. a "Prise" of 0.3 g) are legitimate for
# spices and stay unflagged.
MIN_PLAUSIBLE_RANK1_WEIGHT_G = 0.1
MAX_PLAUSIBLE_RANK1_WEIGHT_G = 2000.0

# German piece-like words. Word boundaries prevent false positives such as
# "Eis" matching "Ei" or "Reis" matching "Ei". Package/container words are a
# separate class: they legitimately carry gram weights with gram units.
_PIECE_PATTERN = re.compile(
    r"\b("
    r"stück|stücke|scheibe|scheiben|stange|stangen|blatt|blätter|zehe|zehen|knolle|knollen|"
    r"kopf|köpfe|bund|bünde|handvoll|würfel|spritzer|schuss|ei|eier|halbe|hälfte|"
    r"stückchen|rolle|rollen|brötchen|wurst|würste|keule|steak|filet|kotelett|koteletts|"
    r"tafel|tafeln|riegel"
    r")\b",
    re.IGNORECASE,
)

_PACKAGE_PATTERN = re.compile(
    r"\b(packung|packungen|dose|dosen|glas|gläser|tüte|tüten|beutel|becher|päckchen|" r"flasche|flaschen|paket)\b",
    re.IGNORECASE,
)

_GRAM_PATTERN = re.compile(r"\b(gramm|gram|g)\b", re.IGNORECASE)
_EXPLICIT_WEIGHT_PATTERN = re.compile(r"(?:\(|\s|^)\d+(?:[.,]\d+)?\s*(?:g|gramm|gram)\b", re.IGNORECASE)


def _is_piece_like(name: str) -> bool:
    return bool(_PIECE_PATTERN.search(name or ""))


def _is_package_like(name: str) -> bool:
    return bool(_PACKAGE_PATTERN.search(name or ""))


def _is_gram_like(name: str, unit: str) -> bool:
    if unit == "g":
        return True
    return bool(_GRAM_PATTERN.search(name or ""))


def _has_explicit_weight(name: str) -> bool:
    """Return whether a legacy portion name states its own gram weight."""
    return bool(_EXPLICIT_WEIGHT_PATTERN.search(name or ""))


def _detect_reason(portion: Portion) -> str | None:
    """Return the detection reason for a suspicious portion, or None."""
    name = portion.name or ""
    unit = portion.measuring_unit.unit if portion.measuring_unit else ""
    weight = portion.weight_g

    # Pieces and packages with a 1-g or missing weight are broken: a Stück or
    # a Packung never weighs 1 gram.
    if (_is_piece_like(name) or _is_package_like(name)) and (weight is None or weight == 1):
        return PortionRepairDetectionReason.PIECE_NAME_ONE_GRAM

    # A bare piece-like name carried on a gram unit is contradictory. Legacy
    # names such as "1 Stück (150g)" already state the intended weight and
    # should not be treated as broken weight data solely because their unit is
    # still Gramm; those names can be normalized separately.
    if _is_piece_like(name) and unit == "g" and not _has_explicit_weight(name):
        return PortionRepairDetectionReason.PIECE_NAME_GRAM_UNIT

    if weight == 1 and portion.rank == 1 and not _is_gram_like(name, unit):
        return PortionRepairDetectionReason.ONE_GRAM_PLACEHOLDER

    if weight is None:
        return PortionRepairDetectionReason.MISSING_WEIGHT

    if portion.rank == 1 and (weight < MIN_PLAUSIBLE_RANK1_WEIGHT_G or weight > MAX_PLAUSIBLE_RANK1_WEIGHT_G):
        return PortionRepairDetectionReason.IMPLAUSIBLE_RANK1

    return None


def classify_repair_path(portion: Portion) -> tuple[str, float | None]:
    """Classify a finding for the repair UI without mutating its portion."""
    if portion.weight_g is not None and portion.weight_g > 0:
        return "review", None
    computed = portion.compute_weight_g(None)
    if (
        computed is not None
        and computed > 0
        and not _is_piece_like(portion.name)
        and not _is_package_like(portion.name)
    ):
        return "automatic", float(computed)
    if _is_piece_like(portion.name) or _is_package_like(portion.name):
        return "review", None
    return "delete", None


def _build_before_snapshot(portion: Portion) -> dict:
    """Capture the portion values that a repair may change."""
    measuring_unit = portion.measuring_unit
    return {
        "name": portion.name,
        "weight_g": portion.weight_g,
        "quantity": portion.quantity,
        "rank": portion.rank,
        "measuring_unit_id": measuring_unit.id if measuring_unit else None,
        "measuring_unit_name": measuring_unit.name if measuring_unit else None,
        "measuring_unit_unit": measuring_unit.unit if measuring_unit else None,
    }


def _snapshot_hash(snapshot: dict) -> str:
    payload = json.dumps(snapshot, sort_keys=True, ensure_ascii=False)
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def get_candidate_portions():
    """Return the queryset of active portions that match a detection rule."""
    from supply.models import Portion

    portions = list(
        Portion.objects.filter(deleted_at__isnull=True)
        .select_related("ingredient", "measuring_unit")
        .order_by("ingredient_id", "rank", "id")
    )
    return [p for p in portions if _detect_reason(p) is not None]


def scan_suspicious_portions(*, dry_run: bool = False, limit: int | None = None) -> list[dict]:
    """Scan all active portions and create idempotent repair findings.

    Idempotency: a portion is skipped when its latest finding carries the
    identical before-snapshot hash, so re-runs never duplicate candidates.
    A stale OPEN finding whose portion data changed since the scan is
    superseded (status=skipped) before the new finding is created.
    With `dry_run=True` nothing is written and only report dicts are returned.

    Returns a list of dicts: {"portion_id", "ingredient_id", "ingredient_name",
    "reason", "recipe_item_ids", "finding_id", "created"}.
    """
    from recipe.models import RecipeItem
    from supply.models import PortionRepairFinding

    OPEN_STATUSES = [
        PortionRepairStatus.CANDIDATE,
        PortionRepairStatus.PENDING_REVIEW,
        PortionRepairStatus.READY,
    ]

    reports: list[dict] = []
    candidates = get_candidate_portions()
    if limit is not None:
        candidates = candidates[:limit]

    latest_by_portion: dict[int, PortionRepairFinding] = {}
    for finding in PortionRepairFinding.objects.order_by("created_at", "id"):
        latest_by_portion[finding.portion_id] = finding

    for portion in candidates:
        snapshot = _build_before_snapshot(portion)
        snapshot_hash = _snapshot_hash(snapshot)

        latest = latest_by_portion.get(portion.pk)
        if latest is not None and latest.before_snapshot_hash == snapshot_hash:
            continue

        recipe_item_ids = sorted(
            RecipeItem.objects.filter(portion=portion).values_list("id", flat=True),
        )
        report = {
            "portion_id": portion.id,
            "ingredient_id": portion.ingredient_id,
            "ingredient_name": portion.ingredient.name,
            "reason": _detect_reason(portion),
            "recipe_item_ids": recipe_item_ids,
            "finding_id": None,
            "created": False,
        }
        report["repair_path"], report["suggested_weight_g"] = classify_repair_path(portion)

        if not dry_run:
            if latest is not None and latest.status in OPEN_STATUSES:
                latest.status = PortionRepairStatus.SKIPPED
                latest.save(update_fields=["status", "updated_at"])
                logger.info(
                    "Superseded stale open finding %s for portion %s (data changed)",
                    latest.id,
                    portion.id,
                )
            finding = PortionRepairFinding.objects.create(
                portion=portion,
                ingredient=portion.ingredient,
                detection_reason=_detect_reason(portion),
                status=PortionRepairStatus.CANDIDATE,
                before_snapshot=snapshot,
                before_snapshot_hash=snapshot_hash,
                recipe_item_ids=recipe_item_ids,
            )
            report["finding_id"] = finding.id
            report["created"] = True

        reports.append(report)

    return reports


# ---------------------------------------------------------------------------
# Safe application (Task 2.3/2.4)
# ---------------------------------------------------------------------------


def _find_or_create_measuring_unit(unit_name: str):
    """Resolve a MeasuringUnit by name, creating it with a sensible unit type
    when missing (falling back to Gramm as last resort)."""
    from supply.choices import MeasuringUnitType
    from supply.models import MeasuringUnit

    name = (unit_name or "Gramm").strip()
    unit = MeasuringUnit.objects.filter(name__iexact=name).first()
    if unit:
        return unit

    lower = name.lower()
    if "stück" in lower or "stueck" in lower or lower in {"stk", "stk."}:
        unit_type = MeasuringUnitType.PIECE
    elif any(
        word in lower
        for word in (
            "milliliter",
            "liter",
            "ml",
            "tasse",
            "esslöffel",
            "teelöffel",
            "el",
            "tl",
            "schuss",
            "spritzer",
            "dose",
            "glas",
            "becher",
            "flasche",
        )
    ):
        unit_type = MeasuringUnitType.VOLUME
    else:
        unit_type = MeasuringUnitType.MASS

    unit, _ = MeasuringUnit.objects.get_or_create(
        name__iexact=name,
        defaults={"name": name, "unit": unit_type, "quantity": 1.0},
    )
    return unit or MeasuringUnit.objects.filter(name__iexact="Gramm").first()


def _move_items_to_replacement(portion: Portion, replacement: Portion, intended_item_ids: list[int]) -> list[int]:
    """Move only the intended RecipeItems onto the replacement portion,
    preserving the gram amount (`quantity * weight_g` stays constant) so
    recipe weights, nutrition, prices and shopping lists remain identical.

    Items recorded at scan time are moved only while they still reference the
    original portion. Returns the list of moved RecipeItem ids.
    """
    from recipe.models import RecipeItem
    from supply.services.portion_resolution import resolve_trusted_weight

    old_weight_g = resolve_trusted_weight(portion)
    new_weight_g = resolve_trusted_weight(replacement)
    if old_weight_g is None or new_weight_g is None:
        raise ValueError("Portion-Reparatur benötigt vertrauenswürdige Gewichte für Quelle und Ziel.")

    moved_ids: list[int] = []
    items = RecipeItem.objects.filter(portion=portion, id__in=intended_item_ids)
    for item in items:
        grams = item.quantity * old_weight_g
        item.portion = replacement
        # Clamp away from exactly 0 — RecipeItem.quantity has a DB check
        # constraint (> 0); rounding a tiny gram amount against a large
        # target weight_g can otherwise round down to 0.0.
        item.quantity = max(round(grams / new_weight_g, 4), 0.0001)
        item.save(update_fields=["portion", "quantity"])
        moved_ids.append(item.id)
    return moved_ids


def _update_unreferenced_portion(portion: Portion, proposal: dict) -> None:
    """Apply a repair to an unreferenced portion in place."""
    from supply.models import Portion

    name = proposal.get("proposed_name") or portion.name
    if (
        name.lower() != (portion.name or "").lower()
        and Portion.objects.filter(
            ingredient=portion.ingredient,
            name__iexact=name,
            deleted_at__isnull=True,
        ).exists()
    ):
        name = f"{name} (korrigiert)"

    measuring_unit = _find_or_create_measuring_unit(proposal.get("proposed_unit_name") or "")
    portion.name = name
    portion.quantity = proposal.get("proposed_quantity") or 1.0
    portion.measuring_unit = measuring_unit
    portion.weight_g = proposal.get("proposed_weight_g")
    portion.save()


def _apply_to_portion(portion: Portion, proposal: dict, intended_item_ids: list[int]):
    """Apply a repair proposal to a portion.

    Referenced portions are never changed in place: a corrected replacement
    portion is created and only the intended RecipeItems are moved.
    Unreferenced portions are updated in place. Returns (applied_portion,
    moved_recipe_item_ids, affected_recipe_ids).
    """
    from recipe.models import RecipeItem
    from supply.services.portion_integrity import create_replacement_portion

    affected_recipe_ids = sorted(
        RecipeItem.objects.filter(portion=portion).values_list("recipe_id", flat=True).distinct()
    )
    if portion.is_referenced_by_recipe_items():
        measuring_unit = _find_or_create_measuring_unit(proposal.get("proposed_unit_name") or "")
        replacement = create_replacement_portion(
            portion,
            name=proposal.get("proposed_name") or portion.name,
            quantity=proposal.get("proposed_quantity") or 1.0,
            measuring_unit=measuring_unit,
            weight_g=proposal.get("proposed_weight_g"),
        )
        moved_ids = _move_items_to_replacement(portion, replacement, intended_item_ids)
        return replacement, moved_ids, affected_recipe_ids

    _update_unreferenced_portion(portion, proposal)
    return portion, [], affected_recipe_ids


def apply_finding(
    finding: PortionRepairFinding,
    *,
    applied_by=None,
    recalculate_caches: bool = True,
) -> dict:
    """Apply a ready finding within one atomic transaction.

    Idempotent: an already applied finding returns its stored outcome without
    creating another replacement or moving items a second time. Moves and
    audit writes happen in one transaction; affected recipe caches are
    recalculated once per recipe afterwards.
    """
    if finding.status == PortionRepairStatus.APPLIED:
        return {
            "applied": False,
            "finding_id": finding.id,
            "applied_portion_id": finding.applied_portion_id,
            "moved_recipe_item_ids": finding.moved_recipe_item_ids,
            "affected_recipe_ids": finding.affected_recipe_ids,
        }

    proposal = finding.ai_proposal or {}
    if not proposal:
        raise ValueError(f"Finding {finding.id} has no AI proposal — cannot apply.")

    from supply.services.portion_repair_ai import GeminiPortionRepairProposal, _is_safe_for_automatic_application

    parsed_proposal = GeminiPortionRepairProposal.model_validate(proposal)
    if not _is_safe_for_automatic_application(finding, parsed_proposal):
        finding.status = PortionRepairStatus.PENDING_REVIEW
        finding.save(update_fields=["status", "updated_at"])
        return {
            "applied": False,
            "finding_id": finding.id,
            "applied_portion_id": finding.applied_portion_id,
            "moved_recipe_item_ids": finding.moved_recipe_item_ids or [],
            "affected_recipe_ids": finding.affected_recipe_ids or [],
        }

    proposed_weight = proposal.get("proposed_weight_g")
    if finding.portion.weight_status == "ai_proposed" or proposed_weight is None or proposed_weight <= 0:
        finding.status = PortionRepairStatus.PENDING_REVIEW
        finding.save(update_fields=["status", "updated_at"])
        return {
            "applied": False,
            "finding_id": finding.id,
            "applied_portion_id": finding.applied_portion_id,
            "moved_recipe_item_ids": finding.moved_recipe_item_ids or [],
            "affected_recipe_ids": finding.affected_recipe_ids or [],
        }

    with transaction.atomic():
        applied_portion, moved_ids, affected_recipe_ids = _apply_to_portion(
            finding.portion,
            proposal,
            list(finding.recipe_item_ids or []),
        )
        finding.status = PortionRepairStatus.APPLIED
        finding.applied_portion = applied_portion
        finding.moved_recipe_item_ids = moved_ids
        finding.affected_recipe_ids = affected_recipe_ids
        finding.applied_by = applied_by
        finding.applied_at = timezone.now()
        finding.save(
            update_fields=[
                "status",
                "applied_portion",
                "moved_recipe_item_ids",
                "affected_recipe_ids",
                "applied_by",
                "applied_at",
                "updated_at",
            ],
        )

    if recalculate_caches and affected_recipe_ids:
        from recipe.models import Recipe
        from recipe.services.recipe_checks import recalculate_recipe_cache

        for recipe in Recipe.objects.filter(id__in=affected_recipe_ids):
            recalculate_recipe_cache(recipe)

    logger.info(
        "Applied portion repair finding %s: portion %s → %s, moved %d item(s), %d affected recipe(s)",
        finding.id,
        finding.portion_id,
        applied_portion.id,
        len(moved_ids),
        len(affected_recipe_ids),
    )
    return {
        "applied": True,
        "finding_id": finding.id,
        "applied_portion_id": applied_portion.id,
        "moved_recipe_item_ids": moved_ids,
        "affected_recipe_ids": affected_recipe_ids,
    }


def reject_finding(finding: PortionRepairFinding, *, rejected_by=None) -> None:
    """Mark a finding as rejected (no data changes)."""
    if finding.status not in (
        PortionRepairStatus.PENDING_REVIEW,
        PortionRepairStatus.READY,
        PortionRepairStatus.CANDIDATE,
    ):
        raise ValueError(f"Finding {finding.id} is already {finding.status}.")
    finding.status = PortionRepairStatus.REJECTED
    finding.rejected_by = rejected_by
    finding.rejected_at = timezone.now()
    finding.save(update_fields=["status", "rejected_by", "rejected_at", "updated_at"])
