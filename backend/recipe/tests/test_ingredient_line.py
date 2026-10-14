"""Tests for the structured ingredient line parser."""

import pytest

from recipe.services.ingredient_line import parse_cells, parse_line, split_compound, to_taste_default


@pytest.mark.parametrize(
    ("line", "quantity", "unit", "query"),
    [
        ("15 Zehe/n Knoblauch", 15, "zehe", "Knoblauch"),
        ("2 Pck. Blätterteig (TK)", 2, "packung", "tk Blätterteig"),
        ("1 Prise(n) Salz", 1, "prise", "Salz"),
        ("Prise(n) Salz", 1, "prise", "Salz"),
        ("2 Stange/n Lauch", 2, "stange", "Lauch"),
        ("0.25 Knolle/n Sellerie", 0.25, "knolle", "Sellerie"),
        ("8 Blätter Basilikum", 8, "blatt", "Basilikum"),
        ("1 Zweig/e Thymian", 1, "zweig", "Thymian"),
        ("200g Mehl", 200, "g", "Mehl"),
        ("1 ½ TL Zimt", 1.5, "tl", "Zimt"),
        ("1 Liter Öl", 1, "l", "Öl"),
        ("1 Ei(er)", 1, "", "Ei"),
    ],
)
def test_units_and_plural_spellings(line, quantity, unit, query):
    parsed = parse_line(line)

    assert parsed.quantity == pytest.approx(quantity)
    assert parsed.unit == unit
    assert parsed.query == query


def test_unit_must_be_a_whole_word():
    assert parse_line("Glasnudeln").name == "Glasnudeln"
    assert parse_line("100 g Würfelzucker").name == "Würfelzucker"


def test_heaped_spoon_scales_the_amount():
    parsed = parse_line("3 TL, gehäuft Naturjoghurt (3,5 % Fett)")

    assert parsed.unit == "tl"
    assert parsed.quantity == pytest.approx(4.5)
    assert parsed.query == "3,5 % Naturjoghurt"


def test_range_with_colon_format_from_pasted_text():
    parsed = parse_line("Frischer Ingwer: ca. 60–80 g")

    assert parsed.quantity == 70
    assert parsed.quantity_kind == "range"
    assert parsed.unit == "g"
    assert parsed.name == "Ingwer"
    assert parsed.specifiers == ["frisch"]


@pytest.mark.parametrize("line", ["n. B. Oregano", "etwas Oregano", "Oregano nach Belieben", "Oregano (n. B.)"])
def test_to_taste_amounts(line):
    parsed = parse_line(line)

    assert parsed.quantity is None
    assert parsed.quantity_kind == "to_taste"
    assert parsed.name == "Oregano"


def test_size_words_are_captured():
    assert parse_line("3 große Zwiebel(n)").size == "large"
    assert parse_line("6 m.-große Ei(er)").size == "medium"
    assert parse_line("24 kleine Tomate(n)").size == "small"


@pytest.mark.parametrize(
    ("line", "query", "note"),
    [
        ("1 Dose Tomaten, passierte", "passiert Tomaten", ""),
        ("1 EL Hefe (Trockenhefe)", "Trockenhefe", ""),
        ("4 EL Essig (Weißweinessig)", "Weißweinessig", ""),
        ("75 ml Wasser (lauwarm)", "Wasser", "lauwarm"),
        ("1 Zwiebel(n) (rot)", "rot Zwiebel", ""),
        ("2 TL Paprikapulver, edelsüßes", "edelsüß Paprikapulver", ""),
        ("250 g Quark (20 %)", "20 % Quark", ""),
        ("400 g Reismehl (Kleb-)", "Klebreismehl", ""),
        ("200 g Bohnen (Mungo-, geschält)", "Mungobohnen", ""),
        ("etwas Butter (und Semmelbrösel für die Form)", "Butter", "und Semmelbrösel für die Form"),
        ("4 EL Balsamico weiß", "weiß Balsamico", ""),
        ("1 Liter trüber Apfelsaft", "trüb Apfelsaft", ""),
        ("2 Ei(er) (hart gekocht)", "Ei", ""),
    ],
)
def test_specifiers_and_notes(line, query, note):
    parsed = parse_line(line)

    assert parsed.query == query
    assert parsed.note == note


def test_weight_in_brackets_is_the_unit_weight():
    assert parse_line("1 Dose Tomate(n) (stückige (425 g))").unit_weight_g == 425
    assert parse_line("1 Lammkeule(n) (mit Knochen, ca. 2kg)").unit_weight_g == 2000


def test_parse_cells_reads_a_table_row():
    parsed = parse_cells("3 TL, gehäuft", "Naturjoghurt", "3,5 % Fett")

    assert parsed.quantity == pytest.approx(4.5)
    assert parsed.unit == "tl"
    assert parsed.query == "3,5 % Naturjoghurt"


def test_compound_line_is_split_when_both_parts_are_known():
    parsed = parse_line("Salz und Pfeffer (schwarzer)")

    lines = split_compound(parsed, lambda name: name in {"Salz", "Pfeffer"})

    assert [line.name for line in lines] == ["Salz", "Pfeffer"]
    assert lines[1].specifiers == ["schwarz"]
    assert {line.source_line for line in lines} == {"Salz und Pfeffer (schwarzer)"}


def test_compound_line_stays_when_a_part_is_unknown():
    parsed = parse_line("Salz und Essig Chips")

    assert split_compound(parsed, lambda name: name == "Salz") == [parsed]


@pytest.mark.parametrize(
    ("line", "expected"),
    [
        ("Pfeffer (schwarz, gemahlen)", (1.0, "prise", "")),
        ("n. B. Salz", (1.0, "prise", "")),
        ("n. B. Olivenöl", (1.0, "el", "")),
        ("etwas Butter", (1.0, "el", "")),
        ("n. B. Petersilie", (3.0, "g", "1 EL gehackt")),
        ("n. B. Oregano (getrocknet)", (1.0, "prise", "")),
        ("Innereien (vom Hähnchen)", None),
        ("2 EL Salz", None),
    ],
)
def test_to_taste_defaults(line, expected):
    assert to_taste_default(parse_line(line)) == expected
