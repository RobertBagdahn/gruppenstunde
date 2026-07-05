"""Term normalization for singular/plural-robust ingredient matching.

Uses `snowballstemmer`'s German stemmer to map singular/plural forms of a
term to the same normalized form (e.g. "Zwiebel"/"Zwiebeln"). Irregular
plurals that the stemmer does not handle correctly (e.g. "Apfel"/"Äpfel")
are covered by a manually maintained mapping.
"""

from __future__ import annotations

import snowballstemmer

_stemmer = snowballstemmer.stemmer("german")

# Irregular German plurals (and other forms) not correctly reduced by the
# Snowball stemmer to a shared stem. Maps any known variant to a canonical
# normalized form.
_IRREGULAR_FORMS: dict[str, str] = {
    "apfel": "apfel",
    "äpfel": "apfel",
    "mutter": "mutter",
    "mütter": "mutter",
    "nuss": "nuss",
    "nüsse": "nuss",
    "kraut": "kraut",
    "kräuter": "kraut",
}


def normalize_term(text: str) -> str:
    """Return a normalized (stemmed) form of `text` for fuzzy comparisons.

    Trims whitespace, lowercases, and applies German stemming so that
    singular/plural variants map to the same normalized form. Irregular
    plurals are resolved via `_IRREGULAR_FORMS` before stemming.
    """
    cleaned = text.strip().lower()
    if not cleaned:
        return ""

    normalized_words = []
    for word in cleaned.split():
        if word in _IRREGULAR_FORMS:
            normalized_words.append(_IRREGULAR_FORMS[word])
        else:
            normalized_words.append(_stemmer.stemWord(word))

    return " ".join(normalized_words)
