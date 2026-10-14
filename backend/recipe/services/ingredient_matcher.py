"""Unified ingredient matching pipeline with cascading confidence stages.

Stages:
  1. Exact name or alias of the parsed query
  2. Scored match on the in-memory index (`matching_index`): normalized tokens,
     compounds, head noun, specifiers and conflicting features
  3. Embedding via pgvector — candidates only, never an automatic match
  4. Human-in-the-Loop + Gemini enrichment

All stages search both Ingredient.name and IngredientAlias.name and skip
ingredients excluded from matching. Every result carries the top candidates
of the deciding stage.
"""

from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING, Any

from pydantic import BaseModel

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractBaseUser
    from django.db.models import QuerySet

    from recipe.models import Recipe
    from recipe.services.ingredient_line import ParsedLine

logger = logging.getLogger(__name__)


def _get_setting(name: str, default: float) -> float:
    from django.conf import settings

    return getattr(settings, name, default)


JACCARD_THRESHOLD = _get_setting("INGREDIENT_MATCHER_JACCARD_THRESHOLD", 0.90)
FUZZY_THRESHOLD = _get_setting("INGREDIENT_MATCHER_FUZZY_THRESHOLD", 0.70)
# Retained for configuration compatibility — the embedding stage never
# auto-matches (see _stage_embedding), so this threshold is not consulted.
EMBEDDING_THRESHOLD = _get_setting("INGREDIENT_MATCHER_EMBEDDING_THRESHOLD", 0.50)
GREY_ZONE_MIN = _get_setting("INGREDIENT_MATCHER_GREY_ZONE_MIN", 0.30)
MULTI_MATCH_SCORE_DIFF = _get_setting("INGREDIENT_MATCHER_MULTI_MATCH_DIFF", 0.05)
MAX_CANDIDATES_PER_STAGE = 8

# ---------------------------------------------------------------------------
# Pydantic schemas
# ---------------------------------------------------------------------------


class MatchCandidate(BaseModel):
    id: int
    name: str
    slug: str = ""
    confidence: float


class MatchResult(BaseModel):
    ingredient_id: int | None = None
    name: str = ""
    confidence: float = 0.0
    matched_via: str = "new"
    note: str = ""
    is_new: bool = False
    needs_review: bool = False
    candidates: list[MatchCandidate] = []
    reason: str = ""
    technical_details: dict[str, Any] = {}

    # Replacement context — set when the matched ingredient is the concrete
    # target of an active generic-to-concrete mapping whose source ingredient
    # is already present in the given recipe.
    replacement_for_item_id: int | None = None
    replacement_reason: str | None = None
    replacement_confidence: float | None = None


# ---------------------------------------------------------------------------
# Matcher
# ---------------------------------------------------------------------------


class IngredientMatcher:
    """Central ingredient matching pipeline. Stateless — all @classmethod."""

    # -------------------------------------------------------------------
    # Public API
    # -------------------------------------------------------------------

    @classmethod
    def match(
        cls,
        raw_name: str,
        user: AbstractBaseUser | None = None,
        recipe: Recipe | None = None,
        parsed: ParsedLine | None = None,
    ) -> MatchResult:
        """Full pipeline: parse → match → enrich if needed.

        Returns MatchResult with ingredient_id, confidence, matched_via,
        note, is_new, needs_review, and candidates for HITL.

        When `recipe` is given and the matched ingredient is the concrete
        target of an active generic-to-concrete replacement mapping whose
        source ingredient is already in the recipe, the result is annotated
        with replacement context (`replacement_for_item_id`,
        `replacement_reason`, `replacement_confidence`).
        """
        result = cls._match_core(raw_name, user, parsed)
        if recipe is not None and result.ingredient_id is not None:
            return cls._apply_replacement_context(result, recipe)
        return result

    @classmethod
    def _match_core(
        cls, raw_name: str, user: AbstractBaseUser | None = None, parsed: ParsedLine | None = None
    ) -> MatchResult:
        """Core matching pipeline without recipe-specific replacement context.

        Candidates are limited to Ingredients ``user`` may read plus system drafts
        (``food_access.matchable_ingredient_queryset``); never private Ingredients
        of other users, never ingredients excluded from matching.
        """
        from recipe.services.ingredient_line import parse_line

        # Callers that already parsed the source line pass it; re-parsing the query
        # would read "20 % Quark" as an amount of 20.
        parsed = parsed or parse_line(raw_name)
        query = parsed.query or raw_name.strip()
        addition = cls._addition_text(parsed.name)
        note = ", ".join(value for value in (parsed.note, addition) if value)
        details: dict[str, Any] = {}
        if parsed.has_amount:
            details = {"parsed_quantity": parsed.quantity, "parsed_unit": parsed.unit}
        allowed_ids = set(cls._candidate_queryset(user).values_list("pk", flat=True))

        stages = (
            lambda: cls._stage_learned(query, note, allowed_ids, trusted_only=True),
            lambda: cls._stage_exact(query, parsed, raw_name, note, allowed_ids),
            lambda: cls._stage_learned(query, note, allowed_ids, trusted_only=False),
            lambda: cls._stage_index(query, note, allowed_ids),
            lambda: cls._stage_embedding(query, note, cls._candidate_queryset(user)),
        )
        for stage in stages:
            result = stage()
            if result is not None:
                result.technical_details.update(details)
                if result.ingredient_id is not None:
                    result.note = cls._note_with_dropped_specifiers(result, parsed.specifiers, note)
                return result

        result = cls._stage_human_dialog(query, note)
        result.technical_details.update(details)
        return result

    @staticmethod
    def _note_with_dropped_specifiers(result: MatchResult, specifiers: list[str], note: str) -> str:
        """Specifiers the chosen ingredient does not carry ("Fladenbrot frisch" → note "frisch")."""
        name = result.name.lower()
        dropped = [spec for spec in specifiers if spec[:5].lower() not in name]
        return ", ".join(value for value in (*dropped, note) if value)

    @staticmethod
    def _addition_text(name: str) -> str:
        """'Mineralwasser mit Kohlensäure' → 'mit Kohlensäure'."""
        match = re.search(r"\s((?:mit|ohne)\s.+)$", name, re.IGNORECASE)
        return match.group(1).strip() if match else ""

    # -------------------------------------------------------------------
    # Learned mappings from confirmed reviews
    # -------------------------------------------------------------------

    @classmethod
    def _stage_learned(cls, query: str, note: str, allowed_ids: set[int], trusted_only: bool) -> MatchResult | None:
        """A query people confirmed before: a match once two people agreed, else a suggestion."""
        from recipe.services.learned_mapping import lookup

        learned = lookup(query, allowed_ids)
        if learned is None or (trusted_only and not learned.is_trusted):
            return None
        return MatchResult(
            ingredient_id=learned.ingredient_id,
            name=learned.name,
            confidence=1.0 if learned.is_trusted else 0.9,
            matched_via="learned",
            note=note,
            needs_review=not learned.is_trusted,
            candidates=[MatchCandidate(id=learned.ingredient_id, name=learned.name, slug=learned.slug, confidence=1.0)],
            reason=(
                "Diese Zuordnung wurde bei früheren Importen mehrfach bestätigt."
                if learned.is_trusted
                else "Diese Zuordnung wurde bei einem früheren Import bestätigt – bitte prüfen."
            ),
            technical_details={"stage": "learned", "confirmations": learned.confirmations},
        )

    # -------------------------------------------------------------------
    # Stage 1: exact name or alias
    # -------------------------------------------------------------------

    @classmethod
    def _stage_exact(
        cls, query: str, parsed: Any, raw_name: str, note: str, allowed_ids: set[int]
    ) -> MatchResult | None:
        """Exact (case-insensitive) name or alias of the query.

        The bare name is also tried when the dropped specifiers are soft ("frischer
        Ingwer" → "Ingwer"), never when they select a different ingredient ("rote Zwiebel").
        """
        from recipe.services.matching_index import SOFT_SPECIFIERS
        from supply.models import Ingredient, IngredientAlias

        names = [query]
        if parsed.name and all(spec in SOFT_SPECIFIERS for spec in parsed.specifiers):
            names.append(parsed.name)
        names.append(raw_name.strip())
        for name in dict.fromkeys(value for value in names if value):
            hits: list[tuple[dict[str, Any], str]] = [
                (dict(row), "exact_name")
                for row in Ingredient.objects.filter(name__iexact=name, pk__in=allowed_ids).values(
                    "id", "name", "slug", "status", "usage_count"
                )
            ]
            for alias in IngredientAlias.objects.filter(
                name__iexact=name, ingredient_id__in=allowed_ids
            ).select_related("ingredient"):
                hits.append(
                    (
                        {
                            "id": alias.ingredient_id,
                            "name": alias.ingredient.name,
                            "slug": alias.ingredient.slug,
                            "status": alias.ingredient.status,
                            "usage_count": alias.ingredient.usage_count,
                        },
                        "alias",
                    )
                )
            if not hits:
                continue
            # A verified ingredient (by name or alias) beats a draft duplicate of the same name.
            ingredient, comparison = min(
                hits,
                key=lambda hit: (hit[0]["status"] != "verified", hit[1] != "exact_name", -(hit[0]["usage_count"] or 0)),
            )
            return MatchResult(
                ingredient_id=ingredient["id"],
                name=ingredient["name"],
                confidence=1.0,
                matched_via="exact",
                note=note,
                candidates=[
                    MatchCandidate(
                        id=ingredient["id"], name=ingredient["name"], slug=ingredient["slug"], confidence=1.0
                    )
                ],
                reason=(
                    "Der Zutatenname entspricht genau einer vorhandenen Zutat."
                    if comparison == "exact_name"
                    else "Ein vorhandener Alias entspricht dem eingegebenen Zutatennamen."
                ),
                technical_details={"stage": "exact", "comparison": comparison},
            )
        return None

    # -------------------------------------------------------------------
    # Stage 2: scored index match
    # -------------------------------------------------------------------

    @classmethod
    def _stage_index(cls, query: str, note: str, allowed_ids: set[int]) -> MatchResult | None:
        """Pick a candidate when it covers the query without contradicting it.

        - strong: all core words covered, same head noun, required specifiers present,
          no conflicting feature → selected (needs review unless unambiguous)
        - generic: like strong but a required specifier is missing and the candidate has
          no other words ("schwarze Oliven" → "Oliven") → preselected, needs review
        - otherwise: grey-zone candidates only
        """
        from recipe.services.matching_index import get_index

        ranked = get_index().search(query, allowed_ids, limit=10)
        if not ranked:
            return None
        listed = [
            MatchCandidate(
                id=candidate.entry.ingredient_id,
                name=candidate.entry.name,
                slug=candidate.entry.slug,
                confidence=candidate.score,
            )
            for candidate in ranked
            if not candidate.conflict
        ][:5]
        technical = {"stage": "index", "score": ranked[0].score}

        acceptable = [c for c in ranked if not c.conflict and c.covers_core and c.head_match and c.extra_words == 0]
        strong = sorted((c for c in acceptable if c.specifiers_ok), key=lambda c: c.selection_key)
        if strong:
            best = strong[0]
            alternatives = [c for c in strong[1:] if not c.exact]
            is_close = not best.exact and bool(alternatives)
            needs_review = not best.exact or best.fuzzy or is_close or bool(cls._addition_text(query))
            return MatchResult(
                ingredient_id=best.entry.ingredient_id,
                name=best.entry.name,
                confidence=1.0 if best.exact else best.score,
                matched_via="index",
                note=note,
                needs_review=needs_review,
                candidates=cls._with_selected_first(best, listed),
                reason=(
                    "Der Name entspricht einer vorhandenen Zutat."
                    if not needs_review
                    else "Mehrere passende Zutaten gefunden, die übliche ist vorausgewählt – bitte prüfen."
                    if is_close
                    else "Die Zutat stimmt bis auf Zusätze mit einer vorhandenen Zutat überein – bitte prüfen."
                ),
                technical_details={**technical, "decision": "strong"},
            )

        generic = sorted((c for c in acceptable if not c.fuzzy and c.extra_core == 0), key=lambda c: c.selection_key)
        if generic:
            best = generic[0]
            return MatchResult(
                ingredient_id=best.entry.ingredient_id,
                name=best.entry.name,
                confidence=best.score,
                matched_via="index",
                note=note,
                needs_review=True,
                candidates=cls._with_selected_first(best, listed),
                reason="Allgemeinere Zutat vorausgewählt, die genaue Sorte fehlt im Katalog – bitte prüfen.",
                technical_details={**technical, "decision": "generic"},
            )

        grey = [candidate for candidate in listed if candidate.confidence >= GREY_ZONE_MIN]
        if not grey:
            return None
        return MatchResult(
            needs_review=True,
            name=query,
            note=note,
            candidates=grey,
            matched_via="index",
            confidence=grey[0].confidence,
            reason=cls._similarity_hint(grey[0].confidence),
            technical_details={**technical, "decision": "grey"},
        )

    @staticmethod
    def _with_selected_first(best: Any, listed: list[MatchCandidate]) -> list[MatchCandidate]:
        selected = MatchCandidate(
            id=best.entry.ingredient_id, name=best.entry.name, slug=best.entry.slug, confidence=best.score
        )
        return [selected, *[candidate for candidate in listed if candidate.id != selected.id]][:5]

    # -------------------------------------------------------------------
    # Replacement context (generic-to-concrete mappings)
    # -------------------------------------------------------------------

    @classmethod
    def _apply_replacement_context(cls, result: MatchResult, recipe: Recipe) -> MatchResult:
        """Annotate `result` with replacement metadata when an active mapping applies.

        A mapping applies when the matched ingredient equals the mapping's
        replacement (concrete) ingredient AND the recipe already contains the
        mapping's source (generic) ingredient. The source is detected by
        ingredient id or case-insensitive name so recipes referencing one of
        several duplicate generic ingredient rows are still recognized.
        """
        from supply.models import IngredientReplacementMapping

        items = list(recipe.recipe_items.select_related("portion__ingredient").order_by("sort_order", "id"))
        if not items:
            return result

        by_ingredient_id = {
            item.portion.ingredient_id: item
            for item in items
            if item.portion_id is not None and item.portion.ingredient_id is not None
        }
        by_ingredient_name = {
            item.portion.ingredient.name.strip().lower(): item
            for item in items
            if item.portion_id is not None and item.portion.ingredient_id is not None
        }

        mappings = IngredientReplacementMapping.objects.filter(
            replacement_ingredient_id=result.ingredient_id,
            is_active=True,
        ).select_related("source_ingredient")

        for mapping in mappings:
            source = mapping.source_ingredient
            existing_item = by_ingredient_id.get(source.id) or by_ingredient_name.get(source.name.strip().lower())
            if existing_item is not None:
                result.replacement_for_item_id = existing_item.id
                result.replacement_reason = f"Ersatz für {source.name}"
                result.replacement_confidence = result.confidence
                return result

        return result

    @staticmethod
    def _similarity_hint(confidence: float) -> str:
        """Hint text that never claims more than the score supports."""
        if confidence >= FUZZY_THRESHOLD:
            return "Der Name ist einer vorhandenen Zutat ausreichend ähnlich."
        return "Ähnlich zu einer vorhandenen Zutat, bitte prüfen."

    # -------------------------------------------------------------------
    # Stage 3: Embedding (pgvector)
    # -------------------------------------------------------------------

    @classmethod
    def _stage_embedding(cls, clean_name: str, note: str, candidate_qs: QuerySet) -> MatchResult | None:
        from django.db import connection

        # pgvector lookups are unsupported on SQLite — skip the stage there.
        if connection.vendor == "sqlite":
            return None

        from pgvector.django import CosineDistance

        query_embedding = cls._embed_text(clean_name)
        if query_embedding is None:
            return None

        results = (
            candidate_qs.exclude(embedding__isnull=True)
            .annotate(distance=CosineDistance("embedding", query_embedding))
            .filter(distance__lt=1.0)
            .order_by("distance")[:MAX_CANDIDATES_PER_STAGE]
        )

        similar: list[MatchCandidate] = []
        for item in results:
            cosine_sim = 1.0 - float(item.distance)
            confidence = cls._sigmoid_calibrate(cosine_sim)
            if confidence >= GREY_ZONE_MIN:
                similar.append(MatchCandidate(id=item.id, name=item.name, slug=item.slug, confidence=confidence))

        return cls._embedding_result(clean_name, note, similar)

    @classmethod
    def _embedding_result(cls, clean_name: str, note: str, similar: list[MatchCandidate]) -> MatchResult | None:
        """Build the embedding-stage result from ranked candidates.

        Embedding results never auto-match: the stored embedding space is not
        calibrated for unrelated pairs (observed cosine ~0.6 for arbitrary
        German food terms), so a threshold hit is not trustworthy. The top
        candidates are offered for explicit human selection instead.
        """
        if not similar:
            return None

        best = similar[0]
        return MatchResult(
            needs_review=True,
            name=clean_name,
            note=note,
            candidates=similar[:5],
            matched_via="embed",
            confidence=best.confidence,
            reason="Die semantische Ähnlichkeit zu einer vorhandenen Zutat ist nicht eindeutig und muss geprüft werden.",
            technical_details={"stage": "embedding", "score": best.confidence},
        )

    # -------------------------------------------------------------------
    # Stage 4: Human Dialog
    # -------------------------------------------------------------------

    @classmethod
    def _stage_human_dialog(cls, clean_name: str, note: str) -> MatchResult:
        return MatchResult(
            needs_review=True,
            name=clean_name,
            note=note,
            candidates=[],
            matched_via="new",
            confidence=0.0,
            reason="Es wurde keine passende bestehende Zutat gefunden.",
            technical_details={"stage": "human_review"},
        )

    # -------------------------------------------------------------------
    # Helpers
    # -------------------------------------------------------------------

    @classmethod
    def _candidate_queryset(cls, user: AbstractBaseUser | None) -> QuerySet:
        """Plain Ingredient queryset restricted to matchable candidates for ``user``."""
        from content.services.food_access import matchable_ingredient_queryset
        from supply.models import Ingredient

        return Ingredient.objects.filter(
            pk__in=matchable_ingredient_queryset(user).values("pk"), exclude_from_matching=False
        )

    @classmethod
    def _normalized_levenshtein(cls, a: str, b: str) -> float:
        """Normalized Levenshtein similarity: 1 − distance/max_len."""
        if not a or not b:
            return 0.0
        max_len = max(len(a), len(b))
        if max_len == 0:
            return 1.0
        distance = cls._levenshtein_distance(a, b)
        return 1.0 - distance / max_len

    @staticmethod
    def _levenshtein_distance(a: str, b: str) -> int:
        """Compute Levenshtein edit distance between two strings."""
        if len(a) < len(b):
            a, b = b, a
        if len(b) == 0:
            return len(a)

        prev_row = list(range(len(b) + 1))
        for i, ca in enumerate(a):
            curr_row = [i + 1]
            for j, cb in enumerate(b):
                insertions = prev_row[j + 1] + 1
                deletions = curr_row[j] + 1
                substitutions = prev_row[j] + (0 if ca == cb else 1)
                curr_row.append(min(insertions, deletions, substitutions))
            prev_row = curr_row
        return prev_row[-1]

    @classmethod
    def _embed_text(cls, text: str) -> list[float] | None:
        """Generate embedding vector for a text string."""
        from content.services.embedding_service import create_embedding

        return create_embedding(text)

    @staticmethod
    def _sigmoid_calibrate(cosine_sim: float, steepness: float = 10.0, midpoint: float = 0.6) -> float:
        """Convert cosine similarity to percentage confidence."""
        import math

        cos_sim = max(0.0, min(1.0, cosine_sim))
        try:
            sigmoid = 1.0 / (1.0 + math.exp(-steepness * (cos_sim - midpoint)))
        except OverflowError:
            sigmoid = 1.0 if cos_sim > midpoint else 0.0
        return sigmoid
