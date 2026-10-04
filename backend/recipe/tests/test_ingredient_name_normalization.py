"""Tabular tests for the deterministic ingredient name normalisation."""

import pytest

from recipe.services.ingredient_name_normalization import normalize_ingredient_name


@pytest.mark.parametrize(
    ("raw", "text", "head", "qualifier_part"),
    [
        ("Prise(n) Salz", "Salz", None, None),
        ("große Ei(er), Größe L", "Ei", None, "Größe L"),
        ("Mineralwasser mit Kohlensäure", "Mineralwasser mit Kohlensäure", "Mineralwasser", "mit Kohlensäure"),
        ("Möhre(n)", "Möhre", None, None),
        ("Bund Petersilie", "Petersilie", None, None),
        ("Tomaten, gehackt", "Tomaten, gehackt", "Tomaten", "gehackt"),
        ("Eier (Größe M)", "Eier", None, "Größe M"),
        ("Kokosmilch", "Kokosmilch", None, None),
        ("Milch (fettarme)", "Milch (fettarme)", "Milch", "fettarme"),
        (
            "Mehl (wer mag, kann Vollkornmehl verwenden)",
            "Mehl (wer mag, kann Vollkornmehl verwenden)",
            "Mehl",
            "wer mag, kann Vollkornmehl verwenden",
        ),
    ],
)
def test_normalization_table(raw, text, head, qualifier_part):
    result = normalize_ingredient_name(raw)

    assert result.text == text
    assert result.head == head
    if qualifier_part is not None:
        assert any(qualifier_part.lower() in qualifier.lower() for qualifier in result.qualifiers)
    assert result.raw == raw


def test_coconut_milk_is_never_cut_inside_the_word():
    result = normalize_ingredient_name("Kokosmilch")
    assert result.head is None
    assert result.text == "Kokosmilch"
    assert not result.changed


def test_only_size_words_keep_the_original_name():
    result = normalize_ingredient_name("große")
    assert result.text == "große"


def test_blank_input():
    assert normalize_ingredient_name("   ").text == ""
