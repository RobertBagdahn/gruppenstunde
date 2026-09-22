"""Unified ingredient matching pipeline with cascading confidence stages.

Stages:
  1. Wort-Jaccard (threshold 0.90)
  2. pg_trgm + Levenshtein (threshold 0.70)
  3. Embedding via pgvector — candidates only, never an automatic match
  4. Human-in-the-Loop + Gemini enrichment

All stages search both Ingredient.name and IngredientAlias.name.
Candidates are ordered by usage_count descending. Every result carries
the top candidates of the deciding stage.
"""

from __future__ import annotations

import logging
import re
from typing import TYPE_CHECKING, Any

from pydantic import BaseModel

from recipe.services.ingredient_parser import IngredientNameParser

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractBaseUser

    from recipe.models import Recipe

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

# Fallback quantity/unit stripping — applied when the parser could not split
# cleanly. Longer alternatives first so "Liter" wins over "l".
QUANTITY_UNIT_STRIP_PATTERN = re.compile(
    r"^(?P<qty>\d+(?:[.,]\d+)?)\s*(?P<unit>kg|g|ml|Liter|l|EL|TL|Msp\.?|Pck\.?|Pkg\.?|Bd\.?|"
    r"Stück|Dose[n]?|Glas|Gläser|Tasse[n]?|Becher|Packung[en]?|Päckchen|Handvoll|Bund|Prise|Schuss|Scheibe[n]?|Zehe[n]?)?\s+",
    re.IGNORECASE,
)
QUANTITY_WORD_STRIP_PATTERN = re.compile(
    r"^(?:etwas|ein\s+paar|einige|ein|eine|einen|einer|ca\.?|circa|etwa|rund)\s+",
    re.IGNORECASE,
)
# Leading bare unit without a number — Gemini extractions often echo
# "Liter Orangensaft" after stripping the quantity themselves.
BARE_UNIT_STRIP_PATTERN = re.compile(
    r"^(?:kg|g|ml|Liter|l|EL|TL|Stück|Dose|Glas|Gläser|Tasse|Becher|Packung|Päckchen|Handvoll|Bund|Prise|Schuss|Scheibe|Zehe)\s+",
    re.IGNORECASE,
)


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
        result = cls._match_core(raw_name)
        if recipe is not None and result.ingredient_id is not None:
            return cls._apply_replacement_context(result, recipe)
        return result

    @classmethod
    def _match_core(cls, raw_name: str) -> MatchResult:
        """Core matching pipeline without recipe-specific replacement context."""
        parsed = IngredientNameParser.parse(raw_name)
        # Low-confidence parser matches are suggestions only. Keep the raw
        # spelling so typoed input can reach the fuzzy stage.
        clean_name = parsed.name if parsed.confidence >= 0.9 else raw_name.strip()
        strip_details: dict[str, Any] = {}

        if parsed.confidence < 0.9:
            stripped = cls._strip_quantity_unit(raw_name)
            if stripped is not None and stripped["rest"].strip():
                clean_name = stripped["rest"].strip()
                strip_details = {
                    "parsed_quantity": stripped["quantity"],
                    "parsed_unit": stripped["unit"],
                }
        elif parsed.quantity or parsed.unit:
            strip_details = {"parsed_quantity": parsed.quantity, "parsed_unit": parsed.unit}

        # Stage 1: Wort-Jaccard
        result = cls._stage_jaccard(clean_name, raw_name.strip(), parsed.note)
        if result is not None:
            result.technical_details.update(strip_details)
            return result

        # Stage 2: pg_trgm + Levenshtein
        result = cls._stage_fuzzy(clean_name, raw_name.strip(), parsed.note)
        if result is not None:
            result.technical_details.update(strip_details)
            return result

        # Stage 3: Embedding
        result = cls._stage_embedding(clean_name, parsed.note)
        if result is not None:
            result.technical_details.update(strip_details)
            return result

        # Stage 4: No algorithmic match → HITL
        result = cls._stage_human_dialog(clean_name, parsed.note)
        result.technical_details.update(strip_details)
        return result

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

    # -------------------------------------------------------------------
    # Stage 1: Wort-Jaccard
    # -------------------------------------------------------------------

    @classmethod
    def _stage_jaccard(cls, clean_name: str, raw_name: str, note: str) -> MatchResult | None:
        query_words = set(clean_name.lower().split())
        if not query_words:
            return None

        candidates = cls._get_candidates_ordered()

        # Decision 4: Prefer exact name or alias matches
        clean_lower = clean_name.lower()
        raw_lower = raw_name.lower()
        for cand in candidates:
            cand_name_lower = cand["name"].lower()
            if cand_name_lower in (clean_lower, raw_lower):
                return MatchResult(
                    ingredient_id=cand["id"],
                    name=cand["name"],
                    confidence=1.0,
                    matched_via="jaccard",
                    note=note,
                    candidates=[
                        MatchCandidate(id=cand["id"], name=cand["name"], slug=cand.get("slug", ""), confidence=1.0)
                    ],
                    reason="Der Zutatenname entspricht genau einer vorhandenen Zutat.",
                    technical_details={"stage": "jaccard", "comparison": "exact_name"},
                )

        from supply.models import IngredientAlias

        alias = (
            IngredientAlias.objects.filter(name__iexact=clean_name)
            .select_related("ingredient")
            .filter(ingredient__deleted_at__isnull=True)
            .first()
        )
        if not alias and raw_name != clean_name:
            alias = (
                IngredientAlias.objects.filter(name__iexact=raw_name)
                .select_related("ingredient")
                .filter(ingredient__deleted_at__isnull=True)
                .first()
            )
        if alias:
            return MatchResult(
                ingredient_id=alias.ingredient_id,
                name=alias.ingredient.name,
                confidence=1.0,
                matched_via="jaccard",
                note=note,
                candidates=[
                    MatchCandidate(
                        id=alias.ingredient_id,
                        name=alias.ingredient.name,
                        slug=alias.ingredient.slug,
                        confidence=1.0,
                    )
                ],
                reason="Ein vorhandener Alias entspricht dem eingegebenen Zutatenname.",
                technical_details={"stage": "jaccard", "comparison": "alias"},
            )

        results: list[MatchCandidate] = []
        for cand in candidates:
            cand_words = set(cand["name"].lower().split())
            intersection = query_words & cand_words
            union = query_words | cand_words
            if not union:
                continue
            score = len(intersection) / len(union)
            if score >= 1.0:
                return MatchResult(
                    ingredient_id=cand["id"],
                    name=cand["name"],
                    confidence=1.0,
                    matched_via="jaccard",
                    note=note,
                    candidates=[
                        MatchCandidate(id=cand["id"], name=cand["name"], slug=cand.get("slug", ""), confidence=1.0)
                    ],
                    reason="Die Wörter des Zutatenname passen vollständig zu einer vorhandenen Zutat.",
                    technical_details={"stage": "jaccard", "score": score},
                )
            if score >= GREY_ZONE_MIN:
                results.append(
                    MatchCandidate(id=cand["id"], name=cand["name"], slug=cand.get("slug", ""), confidence=score)
                )

        if not results:
            return None

        results.sort(key=lambda c: c.confidence, reverse=True)
        best = results[0]

        # Multiple close matches? (Only if not an exact match)
        is_exact = best.confidence >= 1.0 or best.name.lower() == clean_name.lower()
        if (
            not is_exact
            and len(results) > 1
            and (results[0].confidence - results[1].confidence) < MULTI_MATCH_SCORE_DIFF
        ):
            return MatchResult(
                needs_review=True,
                name=clean_name,
                note=note,
                candidates=results[:5],
                matched_via="jaccard",
                confidence=best.confidence,
                reason="Mehrere Zutaten sind ähnlich wahrscheinlich und müssen geprüft werden.",
                technical_details={"stage": "jaccard", "score": best.confidence},
            )

        if best.confidence >= JACCARD_THRESHOLD:
            return MatchResult(
                ingredient_id=best.id,
                name=best.name,
                confidence=best.confidence,
                matched_via="jaccard",
                note=note,
                candidates=results[:5],
                reason="Die Wörter des Namens passen ausreichend zu einer vorhandenen Zutat.",
                technical_details={"stage": "jaccard", "score": best.confidence},
            )

        # Grey zone
        if best.confidence >= GREY_ZONE_MIN:
            return MatchResult(
                needs_review=True,
                name=clean_name,
                note=note,
                candidates=results[:5],
                matched_via="jaccard",
                confidence=best.confidence,
                reason="Mehrere Zutaten sind ähnlich wahrscheinlich und müssen geprüft werden.",
                technical_details={"stage": "fuzzy", "score": best.confidence},
            )

        return None

    # -------------------------------------------------------------------
    # Stage 2: pg_trgm + Levenshtein
    # -------------------------------------------------------------------

    @classmethod
    def _stage_fuzzy(cls, clean_name: str, raw_name: str, note: str) -> MatchResult | None:
        from django.db import connection

        from supply.models import Ingredient

        if connection.vendor == "sqlite":
            results: list[MatchCandidate] = []
            for ing in cls._get_candidates_ordered():
                score = cls._normalized_levenshtein(clean_name.lower(), ing["name"].lower())
                if score >= GREY_ZONE_MIN:
                    results.append(
                        MatchCandidate(id=ing["id"], name=ing["name"], slug=ing.get("slug", ""), confidence=score)
                    )
            results.sort(key=lambda candidate: candidate.confidence, reverse=True)
            return cls._fuzzy_result(clean_name, note, results[:MAX_CANDIDATES_PER_STAGE])

        from django.contrib.postgres.search import TrigramSimilarity

        candidates = cls._get_candidates_ordered()
        for cand in candidates:
            trigram = TrigramSimilarity("name", clean_name)
            # We need to compute per-candidate, so we do it through the queryset
            # For efficiency, batch-annotate all candidates
            break  # We'll use the query approach below

        # Use annotated query for efficiency
        trigram_qs = (
            Ingredient.objects.annotate(
                similarity=TrigramSimilarity("name", clean_name),
            )
            .filter(similarity__gt=0.2)
            .order_by("-similarity")[:MAX_CANDIDATES_PER_STAGE]
        )

        trigram_results: list[MatchCandidate] = []
        for trigram_ing in trigram_qs:
            trigram_score = float(trigram_ing.similarity)
            levenshtein_score = cls._normalized_levenshtein(clean_name.lower(), trigram_ing.name.lower())
            combined = 0.6 * trigram_score + 0.4 * levenshtein_score

            if combined >= GREY_ZONE_MIN:
                trigram_results.append(
                    MatchCandidate(id=trigram_ing.id, name=trigram_ing.name, slug=trigram_ing.slug, confidence=combined)
                )

        return cls._fuzzy_result(clean_name, note, trigram_results)

    @classmethod
    def _fuzzy_result(cls, clean_name: str, note: str, results: list[MatchCandidate]) -> MatchResult | None:
        if not results:
            return None

        best = results[0]

        is_exact = best.confidence >= 1.0 or best.name.lower() == clean_name.lower()
        if (
            not is_exact
            and len(results) > 1
            and (results[0].confidence - results[1].confidence) < MULTI_MATCH_SCORE_DIFF
        ):
            return MatchResult(
                needs_review=True,
                name=clean_name,
                note=note,
                candidates=results[:5],
                matched_via="fuzzy",
                confidence=best.confidence,
                reason="Der Name ähnelt einer vorhandenen Zutat ausreichend stark.",
                technical_details={"stage": "fuzzy", "score": best.confidence},
            )

        if best.confidence >= FUZZY_THRESHOLD:
            return MatchResult(
                ingredient_id=best.id,
                name=best.name,
                confidence=best.confidence,
                matched_via="fuzzy",
                note=note,
                candidates=results[:5],
            )

        if best.confidence >= GREY_ZONE_MIN:
            return MatchResult(
                needs_review=True,
                name=clean_name,
                note=note,
                candidates=results[:5],
                matched_via="fuzzy",
                confidence=best.confidence,
                reason="Die semantische Ähnlichkeit zu einer vorhandenen Zutat ist ausreichend hoch.",
                technical_details={"stage": "embedding", "score": best.confidence},
            )

        return None

    # -------------------------------------------------------------------
    # Stage 3: Embedding (pgvector)
    # -------------------------------------------------------------------

    @classmethod
    def _stage_embedding(cls, clean_name: str, note: str) -> MatchResult | None:
        from django.db import connection

        # pgvector lookups are unsupported on SQLite — skip the stage there.
        if connection.vendor == "sqlite":
            return None

        from pgvector.django import CosineDistance

        from supply.models import Ingredient

        query_embedding = cls._embed_text(clean_name)
        if query_embedding is None:
            return None

        results = (
            Ingredient.objects.exclude(embedding__isnull=True)
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
    def _strip_quantity_unit(cls, raw_name: str) -> dict[str, Any] | None:
        """Strip a leading quantity/unit token from a raw ingredient string.

        Returns {"quantity": float, "unit": str, "rest": str} or None when
        nothing was stripped. Purely a fallback for unparsed inputs; the
        parser remains the primary quantity/unit splitter. A leading bare unit
        (Gemini often strips the number itself) is only accepted when the
        remainder is a known ingredient, so real names like "Glasnudeln" are
        never cut apart.
        """
        stripped = raw_name.strip()

        unit_match = QUANTITY_UNIT_STRIP_PATTERN.match(stripped)
        if unit_match:
            qty_str = unit_match.group("qty").replace(",", ".")
            return {
                "quantity": float(qty_str),
                "unit": unit_match.group("unit") or "",
                "rest": stripped[unit_match.end() :],
            }

        word_match = QUANTITY_WORD_STRIP_PATTERN.match(stripped)
        if word_match:
            return {"quantity": 0, "unit": "", "rest": stripped[word_match.end() :]}

        bare_match = BARE_UNIT_STRIP_PATTERN.match(stripped)
        if bare_match:
            rest = stripped[bare_match.end() :].strip()
            if rest and IngredientNameParser._ingredient_exists(rest):
                return {"quantity": 0, "unit": bare_match.group(0).strip(), "rest": rest}

        return None

    @classmethod
    def _get_candidates_ordered(cls) -> list[dict[str, Any]]:
        """Return all ingredient (id, name, slug) ordered by usage_count DESC."""
        from supply.models import Ingredient

        return [dict(row) for row in Ingredient.objects.order_by("-usage_count", "name").values("id", "name", "slug")]

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
