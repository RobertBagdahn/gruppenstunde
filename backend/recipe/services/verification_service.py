from __future__ import annotations

from typing import TYPE_CHECKING

from django.contrib.contenttypes.models import ContentType
from django.db.models import Q

from content.models.approval import ApprovalLog
from content.choices import ApprovalAction
from recipe.models import Rule

if TYPE_CHECKING:
    from django.contrib.auth.models import User
    from recipe.models import Recipe


REQUIRED_FIELDS = {
    "image": "Bild fehlt",
    "description": "Beschreibung fehlt",
    "recipe_items": "Keine Zutaten vorhanden",
    "steps": "Keine Zubereitungsschritte vorhanden",
}


RULE_PARAMETER_TO_CACHED_FIELD: dict[str, str] = {
    "energy_kcal": "cached_energy_kcal",
    "protein_g": "cached_protein_g",
    "fat_g": "cached_fat_g",
    "carbohydrate_g": "cached_carbohydrate_g",
    "sugar_g": "cached_sugar_g",
    "fibre_g": "cached_fibre_g",
    "salt_g": "cached_salt_g",
    "vitamin_c_mg": "cached_vitamin_c_mg",
    "nutri_class": "cached_nutri_class",
}


class VerificationResult:
    def __init__(
        self,
        can_verify: bool,
        rules_passed: int,
        rules_total: int,
        warnings: list[dict],
        missing_fields: list[str],
    ):
        self.can_verify = can_verify
        self.rules_passed = rules_passed
        self.rules_total = rules_total
        self.warnings = warnings
        self.missing_fields = missing_fields

    def to_dict(self) -> dict:
        return {
            "can_verify": self.can_verify,
            "rules_passed": self.rules_passed,
            "rules_total": self.rules_total,
            "warnings": self.warnings,
            "missing_fields": self.missing_fields,
        }


def _check_required_fields(recipe: Recipe) -> list[str]:
    missing = []
    if not recipe.image:
        missing.append(REQUIRED_FIELDS["image"])
    if not recipe.description:
        missing.append(REQUIRED_FIELDS["description"])
    if recipe.recipe_items.count() == 0:
        missing.append(REQUIRED_FIELDS["recipe_items"])
    if not hasattr(recipe, "steps") or recipe.steps.count() == 0:
        missing.append(REQUIRED_FIELDS["steps"])
    return missing


def _evaluate_rules(recipe: Recipe) -> tuple[list[dict], int, int]:
    warnings = []
    rules_total = 0
    rules_passed = 0

    active_rules = Rule.objects.filter(is_active=True, scope="recipe")

    for rule in active_rules:
        rules_total += 1
        cached_field = RULE_PARAMETER_TO_CACHED_FIELD.get(rule.parameter)
        if cached_field is None:
            rules_passed += 1
            continue

        value = getattr(recipe, cached_field, None)
        if value is None:
            warnings.append({
                "rule_name": rule.name,
                "rule_description": rule.description,
                "hint_level": rule.hint_level,
                "message": f"Kein Wert für {rule.name} verfügbar",
            })
            continue

        status = rule.evaluate(float(value))
        if status != "green":
            warnings.append({
                "rule_name": rule.name,
                "rule_description": rule.description,
                "hint_level": rule.hint_level,
                "current_value": float(value),
                "unit": rule.unit,
                "status": status,
                "tip_text": rule.tip_text,
            })
        else:
            rules_passed += 1

    return warnings, rules_passed, rules_total


def check_verification_readiness(recipe: Recipe) -> VerificationResult:
    missing_fields = _check_required_fields(recipe)
    rule_warnings, rules_passed, rules_total = _evaluate_rules(recipe)

    all_warnings = []
    for mf in missing_fields:
        all_warnings.append({
            "rule_name": "Pflichtfeld",
            "rule_description": mf,
            "hint_level": "error",
            "message": mf,
        })
    all_warnings.extend(rule_warnings)

    can_verify = len(missing_fields) == 0

    return VerificationResult(
        can_verify=can_verify,
        rules_passed=rules_passed,
        rules_total=rules_total + len(missing_fields),
        warnings=all_warnings,
        missing_fields=missing_fields,
    )


def verify_recipe(recipe: Recipe, reviewer: User, confirm: bool = False) -> VerificationResult:
    result = check_verification_readiness(recipe)

    if confirm and result.can_verify:
        recipe.status = "approved"
        recipe.save(update_fields=["status"])

        ct = ContentType.objects.get_for_model(recipe)
        reason = ""
        if result.warnings:
            warning_summaries = [
                w.get("rule_description", w.get("rule_name", ""))
                for w in result.warnings
            ]
            reason = "Warnungen beim Verifizieren: " + "; ".join(warning_summaries)

        ApprovalLog.objects.create(
            content_type=ct,
            object_id=recipe.pk,
            action=ApprovalAction.APPROVED,
            reviewer=reviewer,
            reason=reason,
        )

    return result
