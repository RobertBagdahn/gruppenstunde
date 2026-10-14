"""In-memory ingredient matching index.

Every matchable ingredient name and alias is analysed once into normalized tokens:
lowercased, stemmed (singular = plural), compounds split against the catalog
vocabulary ("Balsamicoessig" → balsamico + essig, "Hühnerei" → hühner + ei),
specifier words mapped to a base form and grouped into features that must not
conflict ("edelsüß" vs "geräuchert"). A query is scored against all entries by
IDF-weighted token coverage plus head-noun agreement. The same code runs on
SQLite and PostgreSQL.

The index is cached per process and rebuilt when the catalog version (bumped by
ingredient and alias signals) changes.
"""

from __future__ import annotations

import math
import re
import threading
from dataclasses import dataclass, field
from typing import Any

from recipe.data.ingredient_line_vocabulary import SPECIFIER_FORMS

CACHE_VERSION_KEY = "ingredient_matching_index_version"

STOPWORDS = frozenset(
    {
        "und",
        "oder",
        "in",
        "im",
        "aus",
        "für",
        "von",
        "vom",
        "der",
        "die",
        "das",
        "den",
        "dem",
        "bio",
        "ca",
        "fett",
        "i",
        "tr",
        "art",
        "nach",
        "à",
        "la",
        "le",
    }
)
# Everything after these words is an addition ("Mineralwasser mit Kohlensäure").
ADDITION_WORDS = frozenset({"mit", "ohne", "aus"})
# "Feta-Käse", "Gouda-Käse": the generic category after the hyphen adds nothing.
_GENERIC_HYPHEN_HEADS = frozenset({"käse"})

# Specifier values in the same group contradict each other.
FEATURE_GROUPS: dict[str, str] = {
    **dict.fromkeys(("rot", "weiß", "gelb", "grün", "schwarz", "braun", "bunt"), "color"),
    **dict.fromkeys(("frisch", "getrocknet"), "freshness"),
    **dict.fromkeys(("edelsüß", "rosenscharf", "geräuchert", "scharf", "mild", "süß", "mittelscharf"), "taste"),
    **dict.fromkeys(("passiert", "stückig", "gehackt"), "cut"),
    **dict.fromkeys(("gemahlen", "ganz"), "grind"),
    **dict.fromkeys(("dunkel", "hell"), "shade"),
    **dict.fromkeys(("trüb", "klar"), "clarity"),
    **dict.fromkeys(("gesalzen", "ungesalzen"), "salt"),
    **dict.fromkeys(("mager",), "fat"),
}
# Missing these on the candidate is harmless ("frischer Ingwer" → "Ingwer").
SOFT_SPECIFIERS = frozenset(
    {
        "frisch",
        "gemischt",
        "extra virgin",
        "flüssig",
        "geschält",
        "gekocht",
        "gehackt",
        "gerieben",
        "tk",
        "trüb",
        "klar",
        "hell",
        "mild",
    }
)
_PERCENT = re.compile(r"(\d+(?:[.,]\d+)?)\s*%")
_WORD = re.compile(r"[^\W_]+(?:%)?", re.UNICODE)
_SHORT_PARTS = frozenset({"ei", "öl", "eis", "tee", "reis", "saft", "mus", "kraut", "salz"})
# Typical compound heads: a compound ending in one of these splits even when the
# front part is no catalog word on its own ("Speisequark", "Kürbisfleisch").
FOOD_HEADS = frozenset(
    {
        "fleisch",
        "quark",
        "käse",
        "wurst",
        "saft",
        "mehl",
        "zucker",
        "essig",
        "sauce",
        "soße",
        "brot",
        "kuchen",
        "milch",
        "pulver",
        "creme",
        "sahne",
        "butter",
        "nudeln",
        "kerne",
        "blätter",
        "beeren",
        "kräuter",
        "gewürz",
        "pfeffer",
        "joghurt",
        "schinken",
        "speck",
        "filet",
        "brust",
        "keule",
        "zwiebel",
        "zwiebeln",
        "tomate",
        "tomaten",
        "suppe",
        "brühe",
        "sirup",
        "kohl",
        "salat",
        "pilze",
        "bohnen",
        "erbsen",
        "linsen",
        "nüsse",
        "mandeln",
        "paste",
        "mark",
        "flocken",
        "senf",
        "honig",
        "wein",
        "bier",
        "wasser",
        "tee",
        "öl",
        "salz",
        "reis",
        "teig",
        "mus",
        "eis",
        "ei",
        "eier",
    }
)
# "Kürbisfleisch", "Fruchtfleisch": the flesh of a plant is the plant itself.
_FLESH = "fleisch"
_MEAT_PARTS = frozenset(
    {
        "rind",
        "schwein",
        "hack",
        "hähnchen",
        "huhn",
        "hühner",
        "kalb",
        "lamm",
        "puten",
        "pute",
        "wild",
        "geflügel",
        "suppen",
        "gulasch",
        "reh",
        "hirsch",
        "ente",
        "gans",
        "brat",
        "dörr",
        "kassler",
        "pferd",
        "ziege",
        "schaf",
    }
)
_TK_FORMS = re.compile(r"\b(?:tiefkühl|tiefgekühlt\w*|tiefgefroren\w*)\b")


@dataclass
class Analysis:
    """Normalized view of an ingredient name or query."""

    tokens: list[str]
    core: list[str]
    specifiers: list[str]
    additions: list[str]
    head: str
    features: dict[str, str]
    # Head stem of every written core word ("Kräutergewürz" → gewürz).
    word_heads: list[str] = field(default_factory=list)

    @property
    def token_set(self) -> frozenset[str]:
        return frozenset(self.tokens)


@dataclass
class IndexEntry:
    ingredient_id: int
    name: str
    slug: str
    status: str
    usage_count: int
    via_alias: str
    analysis: Analysis


@dataclass
class ScoredCandidate:
    entry: IndexEntry
    score: float
    covers_core: bool
    head_match: bool
    specifiers_ok: bool
    conflict: bool
    fuzzy: bool
    extra_core: int
    exact: bool = False
    extra_words: int = 0
    extra_specifiers: int = 0

    @property
    def canonical_key(self) -> tuple[Any, ...]:
        """Ranking by score; ties broken towards verified, used, short names."""
        return (
            -round(self.score, 2),
            self.entry.status != "verified",
            -self.entry.usage_count,
            len(self.entry.name),
            self.entry.name,
        )

    @property
    def selection_key(self) -> tuple[Any, ...]:
        """Among acceptable candidates: exact, verified, fewest extra specifiers, most used."""
        return (
            not self.exact,
            self.entry.status != "verified",
            self.extra_specifiers,
            -self.entry.usage_count,
            -self.score,
            len(self.entry.name),
            self.entry.name,
        )


@dataclass
class MatchingIndex:
    entries: list[IndexEntry] = field(default_factory=list)
    idf: dict[str, float] = field(default_factory=dict)
    vocabulary: frozenset[str] = frozenset()
    by_token: dict[str, list[int]] = field(default_factory=dict)

    # ------------------------------------------------------------------
    # Analysis
    # ------------------------------------------------------------------

    def analyze(self, text: str) -> Analysis:
        return analyze(text, self.vocabulary)

    # ------------------------------------------------------------------
    # Scoring
    # ------------------------------------------------------------------

    def weight(self, token: str) -> float:
        return self.idf.get(token, self._max_idf)

    @property
    def _max_idf(self) -> float:
        return max(self.idf.values(), default=1.0)

    def search(self, query: str, allowed_ids: set[int] | None = None, limit: int = 10) -> list[ScoredCandidate]:
        """Best candidates per ingredient for ``query``, best first."""
        analysis = self.analyze(query)
        if not analysis.tokens:
            return []
        entry_indexes: set[int] = set()
        for token in analysis.tokens:
            entry_indexes.update(self.by_token.get(token, ()))
        # Typos: tokens that are not in the vocabulary are compared approximately.
        unknown = [token for token in analysis.tokens if token not in self.by_token and len(token) >= 5]
        fuzzy_map: dict[str, str] = {}
        for token in unknown:
            best = _closest_token(token, self.by_token)
            if best is not None:
                fuzzy_map[token] = best
                entry_indexes.update(self.by_token[best])

        best_per_ingredient: dict[int, ScoredCandidate] = {}
        for index in entry_indexes:
            entry = self.entries[index]
            if allowed_ids is not None and entry.ingredient_id not in allowed_ids:
                continue
            scored = self._score(analysis, entry, fuzzy_map)
            current = best_per_ingredient.get(entry.ingredient_id)
            if current is None or scored.score > current.score:
                best_per_ingredient[entry.ingredient_id] = scored
        ranked = sorted(best_per_ingredient.values(), key=lambda candidate: candidate.canonical_key)
        return ranked[:limit]

    def _score(self, query: Analysis, entry: IndexEntry, fuzzy_map: dict[str, str]) -> ScoredCandidate:
        target = entry.analysis
        target_tokens = target.token_set
        matched_query: set[str] = set()
        is_fuzzy = False
        for token in query.tokens:
            if token in target_tokens:
                matched_query.add(token)
            elif fuzzy_map.get(token) in target_tokens:
                matched_query.add(token)
                is_fuzzy = True

        def mapped(token: str) -> str:
            return fuzzy_map.get(token, token) if token not in target_tokens else token

        query_weight = sum(self.weight(token) for token in set(query.tokens)) or 1.0
        target_weight = sum(self.weight(token) for token in target_tokens) or 1.0
        covered = sum(self.weight(token) * (0.8 if mapped(token) != token else 1.0) for token in matched_query)
        covered_target = sum(self.weight(mapped(token)) for token in matched_query)
        recall = covered / query_weight
        precision = min(1.0, covered_target / target_weight)
        head_match = bool(query.head) and mapped(query.head) == target.head
        covers_core = all(token in matched_query for token in query.core)
        extra_core = len([token for token in target.core if token not in {mapped(t) for t in matched_query}])

        conflict = any(
            group in target.features and target.features[group] != value for group, value in query.features.items()
        )
        hard_specs = [spec for spec in query.specifiers if spec not in SOFT_SPECIFIERS]
        specifiers_ok = all(spec in target_tokens for spec in hard_specs)
        covered_targets = {mapped(token) for token in matched_query}
        extra_words = sum(1 for word_head in target.word_heads if word_head not in covered_targets)
        extra_specifiers = len(
            [spec for spec in target.specifiers if spec not in SOFT_SPECIFIERS and spec not in query.specifiers]
        )

        score = 0.5 * recall + 0.3 * precision + 0.2 * (1.0 if head_match else 0.0) - 0.03 * extra_specifiers
        if conflict:
            score *= 0.3
        exact = (
            not is_fuzzy
            and not conflict
            and set(query.core) | set(query.specifiers) == set(target.core) | set(target.specifiers)
        )
        score = max(score, 0.0)
        return ScoredCandidate(
            entry=entry,
            score=round(min(score, 1.0), 4),
            covers_core=covers_core,
            head_match=head_match,
            specifiers_ok=specifiers_ok,
            conflict=conflict,
            fuzzy=is_fuzzy,
            extra_core=extra_core,
            exact=exact,
            extra_words=extra_words,
            extra_specifiers=extra_specifiers,
        )


# ---------------------------------------------------------------------------
# Text analysis
# ---------------------------------------------------------------------------


def _stem(word: str) -> str:
    from supply.services.term_normalization import normalize_term

    return normalize_term(word)


def _split_compound(word: str, vocabulary: frozenset[str], depth: int = 0) -> list[str]:
    """Split a compound into known parts ("balsamicoessig" → ["balsamico", "essig"])."""
    if depth > 2 or len(word) < 6:
        return [word]
    best: list[str] | None = None
    for position in range(len(word) - 2, 2, -1):
        left, right = word[:position], word[position:]
        right_ok = _known(right, vocabulary)
        if not right_ok:
            continue
        for linker in ("", "s", "es", "n", "en", "e", "er"):
            if linker and not left.endswith(linker):
                continue
            stem_left = left[: len(left) - len(linker)] if linker else left
            if len(stem_left) < 3:
                continue
            # A known head lets an unknown front part stand ("Speisequark", "Weinbergpfirsich").
            known_head = (right in FOOD_HEADS and len(right) >= 4) or (len(right) >= 5 and right in vocabulary)
            if _known(stem_left, vocabulary) or (len(stem_left) >= 4 and known_head):
                parts = [*_split_compound(stem_left, vocabulary, depth + 1), right]
                # Prefer the split with the longest head part.
                if best is None or len(parts[-1]) > len(best[-1]):
                    best = parts
                break
            if len(stem_left) >= 6:
                inner = _split_compound(stem_left, vocabulary, depth + 1)
                if len(inner) > 1:
                    parts = [*inner, right]
                    if best is None or len(parts[-1]) > len(best[-1]):
                        best = parts
                    break
    return best or [word]


def _known(part: str, vocabulary: frozenset[str]) -> bool:
    if part in _SHORT_PARTS or part in FOOD_HEADS:
        return True
    return len(part) >= 4 and (part in vocabulary or _stem(part) in vocabulary)


_PIECE = re.compile(r"\(|\)|,|[^\s()\[\],;:+&/]+")


def _pieces(text: str) -> list[tuple[str, int, bool, bool]]:
    """Words of ``text`` as (word, hyphen group, inside brackets, after a top-level comma)."""
    lowered = _TK_FORMS.sub("tk", text.lower())
    lowered = _PERCENT.sub(lambda match: f" {match.group(1).replace('.', ',')}% ", lowered)
    pieces: list[tuple[str, int, bool, bool]] = []
    depth = 0
    after_comma = False
    group = 0
    for match in _PIECE.finditer(lowered):
        piece = match.group(0)
        if piece == "(":
            depth += 1
            continue
        if piece == ")":
            depth = max(0, depth - 1)
            continue
        if piece == ",":
            after_comma = after_comma or depth == 0
            continue
        piece = piece.strip(".'\"")
        if not piece:
            continue
        group += 1
        if re.fullmatch(r"\d+(?:,\d+)?%", piece):
            pieces.append((piece, group, depth > 0, after_comma))
            continue
        for index, part in enumerate(piece.split("-")):
            for word in _WORD.findall(part):
                # Each hyphen part is its own word ("Hähnchen-Fleischwurst"); the group of
                # the first part marks the compound for the generic-tail rule.
                pieces.append((word, group * 100 + index, depth > 0, after_comma))
    return pieces


def _raw_words(text: str) -> list[str]:
    return [word for word, _group, _bracket, _comma in _pieces(text)]


def analyze(text: str, vocabulary: frozenset[str] = frozenset()) -> Analysis:
    """Normalize a name or query into tokens, core nouns, specifiers and features.

    Bracket content and words after "mit"/"ohne"/"aus" are additions: they may match
    but are never required. The head noun is the last core noun before a top-level
    comma ("Mehl, Mais" → Mehl).
    """
    pieces = _pieces(text)
    core: list[str] = []
    specifiers: list[str] = []
    additions: list[str] = []
    heads_by_group: dict[int, str] = {}
    head = ""
    in_addition = False
    index = 0
    while index < len(pieces):
        word, group, in_bracket, after_comma = pieces[index]
        index += 1
        if word in ADDITION_WORDS and not in_bracket:
            in_addition = True
            continue
        if word in STOPWORDS or (word.isdigit() and len(word) < 3) or len(word) == 1:
            continue
        following = pieces[index][0] if index < len(pieces) else ""
        if f"{word} {following}" in SPECIFIER_FORMS:
            specifiers.append(SPECIFIER_FORMS[f"{word} {following}"])
            index += 1
            continue
        if word in SPECIFIER_FORMS:
            specifiers.append(SPECIFIER_FORMS[word])
            continue
        if word.endswith("%"):
            specifiers.append(word)
            continue
        is_hyphen_tail = index >= 2 and pieces[index - 2][1] // 100 == group // 100 and group % 100 > 0
        if word in _GENERIC_HYPHEN_HEADS and is_hyphen_tail:
            continue
        parts = _split_compound(word, vocabulary) if vocabulary else [word]
        if len(parts) > 1 and parts[-1] == _FLESH and parts[-2] not in _MEAT_PARTS:
            parts = parts[:-1]
        is_soft = in_bracket or in_addition
        for part in parts:
            if part in SPECIFIER_FORMS:
                specifiers.append(SPECIFIER_FORMS[part])
                continue
            stem = _stem(part)
            if not stem:
                continue
            if is_soft:
                additions.append(stem)
                continue
            core.append(stem)
            heads_by_group[group] = stem
            if not after_comma:
                head = stem
    if not head and core:
        head = core[-1]
    features = {FEATURE_GROUPS[spec]: spec for spec in specifiers if spec in FEATURE_GROUPS}
    for spec in specifiers:
        if spec.endswith("%"):
            features["fat"] = spec
    tokens = [*core, *specifiers, *additions]
    return Analysis(
        tokens=tokens,
        core=core,
        specifiers=specifiers,
        additions=additions,
        head=head,
        features=features,
        word_heads=list(heads_by_group.values()),
    )


def _closest_token(token: str, vocabulary: dict[str, list[int]]) -> str | None:
    """Vocabulary token within a small edit distance (typos like "champninon")."""
    from recipe.services.ingredient_matcher import IngredientMatcher

    best: tuple[float, str] | None = None
    for candidate in vocabulary:
        if abs(len(candidate) - len(token)) > 2 or candidate[:1] != token[:1]:
            continue
        similarity = IngredientMatcher._normalized_levenshtein(token, candidate)
        if similarity >= 0.8 and (best is None or similarity > best[0]):
            best = (similarity, candidate)
    return best[1] if best else None


# ---------------------------------------------------------------------------
# Build and cache
# ---------------------------------------------------------------------------


def build_index() -> MatchingIndex:
    """Analyse every matchable ingredient name and alias."""
    from supply.models import Ingredient, IngredientAlias

    ingredients: list[dict[str, Any]] = [
        dict(row)
        for row in Ingredient.objects.filter(deleted_at__isnull=True, exclude_from_matching=False).values(
            "id", "name", "slug", "status", "usage_count"
        )
    ]
    by_id = {row["id"]: row for row in ingredients}
    aliases = list(IngredientAlias.objects.filter(ingredient_id__in=by_id.keys()).values_list("ingredient_id", "name"))

    raw_vocabulary: set[str] = set()
    for text in [row["name"] for row in ingredients] + [name for _id, name in aliases]:
        for word in _raw_words(text):
            if len(word) >= 3 and not word.endswith("%"):
                raw_vocabulary.add(word)
                raw_vocabulary.add(_stem(word))
    vocabulary = frozenset(raw_vocabulary)

    index = MatchingIndex(vocabulary=vocabulary)
    name_analyses = {row["id"]: analyze(row["name"], vocabulary) for row in ingredients}
    sources: list[tuple[dict[str, Any], str]] = [(row, "") for row in ingredients]
    sources.extend((by_id[ingredient_id], alias) for ingredient_id, alias in aliases)
    for row, alias in sources:
        analysis = name_analyses[row["id"]]
        if alias:
            # An alias names the same ingredient: it inherits the ingredient's features,
            # so "Senf" (alias of "mittelscharfer Senf") still conflicts with "süß".
            alias_analysis = analyze(alias, vocabulary)
            inherited = [spec for spec in analysis.specifiers if spec not in alias_analysis.specifiers]
            alias_analysis.specifiers = [*alias_analysis.specifiers, *inherited]
            alias_analysis.tokens = [*alias_analysis.tokens, *inherited]
            alias_analysis.features = {**analysis.features, **alias_analysis.features}
            analysis = alias_analysis
        if not analysis.tokens:
            continue
        index.entries.append(
            IndexEntry(
                ingredient_id=row["id"],
                name=row["name"],
                slug=row["slug"],
                status=row["status"],
                usage_count=row["usage_count"] or 0,
                via_alias=alias,
                analysis=analysis,
            )
        )

    document_frequency: dict[str, int] = {}
    for position, entry in enumerate(index.entries):
        for token in entry.analysis.token_set:
            document_frequency[token] = document_frequency.get(token, 0) + 1
            index.by_token.setdefault(token, []).append(position)
    total = max(len(index.entries), 1)
    index.idf = {token: math.log(1 + total / count) for token, count in document_frequency.items()}
    return index


_lock = threading.Lock()
_cached: tuple[int, MatchingIndex] | None = None


def catalog_version() -> int:
    from django.core.cache import cache

    return int(cache.get(CACHE_VERSION_KEY) or 0)


def bump_catalog_version() -> None:
    """Invalidate every process's index (called from ingredient and alias signals)."""
    from django.core.cache import cache

    try:
        cache.incr(CACHE_VERSION_KEY)
    except ValueError:
        cache.set(CACHE_VERSION_KEY, 1, timeout=None)


def get_index() -> MatchingIndex:
    global _cached
    version = catalog_version()
    with _lock:
        if _cached is None or _cached[0] != version:
            _cached = (version, build_index())
        return _cached[1]
