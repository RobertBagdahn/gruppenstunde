"""Automatic decisions for pending AI review items (suggestions, renames, duplicates, junk).

Every rule is conservative: it only acts when the outcome is unambiguous and
otherwise leaves the item for a human in the cockpit.

- Value suggestions are accepted when the resulting nutrition profile passes
  all plausibility rules (the old values mostly stem from the broken import).
- Renames are accepted for spelling/plural fixes (high confidence, similar
  string, name not taken). Cosmetic renames that only drop brackets or
  diacritics, and semantic renames, are dismissed; the current name stays.
- Suspected duplicates are merged only when the names differ by spelling,
  plural or harmless descriptors ("entkernt", "Röschen", "Type 630"). Names
  that differ by a meaningful property (light, vegan, Dose, TK, …) never merge.
- Near-duplicate groups are merged only for pure spelling/plural variants.
- Junk (test data, non-food, supplements) is soft-deleted when unused; used
  entries keep their data and lose the verdict.
"""

from __future__ import annotations

import difflib
import re
import unicodedata
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any

from django.db import transaction

from supply.choices import AiReviewVerdictChoices
from supply.services.nutrition_plausibility import (
    NUTRITION_FIELDS,
    detect_nutrition_issues,
    ingredient_nutrition_values,
)

RENAME_MIN_CONFIDENCE = 0.9
RENAME_MIN_SIMILARITY = 0.85

# Extra words that do not make a different product.
HARMLESS_DESCRIPTORS: frozenset[str] = frozenset(
    {
        "entkernt",
        "roeschen",
        "gross",
        "klein",
        "mittelgross",
        "frisch",
        "ganz",
        "geschaelt",
        "schote",
        "schoten",
        "type",
        "monate",
        "fett",
        "i",
        "tr",
        "schnittkaese",
        "stueck",
        "stuecke",
        "bio",
        "natur",
        "eierfrucht",
        "laugengebaeck",
        "aufbackware",
    }
)
# Words that make a different product — never merge across them.
DISTINGUISHING_WORDS: frozenset[str] = frozenset(
    {
        "light",
        "leicht",
        "zuckerfrei",
        "vegan",
        "vegane",
        "veganer",
        "vegetarisch",
        "laktosefrei",
        "glutenfrei",
        "dose",
        "glas",
        "tk",
        "tiefgekuehlt",
        "getrocknet",
        "geraeuchert",
        "alkoholfrei",
        "fettarm",
        "mager",
        "halbfett",
        "vollkorn",
        "ungesuesst",
        "gesalzen",
        "ungesalzen",
        "pulver",
        "gehackt",
        "gehackte",
        "gemahlen",
        "gerieben",
        "rot",
        "gruen",
        "gelb",
        "weiss",
        "schwarz",
    }
)
_SPELLING = {"sosse": "sauce", "soße": "sauce", "joghurt": "jogurt"}


@dataclass
class AutoResolveReport:
    suggestions_applied: int = 0
    suggestions_kept: int = 0
    renamed: int = 0
    renames_dismissed: int = 0
    merged: int = 0
    variants_merged: int = 0
    duplicates_left: int = 0
    junk_deleted: int = 0
    junk_kept: int = 0
    messages: list[str] = field(default_factory=list)


def _ascii(text: str) -> str:
    text = text.lower().replace("ß", "ss").replace("ä", "ae").replace("ö", "oe").replace("ü", "ue")
    return unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()


def _squash(name: str) -> str:
    """Letters and digits only — "Chia-Samen" and "Chiasamen" become equal."""
    return re.sub(r"[^a-z0-9]", "", _ascii(name))


def _stem(word: str) -> str:
    word = _SPELLING.get(word, word)
    for suffix in ("en", "n", "e", "s"):
        if len(word) > 5 and word.endswith(suffix):
            return word[: -len(suffix)]
    return word


def _tokens(name: str) -> set[str]:
    return {_stem(token) for token in re.split(r"[^a-z0-9]+", _ascii(name)) if token}


def is_safe_duplicate(source: str, target: str) -> bool:
    """Names describe the same product (spelling, plural or harmless descriptors)."""
    if _squash(source) == _squash(target):
        return True
    source_tokens, target_tokens = _tokens(source), _tokens(target)
    stems = {_stem(w) for w in DISTINGUISHING_WORDS}
    if (source_tokens ^ target_tokens) & stems:
        return False
    if _squash("".join(sorted(source_tokens))) == _squash("".join(sorted(target_tokens))):
        return True
    if not target_tokens or not target_tokens <= source_tokens:
        return False
    extra = source_tokens - target_tokens
    harmless = {_stem(w) for w in HARMLESS_DESCRIPTORS}
    return all(token in harmless or token.isdigit() for token in extra)


def is_cosmetic_rename(current: str, suggested: str) -> bool:
    """Only brackets, punctuation, case or diacritics differ — not worth a rename."""
    return _squash(current) == _squash(suggested)


def is_spelling_variant(first: str, second: str) -> bool:
    """Same words, only spelling/hyphenation/plural differ ("Chia-Samen" vs "Chiasamen")."""
    if _squash(first) == _squash(second):
        return True
    return _squash("".join(sorted(_tokens(first)))) == _squash("".join(sorted(_tokens(second))))


def is_safe_rename(current: str, suggested: str, confidence: float) -> bool:
    if "(" in current:
        # Bracket qualifiers are the house style ("Mais (Dose)"); the AI tends to spell them out.
        return False
    ratio = difflib.SequenceMatcher(None, current.lower(), suggested.lower()).ratio()
    return confidence >= RENAME_MIN_CONFIDENCE and ratio >= RENAME_MIN_SIMILARITY


def _profile_with(ingredient: Any, suggestions: dict[str, Any]) -> dict[str, float | None]:
    values = ingredient_nutrition_values(ingredient)
    for field_name in NUTRITION_FIELDS:
        if field_name in suggestions:
            values[field_name] = float(suggestions[field_name])
    if "salt_g" in suggestions:
        values["sodium_mg"] = round(float(suggestions["salt_g"]) * 400, 1)
    return values


def auto_resolve(*, apply: bool, user: Any | None = None) -> AutoResolveReport:
    """Decide pending AI review items automatically. Dry-run unless ``apply``."""
    from supply.models import Ingredient
    from supply.services.data_offensive import SUSPECT_NAME_PATTERN, soft_delete_ingredients
    from supply.services.ingredient_merge import IngredientMergeError, merge_ingredient
    from supply.services.nutri_service import calculate_nutri_score
    from supply.services.quality_score import calculate_ingredient_quality_score

    report = AutoResolveReport()
    taken_names = {name.lower() for name in Ingredient.objects.values_list("name", flat=True)}

    with transaction.atomic():
        # 1. Value suggestions and renames.
        to_update: list[Any] = []
        for ingredient in Ingredient.objects.select_related("retail_section").exclude(ai_review_notes={}):
            notes = dict(ingredient.ai_review_notes or {})
            suggestions = dict(notes.get("suggestions") or {})
            changed = False

            if suggestions:
                profile = _profile_with(ingredient, suggestions)
                if not detect_nutrition_issues(profile, name=ingredient.name):
                    for field_name, value in profile.items():
                        setattr(ingredient, field_name, value)
                    if "price_per_kg" in suggestions:
                        ingredient.price_per_kg = Decimal(str(suggestions["price_per_kg"]))
                    notes["suggestions"] = {}
                    report.suggestions_applied += 1
                    changed = True
                else:
                    report.suggestions_kept += 1

            suggested = (notes.get("suggested_name") or "").strip()
            if suggested:
                confidence = float(notes.get("confidence") or 0)
                if (
                    not is_cosmetic_rename(ingredient.name, suggested)
                    and is_safe_rename(ingredient.name, suggested, confidence)
                    and suggested.lower() not in taken_names
                ):
                    taken_names.discard(ingredient.name.lower())
                    taken_names.add(suggested.lower())
                    notes["renamed_from"] = ingredient.name
                    ingredient.name = suggested
                    report.renamed += 1
                else:
                    notes["rename_dismissed"] = suggested
                    report.renames_dismissed += 1
                notes["suggested_name"] = None
                if ingredient.ai_review_verdict == AiReviewVerdictChoices.RENAME:
                    ingredient.ai_review_verdict = AiReviewVerdictChoices.CORRECTED
                changed = True

            if changed:
                ingredient.ai_review_notes = notes
                ingredient.nutri_score, ingredient.nutri_class = calculate_nutri_score(ingredient)
                ingredient.quality_score = calculate_ingredient_quality_score(ingredient)
                to_update.append(ingredient)

        if to_update:
            Ingredient.objects.bulk_update(
                to_update,
                [
                    *NUTRITION_FIELDS,
                    "name",
                    "price_per_kg",
                    "ai_review_notes",
                    "ai_review_verdict",
                    "nutri_score",
                    "nutri_class",
                    "quality_score",
                ],
                batch_size=500,
            )

        # 2. Suspected duplicates.
        for source in Ingredient.objects.filter(ai_review_verdict=AiReviewVerdictChoices.DUPLICATE):
            target_id = (source.ai_review_notes or {}).get("duplicate_of_id")
            target = Ingredient.objects.filter(id=target_id).first() if target_id else None
            if target is None or target.id == source.id:
                source.ai_review_verdict = AiReviewVerdictChoices.CORRECTED
                source.save(update_fields=["ai_review_verdict"])
                continue
            if not is_safe_duplicate(source.name, target.name):
                report.duplicates_left += 1
                continue
            report.merged += 1
            report.messages.append(f"„{source.name}“ → „{target.name}“")
            try:
                merge_ingredient(source, target, user=user)
            except IngredientMergeError as exc:
                report.messages.append(f"{source.name}: {exc}")

        # 3. Near-duplicate groups that are pure spelling/plural variants.
        from supply.services.ingredient_merge import near_duplicate_groups

        for group in near_duplicate_groups():
            target = group[0]
            for candidate in group[1:]:
                if not is_spelling_variant(candidate.name, target.name):
                    continue
                source = Ingredient.objects.filter(id=candidate.id).first()
                if source is None:
                    continue
                report.variants_merged += 1
                report.messages.append(f"„{source.name}“ → „{target.name}“")
                try:
                    merge_ingredient(source, Ingredient.objects.get(id=target.id), user=user)
                except IngredientMergeError as exc:
                    report.messages.append(f"{source.name}: {exc}")

        # 4. Junk: test data, non-food, supplements.
        junk = [
            ingredient
            for ingredient in Ingredient.objects.all()
            if ingredient.ai_review_verdict == AiReviewVerdictChoices.NOT_AN_INGREDIENT
            or SUSPECT_NAME_PATTERN.search(ingredient.name)
        ]
        if junk:
            result = soft_delete_ingredients(ids=[ingredient.id for ingredient in junk])
            report.junk_deleted = result.changed
            report.junk_kept = result.skipped
            deleted_ids = set(
                Ingredient.all_objects.filter(id__in=[i.id for i in junk], deleted_at__isnull=False).values_list(
                    "id", flat=True
                )
            )
            for ingredient in junk:
                if ingredient.id not in deleted_ids:
                    # Used in recipes (e.g. "Heißes Wasser"): keep it and drop the verdict.
                    Ingredient.objects.filter(id=ingredient.id).update(
                        ai_review_verdict=AiReviewVerdictChoices.CORRECTED
                    )

        if not apply:
            transaction.set_rollback(True)
    return report
