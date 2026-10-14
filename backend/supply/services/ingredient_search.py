"""Shared ingredient name search used by the omnibar, the buffet and the ingredient list.

One place decides what matches (substring in name or alias, German umlaut
variants) and how matches are ranked, so "Zwiebel" finds "Speisezwiebel" everywhere.
"""

from __future__ import annotations

import re
import unicodedata
from typing import Any

from django.db.models import Case, Exists, IntegerField, OuterRef, Q, QuerySet, Value, When

RANK_EXACT = 0
RANK_PREFIX = 1
RANK_WORD_START = 2
RANK_CONTAINS = 3

_WORD_SEPARATORS = (" ", "-")


def fold_umlauts(value: str) -> str:
    folded = unicodedata.normalize("NFKC", value).casefold()
    return folded.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")


def query_variants(query: str) -> tuple[str, ...]:
    """Expand common German umlaut transliterations for database lookups."""
    seed = unicodedata.normalize("NFKC", query).strip().casefold()
    variants = {seed}
    for value in tuple(variants):
        variants.add(value.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss"))
        variants.add(value.replace("ae", "ä").replace("oe", "ö").replace("ue", "ü").replace("ss", "ß"))
    return tuple(sorted(variants, key=lambda value: (value != seed, len(value), value)))


def ingredient_name_q(query: str, *, aliases: bool = True) -> Q:
    """Q matching ingredients whose name (or alias) contains ``query`` or one of its variants."""
    from supply.models import IngredientAlias

    condition = Q()
    for variant in query_variants(query):
        condition |= Q(name__icontains=variant)
        if aliases:
            condition |= Exists(IngredientAlias.objects.filter(ingredient=OuterRef("pk"), name__icontains=variant))
    return condition


def annotate_name_rank(queryset: QuerySet, query: str) -> QuerySet:
    """Annotate ``search_rank`` (0 exact, 1 prefix, 2 word start, 3 contains / alias only)."""
    whens: list[When] = []
    variants = query_variants(query)
    for variant in variants:
        whens.append(When(name__iexact=variant, then=Value(RANK_EXACT)))
    for variant in variants:
        whens.append(When(name__istartswith=variant, then=Value(RANK_PREFIX)))
    for variant in variants:
        for separator in _WORD_SEPARATORS:
            whens.append(When(name__icontains=f"{separator}{variant}", then=Value(RANK_WORD_START)))
    return queryset.annotate(
        search_rank=Case(*whens, default=Value(RANK_CONTAINS), output_field=IntegerField()),
    )


def name_rank(name: str, aliases: list[str], query: str) -> int:
    """Python twin of ``annotate_name_rank`` for results ranked in memory."""
    folded_query = fold_umlauts(query).strip()
    best = RANK_CONTAINS
    for value in [name, *aliases]:
        folded = fold_umlauts(value)
        if folded == folded_query:
            return RANK_EXACT
        if folded.startswith(folded_query):
            best = min(best, RANK_PREFIX)
        elif re.search(rf"[ \-]{re.escape(folded_query)}", folded):
            best = min(best, RANK_WORD_START)
    return best


def search_ingredients(
    queryset: QuerySet,
    query: str,
    *,
    include_aliases: bool = True,
) -> QuerySet:
    """Filter ``queryset`` by ``query`` and order by rank, popularity, name."""
    matched = queryset.filter(ingredient_name_q(query, aliases=include_aliases))
    return annotate_name_rank(matched, query).order_by("search_rank", "-usage_count", "name", "id")


def draft_or_verified_for(user: Any) -> Q:
    """Verified ingredients plus the user's own drafts."""
    from supply.choices import IngredientStatusChoices

    condition = Q(status=IngredientStatusChoices.VERIFIED)
    if user is not None and getattr(user, "is_authenticated", False):
        condition |= Q(status=IngredientStatusChoices.DRAFT, owner=user)
    return condition
