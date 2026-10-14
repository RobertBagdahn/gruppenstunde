"""Gold labels for the Chefkoch import matching benchmark.

One entry per ingredient line of each page, in page order. A line is
``(source, accepted, grams)`` or ``(source, accepted, grams, options)``:

- ``accepted``: catalog ingredient names that are a correct match; the first is preferred.
  The catalog contains duplicates ("Zwiebel"/"Speisezwiebeln"), so several can be correct.
- ``grams``: expected total weight of the line; ``None`` when the source gives no amount.
- options: ``tol`` relative gram tolerance (default 0.25; container units and pieces are
  estimates and get more), ``new=True`` when no suitable catalog ingredient exists and the
  row may stay open for "Neue Zutat anlegen".

A compound line ("Salz und Pfeffer") is a ``Split`` of several expected rows: the import
must turn it into one row per ingredient, each "nach Belieben" seasoning as 1 Prise.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass(frozen=True)
class Expected:
    source: str
    accepted: tuple[str, ...]
    grams: float | None
    tol: float = 0.25
    new: bool = False


@dataclass(frozen=True)
class Split:
    source: str
    parts: tuple[Expected, ...] = field(default_factory=tuple)


SALT = ("Jodsalz", "Salz")
PEPPER = ("gemahlener schwarzer Pfeffer", "Pfeffer, Schwarz", "Gemahlener Pfeffer", "Schwarzer Pfeffer gemahlen")
EGGS = ("Hühnerei (Größe M)", "Hühnereier Größe M", "Hühnerei", "Hühnereier", "Eier (Größe M)")
ONION = ("Speisezwiebeln", "Zwiebel")
GARLIC_CLOVE = ("Knoblauchzehe", "frischer Knoblauch")
OLIVE_OIL = ("Olivenöl nativ extra", "Natives Olivenöl Extra", "Olivenöl extra vergine")
MINCE = ("Hackfleisch (gemischt Rind und Schwein)", "Hackfleisch gemischt", "Hackfleisch")
SUGAR = ("weißer Haushaltszucker", "Haushaltszucker (Saccharose)")
OIL = ("raffiniertes Sonnenblumenöl", "Öl", "Speiseöl", "Sonnenblumenöl", "Rapsöl", "Raps- oder Sonnenblumenöl")
WATER = ("Leitungswasser",)
BASIL = ("frisches Basilikum", "Basilikum-Blatt, frisch", "Basilikum frisch", "Basilikum (frisch)")
THYME = ("Thymian", "Thymian (frisch)")
CAYENNE = ("Cayennepfeffer",)
PINCH_G = 0.4


def _salt_and_pepper(source: str) -> Split:
    """'Salz und Pfeffer' without an amount: one pinch of each."""
    return Split(
        source,
        (
            Expected("Salz", SALT, PINCH_G, tol=1.0),
            Expected("Pfeffer", PEPPER, PINCH_G, tol=1.0),
        ),
    )


def _(source: str, accepted: tuple[str, ...] | str, grams: float | None, **options: Any) -> Expected:
    names = (accepted,) if isinstance(accepted, str) else accepted
    return Expected(source, names, grams, **options)


PAGES: dict[str, list[Expected | Split]] = {
    "1118801218112799-Griechische-Teigtaschen.html": [
        _("2 Pck. Blätterteig (TK)", "Blätterteig", 900, tol=0.5),
        _("1 Zwiebel(n)", ONION, 100, tol=0.5),
        _("1 Knoblauchzehe(n)", GARLIC_CLOVE, 5, tol=0.5),
        _("2 EL Olivenöl", OLIVE_OIL, 22, tol=0.4),
        _("500 g Hackfleisch (gemischt)", MINCE, 500),
        _(
            "1 Dose Tomate(n) (stückige (425 g))",
            ("Stückige Tomaten", "Tomaten (stückig, Dose)", "Tomaten stückig", "Tomaten (Dose)", "Tomaten, gewürfelt"),
            425,
            tol=0.3,
        ),
        _salt_and_pepper("Salz und Pfeffer (schwarzer)"),
        _("1 Pck. Feta-Käse", "Feta", 200, tol=0.5),
        _("etwas Oregano (getrockneter)", "Oregano getrocknet", None),
        _("1 Ei(er)", EGGS, 60, tol=0.4),
        _("1 EL Milch", ("Kuhmilch 3,5 % Fett", "Milch"), 15, tol=0.4),
    ],
    "1145481220883340-Axels-Wurstsalat.html": [
        _("400 g Fleischwurst", "Lyoner", 400, new=True),
        _("200 g Feta-Käse", "Feta", 200),
        _(
            "20 Oliven (schwarz, entsteint)",
            ("Schwarze Oliven ohne Stein", "Schwarze Oliven", "Oliven ohne Stein", "Oliven"),
            80,
            tol=0.6,
        ),
        _("10 Kirschtomate(n)", ("Kirschtomaten", "Cherrytomaten", "Cocktailtomaten"), 150, tol=0.5),
        _("1 Zwiebel(n) (rot)", ("Rote Zwiebel", "Rote Zwiebeln", "Zwiebel (rot)", "Zwiebel, rot"), 100, tol=0.5),
        _("1 Knoblauchzehe(n)", GARLIC_CLOVE, 5, tol=0.5),
        _("1 Zweig/e Thymian", THYME, None),
        _("4 EL Essig (Weißweinessig)", "Weißweinessig", 60, tol=0.3),
        _("2 EL Olivenöl", OLIVE_OIL, 22, tol=0.4),
        _("Pfeffer (schwarz, gemahlen)", PEPPER, PINCH_G, tol=1.0),
    ],
    "1494721254659447-Mandel-Amaretto-Kuchen-a-la-Maeusle.html": [
        _("6 m.-große Ei(er)", EGGS, 360, tol=0.3),
        _("150 g Rohrzucker", ("Rohrzucker braun", "Brauner Rohrzucker", "Dunkler Rohrzucker"), 150),
        _("1 Prise(n) Salz", SALT, PINCH_G, tol=1.0),
        _("200 g Mandel(n) (gemahlen)", ("Gemahlene Mandeln", "Mandeln gemahlen"), 200),
        _("3 EL Amaretto", (), 45, tol=0.4, new=True),
        _("etwas Butter (und Semmelbrösel für die Form)", ("Deutsche Markenbutter", "Butter"), None),
        _("200 g Schmand", "Schmand", 200),
        _("250 g Quark (20 %)", "Speisequark 20%", 250),
        _("1 EL Honig (flüssiger und neutraler)", "Blütenhonig", 20, tol=0.4),
    ],
    "1952171317404821-Frittierte-Sesambaellchen.html": [
        _("400 g Reismehl (Kleb-)", (), 400, new=True),
        _("4 EL Reismehl (normales)", (), 40, tol=0.5, new=True),
        _("4 EL Kartoffelpüreepulver", "Kartoffelpüree-Pulver", 30, tol=0.6),
        _("8 EL Zucker (oder Rohrzucker)", SUGAR, 100, tol=0.4),
        _("1 Pck. Backpulver", "Backpulver (Natron-Basis)", 16, tol=0.3),
        _("400 ml Wasser (warmes)", WATER, 400),
        _("200 g Bohnen (Mungo-, geschält)", (), 200, new=True),
        _("200 g Zucker", SUGAR, 200),
        _("1 Pck. Vanillezucker", "Vanillezucker", 8, tol=0.3),
        _("100 g Sesam", "Sesam", 100),
        _("1 Liter Öl", OIL, 920, tol=0.15),
    ],
    "229121093945943-Challah.html": [
        _("1 EL Hefe (Trockenhefe)", ("Trockenhefe", "Hefe (trocken)"), 10, tol=0.6),
        _("1 EL Zucker", SUGAR, 12.5, tol=0.4),
        _("1 EL Salz", SALT, 16, tol=0.4),
        _("750 g Mehl", ("Weizenmehl Type 405", "Weizenmehl"), 750),
        _("2 Ei(er)", EGGS, 120, tol=0.4),
        _("5 EL Öl", OIL, 50, tol=0.4),
        _("75 ml Wasser (lauwarm)", WATER, 75),
        _("1 Ei(er)", EGGS, 60, tol=0.4),
        _("1 Prise(n) Zucker", SUGAR, PINCH_G, tol=1.0),
        _("1 Prise(n) Salz", SALT, PINCH_G, tol=1.0),
    ],
    "3039471456595536-Timballo-di-Riso.html": [
        _("250 g Hackfleisch, gemischtes", MINCE, 250),
        _("1 Zwiebel(n)", ONION, 100, tol=0.5),
        _("3 große Champignons", "Champignons", 90, tol=0.6),
        _("1 Knoblauchzehe(n)", GARLIC_CLOVE, 5, tol=0.5),
        _("n. B. Olivenöl", OLIVE_OIL, None),
        _salt_and_pepper("n. B. Salz und Pfeffer"),
        _("8 Blätter Basilikum", BASIL, 3.2, tol=1.0),
        _("2 Ei(er) (hart gekocht)", (*EGGS, "Eier gekocht"), 120, tol=0.4),
        _("n. B. Oregano", "Oregano getrocknet", None),
        _("50 g Rohschinken (gewürfelt)", ("Parmaschinken", "Serrano-Schinken", "Rohschinken leicht"), 50, new=True),
        _("150 g Käse (nach Wahl)", ("Gouda", "Käse gerieben", "Käse (Gouda)", "Reibekäse"), 150),
        _("70 g Parmesan (gerieben)", ("Parmigiano Reggiano", "Parmesan gerieben"), 70),
        _("225 g Reis", ("Risottoreis", "Risotto-Reis", "Langkornreis parboiled", "Langkornreis"), 225),
        _("50 g Erbsen (TK)", ("Erbsen (Tiefkühl)", "Tiefkühl Erbsen", "Tiefkühl-Erbsen"), 50),
        _("1 Dose Tomaten, passierte", "Passierte Tomaten", 450, tol=0.4),
        _("1 Glas Weißwein", "Weißwein", 175, tol=0.4),
    ],
    "3415041508835296-Lammkeule-nach-feiner-Art.html": [
        _("15 Zehe/n Knoblauch", GARLIC_CLOVE, 75, tol=0.4),
        _("1 Bund Rosmarin (frisch)", ("Rosmarin (frisch)", "Rosmarin", "Rosmarin-Zweig"), 20, tol=0.6),
        _(
            "3 große Paprikaschote(n), bunte",
            ("Gemüsepaprika rot", "Paprikaschoten", "Paprika (rot)", "Paprika (gelb)", "Paprika (grün)"),
            600,
            tol=0.4,
        ),
        _("3 große Zwiebel(n)", ONION, 450, tol=0.4),
        _("4 große Tomate(n)", "Tomaten", 600, tol=0.4),
        _("2 m.-große Karotte(n)", ("Karotte", "Karotten", "Speisemöhren", "Möhre"), 160, tol=0.4),
        _("2 Stange/n Lauch", ("Lauch", "Porree"), 400, tol=0.5),
        _("3 Stängel Sellerieblätter", (), None, new=True),
        _("300 g Kürbisfleisch", ("Kürbis (Hokkaido)", "Kürbis (Butternut)"), 300),
        _("12 EL Olivenöl (Extra virgin)", OLIVE_OIL, 120, tol=0.3),
        _("1 Lammkeule(n) (mit Knochen, ca. 2kg)", (), 2000, tol=0.3, new=True),
        _("8 EL Waldhonig", ("Waldhonig", "Blütenhonig"), 160, tol=0.3),
        _salt_and_pepper("etwas Salz und Pfeffer (aus der Mühle)"),
    ],
    "3855181587055121-Gefuelltes-Brathaehnchen-a-la-Max.html": [
        _("1.5 kg Hähnchen (frisch oder TK, mit Innereien)", (), 1500, new=True),
        _("3 TL Salz", SALT, 15, tol=0.4),
        _("1 TL Cayennepfeffer (gemahlen)", CAYENNE, 2, tol=0.6),
        _("0.5 TL Pfeffer (gemahlen)", PEPPER, 1, tol=0.6),
        _("1 TL Paprikapulver, rosenscharfes", ("Paprikapulver edelsüß", "Paprika edelsüß"), 2.5, tol=0.6, new=True),
        _("2 TL Paprikapulver, edelsüßes", ("Paprikapulver edelsüß", "Paprika edelsüß"), 5, tol=0.6),
        _("6 EL Rapsöl", ("Rapsöl", "Raps- oder Sonnenblumenöl"), 80, tol=0.3),
        _("1 TL Knoblauchpulver", "Knoblauchpulver", 2.5, tol=0.6),
        _("1 EL Limettensaft", "Limettensaft", 15, tol=0.3),
        _("Innereien (vom Hähnchen)", (), None, new=True),
        _("0.25 Knolle/n Sellerie", "Sellerie (Knolle)", 175, tol=0.6),
        _(
            "0.5 Bund Lauchzwiebel(n)",
            ("Lauchzwiebel", "Lauchzwiebeln", "Frühlingszwiebel", "Frühlingszwiebeln"),
            50,
            tol=0.6,
        ),
        _("2 TL Senf, süßer", (), 10, tol=0.5, new=True),
        _("3 TL, gehäuft Naturjoghurt (3,5 % Fett)", "Naturjoghurt 3,5 % Fett", 24, tol=0.6),
        _("2 TL Salz", SALT, 10, tol=0.4),
        _("1 Prise(n) Cayennepfeffer", CAYENNE, PINCH_G, tol=1.0),
        _(
            "einige Stiele Gartenkräuter (Schnittlauch, Petersilie, Bergbohnenkraut)",
            ("Frische Kräuter", "Kräuter"),
            None,
        ),
        _("1 TL Knoblauchpulver", "Knoblauchpulver", 2.5, tol=0.6),
    ],
    "4236221688361447-Tomatensalat-mit-Kalbs-Saltimbocca.html": [
        _("800 g Tomate(n) gemischte", "Tomaten", 800),
        _("2 Knoblauchzehe(n)", GARLIC_CLOVE, 10, tol=0.5),
        _("4 Stiele Thymian", THYME, None),
    ],
    "908131196018784-Tomaten-Mozzarella-Turm-mit-Pesto.html": [
        _("3 EL Sonnenblumenkerne", "Sonnenblumenkerne", 30, tol=0.5),
        _("24 kleine Tomate(n)", ("Tomaten", "Cocktailtomaten", "Kirschtomaten", "Cherrytomaten"), 960, tol=0.6),
        _("375 g Mozzarella", "Mozzarella aus Kuhmilch", 375),
        _("1 Topf Basilikum", BASIL, 30, tol=0.7),
        _("4 EL Balsamico weiß", "Weißer Balsamicoessig", 60, tol=0.3),
        _("2 EL Pesto grün", ("Pesto Basilico", "Pesto", "Pesto Verde"), 30, tol=0.4),
        _("2 EL Wasser", WATER, 30, tol=0.3),
        _("4 EL Olivenöl", OLIVE_OIL, 44, tol=0.4),
        _salt_and_pepper("Salz und Pfeffer"),
    ],
}


# ---------------------------------------------------------------------------
# Control set: ten more random pages, labelled before the pipeline ever ran on them.
# Rules are never tuned on these pages; they show whether improvements generalize.
# ---------------------------------------------------------------------------

POTATOES = ("festkochende Kartoffeln", "Kartoffel", "Kartoffeln festkochend")
SOY = ("Sojasauce Fermentiert", "Sojasoße", "Dunkle Sojasauce", "Helle Sojasauce")
VINEGAR = ("Weißweinessig",)
PARSLEY = ("frische Petersilie", "Glatte Petersilie", "Petersilie frisch gehackt", "Petersilie (frisch)", "Petersilie")
CREAM = ("Schlagsahne 30 % Fett", "Schlagsahne")
FLOUR = ("Weizenmehl Type 405", "Weizenmehl")
COUVERTURE = (
    "Zartbitterkuvertüre",
    "Zartbitter Kuvertüre",
    "Zartbitter-Kuvertüre",
    "Vollmilch Kuvertüre",
    "Kuvertüre Vollmilch",
    "Weiße Schokolade",
)

CONTROL_PAGES: dict[str, list[Expected | Split]] = {
    "1474781252481797-Provenzalische-Haehnchenschenkel-mit-Knoblauchkartoffeln-und-Schmortomaten.html": [
        _("3 große Hähnchenkeule(n) (mit Rückenstück)", "Hähnchenschenkel", 900, tol=0.5),
        _("8 EL Öl (neutrales (z. B. Sonnenblumenöl))", OIL, 100, tol=0.3),
        _salt_and_pepper("Salz und Pfeffer (weißer und schwarzer)"),
        _("0.5 TL Thymian (getrocknet, gerebelt)", ("Getrockneter Thymian", "Thymian"), 1, tol=0.6),
        _("3 Knoblauchzehe(n)", GARLIC_CLOVE, 15, tol=0.5),
        _("1 kg Kartoffel(n)", POTATOES, 1000),
        _("3 große Tomate(n) (reif)", "Tomaten", 540, tol=0.4),
    ],
    "158581069496625-Chicken-Wings.html": [
        _("10 Hähnchenflügel (oder Haxerln)", (), 800, tol=0.5, new=True),
        _("50 ml Sojasauce", SOY, 50),
        _("50 ml Öl (evtl. Erdnussöl)", (*OIL, "Erdnussöl"), 46),
        _("2 EL Essig", VINEGAR, 30, tol=0.3),
        _("1 TL Tabasco", ("Chilisauce",), 5, tol=0.5, new=True),
        _("2 Zehe/n Knoblauch (gehackt)", GARLIC_CLOVE, 10, tol=0.5),
        _("2 TL Ingwer (gehackt)", ("Ingwer", "Ingwerwurzel"), 8, tol=0.6),
        _("1 TL Pfeffer, schwarzer", PEPPER, 2.5, tol=0.6),
        _("1 TL Zucker", SUGAR, 4, tol=0.5),
    ],
    "1990121322506977-Baerlauchpesto.html": [
        _("1 Bund Bärlauch", (), None, new=True),
        _("1 EL Olivenöl", OLIVE_OIL, 12, tol=0.4),
        _("1 TL Sirup ((Agavensirup) oder Honig)", ("Agavendicksaft", "Honig oder Agavendicksaft"), 7, tol=0.5),
        _("3 EL Parmesan", ("Parmigiano Reggiano", "Parmesan gerieben"), 30, tol=0.5),
        _("1 Zehe/n Knoblauch", GARLIC_CLOVE, 5, tol=0.5),
        _("1 Prise(n) Salz", SALT, PINCH_G, tol=1.0),
        _("etwas Rosmarin", ("Rosmarin", "Rosmarin (frisch)", "Rosmarin-Zweig"), None),
    ],
    "2171311348548463-Gruener-Spargel-mit-Feta.html": [
        _("2 Bund Spargel (grüner)", "Spargel (grün)", 1000, tol=0.3),
        _("n. B. Zucker", SUGAR, PINCH_G, tol=1.0),
        _("500 g Kirschtomate(n)", ("Kirschtomaten", "Cherrytomaten", "Cocktailtomaten"), 500),
        _("250 g Feta-Käse", "Feta", 250),
        _("1 Bund Minze (frische)", "Minze", 20, tol=0.5),
        _("Olivenöl", OLIVE_OIL, None),
        _("Balsamico (weißer)", "Weißer Balsamicoessig", None),
        _("n. B. Weißbrot", ("Baguette", "Baguette (aufback)"), None, new=True),
        _("Pfeffer", PEPPER, PINCH_G, tol=1.0),
    ],
    "2195411352305886-Finis-suesse-Schale.html": [
        _("100 g Sahne", CREAM, 100),
        _("150 g Naturjoghurt", "Naturjoghurt 3,5 % Fett", 150),
        _("1 EL Honig", "Blütenhonig", 21, tol=0.4),
        _("2 Pfirsich(e) (Weinberg-)", "Pfirsich", 300, tol=0.4),
        _(
            "1 Handvoll Weintrauben",
            ("Trauben", "Weintrauben, rot", "Weintrauben, grün", "Trauben hell kernlos"),
            30,
            tol=0.5,
        ),
        _("0.25 Melone(n) (Gallia-)", "Melone", 250, tol=0.5),
    ],
    "2300611366873272-Paprika-Schweinefilet.html": [
        _("600 g Schweinefilet(s)", "Schweinefilet", 600),
        _("Salz", SALT, PINCH_G, tol=1.0),
        _("50 g Mehl", FLOUR, 50),
        _("60 g Fett", ("Pflanzenfett", "Butterschmalz", "Kokosfett"), 60, new=True),
        _("3 Zwiebel(n)", ONION, 300, tol=0.5),
        _("1 EL Paprikapulver (edelsüß)", ("Paprikapulver edelsüß", "Paprika edelsüß"), 7, tol=0.5),
        _("0.25 Liter Wasser", WATER, 250),
        _(
            "2 Paprikaschote(n) (gelb oder rot)",
            ("Gemüsepaprika rot", "Paprikaschoten", "Paprika (rot)", "Paprika (gelb)"),
            360,
            tol=0.4,
        ),
        _("3 Tomate(n)", "Tomaten", 360, tol=0.4),
        _("0.5 Tasse saure Sahne", "Saure Sahne", 100, tol=0.3),
    ],
    "2605091409332581-Schwertfisch-Steaks-Cajun-Style-mit-scharfer-Tomatensauce.html": [
        _("4 Steak(s) (vom Schwertfisch, etwa 200 g pro Stück)", (), 800, new=True),
        _("1 EL Knoblauchpulver", "Knoblauchpulver", 7.5, tol=0.5),
        _("1 EL Zwiebelpulver", "Zwiebelpulver", 7.5, tol=0.5),
        _("1 EL Pfeffer (weiß, gemahlen)", (), 7, tol=0.5, new=True),
        _("1 EL Pfeffer (schwarz, grob gemahlen)", PEPPER, 7, tol=0.5),
        _("1 EL Thymian (getrocknet)", ("Getrockneter Thymian", "Thymian"), 4, tol=0.6),
        _("1 EL Oregano (getrocknet)", "Oregano getrocknet", 4, tol=0.6),
        _("500 g Tomate(n)", "Tomaten", 500),
        _("1 Zwiebel(n)", ONION, 100, tol=0.5),
        _("1 Knoblauchzehe(n) (getrocknet)", GARLIC_CLOVE, 5, tol=0.5),
        _("1 Chilischote(n) (rot)", ("Rote Peperoni", "Chili"), 10, tol=0.6),
        _("5 EL Öl", OIL, 69, tol=0.3),
        _("1 EL Petersilie (gehackt)", PARSLEY, 4, tol=0.6),
        _("Salz", SALT, PINCH_G, tol=1.0),
        _("Pfeffer", PEPPER, PINCH_G, tol=1.0),
        _("Tabasco", ("Chilisauce",), None, new=True),
    ],
    "3397641505906095-Aegyptische-Knoblauchsauce.html": [
        _("12 große Knoblauchzehe(n)", GARLIC_CLOVE, 90, tol=0.4),
        _(
            "125 ml Gemüsebrühe (oder Fleischbrühe)",
            ("Gemüsebrühe", "Brühe", "Gemüsebrühe heiß", "Gemüsebrühe ungesalzen"),
            125,
        ),
        _("4 EL Öl (geschmacksneutral)", OIL, 55, tol=0.3),
        _("3 EL Essig", VINEGAR, 45, tol=0.3),
        _("2 EL Zitronensaft", "Zitronensaft", 30, tol=0.3),
        _("0.5 TL Chiliflocken (oder eine fein gehackte, scharfe Chilischote)", "Chiliflocken", 1, tol=0.6),
        _("1 TL Kreuzkümmelpulver", ("Kreuzkümmelpulver", "Gemahlener Kreuzkümmel", "Kreuzkümmel"), 2, tol=0.6),
    ],
    "3525561526062357-Vegetarischer-Pizzabelag-mit-Provolone-Piccante.html": [
        _("0.5 Pck. Tomaten, passierte", "Passierte Tomaten", 250, tol=0.4),
        _("0.5 Zucchini", ("grüne Zucchini", "Zucchini frisch", "Zucchini (mittelgroß)"), 125, tol=0.5),
        _("1 kleine Zwiebel(n)", ONION, 50, tol=0.5),
        _("100 g Hartkäse (Provolone Piccante)", ("Hartkäse gereift",), 100, new=True),
        _(
            "6 Oliven",
            ("Oliven", "Oliven ohne Stein", "Schwarze Oliven", "Schwarze Oliven ohne Stein", "Grüne Oliven"),
            24,
            tol=0.6,
        ),
        _salt_and_pepper("Salz und Pfeffer"),
        _("1 Knoblauchzehe(n)", GARLIC_CLOVE, 5, tol=0.5),
        _("Kräuter, italienische", "Italienische Kräuter getrocknet", None),
        _("Olivenöl", OLIVE_OIL, None),
    ],
    "604211160147214-Eierlikoerkuchen-vom-Blech.html": [
        _("5 Ei(er)", EGGS, 300, tol=0.3),
        _("250 g Puderzucker", "Puderzucker", 250),
        _("2 Pck. Vanillinzucker", ("Vanillinzucker", "Vanillezucker"), 16, tol=0.4),
        _("250 ml Öl", OIL, 230, tol=0.15),
        _("250 ml Eierlikör", (), 250, new=True),
        _("125 g Mehl", FLOUR, 125),
        _("125 g Speisestärke", "Speisestärke", 125),
        _("1 Pck. Backpulver", "Backpulver (Natron-Basis)", 16, tol=0.3),
        _(
            "2 Gläser Sauerkirschen (oder Heidelbeeren)",
            ("Sauerkirschen entsteint (Glas)", "Sauerkirschen, eingelegt"),
            700,
            tol=0.4,
        ),
        _("2 Pck. Puddingpulver (Vanille)", ("Vanillepuddingpulver", "Puddingpulver"), 74, tol=0.4),
        _("3 Becher Schlagsahne", CREAM, 600, tol=0.3),
        _("100 g Kuvertüre", COUVERTURE, 100, new=True),
    ],
}
