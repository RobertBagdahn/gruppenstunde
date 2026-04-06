"""
Management command to seed packing list templates.

Creates 12 predefined packing list templates that users can clone.
Each template includes categorized items for common scouting scenarios.

Usage:
    uv run python manage.py seed_packing_lists
    uv run python manage.py seed_packing_lists --clear  # remove existing templates first
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from packinglist.models import PackingCategory, PackingItem, PackingList

User = get_user_model()

# ---------------------------------------------------------------------------
# Master item catalog – all items grouped by category
# ---------------------------------------------------------------------------

CATEGORIES = {
    "Kleidung": [
        ("Wandersocken", "je Übernachtung", ""),
        ("Unterhose", "je 2 Übernachtungen", ""),
        ("T-Shirt", "je Übernachtung", ""),
        ("Klufthemd mit Halstuch und Knoten", "", ""),
        ("Lange Hose zum Wechseln", "", "Selten notwendig"),
        ("Gürtel", "", ""),
        ("Woll-Juja oder Pullover zum Wechseln", "", ""),
        ("Regenjacke", "", ""),
        ("Regenhose", "", ""),
        ("Poncho", "", ""),
        ("Wanderschuhe", "", ""),
    ],
    "Kulturbeutel": [
        ("Biologisch abbaubare Zahnpasta", "", ""),
        ("Biologisch abbaubares Waschzeug", "", ""),
        ("Zahnbürste", "", ""),
        ("Leichtes Handtuch", "", ""),
        ("Geschlechtsspezifisches (Rasierzeug, ...)", "", ""),
        ("Feuchtigkeitscreme für trockene Hände", "", ""),
        ("Lippenpflegestift", "", ""),
        ("Klopapier", "", ""),
    ],
    "Lager/Fahrt": [
        ("Schlafsack", "", ""),
        ("Isomatte", "", ""),
        ("Poncho / Plane als Untergrund", "", ""),
        ("Essgeschirr und -besteck", "", ""),
        ("Wasserreserve", "", "Mindestens 1L"),
        ("Tasse", "", ""),
        ("Biologisch abbaubares Spülmittel", "", ""),
    ],
    "Hausfahrt": [
        ("Hausschuhe", "", ""),
        ("Betttuch", "", ""),
        ("Bettzeug", "", ""),
    ],
    "Fahrtenküche": [
        ("Topf", "", ""),
        ("Teebeutel", "", ""),
        ("Müllbeutel", "", ""),
        ("Gewürze-Set", "", ""),
        ("Salz", "", ""),
        ("Zucker", "", ""),
        ("Pfeffer", "", ""),
        ("Paprika", "", ""),
        ("Streichhölzer / Feuerzeug oder Feuerstein", "", ""),
        ("Spül-Schwamm / Bürste", "", ""),
        ("Kochlöffel", "", ""),
        ("Spültuch", "", ""),
        ("Trangia", "", ""),
        ("Klopapier", "", ""),
    ],
    "Navigator": [
        ("Kompass", "", ""),
        ("Geodreieck", "", ""),
        ("Planzeiger", "", ""),
        ("Wanderkarte oder ausgedruckte Karten", "", ""),
        ("Kartentasche", "", ""),
        ("Schnur", "", ""),
        ("Schrittzähler", "", ""),
        ("GPS-Gerät", "", "Optional"),
    ],
    "AB-Päckchen": [
        ("Alufolie", "", ""),
        ("Geldbörse mit Personalausweis, Krankenkarte und Bargeld", "", ""),
        ("Klebeband", "", ""),
        ("Sicherheitsnadel", "", ""),
        ("Nähnadel", "", ""),
        ("Nähgarn", "", ""),
        ("Heftzwecke", "", ""),
        ("Schnur", "", ""),
        ("Seil", "", ""),
        ("Draht", "", ""),
        ("Kreide", "", ""),
        ("Bleistift", "", ""),
        ("Zunder", "", ""),
        ("Kerze", "", ""),
        ("Stirnlampe", "", ""),
        ("(Blasen-) Pflaster", "", ""),
        ("Zeckenzange", "", ""),
        ("Material um Feuer zu entzünden", "", ""),
        ("Micro-USB Ladegerät", "", ""),
        ("Micro-USB Powerbank", "", ""),
        ("Ersatzbatterien", "", ""),
        ("Thermometer", "", ""),
        ("Kleine Plastiktüte (z.B. Gefrierbeutel)", "", ""),
    ],
    "Sommer": [
        ("Badehose", "", ""),
        ("Badetuch", "", ""),
        ("Sonnenbrille", "", ""),
        ("Sonnencreme", "", "Mindestens LSF 30"),
        ("Sandalen", "", ""),
        ("Kopfbedeckung", "", ""),
        ("Extra Wasserflasche", "", ""),
    ],
    "Winter": [
        ("Handschuhe", "", ""),
        ("Schal", "", ""),
        ("Mütze", "", ""),
    ],
    "Länger als 3 Tage": [
        ("Biologisch abbaubares Waschmittel", "", ""),
        ("Tagesrucksack", "", ""),
    ],
    "Sippengepäck": [
        ("Sippenwimpel", "", ""),
        ("Beil", "", ""),
        ("Kleine Säge", "", ""),
        ("Kohtenplanen", "", ""),
        ("Sippenkasse", "", ""),
        ("Erste-Hilfe Pack", "", ""),
    ],
    "Singerunde": [
        ("Musikinstrument", "", ""),
        ("Liederbücher", "", ""),
        ("Stimmgerät", "", ""),
    ],
    "Sonstiges": [
        ("Zweite Isomatte zum Sitzen", "", ""),
        ("Feldflasche", "", ""),
        ("Lederhandschuhe", "", "Zum Arbeiten oder für heiße Gegenstände"),
        ("Fotokamera", "", ""),
        ("Smartphone mit speziellen Apps", "", ""),
        ("Mückenschutz", "", ""),
        ("Zusätzlicher kleiner Rucksack", "", ""),
        ("Evtl. Impfpass, Allergiepass", "", ""),
    ],
}

# ---------------------------------------------------------------------------
# Template definitions – each template selects categories from the catalog
# ---------------------------------------------------------------------------

TEMPLATES = [
    {
        "title": "Tageswanderung",
        "description": "Leichte Packliste für einen Tagesausflug oder eine Tageswanderung. Kein Übernachtungsgepäck nötig.",
        "categories": {
            "Kleidung": [
                "Wandersocken",
                "Klufthemd mit Halstuch und Knoten",
                "Regenjacke",
                "Poncho",
                "Wanderschuhe",
            ],
            "Kulturbeutel": [
                "Lippenpflegestift",
            ],
            "Navigator": [
                "Kompass",
                "Wanderkarte oder ausgedruckte Karten",
                "Kartentasche",
            ],
            "AB-Päckchen": [
                "Geldbörse mit Personalausweis, Krankenkarte und Bargeld",
                "(Blasen-) Pflaster",
                "Zeckenzange",
                "Stirnlampe",
                "Micro-USB Powerbank",
            ],
            "Verpflegung": [
                ("Wasserflasche (mind. 1L)", "", ""),
                ("Brotzeit / Lunchpaket", "", ""),
                ("Müsliriegel / Snacks", "", ""),
            ],
            "Sonstiges": [
                "Smartphone mit speziellen Apps",
                "Mückenschutz",
            ],
        },
    },
    {
        "title": "Wochenend-Wanderung",
        "description": "Packliste für eine 2-tägige Wanderung mit einer Übernachtung im Freien.",
        "categories": {
            "Kleidung": None,  # None = alle Items aus Katalog
            "Kulturbeutel": None,
            "Lager/Fahrt": None,
            "Navigator": None,
            "AB-Päckchen": None,
            "Sonstiges": [
                "Feldflasche",
                "Smartphone mit speziellen Apps",
                "Mückenschutz",
                "Evtl. Impfpass, Allergiepass",
            ],
        },
    },
    {
        "title": "Hausübernachtung",
        "description": "Packliste für eine Übernachtung in einem Haus oder Pfadfinderheim.",
        "categories": {
            "Kleidung": [
                "Wandersocken",
                "Unterhose",
                "T-Shirt",
                "Klufthemd mit Halstuch und Knoten",
                "Gürtel",
                "Woll-Juja oder Pullover zum Wechseln",
            ],
            "Kulturbeutel": None,
            "Hausfahrt": None,
            "AB-Päckchen": [
                "Geldbörse mit Personalausweis, Krankenkarte und Bargeld",
                "Stirnlampe",
                "Micro-USB Ladegerät",
                "Micro-USB Powerbank",
            ],
            "Sonstiges": [
                "Smartphone mit speziellen Apps",
                "Evtl. Impfpass, Allergiepass",
            ],
        },
    },
    {
        "title": "Zeltlager-Wochenende",
        "description": "Packliste für ein Wochenend-Zeltlager (2 Tage, 1-2 Nächte) mit Kochen im Freien.",
        "categories": {
            "Kleidung": None,
            "Kulturbeutel": None,
            "Lager/Fahrt": None,
            "Fahrtenküche": None,
            "Navigator": None,
            "AB-Päckchen": None,
            "Sippengepäck": None,
            "Sonstiges": [
                "Feldflasche",
                "Lederhandschuhe",
                "Smartphone mit speziellen Apps",
                "Mückenschutz",
                "Evtl. Impfpass, Allergiepass",
            ],
        },
    },
    {
        "title": "Zeltlager – Langes Wochenende",
        "description": "Packliste für ein 3-4-tägiges Zeltlager mit erweiterter Ausrüstung.",
        "categories": {
            "Kleidung": None,
            "Kulturbeutel": None,
            "Lager/Fahrt": None,
            "Fahrtenküche": None,
            "Navigator": None,
            "AB-Päckchen": None,
            "Länger als 3 Tage": None,
            "Sippengepäck": None,
            "Sonstiges": None,
        },
    },
    {
        "title": "Sommerlager (1 Woche)",
        "description": "Vollständige Packliste für ein einwöchiges Sommerlager mit allem, was man braucht.",
        "categories": {
            "Kleidung": None,
            "Kulturbeutel": None,
            "Lager/Fahrt": None,
            "Fahrtenküche": None,
            "Navigator": None,
            "AB-Päckchen": None,
            "Sommer": None,
            "Länger als 3 Tage": None,
            "Sippengepäck": None,
            "Singerunde": None,
            "Sonstiges": None,
        },
    },
    {
        "title": "Winter-Hajk",
        "description": "Packliste für eine Winterwanderung mit zusätzlicher Kälteschutzausrüstung.",
        "categories": {
            "Kleidung": None,
            "Kulturbeutel": None,
            "Lager/Fahrt": None,
            "Navigator": None,
            "AB-Päckchen": None,
            "Winter": None,
            "Zusätzlich für Winter": [
                ("Thermounterwäsche (Ober- und Unterteil)", "", ""),
                ("Fleecejacke", "", ""),
                ("Warme Socken (Wolle)", "", "Extra Paar"),
                ("Wärmepads (Hand/Fuß)", "", ""),
                ("Thermosflasche mit heißem Tee", "", ""),
                ("Buff / Schlauchschal", "", ""),
            ],
            "Sonstiges": [
                "Feldflasche",
                "Smartphone mit speziellen Apps",
                "Evtl. Impfpass, Allergiepass",
            ],
        },
    },
    {
        "title": "Kochfahrt",
        "description": "Packliste mit Fokus auf Fahrtenküche und Kochen im Freien.",
        "categories": {
            "Kleidung": [
                "Wandersocken",
                "Unterhose",
                "T-Shirt",
                "Klufthemd mit Halstuch und Knoten",
                "Gürtel",
                "Regenjacke",
                "Wanderschuhe",
            ],
            "Kulturbeutel": None,
            "Lager/Fahrt": None,
            "Fahrtenküche": None,
            "Erweiterte Küchenausrüstung": [
                ("Schneidebrett", "", ""),
                ("Küchenmesser (mit Schutz)", "", ""),
                ("Dosenöffner", "", ""),
                ("Alufolie", "", ""),
                ("Frischhaltefolie", "", ""),
                ("Geschirrtuch", "", ""),
                ("Grillrost / Grillzange", "", ""),
                ("Öl / Butter", "", ""),
                ("Rezeptbuch / Rezepte", "", ""),
                ("Kühlbox / Kühltasche", "", "Für verderbliche Lebensmittel"),
            ],
            "AB-Päckchen": [
                "Geldbörse mit Personalausweis, Krankenkarte und Bargeld",
                "Stirnlampe",
                "(Blasen-) Pflaster",
            ],
            "Sonstiges": [
                "Lederhandschuhe",
            ],
        },
    },
    {
        "title": "Singerunde / Lagerfeuer",
        "description": "Packliste für einen gemütlichen Abend mit Musik und Lagerfeuer.",
        "categories": {
            "Kleidung": [
                "Klufthemd mit Halstuch und Knoten",
                "Woll-Juja oder Pullover zum Wechseln",
                "Regenjacke",
            ],
            "Singerunde": None,
            "Lagerfeuer-Zubehör": [
                ("Sitzkissen / Isomatte zum Sitzen", "", ""),
                ("Taschenlampe / Stirnlampe", "", ""),
                ("Stockbrot-Stöcke", "", ""),
                ("Marshmallows", "", ""),
                ("Heißgetränk (Tee / Kakao)", "", ""),
                ("Feuermaterial (Anzünder, Streichhölzer)", "", ""),
            ],
            "Sonstiges": [
                "Mückenschutz",
            ],
        },
    },
    {
        "title": "Pfingstlager",
        "description": "Packliste für ein mehrtägiges Pfingstlager (3-5 Tage) im Frühling.",
        "categories": {
            "Kleidung": None,
            "Kulturbeutel": None,
            "Lager/Fahrt": None,
            "Fahrtenküche": None,
            "Navigator": None,
            "AB-Päckchen": None,
            "Länger als 3 Tage": None,
            "Sippengepäck": None,
            "Singerunde": None,
            "Frühling-Extras": [
                ("Gummistiefel", "", "Für matschiges Gelände"),
                ("Leichte Jacke / Weste", "", ""),
                ("Regenschutz für Rucksack", "", ""),
            ],
            "Sonstiges": None,
        },
    },
    {
        "title": "Gruppenstunde / Elternabend",
        "description": "Minimale Packliste für regelmäßige Gruppenstunden oder Elternabende.",
        "categories": {
            "Grundausstattung": [
                ("Klufthemd mit Halstuch und Knoten", "", ""),
                ("Schreibzeug (Stift, Block)", "", ""),
                ("Getränk / Wasserflasche", "", ""),
                ("Snack", "", "Optional"),
                ("Geldbörse / Schlüssel", "", ""),
                ("Smartphone", "", ""),
            ],
            "Für Gruppenleiter": [
                ("Programmplanung / Stundenentwurf", "", ""),
                ("Materialliste", "", ""),
                ("Anwesenheitsliste", "", ""),
                ("Erste-Hilfe Set", "", ""),
                ("Pfadfinder-Materialien", "", "Je nach Programm"),
            ],
        },
    },
    {
        "title": "Großfahrt (2+ Wochen)",
        "description": "Ausführliche Packliste für eine längere Fahrt oder Großfahrt von mindestens zwei Wochen.",
        "categories": {
            "Kleidung": None,
            "Kulturbeutel": None,
            "Lager/Fahrt": None,
            "Fahrtenküche": None,
            "Navigator": None,
            "AB-Päckchen": None,
            "Sommer": None,
            "Länger als 3 Tage": None,
            "Sippengepäck": None,
            "Singerunde": None,
            "Dokumente & Geld": [
                ("Reisepass / Personalausweis", "", ""),
                ("Versicherungskarte (EHIC)", "", "Europäische Krankenversicherungskarte"),
                ("Impfpass", "", ""),
                ("Allergiepass", "", ""),
                ("Bargeld + EC-/Kreditkarte", "", ""),
                ("Notfall-Telefonnummern (ausgedruckt)", "", ""),
                ("Teilnehmerliste", "", "Für Gruppenleiter"),
                ("Einverständniserklärungen", "", "Für Gruppenleiter"),
            ],
            "Erweiterte Ausrüstung": [
                ("Wäscheleine + Klammern", "", ""),
                ("Nähset", "", ""),
                ("Ersatzschnürsenkel", "", ""),
                ("Kabelbinder", "", ""),
                ("Taschenmesser / Fahrtenmesser", "", ""),
                ("Tarp / Zusätzliche Plane", "", ""),
                ("Hängematte", "", "Optional"),
                ("Reiseapotheke", "", "Kopfschmerztabletten, Durchfallmittel, etc."),
                ("Sonnensegel", "", ""),
            ],
            "Sonstiges": None,
        },
    },
]


def _get_or_create_template_user():
    """Get or create a system user for template ownership."""
    user, _ = User.objects.get_or_create(
        email="system@gruppenstunde.de",
        defaults={
            "username": "system",
            "is_active": True,
            "is_staff": True,
        },
    )
    return user


def _get_catalog_items(category_name: str) -> list[tuple[str, str, str]]:
    """Return all items for a category from the master catalog."""
    return CATEGORIES.get(category_name, [])


def _resolve_items(category_name: str, item_spec) -> list[tuple[str, str, str]]:
    """
    Resolve item specification for a template category.

    - None → use all items from the master catalog
    - list of strings → filter master catalog by name
    - list of tuples → use directly (custom items not in catalog)
    """
    if item_spec is None:
        return _get_catalog_items(category_name)

    result = []
    catalog_items = {item[0]: item for item in _get_catalog_items(category_name)}

    for entry in item_spec:
        if isinstance(entry, str):
            # Look up from catalog
            if entry in catalog_items:
                result.append(catalog_items[entry])
            else:
                result.append((entry, "", ""))
        elif isinstance(entry, tuple):
            result.append(entry)

    return result


class Command(BaseCommand):
    help = "Seed packing list templates for common scouting scenarios."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Remove all existing template packing lists before seeding.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["clear"]:
            count, _ = PackingList.objects.filter(is_template=True).delete()
            self.stdout.write(self.style.WARNING(f"Removed {count} existing template objects."))

        owner = _get_or_create_template_user()
        created_count = 0
        skipped_count = 0

        for template_data in TEMPLATES:
            title = template_data["title"]

            # Skip if template with same title already exists
            if PackingList.objects.filter(title=title, is_template=True).exists():
                skipped_count += 1
                self.stdout.write(f"  Skipped (exists): {title}")
                continue

            packing_list = PackingList.objects.create(
                title=title,
                description=template_data["description"],
                owner=owner,
                is_template=True,
            )

            cat_order = 0
            total_items = 0

            for cat_name, item_spec in template_data["categories"].items():
                items = _resolve_items(cat_name, item_spec)
                if not items:
                    continue

                category = PackingCategory.objects.create(
                    packing_list=packing_list,
                    name=cat_name,
                    sort_order=cat_order,
                )
                cat_order += 1

                for idx, (name, quantity, description) in enumerate(items):
                    PackingItem.objects.create(
                        category=category,
                        name=name,
                        quantity=quantity,
                        description=description,
                        sort_order=idx,
                    )
                    total_items += 1

            created_count += 1
            self.stdout.write(f"  Created: {title} ({cat_order} categories, {total_items} items)")

        self.stdout.write(self.style.SUCCESS(f"\nDone! Created {created_count} templates, skipped {skipped_count}."))
