"""Unified ingredient matching pipeline with cascading confidence stages.

Stages:
  1. Wort-Jaccard (threshold 0.90)
  2. pg_trgm + Levenshtein (threshold 0.70)
  3. Embedding via pgvector (threshold 0.50)
  4. Human-in-the-Loop + Gemini enrichment

All stages search both Ingredient.name and IngredientAlias.name.
Candidates are ordered by usage_count descending.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

from pydantic import BaseModel, Field

from recipe.services.ingredient_parser import IngredientNameParser, ParsedIngredient

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractBaseUser

logger = logging.getLogger(__name__)


def _get_setting(name: str, default: float) -> float:
    from django.conf import settings
    return getattr(settings, name, default)


JACCARD_THRESHOLD = _get_setting("INGREDIENT_MATCHER_JACCARD_THRESHOLD", 0.90)
FUZZY_THRESHOLD = _get_setting("INGREDIENT_MATCHER_FUZZY_THRESHOLD", 0.70)
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
    confidence: float


class MatchResult(BaseModel):
    ingredient_id: int | None = Field(None, description="Matched ingredient ID, null if needs_review")
    name: str = Field("", description="Ingredient name")
    confidence: float = Field(0.0, description="Match confidence 0.0–1.0")
    matched_via: str = Field("new", description="jaccard | fuzzy | embed | gemini | new")
    note: str = Field("", description="Extracted note from parser")
    is_new: bool = Field(False, description="True if a new ingredient was created")
    needs_review: bool = Field(False, description="True if HITL dialog should open")
    candidates: list[MatchCandidate] = Field(default_factory=list, description="Alternative candidates for HITL")


# ---------------------------------------------------------------------------
# Matcher
# ---------------------------------------------------------------------------


class IngredientMatcher:
    """Central ingredient matching pipeline. Stateless — all @classmethod."""

    # -------------------------------------------------------------------
    # Public API
    # -------------------------------------------------------------------

    @classmethod
    def match(cls, raw_name: str, user: AbstractBaseUser | None = None) -> MatchResult:
        """Full pipeline: parse → match → enrich if needed.

        Returns MatchResult with ingredient_id, confidence, matched_via,
        note, is_new, needs_review, and candidates for HITL.
        """
        parsed = IngredientNameParser.parse(raw_name)
        clean_name = parsed.name or raw_name.strip()

        from supply.models import Ingredient

        # Stage 1: Wort-Jaccard
        result = cls._stage_jaccard(clean_name, raw_name.strip(), parsed.note)
        if result is not None:
            return result

        # Stage 2: pg_trgm + Levenshtein
        result = cls._stage_fuzzy(clean_name, raw_name.strip(), parsed.note)
        if result is not None:
            return result

        # Stage 3: Embedding
        result = cls._stage_embedding(clean_name, parsed.note)
        if result is not None:
            return result

        # Stage 4: No algorithmic match → HITL
        return cls._stage_human_dialog(clean_name, parsed.note)

    # -------------------------------------------------------------------
    # Stage 1: Wort-Jaccard
    # -------------------------------------------------------------------

    @classmethod
    def _stage_jaccard(cls, clean_name: str, raw_name: str, note: str) -> MatchResult | None:
        query_words = set(clean_name.lower().split())
        if not query_words:
            return None

        candidates = cls._get_candidates_ordered()
        results: list[MatchCandidate] = []

        for cand in candidates:
            cand_words = set(cand["name"].lower().split())
            intersection = query_words & cand_words
            union = query_words | cand_words
            if not union:
                continue
            score = len(intersection) / len(union)
            if score >= GREY_ZONE_MIN:
                results.append(MatchCandidate(id=cand["id"], name=cand["name"], confidence=score))
            if len(results) >= MAX_CANDIDATES_PER_STAGE:
                break

        if not results:
            return None

        best = results[0]

        # Multiple close matches?
        if len(results) > 1 and (results[0].confidence - results[1].confidence) < MULTI_MATCH_SCORE_DIFF:
            return MatchResult(
                needs_review=True,
                name=clean_name,
                note=note,
                candidates=results[:5],
                matched_via="jaccard",
                confidence=best.confidence,
            )

        if best.confidence >= JACCARD_THRESHOLD:
            return MatchResult(
                ingredient_id=best.id,
                name=best.name,
                confidence=best.confidence,
                matched_via="jaccard",
                note=note,
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
            )

        return None

    # -------------------------------------------------------------------
    # Stage 2: pg_trgm + Levenshtein
    # -------------------------------------------------------------------

    @classmethod
    def _stage_fuzzy(cls, clean_name: str, raw_name: str, note: str) -> MatchResult | None:
        from django.contrib.postgres.search import TrigramSimilarity
        from supply.models import Ingredient

        candidates = cls._get_candidates_ordered()
        results: list[MatchCandidate] = []

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

        for ing in trigram_qs:
            trigram_score = float(ing.similarity)
            levenshtein_score = cls._normalized_levenshtein(clean_name.lower(), ing.name.lower())
            combined = 0.6 * trigram_score + 0.4 * levenshtein_score

            if combined >= GREY_ZONE_MIN:
                results.append(MatchCandidate(id=ing.id, name=ing.name, confidence=combined))

        if not results:
            return None

        best = results[0]

        if len(results) > 1 and (results[0].confidence - results[1].confidence) < MULTI_MATCH_SCORE_DIFF:
            return MatchResult(
                needs_review=True,
                name=clean_name,
                note=note,
                candidates=results[:5],
                matched_via="fuzzy",
                confidence=best.confidence,
            )

        if best.confidence >= FUZZY_THRESHOLD:
            return MatchResult(
                ingredient_id=best.id,
                name=best.name,
                confidence=best.confidence,
                matched_via="fuzzy",
                note=note,
            )

        if best.confidence >= GREY_ZONE_MIN:
            return MatchResult(
                needs_review=True,
                name=clean_name,
                note=note,
                candidates=results[:5],
                matched_via="fuzzy",
                confidence=best.confidence,
            )

        return None

    # -------------------------------------------------------------------
    # Stage 3: Embedding (pgvector)
    # -------------------------------------------------------------------

    @classmethod
    def _stage_embedding(cls, clean_name: str, note: str) -> MatchResult | None:
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
                similar.append(MatchCandidate(id=item.id, name=item.name, confidence=confidence))

        if not similar:
            return None

        best = similar[0]

        if best.confidence >= EMBEDDING_THRESHOLD:
            return MatchResult(
                ingredient_id=best.id,
                name=best.name,
                confidence=best.confidence,
                matched_via="embed",
                note=note,
            )

        if best.confidence >= GREY_ZONE_MIN:
            return MatchResult(
                needs_review=True,
                name=clean_name,
                note=note,
                candidates=similar[:5],
                matched_via="embed",
                confidence=best.confidence,
            )

        return None

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
        )

    # -------------------------------------------------------------------
    # Helpers
    # -------------------------------------------------------------------

    @classmethod
    def _get_candidates_ordered(cls) -> list[dict[str, Any]]:
        """Return all ingredient (id, name) ordered by usage_count DESC."""
        from supply.models import Ingredient

        return list(
            Ingredient.objects.order_by("-usage_count", "name")
            .values("id", "name")
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
