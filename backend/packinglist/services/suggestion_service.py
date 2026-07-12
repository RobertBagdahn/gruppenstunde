"""
Service for packing list item suggestions and dynamic list building.

Provides:
1. Unified Catalog — single source of truth for all packing list items
2. Dynamic Builder — context-based packing list generation
3. Static catalog suggestions — filtered catalog items for autocomplete/browse
4. AI-powered suggestions — contextual item ideas via Vertex AI Gemini
"""

import logging
import random

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Unified Catalog — single source of truth for all packing list items
#
# Each item: (name, quantity_hint, description, tags, is_do_not_bring)
#
# Tag system:
#   Priority tags (exactly one per item):
#     "basis"     — always included regardless of context
#     "standard"  — included when at least one context tag matches
#     "erweitert" — included only for longer trips (1-woche, 2-wochen-plus) + context match
#
#   Context tags (zero or more):
#     Activity:  zeltlager, hausfahrt, tageswanderung, radtour, kanutour, stadtfahrt, hajk, gruppenstunde
#     Duration:  1-tag, wochenende, 1-woche, 2-wochen-plus
#     Season:    sommer, winter, uebergang
#     Age group: woelflinge, jufis, pfadis, rover
#
#   Exclusion tags (prefixed with !):
#     "!woelflinge" — exclude for Wölflinge
#     "!1-tag"      — exclude for day trips
#
#   Legacy/general tags (used for search/autocomplete matching):
#     outdoor, wanderung, lager, pfadfinder, kochen, navigation, etc.
# ---------------------------------------------------------------------------

UNIFIED_CATALOG: dict[str, list[tuple[str, str, str, list[str], bool]]] = {
    "Kleidung": [
        ("Wandersocken", "je Übernachtung", "", ["basis", "outdoor", "wanderung", "lager", "!1-tag"], False),
        ("Unterhose", "je 2 Übernachtungen", "", ["basis", "!1-tag"], False),
        ("T-Shirt", "je Übernachtung", "", ["basis"], False),
        ("Klufthemd mit Halstuch und Knoten", "", "", ["basis", "pfadfinder"], False),
        (
            "Lange Hose zum Wechseln",
            "",
            "Selten notwendig",
            ["standard", "zeltlager", "hajk", "wochenende", "1-woche", "2-wochen-plus"],
            False,
        ),
        ("Kurze Hose", "", "", ["standard", "sommer", "zeltlager", "hajk"], False),
        ("Gürtel", "", "", ["basis"], False),
        ("Woll-Juja oder Pullover zum Wechseln", "", "", ["basis", "outdoor", "!1-tag"], False),
        ("Regenjacke", "", "", ["basis", "outdoor", "wanderung"], False),
        (
            "Regenhose",
            "",
            "",
            ["standard", "zeltlager", "hajk", "tageswanderung", "radtour", "kanutour", "wanderung"],
            False,
        ),
        ("Poncho", "", "", ["standard", "tageswanderung", "hajk", "wanderung"], False),
        ("Wanderschuhe", "", "Eingelaufen!", ["basis", "outdoor", "wanderung", "!gruppenstunde", "!stadtfahrt"], False),
        ("Badehose / Badeanzug", "", "", ["standard", "sommer", "kanutour", "zeltlager"], False),
        ("Mütze / Hut", "", "", ["standard", "sommer", "outdoor"], False),
        ("Halstuch", "", "", ["standard", "pfadfinder"], False),
        ("Fleecejacke", "", "", ["standard", "winter", "uebergang", "outdoor"], False),
        ("Thermounterwäsche (Ober- und Unterteil)", "", "", ["standard", "winter"], False),
        ("Wechsel-T-Shirt", "2-3 Stück", "", ["standard", "1-woche", "2-wochen-plus", "zeltlager"], False),
        (
            "Schlaf-T-Shirt",
            "",
            "Nur zum Schlafen",
            ["standard", "zeltlager", "hajk", "wochenende", "1-woche", "2-wochen-plus"],
            False,
        ),
        (
            "Sandalen / Badelatschen",
            "",
            "Für den Waschraum",
            ["standard", "sommer", "zeltlager", "1-woche", "2-wochen-plus"],
            False,
        ),
        ("Gummistiefel", "", "Für matschiges Gelände", ["standard", "uebergang", "zeltlager"], False),
        ("Softshell-Jacke", "", "Wind- und wasserabweisend", ["erweitert", "wanderung", "hajk", "radtour"], False),
        ("Wanderhose mit abnehmbaren Beinen", "", "", ["erweitert", "wanderung", "hajk", "sommer"], False),
        ("Sport-BH", "", "", ["erweitert", "wanderung", "radtour"], False),
        ("Funktionsunterwäsche", "", "Schnelltrocknend", ["erweitert", "wanderung", "hajk", "radtour"], False),
        ("Gamaschen", "", "Bei Schnee oder hohem Gras", ["erweitert", "winter", "wanderung", "hajk"], False),
        ("Regenüberzug für Schuhe", "", "", ["erweitert", "wanderung", "hajk"], False),
    ],
    "Kulturbeutel / Hygiene": [
        ("Biologisch abbaubare Zahnpasta", "", "", ["standard", "zeltlager", "hajk", "outdoor"], False),
        ("Biologisch abbaubares Waschzeug", "", "", ["standard", "zeltlager", "hajk", "outdoor"], False),
        ("Zahnbürste", "", "", ["basis", "!1-tag"], False),
        ("Leichtes Handtuch", "", "Mikrofaser empfohlen", ["basis", "!1-tag"], False),
        (
            "Geschlechtsspezifisches (Rasierzeug, ...)",
            "",
            "",
            ["standard", "1-woche", "2-wochen-plus", "!woelflinge", "!jufis"],
            False,
        ),
        ("Feuchtigkeitscreme für trockene Hände", "", "", ["standard", "winter", "outdoor"], False),
        ("Lippenpflegestift", "", "Mit Lichtschutzfaktor", ["standard", "outdoor", "winter", "sommer"], False),
        ("Klopapier", "", "In Plastiktüte verpackt", ["standard", "zeltlager", "hajk", "outdoor"], False),
        ("Haarbürste / Kamm", "", "", ["standard", "wochenende", "1-woche", "2-wochen-plus"], False),
        ("Taschentücher", "", "", ["basis"], False),
        ("Handdesinfektion", "", "", ["basis"], False),
        ("Sonnencreme", "LSF 30+", "Mindestens LSF 30", ["standard", "sommer", "outdoor"], False),
        ("After-Sun Lotion", "", "", ["erweitert", "sommer", "1-woche", "2-wochen-plus"], False),
        ("Zeckenzange", "", "", ["standard", "outdoor", "zeltlager", "hajk", "tageswanderung"], False),
        ("Mückenspray", "", "DEET oder Icaridin", ["standard", "sommer", "outdoor", "zeltlager"], False),
        ("Waschlappen", "", "", ["standard", "wochenende", "1-woche", "2-wochen-plus"], False),
        ("Haargummis / Haarklammern", "", "", ["standard", "wochenende", "1-woche", "2-wochen-plus"], False),
        (
            "Biologisch abbaubare Seife",
            "",
            "Für Körper und Geschirr",
            ["standard", "zeltlager", "hajk", "outdoor"],
            False,
        ),
        ("Nagelschere / Nagelknipser", "", "", ["erweitert", "2-wochen-plus"], False),
        ("Duschgel (biologisch abbaubar)", "", "", ["standard", "zeltlager", "1-woche", "2-wochen-plus"], False),
        ("Deo", "", "", ["standard", "wochenende", "1-woche", "2-wochen-plus", "!woelflinge"], False),
        ("Wattestäbchen", "", "", ["erweitert", "1-woche", "2-wochen-plus"], False),
        (
            "Pflaster (Blasenpflaster)",
            "",
            "Verschiedene Größen",
            ["standard", "wanderung", "hajk", "tageswanderung", "outdoor"],
            False,
        ),
    ],
    "Schlafen": [
        (
            "Schlafsack",
            "",
            "Temperaturbereich beachten!",
            ["basis", "zeltlager", "hajk", "!1-tag", "!gruppenstunde", "!stadtfahrt"],
            False,
        ),
        (
            "Isomatte",
            "",
            "",
            ["basis", "zeltlager", "hajk", "!1-tag", "!gruppenstunde", "!stadtfahrt", "!hausfahrt"],
            False,
        ),
        (
            "Kissen",
            "",
            "Klein und leicht",
            ["standard", "zeltlager", "hajk", "wochenende", "1-woche", "2-wochen-plus"],
            False,
        ),
        ("Poncho / Plane als Untergrund", "", "", ["standard", "zeltlager", "hajk", "outdoor"], False),
        ("Inlett / Hüttenschlafsack", "", "Für wärmere Nächte", ["standard", "sommer", "hausfahrt"], False),
        ("Aufblasbares Kissen", "", "Platzsparend", ["erweitert", "wanderung", "hajk"], False),
        ("Biwaksack", "", "Notfall-Übernachtung", ["erweitert", "hajk", "wanderung"], False),
        ("Hängematte", "", "Optional", ["erweitert", "sommer", "zeltlager"], False),
        ("Schlafbrille", "", "", ["erweitert", "zeltlager", "1-woche", "2-wochen-plus"], False),
        (
            "Ohrenstöpsel",
            "",
            "",
            ["standard", "zeltlager", "hausfahrt", "wochenende", "1-woche", "2-wochen-plus"],
            False,
        ),
        ("Wärmflasche", "", "", ["standard", "winter"], False),
    ],
    "Hausfahrt": [
        ("Hausschuhe", "", "", ["basis", "hausfahrt"], False),
        ("Betttuch", "", "", ["standard", "hausfahrt"], False),
        ("Bettzeug", "", "Falls nicht gestellt", ["standard", "hausfahrt"], False),
    ],
    "Essen & Trinken": [
        ("Essgeschirr (Teller, Schüssel)", "", "", ["standard", "zeltlager", "hajk", "outdoor", "!1-tag"], False),
        ("Besteck (Messer, Gabel, Löffel)", "", "", ["standard", "zeltlager", "hajk", "outdoor", "!1-tag"], False),
        ("Tasse / Becher", "", "", ["standard", "zeltlager", "hajk", "outdoor", "!1-tag"], False),
        ("Trinkflasche (mind. 1L)", "", "BPA-frei", ["basis"], False),
        ("Brotdose", "", "", ["standard", "tageswanderung", "wanderung", "radtour", "1-tag"], False),
        ("Besteck für unterwegs", "", "", ["standard", "tageswanderung", "wanderung", "1-tag"], False),
        (
            "Wasserreserve",
            "",
            "Mindestens 1L extra",
            ["standard", "wanderung", "hajk", "radtour", "tageswanderung"],
            False,
        ),
        ("Biologisch abbaubares Spülmittel", "", "", ["standard", "zeltlager", "hajk", "outdoor", "!1-tag"], False),
        ("Spül-Schwamm / Bürste", "", "", ["standard", "zeltlager", "1-woche", "2-wochen-plus"], False),
        ("Thermosflasche", "", "Für heiße Getränke", ["standard", "winter", "wanderung", "hajk"], False),
        ("Trinkblase / Trinksystem", "", "Für den Rucksack", ["erweitert", "wanderung", "hajk", "radtour"], False),
        (
            "Müsliriegel / Energieriegel",
            "3-5 Stück",
            "Für unterwegs",
            ["standard", "wanderung", "hajk", "radtour", "tageswanderung"],
            False,
        ),
        ("Studentenfutter / Trail Mix", "", "", ["standard", "wanderung", "hajk", "tageswanderung"], False),
        ("Feldflasche", "", "", ["erweitert", "outdoor", "pfadfinder", "hajk"], False),
        ("Spork (Löffel-Gabel-Kombi)", "", "Platzsparend", ["erweitert", "wanderung", "hajk"], False),
    ],
    "Fahrtenküche": [
        ("Topf", "", "Verschiedene Größen", ["standard", "zeltlager", "hajk", "kochen"], False),
        ("Pfanne", "", "", ["standard", "zeltlager", "kochen", "1-woche", "2-wochen-plus"], False),
        ("Teebeutel", "", "", ["standard", "zeltlager", "hajk", "kochen"], False),
        (
            "Müllbeutel",
            "",
            "Für Müllentsorgung",
            ["basis", "zeltlager", "hajk", "kochen", "!gruppenstunde", "!stadtfahrt"],
            False,
        ),
        ("Gewürze-Set", "", "", ["standard", "zeltlager", "hajk", "kochen"], False),
        ("Salz", "", "", ["standard", "zeltlager", "hajk", "kochen"], False),
        ("Zucker", "", "", ["standard", "zeltlager", "hajk", "kochen"], False),
        ("Pfeffer", "", "", ["standard", "zeltlager", "hajk", "kochen"], False),
        ("Paprika", "", "", ["erweitert", "zeltlager", "kochen", "1-woche", "2-wochen-plus"], False),
        (
            "Streichhölzer / Feuerzeug oder Feuerstein",
            "",
            "",
            ["standard", "zeltlager", "hajk", "kochen", "outdoor"],
            False,
        ),
        ("Kochlöffel", "", "", ["standard", "zeltlager", "hajk", "kochen"], False),
        ("Spültuch", "", "", ["standard", "zeltlager", "hajk", "kochen"], False),
        ("Trangia (Campingkocher)", "", "", ["standard", "hajk", "wanderung", "kochen"], False),
        ("Schneidebrett", "", "", ["standard", "zeltlager", "kochen", "1-woche", "2-wochen-plus"], False),
        ("Küchenmesser (mit Schutz)", "", "", ["standard", "zeltlager", "kochen", "1-woche", "2-wochen-plus"], False),
        ("Dosenöffner", "", "", ["standard", "zeltlager", "kochen"], False),
        ("Alufolie", "", "Zum Kochen am Feuer", ["standard", "zeltlager", "kochen"], False),
        ("Frischhaltefolie", "", "", ["erweitert", "zeltlager", "kochen", "1-woche", "2-wochen-plus"], False),
        ("Geschirrtuch", "", "", ["standard", "zeltlager", "kochen", "1-woche", "2-wochen-plus"], False),
        ("Grillrost / Grillzange", "", "", ["erweitert", "zeltlager", "kochen", "lagerfeuer"], False),
        ("Öl / Butter", "", "", ["standard", "zeltlager", "kochen"], False),
        ("Rezeptbuch / Rezepte", "", "", ["erweitert", "zeltlager", "kochen", "1-woche", "2-wochen-plus"], False),
        ("Kühlbox / Kühltasche", "", "Für verderbliche Lebensmittel", ["erweitert", "zeltlager", "kochen"], False),
        ("Schöpfkelle", "", "", ["erweitert", "zeltlager", "kochen", "1-woche", "2-wochen-plus"], False),
        ("Sieb", "", "", ["erweitert", "zeltlager", "kochen", "1-woche", "2-wochen-plus"], False),
        ("Kartoffelschäler", "", "", ["erweitert", "zeltlager", "kochen", "1-woche", "2-wochen-plus"], False),
        ("Feuerhandschuh / Topflappen", "", "", ["standard", "zeltlager", "kochen"], False),
    ],
    "Navigation": [
        ("Kompass", "", "", ["standard", "hajk", "tageswanderung", "wanderung", "radtour", "navigation"], False),
        ("Geodreieck", "", "", ["standard", "hajk", "navigation"], False),
        ("Planzeiger", "", "", ["erweitert", "hajk", "navigation"], False),
        (
            "Wanderkarte oder ausgedruckte Karten",
            "",
            "",
            ["standard", "hajk", "tageswanderung", "wanderung", "radtour", "navigation"],
            False,
        ),
        ("Kartentasche", "", "Wasserdicht", ["standard", "hajk", "wanderung", "navigation"], False),
        ("Schnur", "", "", ["standard", "hajk", "navigation"], False),
        ("Schrittzähler", "", "", ["erweitert", "hajk", "navigation"], False),
        ("GPS-Gerät", "", "Optional", ["erweitert", "wanderung", "hajk", "navigation"], False),
        ("Höhenmesser", "", "", ["erweitert", "wanderung", "hajk"], False),
        ("Peilkompass", "", "Für genaue Navigation", ["erweitert", "hajk"], False),
    ],
    "AB-Päckchen / Werkzeug": [
        ("Alufolie", "", "", ["standard", "zeltlager", "hajk", "outdoor"], False),
        ("Geldbörse mit Personalausweis, Krankenkarte und Bargeld", "", "", ["basis", "!gruppenstunde"], False),
        ("Klebeband / Gaffa-Tape", "", "", ["standard", "zeltlager", "hajk", "outdoor", "reparatur"], False),
        ("Sicherheitsnadel", "5 Stück", "", ["standard", "zeltlager", "hajk", "outdoor"], False),
        ("Nähnadel", "", "", ["standard", "zeltlager", "hajk", "outdoor"], False),
        ("Nähgarn", "", "", ["standard", "zeltlager", "hajk", "outdoor"], False),
        ("Heftzwecke", "", "", ["erweitert", "zeltlager", "hajk", "outdoor"], False),
        ("Schnur / Paracord", "", "3-5m", ["standard", "zeltlager", "hajk", "outdoor"], False),
        ("Seil", "", "", ["standard", "zeltlager", "hajk", "outdoor"], False),
        ("Draht", "", "", ["erweitert", "zeltlager", "hajk", "outdoor"], False),
        ("Kreide", "", "", ["erweitert", "zeltlager", "hajk", "outdoor"], False),
        ("Bleistift", "", "Funktioniert bei Nässe", ["standard", "zeltlager", "hajk", "outdoor"], False),
        ("Zunder", "", "", ["standard", "zeltlager", "hajk", "outdoor", "feuer"], False),
        ("Kerze", "", "", ["standard", "zeltlager", "hajk", "outdoor"], False),
        ("Stirnlampe", "", "Mit Ersatzbatterien", ["basis", "outdoor", "!1-tag", "!gruppenstunde"], False),
        ("(Blasen-) Pflaster", "", "", ["standard", "wanderung", "hajk", "tageswanderung", "radtour"], False),
        ("Zeckenzange", "", "", ["standard", "outdoor", "zeltlager", "hajk", "tageswanderung"], False),
        ("Material um Feuer zu entzünden", "", "", ["standard", "zeltlager", "hajk", "outdoor", "feuer"], False),
        ("USB-C Ladegerät", "", "", ["standard", "wochenende", "1-woche", "2-wochen-plus", "technik"], False),
        (
            "Powerbank",
            "",
            "Mind. 10.000 mAh",
            ["standard", "wochenende", "1-woche", "2-wochen-plus", "tageswanderung", "technik"],
            False,
        ),
        ("Ersatzbatterien", "", "", ["standard", "1-woche", "2-wochen-plus", "technik"], False),
        ("Thermometer", "", "", ["erweitert", "zeltlager", "hajk", "outdoor"], False),
        (
            "Kleine Plastiktüte (z.B. Gefrierbeutel)",
            "",
            "Für Müll oder nasse Kleidung",
            ["standard", "zeltlager", "hajk", "outdoor"],
            False,
        ),
        (
            "Kabelbinder",
            "",
            "Verschiedene Größen",
            ["erweitert", "zeltlager", "hajk", "outdoor", "reparatur", "2-wochen-plus"],
            False,
        ),
        (
            "Taschenmesser / Fahrtenmesser",
            "",
            "",
            ["standard", "outdoor", "pfadfinder", "zeltlager", "hajk", "!woelflinge"],
            False,
        ),
        ("Multitool", "", "", ["erweitert", "outdoor", "hajk", "2-wochen-plus"], False),
        (
            "Pfeife / Signalpfeife",
            "",
            "Für Notfälle",
            ["standard", "outdoor", "hajk", "wanderung", "sicherheit"],
            False,
        ),
        ("Notizblock (wasserfest)", "", "", ["erweitert", "outdoor", "hajk"], False),
        ("Edding / Permanentmarker", "", "", ["erweitert", "zeltlager", "hajk", "outdoor"], False),
    ],
    "Sommer": [
        ("Badehose", "", "", ["basis", "sommer", "wasser"], False),
        ("Badetuch", "", "", ["basis", "sommer", "wasser"], False),
        ("Sonnenbrille", "", "UV-Schutz!", ["basis", "sommer"], False),
        ("Sonnencreme", "LSF 50", "Mindestens LSF 30", ["basis", "sommer"], False),
        ("Sandalen", "", "", ["standard", "sommer", "zeltlager"], False),
        ("Kopfbedeckung", "", "Gegen Sonnenstich", ["basis", "sommer"], False),
        ("Extra Wasserflasche", "", "", ["standard", "sommer", "zeltlager", "hajk", "tageswanderung"], False),
        ("Strandtuch", "", "", ["erweitert", "sommer", "wasser", "kanutour"], False),
        (
            "Wasserballon",
            "",
            "Für Wasserspiele",
            ["erweitert", "sommer", "zeltlager", "spiele", "woelflinge", "jufis"],
            False,
        ),
        ("Wasserpistole", "", "", ["erweitert", "sommer", "zeltlager", "spiele", "woelflinge", "jufis"], False),
        ("Aqua-Schuhe", "", "Für Flusswanderungen", ["erweitert", "sommer", "kanutour", "wasser"], False),
        ("Ventilator (Handventilator)", "", "", ["erweitert", "sommer", "1-woche", "2-wochen-plus"], False),
        ("Kühlende Tücher", "", "", ["erweitert", "sommer", "1-woche", "2-wochen-plus"], False),
    ],
    "Winter": [
        ("Handschuhe", "", "Wasserdicht und warm", ["basis", "winter"], False),
        ("Schal", "", "", ["basis", "winter"], False),
        ("Mütze (warm)", "", "Wolle oder Fleece", ["basis", "winter"], False),
        ("Thermounterwäsche (Ober- und Unterteil)", "", "", ["basis", "winter"], False),
        ("Fleecejacke", "", "", ["basis", "winter"], False),
        ("Warme Socken (Wolle)", "", "Extra Paar", ["standard", "winter"], False),
        ("Wärmepads (Hand/Fuß)", "5-10 Stück", "", ["standard", "winter", "zeltlager", "hajk"], False),
        ("Thermosflasche mit heißem Tee", "", "", ["standard", "winter"], False),
        ("Buff / Schlauchschal", "", "", ["standard", "winter", "hajk", "wanderung"], False),
        ("Skiunterwäsche", "", "", ["erweitert", "winter", "hajk"], False),
        ("Daunenjacke", "", "Leicht und warm", ["erweitert", "winter", "hajk", "2-wochen-plus"], False),
        ("Handwärmer (wiederverwendbar)", "", "", ["erweitert", "winter"], False),
        ("Schneegamaschen", "", "Bei Tiefschnee", ["erweitert", "winter", "hajk", "wanderung"], False),
    ],
    "Sippengepäck / Gruppenausrüstung": [
        ("Sippenwimpel", "", "", ["standard", "pfadfinder", "zeltlager", "hajk"], False),
        ("Beil", "", "", ["standard", "outdoor", "zeltlager", "hajk", "holz", "!woelflinge"], False),
        ("Kleine Säge", "", "", ["standard", "outdoor", "zeltlager", "hajk", "holz", "!woelflinge"], False),
        ("Kohtenplanen", "", "", ["standard", "pfadfinder", "zeltlager"], False),
        ("Sippenkasse", "", "", ["standard", "pfadfinder", "zeltlager", "hajk"], False),
        (
            "Erste-Hilfe Pack",
            "",
            "",
            ["basis", "sicherheit", "zeltlager", "hajk", "tageswanderung", "!gruppenstunde"],
            False,
        ),
        ("Kohtengestänge", "", "", ["standard", "pfadfinder", "zeltlager"], False),
        ("Heringe", "20+ Stück", "", ["standard", "zeltlager"], False),
        ("Erdnägel", "10 Stück", "", ["standard", "zeltlager"], False),
        ("Abspannleinen", "", "", ["standard", "zeltlager"], False),
        ("Lagerflagge", "", "", ["erweitert", "pfadfinder", "zeltlager", "1-woche", "2-wochen-plus"], False),
        ("Werkzeugkiste", "", "", ["erweitert", "zeltlager", "1-woche", "2-wochen-plus"], False),
        ("Feuerschale", "", "Wenn offenes Feuer nicht erlaubt", ["erweitert", "zeltlager", "feuer"], False),
    ],
    "Singerunde / Musik": [
        ("Musikinstrument", "", "Gitarre, Ukulele, etc.", ["standard", "musik", "zeltlager", "hajk"], False),
        ("Liederbücher", "", "", ["standard", "musik", "pfadfinder", "zeltlager"], False),
        ("Stimmgerät", "", "", ["standard", "musik"], False),
        ("Notenständer (faltbar)", "", "", ["erweitert", "musik"], False),
        ("Cajon (Sitztrommel)", "", "", ["erweitert", "musik"], False),
        ("Mundharmonika", "", "", ["erweitert", "musik"], False),
        ("Gitarrenkapodaster", "", "", ["erweitert", "musik"], False),
        ("Ersatzsaiten", "", "", ["erweitert", "musik", "2-wochen-plus"], False),
    ],
    "Dokumente": [
        ("Krankenversicherungskarte", "", "", ["basis", "dokumente", "!gruppenstunde"], False),
        ("Impfpass", "", "", ["standard", "dokumente", "zeltlager", "hajk", "1-woche", "2-wochen-plus"], False),
        (
            "Teilnehmerbogen",
            "",
            "Ausgefüllt und unterschrieben",
            ["standard", "zeltlager", "hajk", "dokumente", "wochenende", "1-woche", "2-wochen-plus"],
            False,
        ),
        ("Personalausweis", "", "", ["basis", "dokumente", "!woelflinge", "!gruppenstunde"], False),
        ("Allergiepass", "", "Falls vorhanden", ["standard", "dokumente", "zeltlager", "hajk"], False),
        ("Reisepass", "", "Für Auslandsfahrten", ["erweitert", "2-wochen-plus", "dokumente"], False),
        ("Europäische Krankenversicherungskarte (EHIC)", "", "", ["erweitert", "2-wochen-plus", "dokumente"], False),
        (
            "Notfall-Telefonnummern (ausgedruckt)",
            "",
            "",
            ["standard", "sicherheit", "dokumente", "zeltlager", "hajk"],
            False,
        ),
        ("Einverständniserklärungen", "", "Für Gruppenleiter", ["standard", "leiter", "dokumente", "zeltlager"], False),
        ("Teilnehmerliste", "", "Für Gruppenleiter", ["standard", "leiter", "dokumente", "zeltlager"], False),
        ("Kopie Reiseversicherung", "", "", ["erweitert", "2-wochen-plus"], False),
        ("Bargeld + EC-/Kreditkarte", "", "", ["erweitert", "2-wochen-plus", "stadtfahrt"], False),
    ],
    "Sicherheit / Erste Hilfe": [
        ("Erste-Hilfe Set", "", "", ["basis", "sicherheit", "!gruppenstunde"], False),
        ("Rettungsdecke", "", "", ["standard", "sicherheit", "outdoor", "hajk", "wanderung"], False),
        ("Dreieckstuch", "", "", ["standard", "sicherheit", "zeltlager", "hajk"], False),
        ("Verbandspäckchen", "", "", ["standard", "sicherheit", "zeltlager", "hajk"], False),
        ("Desinfektionsmittel", "", "", ["standard", "sicherheit", "zeltlager", "hajk"], False),
        ("Pflaster (verschiedene Größen)", "", "", ["basis", "sicherheit"], False),
        ("Elastische Binde", "", "", ["standard", "sicherheit", "zeltlager", "hajk"], False),
        ("Fieberthermometer", "", "", ["erweitert", "sicherheit", "1-woche", "2-wochen-plus"], False),
        (
            "Schmerztabletten (Ibuprofen)",
            "",
            "Nur mit Erlaubnis",
            ["erweitert", "sicherheit", "1-woche", "2-wochen-plus", "!woelflinge", "!jufis"],
            False,
        ),
        ("Durchfallmittel", "", "", ["erweitert", "sicherheit", "2-wochen-plus"], False),
        ("Reiseapotheke", "", "", ["erweitert", "2-wochen-plus"], False),
        ("Insektenstich-Gel", "", "", ["standard", "sommer", "sicherheit", "zeltlager"], False),
        ("Kohletabletten", "", "", ["erweitert", "sicherheit", "2-wochen-plus"], False),
    ],
    "Spiele & Unterhaltung": [
        ("Kartenspiel", "", "", ["standard", "spiele", "zeltlager", "hausfahrt"], False),
        ("Würfel", "2-3 Stück", "", ["standard", "spiele", "zeltlager"], False),
        ("Knobel / Rätsel", "", "", ["erweitert", "spiele", "1-woche", "2-wochen-plus"], False),
        ("Frisbee", "", "", ["standard", "spiele", "outdoor", "sommer", "zeltlager"], False),
        ("Ball (aufblasbar)", "", "Platzsparend", ["standard", "spiele", "outdoor", "zeltlager"], False),
        ("Buch / E-Reader", "", "", ["erweitert", "unterhaltung", "1-woche", "2-wochen-plus"], False),
        ("Seilspringen", "", "", ["erweitert", "spiele", "woelflinge", "jufis"], False),
        ("Jonglier-Bälle", "", "", ["erweitert", "spiele", "zeltlager"], False),
        ("Fernglas", "", "", ["erweitert", "outdoor", "natur", "hajk", "wanderung"], False),
        ("Bestimmungsbuch (Pflanzen/Tiere)", "", "", ["erweitert", "natur", "outdoor", "hajk"], False),
        (
            "Schnitzmesser",
            "",
            "Nur mit Erlaubnis",
            ["standard", "outdoor", "pfadfinder", "zeltlager", "hajk", "!woelflinge"],
            False,
        ),
        ("Schnitzhandschuh", "", "", ["standard", "outdoor", "zeltlager", "hajk", "!woelflinge"], False),
        ("Laufspiel / Fangspiel-Material", "", "", ["standard", "spiele", "zeltlager", "woelflinge", "jufis"], False),
    ],
    "Lagerfeuer": [
        ("Sitzkissen / Isomatte zum Sitzen", "", "", ["standard", "lagerfeuer", "zeltlager"], False),
        ("Taschenlampe / Stirnlampe", "", "", ["standard", "lagerfeuer", "zeltlager"], False),
        ("Stockbrot-Stöcke", "", "", ["standard", "lagerfeuer", "zeltlager"], False),
        ("Marshmallows", "", "", ["standard", "lagerfeuer", "zeltlager"], False),
        ("Heißgetränk (Tee / Kakao)", "", "", ["standard", "lagerfeuer", "winter", "zeltlager"], False),
        ("Feuermaterial (Anzünder, Streichhölzer)", "", "", ["standard", "lagerfeuer", "feuer", "zeltlager"], False),
        ("Popcorn-Mais", "", "Für die Feuerpfanne", ["erweitert", "lagerfeuer", "zeltlager"], False),
        ("Lagerfeuer-Geschichten", "", "", ["erweitert", "lagerfeuer", "zeltlager", "woelflinge", "jufis"], False),
    ],
    "Rucksack & Transport": [
        ("Rucksack (passende Größe)", "", "Tagesrucksack 20-30L, Trekking 50-65L", ["basis", "!gruppenstunde"], False),
        ("Rucksack-Regenschutz", "", "", ["standard", "outdoor", "wanderung", "hajk", "radtour"], False),
        (
            "Packsäcke / Drybags",
            "",
            "Für Kleidungssortierung",
            ["standard", "outdoor", "hajk", "kanutour", "wochenende", "1-woche", "2-wochen-plus"],
            False,
        ),
        ("Kompressionsbeutel", "", "Für Schlafsack", ["erweitert", "wanderung", "hajk"], False),
        ("Beutel für Schmutzwäsche", "", "", ["standard", "zeltlager", "1-woche", "2-wochen-plus"], False),
        (
            "Tagesrucksack (zusätzlich)",
            "",
            "Für Ausflüge vom Lager",
            ["standard", "zeltlager", "1-woche", "2-wochen-plus"],
            False,
        ),
        ("Karabiner", "2-3 Stück", "Zum Befestigen am Rucksack", ["erweitert", "outdoor", "hajk", "wanderung"], False),
        ("Wäscheleine + Klammern", "", "", ["standard", "1-woche", "2-wochen-plus", "zeltlager"], False),
    ],
    "Für Gruppenleiter": [
        ("Programmplanung / Stundenentwurf", "", "", ["standard", "leiter", "gruppenstunde", "zeltlager"], False),
        ("Materialliste", "", "", ["standard", "leiter", "gruppenstunde", "zeltlager"], False),
        ("Anwesenheitsliste", "", "", ["standard", "leiter", "gruppenstunde", "zeltlager"], False),
        ("Erste-Hilfe Set (erweitert)", "", "", ["standard", "leiter", "sicherheit", "zeltlager", "hajk"], False),
        ("Pfadfinder-Materialien", "", "Je nach Programm", ["standard", "leiter", "gruppenstunde"], False),
        ("Trillerpfeife", "", "", ["standard", "leiter", "zeltlager", "hajk"], False),
        ("Megaphon", "", "Bei großen Gruppen", ["erweitert", "leiter", "zeltlager", "1-woche", "2-wochen-plus"], False),
        ("Notfall-Kontaktliste", "", "", ["standard", "leiter", "sicherheit", "zeltlager", "hajk"], False),
        ("Gruppenhandy", "", "Für Notfälle", ["standard", "leiter", "zeltlager", "hajk"], False),
        ("Kassenbuch + Gruppenkasse", "", "", ["standard", "leiter", "zeltlager", "hajk"], False),
        ("Teilnehmerbogen (Blanko)", "", "", ["standard", "leiter", "zeltlager"], False),
        (
            "Warnwesten",
            "",
            "Für Straßenquerungen",
            ["standard", "leiter", "sicherheit", "wanderung", "radtour", "hajk"],
            False,
        ),
    ],
    "Sonstiges": [
        ("Fotokamera", "", "", ["erweitert", "zeltlager", "hajk", "2-wochen-plus"], False),
        ("Smartphone mit speziellen Apps", "", "", ["erweitert", "tageswanderung", "hajk", "wanderung"], False),
        ("Mückenschutz", "", "", ["standard", "sommer", "zeltlager", "outdoor"], False),
        ("Insektenschutz", "", "", ["standard", "sommer", "zeltlager", "outdoor"], False),
        ("Mülltüten", "", "", ["standard", "zeltlager", "hajk", "outdoor", "tageswanderung"], False),
        ("Regenschirm", "", "", ["standard", "stadtfahrt", "uebergang"], False),
        (
            "Lederhandschuhe",
            "",
            "Zum Arbeiten oder für heiße Gegenstände",
            ["standard", "zeltlager", "hajk", "outdoor"],
            False,
        ),
        ("Biologisch abbaubares Waschmittel", "", "", ["standard", "1-woche", "2-wochen-plus", "zeltlager"], False),
    ],
    "Nicht mitbringen": [
        (
            "Handy (nur ausgeschaltet im Rucksack erlaubt)",
            "",
            "Handys lenken ab und stören das Lagerleben",
            ["standard", "zeltlager", "hajk", "woelflinge", "jufis"],
            True,
        ),
        ("Geld", "", "Wird nicht benötigt, Verlustgefahr", ["standard", "zeltlager", "woelflinge", "jufis"], True),
        (
            "Eigene Süßigkeiten",
            "",
            "Gemeinsame Verpflegung wird gestellt",
            ["standard", "zeltlager", "woelflinge", "jufis"],
            True,
        ),
        (
            "Spielkonsolen",
            "",
            "Elektronische Unterhaltung ist nicht erwünscht",
            ["standard", "zeltlager", "1-woche", "2-wochen-plus"],
            True,
        ),
        (
            "Schmuck und Wertgegenstände",
            "",
            "Verlust- und Beschädigungsgefahr",
            ["standard", "zeltlager", "1-woche", "2-wochen-plus"],
            True,
        ),
        (
            "Elektronische Geräte",
            "",
            "Tablets, E-Reader etc. sind nicht erwünscht",
            ["standard", "zeltlager", "1-woche", "2-wochen-plus"],
            True,
        ),
        ("Bluetooth-Lautsprecher", "", "Stört das Lagerleben", ["standard", "zeltlager"], True),
        ("Haarspray / Deo-Spray", "", "Brandgefahr am Feuer", ["standard", "zeltlager"], True),
    ],
}


# ---------------------------------------------------------------------------
# Dynamic list builder — context-based packing list generation
# ---------------------------------------------------------------------------

# Priority tags control inclusion behavior
_PRIORITY_TAGS = {"basis", "standard", "erweitert"}

# Duration tags considered "long" for erweitert items
_LONG_DURATIONS = {"1-woche", "2-wochen-plus"}


def build_dynamic_list(context: dict) -> dict[str, list[dict]]:
    """
    Build a packing list dynamically based on context.

    Args:
        context: Dict with keys 'activity', 'duration', 'season', 'age_group' (optional).

    Returns:
        Dict mapping category names to lists of item dicts.
    """
    user_tags = {
        context.get("activity", ""),
        context.get("duration", ""),
        context.get("season", ""),
    }
    if context.get("age_group"):
        user_tags.add(context["age_group"])
    user_tags.discard("")

    result: dict[str, list[dict]] = {}

    for category_name, items in UNIFIED_CATALOG.items():
        matched_items = []
        for item in items:
            name, quantity, description, tags, is_do_not_bring = item
            tag_set = set(tags)

            # Step 1: Check exclusion tags
            exclusion_tags = {t[1:] for t in tag_set if t.startswith("!")}
            if exclusion_tags & user_tags:
                continue

            # Determine priority
            priority = "standard"
            for p in _PRIORITY_TAGS:
                if p in tag_set:
                    priority = p
                    break

            # Non-priority, non-exclusion tags for context matching
            context_tags = tag_set - _PRIORITY_TAGS - {t for t in tag_set if t.startswith("!")}

            # Step 2: Apply priority rules
            if priority == "basis":
                matched_items.append(_item_to_dict(name, quantity, description, tags, is_do_not_bring, category_name))
            elif priority == "standard":
                if context_tags & user_tags:
                    matched_items.append(
                        _item_to_dict(name, quantity, description, tags, is_do_not_bring, category_name)
                    )
            elif priority == "erweitert":
                duration = context.get("duration", "")
                if duration in _LONG_DURATIONS and context_tags & user_tags:
                    matched_items.append(
                        _item_to_dict(name, quantity, description, tags, is_do_not_bring, category_name)
                    )

        if matched_items:
            result[category_name] = matched_items

    return result


def preview_dynamic_list(context: dict) -> dict:
    """
    Preview what the builder would generate without creating DB records.

    Returns:
        Dict with 'categories' (list of {name, item_count}) and 'total_items'.
    """
    built = build_dynamic_list(context)
    categories = [{"name": name, "item_count": len(items)} for name, items in built.items()]
    total_items = sum(c["item_count"] for c in categories)
    return {"categories": categories, "total_items": total_items}


def _item_to_dict(
    name: str,
    quantity: str,
    description: str,
    tags: list[str],
    is_do_not_bring: bool,
    category: str,
) -> dict:
    """Convert item tuple fields to a dict."""
    return {
        "name": name,
        "quantity": quantity,
        "description": description,
        "tags": tags,
        "is_do_not_bring": is_do_not_bring,
        "category": category,
    }


# ---------------------------------------------------------------------------
# Catalog query functions — used by suggestion endpoints
# ---------------------------------------------------------------------------


def get_all_categories() -> list[str]:
    """Return all available suggestion category names."""
    return list(UNIFIED_CATALOG.keys())


def get_suggestions_for_category(category_name: str) -> list[dict]:
    """Return all suggestion items for a given category."""
    items = UNIFIED_CATALOG.get(category_name, [])
    return [
        {
            "name": item[0],
            "quantity": item[1],
            "description": item[2],
            "tags": item[3],
            "is_do_not_bring": item[4],
        }
        for item in items
    ]


def get_catalog_suggestions(
    existing_item_names: list[str] | None = None,
    category_filter: str | None = None,
    search_query: str | None = None,
    limit: int = 50,
) -> dict:
    """
    Return suggestion items from the catalog, filtering out items
    that already exist in the packing list.

    Args:
        existing_item_names: Names of items already in the packing list (case-insensitive)
        category_filter: Optional category name to filter by
        search_query: Optional search string to filter items by name
        limit: Max number of suggestions to return

    Returns:
        Dict with 'categories' list of {name, items} and 'total_available' count.
    """
    existing_lower = set()
    if existing_item_names:
        existing_lower = {name.lower().strip() for name in existing_item_names}

    result_categories = []
    total_available = 0

    for cat_name, items in UNIFIED_CATALOG.items():
        if category_filter and cat_name != category_filter:
            continue

        filtered_items = []
        for item in items:
            name = item[0]

            if name.lower().strip() in existing_lower:
                continue

            if search_query:
                query_lower = search_query.lower()
                if query_lower not in name.lower() and not any(query_lower in tag for tag in item[3]):
                    continue

            filtered_items.append(
                {
                    "name": name,
                    "quantity": item[1],
                    "description": item[2],
                    "tags": item[3],
                    "is_do_not_bring": item[4],
                }
            )

        if filtered_items:
            result_categories.append(
                {
                    "name": cat_name,
                    "items": filtered_items[:limit],
                }
            )
            total_available += len(filtered_items)

    return {
        "categories": result_categories,
        "total_available": total_available,
    }


def get_random_suggestions(
    existing_item_names: list[str] | None = None,
    count: int = 8,
) -> list[dict]:
    """
    Return a random selection of items from the catalog that are not yet in the packing list.
    Useful for "quick add" chip suggestions.
    """
    existing_lower = set()
    if existing_item_names:
        existing_lower = {name.lower().strip() for name in existing_item_names}

    all_items = []
    for cat_name, items in UNIFIED_CATALOG.items():
        if cat_name == "Nicht mitbringen":
            continue
        for item in items:
            if item[0].lower().strip() not in existing_lower:
                all_items.append(
                    {
                        "name": item[0],
                        "quantity": item[1],
                        "description": item[2],
                        "category": cat_name,
                        "tags": item[3],
                        "is_do_not_bring": False,
                    }
                )

    if len(all_items) <= count:
        return all_items

    return random.sample(all_items, count)


def get_full_catalog() -> list[dict]:
    """
    Return all items from the catalog as a flat list (excluding is_do_not_bring items).
    Used for client-side autocomplete.
    """
    result = []
    for cat_name, items in UNIFIED_CATALOG.items():
        for item in items:
            if item[4]:  # skip is_do_not_bring
                continue
            result.append(
                {
                    "name": item[0],
                    "quantity": item[1],
                    "description": item[2],
                    "category": cat_name,
                    "tags": item[3],
                }
            )
    return result


# ---------------------------------------------------------------------------
# Presets — predefined context combinations for quick wizard selection
# ---------------------------------------------------------------------------

PRESETS: list[dict] = [
    {
        "name": "Sommerlager",
        "icon": "wb_sunny",
        "description": "Klassisches Zeltlager im Sommer, 1 Woche",
        "context": {
            "activity": "zeltlager",
            "duration": "1-woche",
            "season": "sommer",
            "age_group": None,
        },
    },
    {
        "name": "Winterlager",
        "icon": "ac_unit",
        "description": "Zeltlager oder Hütte im Winter, 1 Woche",
        "context": {
            "activity": "zeltlager",
            "duration": "1-woche",
            "season": "winter",
            "age_group": None,
        },
    },
    {
        "name": "Pfingstlager",
        "icon": "park",
        "description": "Zeltlager über Pfingsten, langes Wochenende",
        "context": {
            "activity": "zeltlager",
            "duration": "long-wochenende",
            "season": "sommer",
            "age_group": None,
        },
    },
    {
        "name": "Zeltlager-Wochenende",
        "icon": "camping",
        "description": "Kurzes Zeltlager am Wochenende",
        "context": {
            "activity": "zeltlager",
            "duration": "wochenende",
            "season": "sommer",
            "age_group": None,
        },
    },
    {
        "name": "Großfahrt",
        "icon": "backpack",
        "description": "Mehrtägige Großfahrt mit Zelt und Rucksack",
        "context": {
            "activity": "hajk",
            "duration": "1-woche",
            "season": "sommer",
            "age_group": "pfadfinder",
        },
    },
    {
        "name": "Winter-Hajk",
        "icon": "ac_unit",
        "description": "Wochenend-Hajk im Winter",
        "context": {
            "activity": "hajk",
            "duration": "wochenende",
            "season": "winter",
            "age_group": None,
        },
    },
    {
        "name": "Tageswanderung",
        "icon": "hiking",
        "description": "Wanderung für einen Tag",
        "context": {
            "activity": "tageswanderung",
            "duration": "tagesfahrt",
            "season": "sommer",
            "age_group": None,
        },
    },
    {
        "name": "Wochenend-Wanderung",
        "icon": "terrain",
        "description": "Wanderung mit Übernachtung am Wochenende",
        "context": {
            "activity": "wanderung",
            "duration": "wochenende",
            "season": "sommer",
            "age_group": None,
        },
    },
    {
        "name": "Hausübernachtung",
        "icon": "cottage",
        "description": "Übernachtung im Pfadfinderheim oder Gemeindehaus",
        "context": {
            "activity": "hausfahrt",
            "duration": "wochenende",
            "season": "sommer",
            "age_group": None,
        },
    },
    {
        "name": "Hüttenwochenende",
        "icon": "cabin",
        "description": "Wochenende in einer Hütte oder Jugendherberge",
        "context": {
            "activity": "hausfahrt",
            "duration": "wochenende",
            "season": "winter",
            "age_group": None,
        },
    },
    {
        "name": "Radtour",
        "icon": "directions_bike",
        "description": "Mehrtägige Radtour mit Gepäck",
        "context": {
            "activity": "radtour",
            "duration": "wochenende",
            "season": "sommer",
            "age_group": None,
        },
    },
    {
        "name": "Kanutour",
        "icon": "kayaking",
        "description": "Mehrtägige Kanutour",
        "context": {
            "activity": "kanutour",
            "duration": "wochenende",
            "season": "sommer",
            "age_group": None,
        },
    },
    {
        "name": "Stadtfahrt",
        "icon": "location_city",
        "description": "Fahrt in eine Stadt mit Programm",
        "context": {
            "activity": "stadtfahrt",
            "duration": "wochenende",
            "season": "sommer",
            "age_group": None,
        },
    },
    {
        "name": "Gruppenstunde",
        "icon": "group",
        "description": "Regelmäßige Gruppenstunde",
        "context": {
            "activity": "gruppenstunde",
            "duration": "tagesfahrt",
            "season": "sommer",
            "age_group": None,
        },
    },
    {
        "name": "Wölflinge Wochenende",
        "icon": "pets",
        "description": "Wochenendfahrt für Wölflinge (7-10 Jahre)",
        "context": {
            "activity": "zeltlager",
            "duration": "wochenende",
            "season": "sommer",
            "age_group": "woelflinge",
        },
    },
    {
        "name": "Jufis Lager",
        "icon": "explore",
        "description": "Sommerlager für Jungpfadfinder (10-13 Jahre)",
        "context": {
            "activity": "zeltlager",
            "duration": "1-woche",
            "season": "sommer",
            "age_group": "jufis",
        },
    },
    {
        "name": "Singerunde",
        "icon": "music_note",
        "description": "Singerunde mit Gitarre und Liederbüchern",
        "context": {
            "activity": "gruppenstunde",
            "duration": "tagesfahrt",
            "season": "sommer",
            "age_group": None,
        },
    },
]


# ---------------------------------------------------------------------------
# AI-powered suggestions via Vertex AI Gemini
# ---------------------------------------------------------------------------


class PackingListAISuggestionError(Exception):
    """Raised when AI suggestion fails."""

    pass


def get_ai_suggestions(
    packing_list_title: str,
    packing_list_description: str,
    existing_items: list[str],
    category_context: str | None = None,
    count: int = 5,
    user=None,
) -> list[dict]:
    """
    Use Vertex AI Gemini to suggest additional packing list items based on context.

    Args:
        packing_list_title: Title of the packing list
        packing_list_description: Description of the packing list
        existing_items: List of item names already in the list
        category_context: Optional category name for more targeted suggestions
        count: Number of suggestions to generate

    Returns:
        List of dicts with name, quantity, description, category fields.
    """
    try:
        from google.genai import types
        from pydantic import BaseModel
    except ImportError:
        raise PackingListAISuggestionError("google-genai package not installed")

    from core.services.gemini import gemini_call

    class SuggestedItem(BaseModel):
        name: str
        quantity: str
        description: str
        category: str

    class SuggestionResponse(BaseModel):
        items: list[SuggestedItem]

    existing_str = ", ".join(existing_items[:100]) if existing_items else "keine"

    category_hint = ""
    if category_context:
        category_hint = f"\nDie Vorschläge sollen zur Kategorie '{category_context}' passen."

    prompt = f"""Du bist ein erfahrener Pfadfinder-Gruppenleiter und hilfst beim Packen.

Packliste: "{packing_list_title}"
Beschreibung: "{packing_list_description}"
{category_hint}

Bereits vorhandene Gegenstände: {existing_str}

Schlage {count} NEUE Gegenstände vor, die noch NICHT in der Liste sind.
Jeder Vorschlag soll:
- Einen konkreten Gegenstandsnamen haben
- Optional eine Mengenangabe (z.B. "2 Stück", "je Übernachtung")
- Optional eine kurze Beschreibung/Tipp
- Eine passende Kategorie

Die Vorschläge sollen sinnvoll und praktisch für Pfadfinder/Scouts sein.
Denke an Dinge, die oft vergessen werden oder besonders nützlich sind.
Antworte nur auf Deutsch."""

    try:
        response, interaction_id = gemini_call(
            user=user,
            model="gemini-3.1-flash-lite",
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=SuggestionResponse,
                http_options=types.HttpOptions(timeout=30_000),
            ),
            context="packing_list_suggestions",
        )
        if response is None:
            raise PackingListAISuggestionError("AI client not available")

        result = SuggestionResponse.model_validate_json(response.text)
        return [item.model_dump() for item in result.items], str(interaction_id) if interaction_id else None

    except Exception as exc:
        logger.warning("AI suggestion failed: %s", exc)
        raise PackingListAISuggestionError(str(exc)) from exc
