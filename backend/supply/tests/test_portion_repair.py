"""Tests for the deterministic portion repair scanner and safe apply logic.

Covers the change `repair-food-portion-data`: deterministic candidate
scanning (valid gram portions must not be flagged), idempotent finding
creation, dry-run reporting, soft-delete handling, AI evaluation thresholds,
safe application for referenced/unreferenced portions, idempotent re-apply,
rollback, meal-plan variant protection and cache recalculation.
"""

import json
import uuid
from types import SimpleNamespace

import pytest
from django.utils import timezone

from recipe.tests import make_recipe_item
from supply.choices import PortionRepairDetectionReason, PortionRepairStatus
from supply.models import Ingredient, MeasuringUnit, Portion, PortionRepairFinding, RetailSection
from supply.services.portion_repair import (
    _detect_reason,
    apply_finding,
    extract_explicit_weight_g,
    get_candidate_portions,
    scan_suspicious_portions,
)

# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def retail_section(db):
    return RetailSection.objects.create(name="Gemüse", rank=1)


@pytest.fixture
def ingredient(db, retail_section):
    return Ingredient.objects.create(
        name="Testzutat",
        slug="testzutat",
        status="verified",
        retail_section=retail_section,
    )


@pytest.fixture
def gram_unit(db):
    return MeasuringUnit.objects.create(name="Gramm", unit="g", quantity=1.0)


@pytest.fixture
def piece_unit(db):
    return MeasuringUnit.objects.create(name="Stück", unit="stk", quantity=1.0)


def make_portion(ingredient, measuring_unit, **kwargs):
    portion = Portion(
        ingredient=ingredient,
        measuring_unit=measuring_unit,
        name=kwargs.pop("name", "Gramm"),
        quantity=kwargs.pop("quantity", 1.0),
        rank=kwargs.pop("rank", 1),
    )
    portion.weight_g = kwargs.pop("weight_g", 1.0)
    portion.weight_status = kwargs.pop("weight_status", "imported")
    portion.weight_source = kwargs.pop("weight_source", "import")
    portion.save()
    return portion


# ---------------------------------------------------------------------------
# 1.2 Detection rules
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_valid_gram_portion_not_flagged(ingredient, gram_unit):
    portion = make_portion(ingredient, gram_unit, name="Gramm", weight_g=1.0)
    assert _detect_reason(portion) is None
    assert get_candidate_portions() == []


@pytest.mark.django_db
def test_piece_name_with_one_gram_flagged(ingredient, gram_unit):
    portion = make_portion(ingredient, gram_unit, name="Stück", weight_g=1.0)
    assert _detect_reason(portion) == PortionRepairDetectionReason.PIECE_NAME_ONE_GRAM


@pytest.mark.django_db
def test_piece_name_with_missing_weight_flagged(ingredient, gram_unit):
    portion = make_portion(ingredient, gram_unit, name="Scheibe", weight_g=None)
    assert _detect_reason(portion) == PortionRepairDetectionReason.PIECE_NAME_ONE_GRAM


@pytest.mark.django_db
def test_piece_name_with_gram_unit_flagged(ingredient, gram_unit):
    portion = make_portion(ingredient, gram_unit, name="Stück", weight_g=50.0)
    assert _detect_reason(portion) == PortionRepairDetectionReason.PIECE_NAME_GRAM_UNIT


@pytest.mark.django_db
def test_piece_name_with_explicit_weight_is_not_flagged(ingredient, gram_unit):
    portion = make_portion(ingredient, gram_unit, name="1 Stück (150g)", weight_g=150.0)
    assert _detect_reason(portion) is None


def test_extract_explicit_weight_from_legacy_name():
    assert extract_explicit_weight_g("kleine (50g)") == 50.0
    assert extract_explicit_weight_g("1 Stück (150 g)") == 150.0
    assert extract_explicit_weight_g("100 Gramm") == 100.0
    assert extract_explicit_weight_g("Stück") is None


@pytest.mark.django_db
def test_handful_name_with_explicit_weight_is_not_flagged(ingredient, gram_unit):
    portion = make_portion(ingredient, gram_unit, name="1 Handvoll (50g)", weight_g=50.0)
    assert _detect_reason(portion) is None


@pytest.mark.django_db
def test_package_name_with_gram_unit_not_flagged(ingredient, gram_unit):
    portion = make_portion(ingredient, gram_unit, name="Packung", weight_g=200.0)
    assert _detect_reason(portion) is None


@pytest.mark.django_db
def test_package_name_with_one_gram_flagged(ingredient, gram_unit):
    portion = make_portion(ingredient, gram_unit, name="Packung", weight_g=1.0)
    assert _detect_reason(portion) == PortionRepairDetectionReason.PIECE_NAME_ONE_GRAM


@pytest.mark.django_db
def test_piece_name_with_piece_unit_and_plausible_weight_not_flagged(ingredient, piece_unit):
    portion = make_portion(ingredient, piece_unit, name="Stück", weight_g=80.0)
    assert _detect_reason(portion) is None


@pytest.mark.django_db
def test_one_gram_placeholder_flagged(ingredient, piece_unit):
    portion = make_portion(ingredient, piece_unit, name="Portion", weight_g=1.0, rank=1)
    assert _detect_reason(portion) == PortionRepairDetectionReason.ONE_GRAM_PLACEHOLDER


@pytest.mark.django_db
def test_missing_weight_flagged(ingredient):
    zero_unit = MeasuringUnit.objects.create(name="Unbekannt", unit="stk", quantity=0.0)
    portion = make_portion(ingredient, zero_unit, name="Portion", weight_g=None, rank=2)
    assert portion.weight_g is None
    assert _detect_reason(portion) == PortionRepairDetectionReason.MISSING_WEIGHT


@pytest.mark.django_db
def test_implausible_rank1_weight_flagged(ingredient, gram_unit):
    too_large = make_portion(ingredient, gram_unit, name="Gramm", weight_g=5000.0, rank=1)
    assert _detect_reason(too_large) == PortionRepairDetectionReason.IMPLAUSIBLE_RANK1


@pytest.mark.django_db
def test_small_piece_rank1_weight_not_implausible(ingredient, gram_unit):
    prise = make_portion(ingredient, gram_unit, name="Prise", weight_g=0.3, rank=1)
    assert _detect_reason(prise) is None


# ---------------------------------------------------------------------------
# 1.3/1.4 Scanner, dry-run and idempotency
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_scan_dry_run_writes_nothing(ingredient, gram_unit):
    make_portion(ingredient, gram_unit, name="Stück", weight_g=1.0)
    reports = scan_suspicious_portions(dry_run=True)
    assert len(reports) == 1
    assert reports[0]["created"] is False
    assert PortionRepairFinding.objects.count() == 0


@pytest.mark.django_db
def test_scan_creates_idempotent_findings(ingredient, gram_unit):
    portion = make_portion(ingredient, gram_unit, name="Stück", weight_g=1.0)
    make_recipe_item(portion=portion, quantity=2.0)

    first = scan_suspicious_portions()
    assert len(first) == 1
    assert first[0]["created"] is True
    finding = PortionRepairFinding.objects.get(portion=portion)
    assert finding.status == PortionRepairStatus.CANDIDATE
    assert finding.before_snapshot["weight_g"] == 1.0
    item_ids = list(finding.recipe_item_ids)
    assert len(item_ids) == 1

    # Repeated scan must not duplicate the finding
    second = scan_suspicious_portions()
    assert second == []
    assert PortionRepairFinding.objects.filter(portion=portion).count() == 1


@pytest.mark.django_db
def test_scan_skips_soft_deleted_portions(ingredient, gram_unit):
    portion = make_portion(ingredient, gram_unit, name="Stück", weight_g=1.0)
    portion.soft_delete()
    assert scan_suspicious_portions(dry_run=True) == []


@pytest.mark.django_db
def test_scan_reruns_after_data_change(ingredient, gram_unit):
    portion = make_portion(ingredient, gram_unit, name="Stück", weight_g=1.0)
    scan_suspicious_portions()

    # Repaired data with a new snapshot → a new finding is legitimate
    portion.name = "Stück"
    portion.weight_g = 80.0
    portion.save()
    reports = scan_suspicious_portions()
    assert len(reports) == 1
    assert reports[0]["created"] is True
    assert PortionRepairFinding.objects.count() == 2


# ---------------------------------------------------------------------------
# 2.2 AI evaluation thresholds (mocked Gemini)
# ---------------------------------------------------------------------------


@pytest.fixture
def fake_gemini_response(monkeypatch):
    def _fake(payload: dict):
        response = SimpleNamespace(text=json.dumps(payload))

        def _gemini_call(**kwargs):
            return response, uuid.uuid4()

        monkeypatch.setattr("supply.services.portion_repair_ai.gemini_call", _gemini_call)

    return _fake


def _candidate_finding(portion):
    return PortionRepairFinding.objects.create(
        portion=portion,
        ingredient=portion.ingredient,
        detection_reason=PortionRepairDetectionReason.PIECE_NAME_ONE_GRAM,
        before_snapshot={"name": portion.name, "weight_g": portion.weight_g},
        before_snapshot_hash="abc",
        recipe_item_ids=[],
    )


@pytest.mark.django_db
def test_evaluate_high_confidence_becomes_ready(ingredient, gram_unit, fake_gemini_response):
    from supply.services.portion_repair_ai import evaluate_finding

    portion = make_portion(ingredient, gram_unit, name="Stück", weight_g=1.0)
    finding = _candidate_finding(portion)
    fake_gemini_response(
        {
            "classification": "piece",
            "proposed_name": "Stück",
            "proposed_weight_g": 60.0,
            "proposed_quantity": 1.0,
            "proposed_unit_name": "Stück",
            "confidence": 0.95,
            "rationale": "Ei wiegt ca. 60g",
        }
    )
    evaluate_finding(finding)
    finding.refresh_from_db()
    assert finding.status == PortionRepairStatus.READY
    assert finding.confidence == 0.95
    assert finding.prompt_version == "1"
    assert finding.threshold == 0.90
    assert finding.ai_proposal["proposed_weight_g"] == 60.0


@pytest.mark.django_db
def test_evaluate_low_confidence_stays_pending_review(ingredient, gram_unit, fake_gemini_response):
    from supply.services.portion_repair_ai import evaluate_finding

    portion = make_portion(ingredient, gram_unit, name="Stück", weight_g=1.0)
    finding = _candidate_finding(portion)
    fake_gemini_response(
        {
            "classification": "piece",
            "proposed_name": "Stück",
            "proposed_weight_g": 60.0,
            "proposed_quantity": 1.0,
            "proposed_unit_name": "Stück",
            "confidence": 0.70,
            "rationale": "unsicher",
        }
    )
    evaluate_finding(finding)
    finding.refresh_from_db()
    assert finding.status == PortionRepairStatus.PENDING_REVIEW


@pytest.mark.django_db
def test_evaluate_custom_threshold(ingredient, gram_unit, fake_gemini_response):
    from supply.services.portion_repair_ai import evaluate_finding

    portion = make_portion(ingredient, gram_unit, name="Stück", weight_g=1.0)
    finding = _candidate_finding(portion)
    fake_gemini_response(
        {
            "classification": "piece",
            "proposed_name": "Stück",
            "proposed_weight_g": 60.0,
            "proposed_quantity": 1.0,
            "proposed_unit_name": "Stück",
            "confidence": 0.80,
            "rationale": "klar genug für 0.75",
        }
    )
    evaluate_finding(finding, min_confidence=0.75)
    finding.refresh_from_db()
    assert finding.status == PortionRepairStatus.READY
    assert finding.threshold == 0.75


@pytest.mark.django_db
def test_inconsistent_piece_unit_stays_pending_review(ingredient, gram_unit, fake_gemini_response):
    from supply.services.portion_repair_ai import evaluate_finding

    portion = make_portion(ingredient, gram_unit, name="Scheibe", weight_g=30.0)
    finding = _candidate_finding(portion)
    fake_gemini_response(
        {
            "classification": "piece",
            "proposed_name": "Scheibe",
            "proposed_weight_g": 30.0,
            "proposed_quantity": 1.0,
            "proposed_unit_name": "Gramm",
            "confidence": 0.98,
            "rationale": "Das Gewicht wirkt plausibel.",
        }
    )

    evaluate_finding(finding)
    finding.refresh_from_db()
    assert finding.status == PortionRepairStatus.PENDING_REVIEW


@pytest.mark.django_db
def test_existing_positive_weight_is_not_reestimated_automatically(ingredient, gram_unit, fake_gemini_response):
    from supply.services.portion_repair_ai import evaluate_finding

    portion = make_portion(ingredient, gram_unit, name="Stück", weight_g=150.0)
    finding = _candidate_finding(portion)
    fake_gemini_response(
        {
            "classification": "piece",
            "proposed_name": "Stück",
            "proposed_weight_g": 120.0,
            "proposed_quantity": 1.0,
            "proposed_unit_name": "Stück",
            "confidence": 0.98,
            "rationale": "Durchschnittsschätzung.",
        }
    )

    evaluate_finding(finding)
    finding.refresh_from_db()
    assert finding.status == PortionRepairStatus.PENDING_REVIEW


@pytest.mark.django_db
def test_ambiguous_piece_name_stays_pending_review(ingredient, gram_unit, fake_gemini_response):
    from supply.services.portion_repair_ai import evaluate_finding

    portion = make_portion(ingredient, gram_unit, name="Handvoll", weight_g=1.0)
    finding = _candidate_finding(portion)
    fake_gemini_response(
        {
            "classification": "piece",
            "proposed_name": "Handvoll",
            "proposed_weight_g": 30.0,
            "proposed_quantity": 1.0,
            "proposed_unit_name": "Stück",
            "confidence": 0.95,
            "rationale": "Durchschnittsschätzung.",
        }
    )

    evaluate_finding(finding)
    finding.refresh_from_db()
    assert finding.status == PortionRepairStatus.PENDING_REVIEW


@pytest.mark.django_db
def test_evaluate_no_action_skipped(ingredient, gram_unit, fake_gemini_response):
    from supply.services.portion_repair_ai import evaluate_finding

    portion = make_portion(ingredient, gram_unit, name="Gramm", weight_g=1.0)
    finding = _candidate_finding(portion)
    fake_gemini_response(
        {
            "classification": "no_action",
            "proposed_name": "",
            "proposed_weight_g": None,
            "proposed_quantity": 1.0,
            "proposed_unit_name": "Gramm",
            "confidence": 0.99,
            "rationale": "echte Gramm-Portion",
        }
    )
    evaluate_finding(finding)
    finding.refresh_from_db()
    assert finding.status == PortionRepairStatus.SKIPPED


# ---------------------------------------------------------------------------
# 2.3/2.4 Safe application
# ---------------------------------------------------------------------------


def _ready_finding(portion, recipe_item_ids=None, proposed_weight_g=60.0):
    return PortionRepairFinding.objects.create(
        portion=portion,
        ingredient=portion.ingredient,
        detection_reason=PortionRepairDetectionReason.PIECE_NAME_ONE_GRAM,
        status=PortionRepairStatus.READY,
        before_snapshot={"name": portion.name, "weight_g": portion.weight_g},
        before_snapshot_hash="abc",
        recipe_item_ids=recipe_item_ids or [],
        ai_proposal={
            "classification": "piece",
            "proposed_name": "Stück",
            "proposed_weight_g": proposed_weight_g,
            "proposed_quantity": 1.0,
            "proposed_unit_name": "Stück",
            "confidence": 0.95,
            "rationale": "typisches Ei",
        },
        confidence=0.95,
        prompt_version="1",
        threshold=0.90,
    )


@pytest.mark.django_db
def test_apply_unreferenced_portion_updates_in_place(ingredient, gram_unit):
    portion = make_portion(ingredient, gram_unit, name="Stück", weight_g=1.0)
    finding = _ready_finding(portion)

    result = apply_finding(finding)
    portion.refresh_from_db()
    finding.refresh_from_db()

    assert result["applied"] is True
    assert finding.status == PortionRepairStatus.APPLIED
    assert finding.applied_portion_id == portion.id
    assert portion.weight_g == 60.0
    assert portion.name == "Stück"
    assert portion.measuring_unit.unit == "stk"


@pytest.mark.django_db
def test_apply_referenced_portion_creates_replacement(ingredient, gram_unit):
    portion = make_portion(ingredient, gram_unit, name="Stück", weight_g=1.0)
    item_a = make_recipe_item(portion=portion, quantity=3.0)
    item_b = make_recipe_item(portion=portion, quantity=1.0)
    finding = _ready_finding(portion, recipe_item_ids=[item_a.id, item_b.id])

    result = apply_finding(finding)
    portion.refresh_from_db()
    item_a.refresh_from_db()
    item_b.refresh_from_db()

    # Original portion untouched
    assert portion.weight_g == 1.0
    assert portion.name == "Stück"

    # Replacement created and both recorded items moved (gram amount preserved:
    # 3 × 1g → 3 × 60g → quantity 0.05)
    replacement = Portion.objects.get(pk=result["applied_portion_id"])
    assert replacement.id != portion.id
    assert replacement.weight_g == 60.0
    assert item_a.portion_id == replacement.id
    assert item_b.portion_id == replacement.id
    assert item_a.quantity == pytest.approx(0.05)
    assert item_b.quantity == pytest.approx(round(1 / 60, 4))


@pytest.mark.django_db
def test_apply_moves_only_intended_items(ingredient, gram_unit):
    portion = make_portion(ingredient, gram_unit, name="Stück", weight_g=1.0)
    item_a = make_recipe_item(portion=portion, quantity=3.0)
    item_b = make_recipe_item(portion=portion, quantity=1.0)
    finding = _ready_finding(portion, recipe_item_ids=[item_a.id])

    result = apply_finding(finding)
    item_a.refresh_from_db()
    item_b.refresh_from_db()

    assert item_a.portion_id == result["applied_portion_id"]
    assert item_b.portion_id == portion.id


@pytest.mark.django_db
def test_apply_is_idempotent(ingredient, gram_unit):
    portion = make_portion(ingredient, gram_unit, name="Stück", weight_g=1.0)
    item = make_recipe_item(portion=portion, quantity=1.0)
    finding = _ready_finding(portion, recipe_item_ids=[item.id])

    first = apply_finding(finding)
    replacement_count = Portion.objects.filter(ingredient=ingredient).count()

    second = apply_finding(finding)
    assert second["applied"] is False
    assert second["applied_portion_id"] == first["applied_portion_id"]
    assert Portion.objects.filter(ingredient=ingredient).count() == replacement_count
    item.refresh_from_db()
    assert item.portion_id != portion.id


@pytest.mark.django_db
def test_apply_rollback_on_error(ingredient, gram_unit, monkeypatch):
    portion = make_portion(ingredient, gram_unit, name="Stück", weight_g=1.0)
    item = make_recipe_item(portion=portion, quantity=1.0)
    finding = _ready_finding(portion, recipe_item_ids=[item.id])

    def _boom(portion_obj, proposal, intended_ids):
        raise RuntimeError("boom")

    monkeypatch.setattr("supply.services.portion_repair._apply_to_portion", _boom)
    with pytest.raises(RuntimeError):
        apply_finding(finding)

    finding.refresh_from_db()
    item.refresh_from_db()
    assert finding.status == PortionRepairStatus.READY
    assert item.portion_id == portion.id
    assert PortionRepairFinding.objects.filter(portion=portion).count() == 1


@pytest.mark.django_db
def test_apply_recalculates_affected_recipe_cache(ingredient, gram_unit):
    portion = make_portion(ingredient, gram_unit, name="Stück", weight_g=1.0)
    item = make_recipe_item(portion=portion, quantity=1.0)
    finding = _ready_finding(portion, recipe_item_ids=[item.id])

    calls = []

    def _fake_recalc(recipe):
        calls.append(recipe.id)

    monkeypatch = pytest.MonkeyPatch()
    monkeypatch.setattr(
        "recipe.services.recipe_checks.recalculate_recipe_cache",
        _fake_recalc,
    )
    try:
        apply_finding(finding)
    finally:
        monkeypatch.undo()

    # The explicit post-apply recalculation plus the RecipeItem save signal
    # both target the same recipe — it must never be missed and never other recipes.
    assert set(calls) == {item.recipe_id}
    assert calls.count(item.recipe_id) >= 1


@pytest.mark.django_db
def test_apply_keeps_meal_plan_variants_valid(ingredient, gram_unit):
    from model_bakery import baker

    portion = make_portion(ingredient, gram_unit, name="Stück", weight_g=1.0)
    item = make_recipe_item(portion=portion, quantity=2.0)
    finding = _ready_finding(portion, recipe_item_ids=[item.id])

    meal_item = baker.make(
        "planner.MealItem",
        active_recipe_item_ids=[item.id],
    )

    apply_finding(finding)

    meal_item.refresh_from_db()
    item.refresh_from_db()
    # The RecipeItem id is stable; the variant selection stays valid and now
    # points to the corrected portion.
    assert meal_item.active_recipe_item_ids == [item.id]
    assert item.portion_id != portion.id


@pytest.mark.django_db
def test_apply_without_proposal_raises(ingredient, gram_unit):
    portion = make_portion(ingredient, gram_unit, name="Stück", weight_g=1.0)
    finding = PortionRepairFinding.objects.create(
        portion=portion,
        ingredient=ingredient,
        detection_reason=PortionRepairDetectionReason.PIECE_NAME_ONE_GRAM,
        status=PortionRepairStatus.READY,
        before_snapshot={"name": "Stück", "weight_g": 1.0},
        before_snapshot_hash="abc",
    )
    with pytest.raises(ValueError):
        apply_finding(finding)


@pytest.mark.django_db
def test_apply_untrusted_piece_weight_stays_pending_review(ingredient, gram_unit):
    portion = make_portion(
        ingredient,
        gram_unit,
        name="Stück",
        weight_g=1.0,
        weight_status="ai_proposed",
        weight_source="ai",
    )
    finding = _ready_finding(portion, recipe_item_ids=[])

    result = apply_finding(finding)

    finding.refresh_from_db()
    assert result["applied"] is False
    assert finding.status == PortionRepairStatus.PENDING_REVIEW


@pytest.mark.django_db
def test_apply_rechecks_inconsistent_ready_proposal(ingredient, gram_unit):
    portion = make_portion(ingredient, gram_unit, name="Scheibe", weight_g=30.0)
    finding = _ready_finding(portion, proposed_weight_g=30.0)
    finding.ai_proposal["proposed_unit_name"] = "Gramm"
    finding.save(update_fields=["ai_proposal"])

    result = apply_finding(finding)

    finding.refresh_from_db()
    assert result["applied"] is False
    assert finding.status == PortionRepairStatus.PENDING_REVIEW


@pytest.mark.django_db
def test_soft_deleted_portion_not_scanned_again(ingredient, gram_unit):
    portion = make_portion(ingredient, gram_unit, name="Stück", weight_g=1.0)
    portion.deleted_at = timezone.now()
    portion.save(update_fields=["deleted_at"])
    assert scan_suspicious_portions(dry_run=True) == []


# ---------------------------------------------------------------------------
# 2.5 Management command
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_command_dry_run_writes_nothing(ingredient, gram_unit):
    from io import StringIO

    from django.core.management import call_command

    make_portion(ingredient, gram_unit, name="Stück", weight_g=1.0)
    out = StringIO()
    call_command("repair_portion_data", "--dry-run", stdout=out)
    assert "1 candidate(s) found" in out.getvalue()
    assert PortionRepairFinding.objects.count() == 0


@pytest.mark.django_db
def test_command_scan_creates_candidates(ingredient, gram_unit, gemini_unavailable):
    from io import StringIO

    from django.core.management import call_command

    make_portion(ingredient, gram_unit, name="Stück", weight_g=1.0)
    out = StringIO()
    call_command("repair_portion_data", "--limit", "5", stdout=out)
    assert PortionRepairFinding.objects.count() == 1
    assert "Step 3/3: skipped" in out.getvalue()
