"""
Management command to seed the local development database with realistic test data.

This command creates dynamic test data across all apps using the factory functions
defined in each app's tests/__init__.py. It is idempotent — running it multiple times
will add more data (it does NOT deduplicate).

Static master data (Tags, ScoutLevels, MeasuringUnits, etc.) should be loaded
separately via `loaddata initial_data.json`.

Usage:
    uv run python manage.py seed_all               # seed everything
    uv run python manage.py seed_all --only ideas   # seed only ideas
    uv run python manage.py seed_all --only recipes
    uv run python manage.py seed_all --only events
    uv run python manage.py seed_all --only planner
    uv run python manage.py seed_all --only profiles
    uv run python manage.py seed_all --only packing
"""

import datetime
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

User = get_user_model()

SECTIONS = ["ideas", "recipes", "events", "planner", "profiles", "packing"]


class Command(BaseCommand):
    help = "Seed the local development database with realistic test data across all apps."

    def add_arguments(self, parser):
        parser.add_argument(
            "--only",
            type=str,
            choices=SECTIONS,
            help="Seed only a specific section.",
        )

    def handle(self, *args, **options):
        only = options.get("only")

        with transaction.atomic():
            # Ensure we have at least one user to assign as author/owner
            users = self._ensure_users()

            if only in (None, "ideas"):
                self._seed_ideas(users)
            if only in (None, "recipes"):
                self._seed_recipes(users)
            if only in (None, "events"):
                self._seed_events(users)
            if only in (None, "planner"):
                self._seed_planner(users)
            if only in (None, "profiles"):
                self._seed_profiles(users)
            if only in (None, "packing"):
                self._seed_packing(users)

        self.stdout.write(self.style.SUCCESS("seed_all complete."))

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _ensure_users(self) -> list:
        """Return a list of existing users; create a fallback user if none exist."""
        users = list(User.objects.all()[:6])
        if not users:
            self.stdout.write("  No users found – creating fallback seed user...")
            user = User.objects.create_user(
                username="seed_user",
                password="seed_user",
                email="seed@example.com",
            )
            users = [user]
        self.stdout.write(f"  Using {len(users)} user(s) for seeding.")
        return users

    def _pick_user(self, users: list, index: int = 0):
        return users[index % len(users)]

    # ------------------------------------------------------------------
    # Ideas
    # ------------------------------------------------------------------

    def _seed_ideas(self, users: list):
        self.stdout.write("Seeding ideas...")

        from idea.choices import (
            CostsRatingChoices,
            DifficultyChoices,
            EmotionType,
            ExecutionTimeChoices,
            IdeaTypeChoices,
            StatusChoices,
        )
        from idea.models import (
            Comment,
            Emotion,
            Idea,
            IdeaOfTheWeek,
            Ingredient,
            MaterialItem,
            MaterialName,
            MeasuringUnit,
            Portion,
            Price,
            Tag,
        )

        # --- Ideas (different types and statuses) ---
        idea_data = [
            {
                "title": "Schnitzeljagd im Wald",
                "summary": "Eine spannende Schnitzeljagd durch den Wald mit Rätseln und Aufgaben",
                "description": "## Vorbereitung\n\nVerstecke vorab Hinweise an markanten Stellen im Wald.\n\n## Ablauf\n\n1. Teams bilden (3-5 Personen)\n2. Erste Hinweiskarte verteilen\n3. Teams folgen den Hinweisen\n4. Am Ziel wartet eine kleine Belohnung\n\n## Tipps\n\n- GPS-Koordinaten für ältere Gruppen verwenden\n- Schwierigkeitsgrad an die Altersgruppe anpassen",
                "difficulty": DifficultyChoices.MEDIUM,
                "execution_time": ExecutionTimeChoices.BETWEEN_60_90,
                "costs_rating": CostsRatingChoices.LESS_1,
                "status": StatusChoices.PUBLISHED,
                "idea_type": IdeaTypeChoices.IDEA,
            },
            {
                "title": "Knotenkunde für Anfänger",
                "summary": "Die wichtigsten Knoten lernen und üben",
                "description": "## Knoten\n\n1. **Kreuzknoten** – zum Verbinden gleicher Seile\n2. **Palstek** – feste Schlaufe\n3. **Mastwurf** – Seil am Mast befestigen\n4. **Zimmermannsknoten** – Balken sichern\n\n## Methodik\n\nJeder Teilnehmer bekommt ein Seilstück und übt jeden Knoten mindestens 5 Mal.",
                "difficulty": DifficultyChoices.EASY,
                "execution_time": ExecutionTimeChoices.LESS_30,
                "costs_rating": CostsRatingChoices.FREE,
                "status": StatusChoices.PUBLISHED,
                "idea_type": IdeaTypeChoices.IDEA,
            },
            {
                "title": "Nachtwanderung mit Sternenbeobachtung",
                "summary": "Natur bei Nacht erleben und Sternbilder kennenlernen",
                "description": "## Planung\n\n- Route vorab abgehen (Sicherheit!)\n- Wetter prüfen (klarer Himmel nötig)\n- Taschenlampen und Stirnlampen einpacken\n\n## Programm\n\n1. Kurze Einführung zu Sternbildern\n2. Wanderung mit Stille-Phase\n3. Beobachtungsstation mit Fernglas\n4. Abschlussrunde am Lagerfeuer",
                "difficulty": DifficultyChoices.MEDIUM,
                "execution_time": ExecutionTimeChoices.MORE_90,
                "costs_rating": CostsRatingChoices.FREE,
                "status": StatusChoices.PUBLISHED,
                "idea_type": IdeaTypeChoices.IDEA,
            },
            {
                "title": "Erste-Hilfe-Wissen: Stabile Seitenlage",
                "summary": "Wissensartikel zur stabilen Seitenlage mit Schritt-für-Schritt-Anleitung",
                "description": "## Warum die stabile Seitenlage?\n\nDie stabile Seitenlage verhindert, dass eine bewusstlose Person an Erbrochenem oder der eigenen Zunge erstickt.\n\n## Schritt-für-Schritt\n\n1. Bewusstlosigkeit feststellen\n2. Notruf absetzen (112)\n3. Arm der Person anwinkeln\n4. Gegenüberliegendes Bein aufstellen\n5. Person zu sich rollen\n6. Kopf überstrecken\n7. Mund leicht öffnen\n\n## Häufige Fehler\n\n- Kopf nicht überstreckt → Atemwege blockiert\n- Person auf dem Rücken gelassen\n- Notruf vergessen",
                "difficulty": DifficultyChoices.EASY,
                "execution_time": ExecutionTimeChoices.LESS_30,
                "costs_rating": CostsRatingChoices.FREE,
                "status": StatusChoices.PUBLISHED,
                "idea_type": IdeaTypeChoices.KNOWLEDGE,
            },
            {
                "title": "Feuer machen ohne Streichhölzer",
                "summary": "Verschiedene Methoden, um Feuer ohne moderne Hilfsmittel zu entzünden",
                "description": "## Methoden\n\n### Feuerbohren\nEin Stück weiches Holz und ein härterer Stab...\n\n### Feuerstein\nMit Feuerstein und Feuerstahl...\n\n### Lupe\nBei Sonnenschein kann eine Lupe oder ein Brillenglas...",
                "difficulty": DifficultyChoices.HARD,
                "execution_time": ExecutionTimeChoices.BETWEEN_30_60,
                "costs_rating": CostsRatingChoices.LESS_1,
                "status": StatusChoices.PUBLISHED,
                "idea_type": IdeaTypeChoices.IDEA,
            },
            {
                "title": "Geländespiel: Capture the Flag",
                "summary": "Das klassische Geländespiel für große Gruppen",
                "description": "## Regeln\n\n- Zwei Teams\n- Jedes Team hat eine Flagge in seiner Basis\n- Ziel: die gegnerische Flagge erobern\n- Wer im gegnerischen Gebiet gefangen wird, muss ins 'Gefängnis'\n\n## Vorbereitung\n\n- Spielfeld markieren\n- Grenzen festlegen\n- Flaggen basteln (Stöcke + Tücher)",
                "difficulty": DifficultyChoices.MEDIUM,
                "execution_time": ExecutionTimeChoices.MORE_90,
                "costs_rating": CostsRatingChoices.FREE,
                "status": StatusChoices.PUBLISHED,
                "idea_type": IdeaTypeChoices.IDEA,
            },
            {
                "title": "Entwurf: Orientierung mit Karte und Kompass",
                "summary": "Grundlagen der Navigation mit Karte und Kompass",
                "description": "## Inhalte\n\n- Karte lesen (Legende, Maßstab, Höhenlinien)\n- Kompass einnorden\n- Marschzahl bestimmen\n- Peilen und Rückwärtseinschneiden",
                "difficulty": DifficultyChoices.HARD,
                "execution_time": ExecutionTimeChoices.BETWEEN_60_90,
                "costs_rating": CostsRatingChoices.BETWEEN_1_2,
                "status": StatusChoices.DRAFT,
                "idea_type": IdeaTypeChoices.IDEA,
            },
        ]

        created_ideas = []
        for i, data in enumerate(idea_data):
            if Idea.objects.filter(title=data["title"]).exists():
                self.stdout.write(f"  Idea '{data['title']}' already exists, skipping.")
                created_ideas.append(Idea.objects.get(title=data["title"]))
                continue
            idea = Idea.objects.create(**data)
            idea.authors.add(self._pick_user(users, i))
            # Assign tags if they exist
            tags = Tag.objects.filter(parent__isnull=False)[:3]
            if tags:
                idea.tags.set(tags)
            created_ideas.append(idea)
            self.stdout.write(f"  + Idea: {data['title']}")

        # --- Comments on published ideas ---
        published = [i for i in created_ideas if i.status == StatusChoices.PUBLISHED]
        comments_data = [
            ("Super Idee! Haben wir letzten Freitag ausprobiert.", "approved"),
            ("Könnte man auch drinnen machen?", "approved"),
            ("Vorsicht bei nassem Wetter.", "pending"),
        ]
        for i, idea in enumerate(published[:3]):
            text, status = comments_data[i % len(comments_data)]
            if not Comment.objects.filter(idea=idea, text=text).exists():
                Comment.objects.create(
                    idea=idea,
                    text=text,
                    status=status,
                    author_name=f"Pfadfinder{i + 1}",
                    user=self._pick_user(users, i) if status == "approved" else None,
                )

        # --- Emotions ---
        emotion_types = [EmotionType.IN_LOVE, EmotionType.HAPPY, EmotionType.HAPPY]
        for i, idea in enumerate(published[:3]):
            if not Emotion.objects.filter(idea=idea).exists():
                Emotion.objects.create(
                    idea=idea,
                    emotion_type=emotion_types[i % len(emotion_types)],
                    session_key=f"seed-session-{i}",
                )

        # --- Idea of the Week ---
        if published and not IdeaOfTheWeek.objects.exists():
            IdeaOfTheWeek.objects.create(
                idea=published[0],
                release_date=datetime.date.today(),
                description="Unsere Empfehlung für diese Woche!",
            )

        # --- MaterialItems for non-knowledge ideas ---
        material_ideas = [
            i for i in created_ideas if i.idea_type != IdeaTypeChoices.KNOWLEDGE and i.status == StatusChoices.PUBLISHED
        ]
        # Get or create some material names and units
        unit, _ = MeasuringUnit.objects.get_or_create(name="Stück", defaults={"description": "Einzelstück"})
        materials = [
            ("Seil", "10 Meter"),
            ("Papier", "5 Blatt"),
            ("Stifte", "1 Set"),
            ("Taschenlampe", "1"),
        ]
        for i, idea in enumerate(material_ideas[:4]):
            if not MaterialItem.objects.filter(idea=idea).exists():
                mat_name, _ = MaterialName.objects.get_or_create(name=materials[i % len(materials)][0])
                MaterialItem.objects.create(
                    idea=idea,
                    quantity=materials[i % len(materials)][1],
                    material_name=mat_name,
                    material_unit=unit,
                )

        # --- Ingredients & Portions & Prices (for the ingredient database) ---
        ingredients_data = [
            {
                "name": "Mehl",
                "description": "Weizenmehl Typ 405",
                "physical_density": 0.6,
                "energy_kj": 1440.0,
                "protein_g": 10.0,
                "fat_g": 1.0,
                "carbohydrate_g": 72.0,
                "sugar_g": 0.7,
                "fibre_g": 3.0,
                "salt_g": 0.01,
            },
            {
                "name": "Butter",
                "description": "Deutsche Markenbutter",
                "physical_density": 0.9,
                "energy_kj": 3054.0,
                "protein_g": 0.7,
                "fat_g": 82.0,
                "carbohydrate_g": 0.6,
                "sugar_g": 0.6,
                "fibre_g": 0.0,
                "salt_g": 0.04,
            },
            {
                "name": "Milch",
                "description": "Vollmilch 3,5%",
                "physical_density": 1.03,
                "energy_kj": 272.0,
                "protein_g": 3.4,
                "fat_g": 3.5,
                "carbohydrate_g": 4.8,
                "sugar_g": 4.8,
                "fibre_g": 0.0,
                "salt_g": 0.11,
            },
            {
                "name": "Reis",
                "description": "Langkornreis, parboiled",
                "physical_density": 0.85,
                "energy_kj": 1506.0,
                "protein_g": 7.0,
                "fat_g": 0.6,
                "carbohydrate_g": 78.0,
                "sugar_g": 0.2,
                "fibre_g": 1.4,
                "salt_g": 0.01,
            },
            {
                "name": "Eier",
                "description": "Hühnereier, Größe M",
                "physical_density": 1.03,
                "energy_kj": 596.0,
                "protein_g": 12.6,
                "fat_g": 10.6,
                "carbohydrate_g": 0.3,
                "sugar_g": 0.3,
                "fibre_g": 0.0,
                "salt_g": 0.37,
            },
            {
                "name": "Nudeln",
                "description": "Spaghetti, Hartweizen",
                "physical_density": 0.5,
                "energy_kj": 1507.0,
                "protein_g": 12.5,
                "fat_g": 1.8,
                "carbohydrate_g": 70.0,
                "sugar_g": 3.2,
                "fibre_g": 3.0,
                "salt_g": 0.01,
            },
            {
                "name": "Tomaten (Dose)",
                "description": "Geschälte Tomaten in der Dose",
                "physical_density": 1.05,
                "energy_kj": 75.0,
                "protein_g": 1.2,
                "fat_g": 0.1,
                "carbohydrate_g": 3.0,
                "sugar_g": 2.7,
                "fibre_g": 1.0,
                "salt_g": 0.05,
            },
            {
                "name": "Zwiebeln",
                "description": "Speisezwiebeln",
                "physical_density": 0.95,
                "energy_kj": 113.0,
                "protein_g": 1.3,
                "fat_g": 0.3,
                "carbohydrate_g": 5.0,
                "sugar_g": 4.2,
                "fibre_g": 1.4,
                "salt_g": 0.01,
            },
            {
                "name": "Knoblauch",
                "description": "Frischer Knoblauch",
                "physical_density": 0.8,
                "energy_kj": 590.0,
                "protein_g": 6.4,
                "fat_g": 0.5,
                "carbohydrate_g": 28.0,
                "sugar_g": 1.0,
                "fibre_g": 2.1,
                "salt_g": 0.02,
            },
            {
                "name": "Olivenöl",
                "description": "Natives Olivenöl extra",
                "physical_density": 0.92,
                "energy_kj": 3700.0,
                "protein_g": 0.0,
                "fat_g": 100.0,
                "carbohydrate_g": 0.0,
                "sugar_g": 0.0,
                "fibre_g": 0.0,
                "salt_g": 0.0,
            },
            {
                "name": "Kartoffeln",
                "description": "Festkochende Kartoffeln",
                "physical_density": 1.1,
                "energy_kj": 297.0,
                "protein_g": 2.0,
                "fat_g": 0.1,
                "carbohydrate_g": 15.0,
                "sugar_g": 0.8,
                "fibre_g": 2.1,
                "salt_g": 0.01,
            },
            {
                "name": "Käse (Gouda)",
                "description": "Gouda jung, 48% F.i.Tr.",
                "physical_density": 1.0,
                "energy_kj": 1500.0,
                "protein_g": 24.0,
                "fat_g": 27.0,
                "carbohydrate_g": 0.0,
                "sugar_g": 0.0,
                "fibre_g": 0.0,
                "salt_g": 2.0,
            },
            {
                "name": "Haferflocken",
                "description": "Zarte Haferflocken",
                "physical_density": 0.4,
                "energy_kj": 1540.0,
                "protein_g": 13.5,
                "fat_g": 7.0,
                "carbohydrate_g": 58.7,
                "sugar_g": 1.0,
                "fibre_g": 10.0,
                "salt_g": 0.01,
            },
            {
                "name": "Zucker",
                "description": "Weißer Haushaltszucker",
                "physical_density": 0.85,
                "energy_kj": 1700.0,
                "protein_g": 0.0,
                "fat_g": 0.0,
                "carbohydrate_g": 100.0,
                "sugar_g": 100.0,
                "fibre_g": 0.0,
                "salt_g": 0.0,
            },
            {
                "name": "Salz",
                "description": "Jodsalz",
                "physical_density": 1.2,
                "energy_kj": 0.0,
                "protein_g": 0.0,
                "fat_g": 0.0,
                "carbohydrate_g": 0.0,
                "sugar_g": 0.0,
                "fibre_g": 0.0,
                "salt_g": 100.0,
            },
            {
                "name": "Paprika",
                "description": "Rote Paprika",
                "physical_density": 0.5,
                "energy_kj": 109.0,
                "protein_g": 1.0,
                "fat_g": 0.3,
                "carbohydrate_g": 4.2,
                "sugar_g": 4.2,
                "fibre_g": 1.7,
                "salt_g": 0.0,
            },
            {
                "name": "Brot (Vollkorn)",
                "description": "Vollkornbrot, geschnitten",
                "physical_density": 0.6,
                "energy_kj": 880.0,
                "protein_g": 8.0,
                "fat_g": 1.2,
                "carbohydrate_g": 40.0,
                "sugar_g": 3.5,
                "fibre_g": 7.0,
                "salt_g": 1.2,
            },
            {
                "name": "Äpfel",
                "description": "Frische Äpfel",
                "physical_density": 0.9,
                "energy_kj": 218.0,
                "protein_g": 0.3,
                "fat_g": 0.2,
                "carbohydrate_g": 11.4,
                "sugar_g": 10.3,
                "fibre_g": 2.4,
                "salt_g": 0.0,
            },
            {
                "name": "Honig",
                "description": "Blütenhonig",
                "physical_density": 1.4,
                "energy_kj": 1360.0,
                "protein_g": 0.4,
                "fat_g": 0.0,
                "carbohydrate_g": 82.0,
                "sugar_g": 82.0,
                "fibre_g": 0.0,
                "salt_g": 0.01,
            },
            {
                "name": "Joghurt (Natur)",
                "description": "Naturjoghurt 3,5%",
                "physical_density": 1.03,
                "energy_kj": 260.0,
                "protein_g": 4.0,
                "fat_g": 3.5,
                "carbohydrate_g": 4.7,
                "sugar_g": 4.7,
                "fibre_g": 0.0,
                "salt_g": 0.13,
            },
        ]

        # Portions per ingredient (name, quantity, weight_g, unit_name)
        extra_portions = {
            "Mehl": [
                ("1 EL Mehl", 1.0, 10.0, "Esslöffel"),
                ("1 Tasse Mehl", 1.0, 125.0, "Tasse"),
            ],
            "Butter": [
                ("1 EL Butter", 1.0, 10.0, "Esslöffel"),
                ("250g Block Butter", 1.0, 250.0, "Stück"),
            ],
            "Milch": [
                ("1 Glas Milch", 1.0, 200.0, "Glas"),
                ("1 Liter Milch", 1.0, 1030.0, "Liter"),
            ],
            "Eier": [
                ("1 Ei (Größe M)", 1.0, 58.0, "Stück"),
                ("1 Ei (Größe L)", 1.0, 68.0, "Stück"),
            ],
            "Nudeln": [
                ("1 Portion Nudeln", 1.0, 125.0, "Portion"),
            ],
            "Tomaten (Dose)": [
                ("1 Dose (400g)", 1.0, 400.0, "Dose"),
            ],
            "Zwiebeln": [
                ("1 Zwiebel (mittel)", 1.0, 80.0, "Stück"),
            ],
            "Knoblauch": [
                ("1 Zehe", 1.0, 4.0, "Stück"),
            ],
            "Olivenöl": [
                ("1 EL Olivenöl", 1.0, 11.0, "Esslöffel"),
            ],
            "Kartoffeln": [
                ("1 Kartoffel (mittel)", 1.0, 130.0, "Stück"),
                ("1 kg Kartoffeln", 1.0, 1000.0, "Kilogramm"),
            ],
            "Käse (Gouda)": [
                ("1 Scheibe Gouda", 1.0, 25.0, "Scheibe"),
            ],
            "Haferflocken": [
                ("1 Portion Haferflocken", 1.0, 50.0, "Portion"),
            ],
            "Zucker": [
                ("1 EL Zucker", 1.0, 12.0, "Esslöffel"),
                ("1 TL Zucker", 1.0, 5.0, "Teelöffel"),
            ],
            "Salz": [
                ("1 Prise Salz", 1.0, 0.3, "Prise"),
                ("1 TL Salz", 1.0, 5.0, "Teelöffel"),
            ],
            "Äpfel": [
                ("1 Apfel (mittel)", 1.0, 150.0, "Stück"),
            ],
            "Honig": [
                ("1 EL Honig", 1.0, 20.0, "Esslöffel"),
            ],
            "Joghurt (Natur)": [
                ("1 Becher Joghurt", 1.0, 150.0, "Becher"),
            ],
        }

        # Extra prices per ingredient (portion_name, price, qty, label, retailer, quality)
        extra_prices = {
            "Mehl": [
                ("100g Mehl", Decimal("0.49"), 1, "1kg Mehl", "Aldi", "Standard"),
                ("100g Mehl", Decimal("1.29"), 1, "1kg Bio-Mehl", "Rewe", "Bio"),
            ],
            "Butter": [
                ("100g Butter", Decimal("1.79"), 1, "250g Markenbutter", "Aldi", "Standard"),
                ("100g Butter", Decimal("2.49"), 1, "250g Bio-Butter", "Edeka", "Bio"),
            ],
            "Milch": [
                ("100g Milch", Decimal("1.15"), 1, "1L Vollmilch", "Aldi", "Standard"),
                ("100g Milch", Decimal("1.69"), 1, "1L Bio-Vollmilch", "Rewe", "Bio"),
            ],
            "Eier": [
                ("100g Eier", Decimal("1.69"), 1, "10er Packung Eier", "Aldi", "Bodenhaltung"),
                ("100g Eier", Decimal("3.29"), 1, "10er Bio-Eier", "Edeka", "Bio"),
            ],
            "Nudeln": [
                ("100g Nudeln", Decimal("0.79"), 1, "500g Spaghetti", "Aldi", "Standard"),
                ("100g Nudeln", Decimal("1.49"), 1, "500g Bio-Spaghetti", "dm", "Bio"),
            ],
            "Tomaten (Dose)": [
                ("100g Tomaten (Dose)", Decimal("0.59"), 1, "400g Dose Tomaten", "Aldi", "Standard"),
            ],
            "Zwiebeln": [
                ("100g Zwiebeln", Decimal("1.29"), 1, "1kg Zwiebeln", "Aldi", "Standard"),
            ],
            "Olivenöl": [
                ("100g Olivenöl", Decimal("3.99"), 1, "500ml Olivenöl", "Aldi", "Standard"),
                ("100g Olivenöl", Decimal("6.99"), 1, "500ml Bio-Olivenöl", "Rewe", "Bio"),
            ],
            "Kartoffeln": [
                ("100g Kartoffeln", Decimal("1.99"), 1, "2,5kg Kartoffeln", "Aldi", "Standard"),
            ],
            "Käse (Gouda)": [
                ("100g Käse (Gouda)", Decimal("1.29"), 1, "200g Gouda", "Aldi", "Standard"),
            ],
            "Haferflocken": [
                ("100g Haferflocken", Decimal("0.59"), 1, "500g Haferflocken", "Aldi", "Standard"),
                ("100g Haferflocken", Decimal("1.19"), 1, "500g Bio-Haferflocken", "dm", "Bio"),
            ],
            "Zucker": [
                ("100g Zucker", Decimal("0.85"), 1, "1kg Zucker", "Aldi", "Standard"),
            ],
            "Joghurt (Natur)": [
                ("100g Joghurt (Natur)", Decimal("0.59"), 1, "500g Naturjoghurt", "Aldi", "Standard"),
            ],
        }

        for ing_data in ingredients_data:
            name = ing_data.pop("name")
            description = ing_data.pop("description")
            ingredient, created = Ingredient.objects.get_or_create(
                name=name,
                defaults={
                    "description": description,
                    "physical_viscosity": "solid" if name not in ("Milch", "Olivenöl", "Joghurt (Natur)") else "liquid",
                    "status": "verified",
                    **ing_data,
                },
            )
            if created:
                self.stdout.write(f"  + Ingredient: {name}")

            # Create base 100g portion
            gram_unit, _ = MeasuringUnit.objects.get_or_create(
                name="Gramm", defaults={"description": "Gewichtseinheit"}
            )
            portion, _ = Portion.objects.get_or_create(
                ingredient=ingredient,
                measuring_unit=gram_unit,
                defaults={
                    "name": f"100g {name}",
                    "quantity": 1.0,
                    "weight_g": 100.0,
                    "rank": 1,
                },
            )
            # Create a default price
            Price.objects.get_or_create(
                portion=portion,
                price_eur=Decimal("1.49"),
                defaults={
                    "quantity": 1,
                    "name": f"1kg Packung {name}",
                    "retailer": "Aldi",
                    "quality": "Standard",
                },
            )

            # Create extra portions
            if name in extra_portions:
                for p_name, p_qty, p_weight, unit_name in extra_portions[name]:
                    unit_obj, _ = MeasuringUnit.objects.get_or_create(
                        name=unit_name, defaults={"description": unit_name}
                    )
                    Portion.objects.get_or_create(
                        ingredient=ingredient,
                        name=p_name,
                        defaults={
                            "measuring_unit": unit_obj,
                            "quantity": p_qty,
                            "weight_g": p_weight,
                            "rank": 2,
                        },
                    )

            # Create extra prices
            if name in extra_prices:
                base_portion = Portion.objects.filter(ingredient=ingredient, measuring_unit=gram_unit).first()
                if base_portion:
                    for _, price_val, qty, label, retailer, quality in extra_prices[name]:
                        Price.objects.get_or_create(
                            portion=base_portion,
                            name=label,
                            defaults={
                                "price_eur": price_val,
                                "quantity": qty,
                                "retailer": retailer,
                                "quality": quality,
                            },
                        )

        self.stdout.write(self.style.SUCCESS(f"  Ideas total: {Idea.objects.count()}"))

    # ------------------------------------------------------------------
    # Recipes
    # ------------------------------------------------------------------

    def _seed_recipes(self, users: list):
        self.stdout.write("Seeding recipes...")

        from recipe.choices import (
            DifficultyChoices,
            ExecutionTimeChoices,
            HintLevelChoices,
            HintMinMaxChoices,
            HintParameterChoices,
            RecipeObjectiveChoices,
            RecipeStatusChoices,
            RecipeTypeChoices,
        )
        from recipe.models import Recipe, RecipeHint, RecipeItem

        from idea.models import Ingredient, MeasuringUnit, Portion

        recipe_data = [
            {
                "title": "Pfannkuchen",
                "summary": "Einfache Pfannkuchen für große Gruppen",
                "description": "## Zubereitung\n\n1. Mehl, Eier und Milch verrühren\n2. Teig 10 Minuten ruhen lassen\n3. In heißer Pfanne von beiden Seiten goldbraun backen\n4. Mit Zucker und Zimt oder Nutella servieren",
                "difficulty": DifficultyChoices.EASY,
                "execution_time": ExecutionTimeChoices.LESS_30,
                "recipe_type": RecipeTypeChoices.WARM_MEAL,
                "servings": 10,
                "status": RecipeStatusChoices.PUBLISHED,
            },
            {
                "title": "Nudeln mit Tomatensoße",
                "summary": "Klassiker der Lagerküche",
                "description": "## Zubereitung\n\n1. Nudeln nach Packungsanweisung kochen\n2. Zwiebeln und Knoblauch anbraten\n3. Tomaten (Dose) hinzufügen und 15 Minuten köcheln\n4. Mit Basilikum, Salz und Pfeffer abschmecken",
                "difficulty": DifficultyChoices.EASY,
                "execution_time": ExecutionTimeChoices.BETWEEN_30_60,
                "recipe_type": RecipeTypeChoices.WARM_MEAL,
                "servings": 10,
                "status": RecipeStatusChoices.PUBLISHED,
            },
            {
                "title": "Müsli mit frischem Obst",
                "summary": "Gesundes Frühstück für den Lageralltag",
                "description": "## Zubereitung\n\n1. Haferflocken in Schüsseln verteilen\n2. Milch oder Joghurt dazugeben\n3. Frisches Obst schneiden und darüber geben\n4. Optional: Honig, Nüsse, Rosinen",
                "difficulty": DifficultyChoices.EASY,
                "execution_time": ExecutionTimeChoices.LESS_30,
                "recipe_type": RecipeTypeChoices.BREAKFAST,
                "servings": 10,
                "status": RecipeStatusChoices.PUBLISHED,
            },
            {
                "title": "Stockbrot",
                "summary": "Am Lagerfeuer gebackenes Brot am Stock",
                "description": "## Teig\n\n- 500g Mehl\n- 250ml lauwarmes Wasser\n- 1 Päckchen Trockenhefe\n- 1 TL Salz\n- 1 EL Öl\n\n## Zubereitung\n\n1. Alle Zutaten verkneten\n2. 30 Min gehen lassen\n3. Um Stöcke wickeln\n4. Über dem Feuer backen (ca. 10-15 Min drehen)",
                "difficulty": DifficultyChoices.MEDIUM,
                "execution_time": ExecutionTimeChoices.BETWEEN_60_90,
                "recipe_type": RecipeTypeChoices.SNACK,
                "servings": 8,
                "status": RecipeStatusChoices.PUBLISHED,
            },
            {
                "title": "Kartoffelsuppe",
                "summary": "Deftige Kartoffelsuppe für kühle Abende",
                "description": "## Zubereitung\n\n1. Kartoffeln schälen und würfeln\n2. Zwiebeln und Knoblauch anbraten\n3. Kartoffeln und Brühe hinzufügen\n4. 20 Minuten köcheln lassen\n5. Teilweise pürieren\n6. Mit Salz, Pfeffer und Muskat abschmecken",
                "difficulty": DifficultyChoices.EASY,
                "execution_time": ExecutionTimeChoices.BETWEEN_30_60,
                "recipe_type": RecipeTypeChoices.WARM_MEAL,
                "servings": 12,
                "status": RecipeStatusChoices.PUBLISHED,
            },
            {
                "title": "Overnight Oats",
                "summary": "Frühstück zum Vorbereiten am Vorabend",
                "description": "## Zubereitung\n\n1. Haferflocken mit Milch/Joghurt mischen\n2. Honig und Zimt hinzufügen\n3. Über Nacht in den Kühlschrank stellen\n4. Morgens mit frischem Obst und Nüssen toppen",
                "difficulty": DifficultyChoices.EASY,
                "execution_time": ExecutionTimeChoices.LESS_30,
                "recipe_type": RecipeTypeChoices.BREAKFAST,
                "servings": 10,
                "status": RecipeStatusChoices.PUBLISHED,
            },
            {
                "title": "Gemüsepfanne mit Reis",
                "summary": "Bunte Gemüsepfanne auf Reis – schnell und gesund",
                "description": "## Zubereitung\n\n1. Reis nach Packungsanweisung kochen\n2. Paprika, Zwiebeln und Zucchini in Streifen schneiden\n3. Gemüse in Olivenöl anbraten\n4. Mit Sojasauce und Gewürzen abschmecken\n5. Auf Reis servieren",
                "difficulty": DifficultyChoices.EASY,
                "execution_time": ExecutionTimeChoices.BETWEEN_30_60,
                "recipe_type": RecipeTypeChoices.WARM_MEAL,
                "servings": 10,
                "status": RecipeStatusChoices.PUBLISHED,
            },
            {
                "title": "Obstsalat",
                "summary": "Frischer Obstsalat als leichter Nachtisch",
                "description": "## Zubereitung\n\n1. Äpfel, Bananen, Orangen und Beeren waschen und schneiden\n2. In einer großen Schüssel mischen\n3. Mit etwas Zitronensaft und Honig verfeinern",
                "difficulty": DifficultyChoices.EASY,
                "execution_time": ExecutionTimeChoices.LESS_30,
                "recipe_type": RecipeTypeChoices.DESSERT,
                "servings": 10,
                "status": RecipeStatusChoices.PUBLISHED,
            },
            {
                "title": "Nudelauflauf mit Käse",
                "summary": "Überbackener Nudelauflauf – Liebling aller Pfadfinder",
                "description": "## Zubereitung\n\n1. Nudeln al dente kochen\n2. Mit Tomatensoße und Gemüse mischen\n3. In eine Auflaufform geben\n4. Käse darüber streuen\n5. 20 Minuten bei 200°C überbacken",
                "difficulty": DifficultyChoices.MEDIUM,
                "execution_time": ExecutionTimeChoices.BETWEEN_60_90,
                "recipe_type": RecipeTypeChoices.WARM_MEAL,
                "servings": 12,
                "status": RecipeStatusChoices.PUBLISHED,
            },
            {
                "title": "Käsebrot-Platte",
                "summary": "Schnelle kalte Platte für Abendessen",
                "description": "## Zubereitung\n\n1. Verschiedene Brote aufschneiden\n2. Käse und Aufschnitt anrichten\n3. Gemüse-Sticks (Paprika, Gurke, Karotten) dazu\n4. Butter und Frischkäse bereitstellen",
                "difficulty": DifficultyChoices.EASY,
                "execution_time": ExecutionTimeChoices.LESS_30,
                "recipe_type": RecipeTypeChoices.COLD_MEAL,
                "servings": 10,
                "status": RecipeStatusChoices.PUBLISHED,
            },
        ]

        created_recipes = []
        for i, data in enumerate(recipe_data):
            if Recipe.objects.filter(title=data["title"]).exists():
                self.stdout.write(f"  Recipe '{data['title']}' already exists, skipping.")
                created_recipes.append(Recipe.objects.get(title=data["title"]))
                continue
            recipe = Recipe.objects.create(**data)
            recipe.authors.add(self._pick_user(users, i))
            created_recipes.append(recipe)
            self.stdout.write(f"  + Recipe: {data['title']}")

        # --- RecipeItems (link ingredients to recipes) ---
        mehl = Ingredient.objects.filter(name="Mehl").first()
        milch = Ingredient.objects.filter(name="Milch").first()
        butter = Ingredient.objects.filter(name="Butter").first()
        eier = Ingredient.objects.filter(name="Eier").first()
        nudeln = Ingredient.objects.filter(name="Nudeln").first()
        tomaten = Ingredient.objects.filter(name="Tomaten (Dose)").first()
        zwiebeln = Ingredient.objects.filter(name="Zwiebeln").first()
        knoblauch = Ingredient.objects.filter(name="Knoblauch").first()
        olivenoel = Ingredient.objects.filter(name="Olivenöl").first()
        kartoffeln = Ingredient.objects.filter(name="Kartoffeln").first()
        kaese = Ingredient.objects.filter(name="Käse (Gouda)").first()
        haferflocken = Ingredient.objects.filter(name="Haferflocken").first()
        zucker = Ingredient.objects.filter(name="Zucker").first()
        salz_ing = Ingredient.objects.filter(name="Salz").first()
        reis = Ingredient.objects.filter(name="Reis").first()
        paprika = Ingredient.objects.filter(name="Paprika").first()
        aepfel = Ingredient.objects.filter(name="Äpfel").first()
        honig = Ingredient.objects.filter(name="Honig").first()
        joghurt = Ingredient.objects.filter(name="Joghurt (Natur)").first()
        brot = Ingredient.objects.filter(name="Brot (Vollkorn)").first()

        gram_unit = MeasuringUnit.objects.filter(name="Gramm").first()

        # Map recipe -> [(ingredient, quantity_g, note)]
        recipe_ingredients_map = {
            "Pfannkuchen": [
                (mehl, 500.0, ""),
                (milch, 750.0, ""),
                (eier, 290.0, "5 Eier"),
                (zucker, 24.0, "2 EL"),
                (salz_ing, 1.5, "1 Prise"),
                (butter, 50.0, "zum Braten"),
            ],
            "Nudeln mit Tomatensoße": [
                (nudeln, 1250.0, ""),
                (tomaten, 1600.0, "4 Dosen"),
                (zwiebeln, 160.0, "2 Stück"),
                (knoblauch, 12.0, "3 Zehen"),
                (olivenoel, 33.0, "3 EL"),
                (salz_ing, 5.0, "1 TL"),
                (zucker, 5.0, "1 TL"),
            ],
            "Müsli mit frischem Obst": [
                (haferflocken, 500.0, ""),
                (milch, 1000.0, "oder Joghurt"),
                (aepfel, 450.0, "3 Äpfel"),
                (honig, 60.0, "3 EL"),
            ],
            "Stockbrot": [
                (mehl, 500.0, ""),
                (salz_ing, 5.0, "1 TL"),
                (olivenoel, 11.0, "1 EL"),
            ],
            "Kartoffelsuppe": [
                (kartoffeln, 2000.0, "ca. 15 Stück"),
                (zwiebeln, 160.0, "2 Stück"),
                (knoblauch, 8.0, "2 Zehen"),
                (butter, 30.0, "zum Anbraten"),
                (milch, 200.0, "zum Verfeinern"),
                (salz_ing, 5.0, "1 TL"),
            ],
            "Overnight Oats": [
                (haferflocken, 500.0, ""),
                (joghurt, 750.0, "5 Becher"),
                (milch, 500.0, ""),
                (honig, 60.0, "3 EL"),
                (aepfel, 300.0, "2 Äpfel"),
            ],
            "Gemüsepfanne mit Reis": [
                (reis, 750.0, ""),
                (paprika, 400.0, "4 Stück"),
                (zwiebeln, 240.0, "3 Stück"),
                (olivenoel, 33.0, "3 EL"),
                (salz_ing, 5.0, "1 TL"),
            ],
            "Obstsalat": [
                (aepfel, 600.0, "4 Äpfel"),
                (honig, 40.0, "2 EL"),
                (zucker, 12.0, "1 EL"),
            ],
            "Nudelauflauf mit Käse": [
                (nudeln, 1500.0, ""),
                (tomaten, 1200.0, "3 Dosen"),
                (kaese, 400.0, "zum Überbacken"),
                (zwiebeln, 160.0, "2 Stück"),
                (knoblauch, 8.0, "2 Zehen"),
                (olivenoel, 22.0, "2 EL"),
                (salz_ing, 5.0, "1 TL"),
            ],
            "Käsebrot-Platte": [
                (brot, 1000.0, ""),
                (kaese, 500.0, "diverse Sorten"),
                (butter, 125.0, "halber Block"),
                (paprika, 200.0, "2 Stück, in Streifen"),
            ],
        }

        for recipe in created_recipes:
            if recipe.title in recipe_ingredients_map and not RecipeItem.objects.filter(recipe=recipe).exists():
                for sort_idx, (ingredient, qty, note) in enumerate(recipe_ingredients_map[recipe.title]):
                    if ingredient and gram_unit:
                        portion = Portion.objects.filter(ingredient=ingredient, measuring_unit=gram_unit).first()
                        RecipeItem.objects.create(
                            recipe=recipe,
                            portion=portion,
                            ingredient=ingredient,
                            quantity=qty,
                            measuring_unit=gram_unit,
                            sort_order=sort_idx,
                            note=note,
                        )

        # --- RecipeHints (rule-based, static) ---
        hints_data = [
            {
                "name": "Zu viel Salz",
                "description": "Der Salzgehalt pro Portion ist zu hoch. Maximal 2g Salz pro Portion empfohlen.",
                "parameter": HintParameterChoices.SALT_G,
                "max_value": 2.0,
                "min_max": HintMinMaxChoices.MAX,
                "hint_level": HintLevelChoices.WARNING,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            {
                "name": "Zu viel Zucker",
                "description": "Der Zuckergehalt pro Portion ist zu hoch. Maximal 15g Zucker pro Portion empfohlen.",
                "parameter": HintParameterChoices.SUGAR_G,
                "max_value": 15.0,
                "min_max": HintMinMaxChoices.MAX,
                "hint_level": HintLevelChoices.WARNING,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            {
                "name": "Zu wenig Ballaststoffe",
                "description": "Der Ballaststoffgehalt ist niedrig. Mindestens 3g pro Portion für gute Sättigung.",
                "parameter": HintParameterChoices.FIBRE_G,
                "min_value": 3.0,
                "min_max": HintMinMaxChoices.MIN,
                "hint_level": HintLevelChoices.INFO,
                "recipe_objective": RecipeObjectiveChoices.FULFILLMENT,
            },
            {
                "name": "Hoher Fettgehalt",
                "description": "Der Fettgehalt pro Portion ist hoch. Maximal 20g Fett pro Portion empfohlen.",
                "parameter": HintParameterChoices.FAT_G,
                "max_value": 20.0,
                "min_max": HintMinMaxChoices.MAX,
                "hint_level": HintLevelChoices.INFO,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
        ]

        for hint_data in hints_data:
            if not RecipeHint.objects.filter(name=hint_data["name"]).exists():
                RecipeHint.objects.create(**hint_data)
                self.stdout.write(f"  + RecipeHint: {hint_data['name']}")

        self.stdout.write(self.style.SUCCESS(f"  Recipes total: {Recipe.objects.count()}"))

    # ------------------------------------------------------------------
    # Events
    # ------------------------------------------------------------------

    def _seed_events(self, users: list):
        self.stdout.write("Seeding events...")

        from event.choices import GenderChoices
        from event.models import (
            BookingOption,
            Event,
            EventLocation,
            Participant,
            Person,
            Registration,
        )

        # --- Locations ---
        locations_data = [
            {
                "name": "Pfadfinderheim Waldwiese",
                "street": "Waldweg 12",
                "zip_code": "35037",
                "city": "Marburg",
                "state": "Hessen",
                "country": "Deutschland",
                "description": "Gemütliches Pfadfinderheim am Waldrand mit großem Garten",
            },
            {
                "name": "Zeltplatz Sonnenwiese",
                "street": "Am Waldrand 1",
                "zip_code": "36199",
                "city": "Rotenburg",
                "state": "Hessen",
                "country": "Deutschland",
                "description": "Großer Zeltplatz mit Feuerstelle und Sanitäranlagen",
            },
            {
                "name": "Jugendherberge Burg Staufenberg",
                "street": "Burgstraße 7",
                "zip_code": "35460",
                "city": "Staufenberg",
                "state": "Hessen",
                "country": "Deutschland",
                "description": "Historische Jugendherberge mit Rittersaal und Burgturm",
            },
            {
                "name": "Naturfreundehaus Lahntal",
                "street": "Lahnufer 23",
                "zip_code": "35043",
                "city": "Marburg",
                "state": "Hessen",
                "country": "Deutschland",
                "description": "Direkt am Fluss mit Kanuverleih und Grillplatz",
            },
        ]

        created_locations = []
        for loc_data in locations_data:
            location, created = EventLocation.objects.get_or_create(
                name=loc_data["name"],
                defaults={**loc_data, "created_by": self._pick_user(users, 0)},
            )
            created_locations.append(location)
            if created:
                self.stdout.write(f"  + Location: {loc_data['name']}")

        # --- Events ---
        now = timezone.now()
        events_data = [
            {
                "name": "Sommerlager 2026",
                "description": "Eine Woche Abenteuer im Wald! Mit Wandern, Kanufahren, Lagerbauten und Lagerfeuerabenden.",
                "location": "Rotenburg an der Fulda",
                "start_date": now + datetime.timedelta(days=90),
                "end_date": now + datetime.timedelta(days=97),
                "registration_deadline": now + datetime.timedelta(days=75),
                "registration_start": now - datetime.timedelta(days=10),
                "is_public": True,
                "invitation_text": "Liebes Stammesmitglied, wir laden dich herzlich zum Sommerlager 2026 ein!",
            },
            {
                "name": "Elternabend Herbst 2026",
                "description": "Informationsabend für Eltern zum kommenden Halbjahr.",
                "location": "Marburg",
                "start_date": now + datetime.timedelta(days=30),
                "end_date": now + datetime.timedelta(days=30),
                "registration_deadline": now + datetime.timedelta(days=25),
                "registration_start": now - datetime.timedelta(days=5),
                "is_public": False,
            },
            {
                "name": "Stammesversammlung Januar 2027",
                "description": "Jahresplanung und Wahlen der Stammesführung.",
                "location": "Marburg",
                "start_date": now + datetime.timedelta(days=270),
                "end_date": now + datetime.timedelta(days=270),
                "registration_deadline": now + datetime.timedelta(days=260),
                "registration_start": now + datetime.timedelta(days=200),
                "is_public": False,
            },
            {
                "name": "Pfingstlager 2026",
                "description": "Verlängertes Wochenende auf dem Zeltplatz mit Geländespielen, Nachtwanderung und Lagerfeuer.",
                "location": "Staufenberg",
                "start_date": now + datetime.timedelta(days=50),
                "end_date": now + datetime.timedelta(days=53),
                "registration_deadline": now + datetime.timedelta(days=40),
                "registration_start": now - datetime.timedelta(days=15),
                "is_public": True,
                "invitation_text": "Pfingsten steht vor der Tür – kommt alle mit zum Pfingstlager!",
            },
            {
                "name": "Nikolausaktion 2026",
                "description": "Wir verteilen als Nikoläuse Geschenke in der Nachbarschaft und sammeln Spenden für den guten Zweck.",
                "location": "Marburg Innenstadt",
                "start_date": now + datetime.timedelta(days=245),
                "end_date": now + datetime.timedelta(days=245),
                "registration_deadline": now + datetime.timedelta(days=235),
                "registration_start": now + datetime.timedelta(days=180),
                "is_public": True,
            },
            {
                "name": "Kochfahrt Herbst 2026",
                "description": "Wochenend-Hajk mit Kochen über dem Feuer. Jede Sippe bereitet ein Gericht zu.",
                "location": "Lahntal",
                "start_date": now + datetime.timedelta(days=150),
                "end_date": now + datetime.timedelta(days=152),
                "registration_deadline": now + datetime.timedelta(days=140),
                "registration_start": now + datetime.timedelta(days=60),
                "is_public": False,
                "invitation_text": "Kochen, Wandern, Sterne gucken – die Kochfahrt ruft!",
            },
        ]

        created_events = []
        for i, ev_data in enumerate(events_data):
            if Event.objects.filter(name=ev_data["name"]).exists():
                self.stdout.write(f"  Event '{ev_data['name']}' already exists, skipping.")
                created_events.append(Event.objects.get(name=ev_data["name"]))
                continue
            event = Event.objects.create(
                **ev_data,
                event_location=created_locations[i % len(created_locations)],
                created_by=self._pick_user(users, i),
            )
            event.responsible_persons.add(self._pick_user(users, 0))
            created_events.append(event)
            self.stdout.write(f"  + Event: {ev_data['name']}")

        # --- BookingOptions for Sommerlager ---
        sommerlager = created_events[0] if created_events else None
        if sommerlager and not BookingOption.objects.filter(event=sommerlager).exists():
            BookingOption.objects.create(
                event=sommerlager,
                name="Ganzes Lager",
                description="7 Tage inkl. Verpflegung",
                price=Decimal("120.00"),
                max_participants=40,
            )
            BookingOption.objects.create(
                event=sommerlager,
                name="Wochenende",
                description="Nur Sa + So inkl. Verpflegung",
                price=Decimal("40.00"),
                max_participants=15,
            )

        # BookingOptions for Pfingstlager
        pfingstlager = next((e for e in created_events if e.name == "Pfingstlager 2026"), None)
        if pfingstlager and not BookingOption.objects.filter(event=pfingstlager).exists():
            BookingOption.objects.create(
                event=pfingstlager,
                name="Komplett (Fr-Mo)",
                description="4 Tage inkl. Verpflegung und Zeltplatz",
                price=Decimal("55.00"),
                max_participants=30,
            )
            BookingOption.objects.create(
                event=pfingstlager,
                name="Nur Samstag/Sonntag",
                description="2 Tage inkl. Verpflegung",
                price=Decimal("25.00"),
                max_participants=10,
            )

        # BookingOptions for Kochfahrt
        kochfahrt = next((e for e in created_events if e.name == "Kochfahrt Herbst 2026"), None)
        if kochfahrt and not BookingOption.objects.filter(event=kochfahrt).exists():
            BookingOption.objects.create(
                event=kochfahrt,
                name="Teilnahme",
                description="Wochenende inkl. Zutaten und Zeltplatz",
                price=Decimal("30.00"),
                max_participants=20,
            )

        # --- Persons (for admin@admin.de user) ---
        admin_user = User.objects.filter(email="admin@admin.de").first()
        if admin_user:
            # Owner person for admin
            if not Person.objects.filter(user=admin_user, is_owner=True).exists():
                admin_person = Person.objects.create(
                    user=admin_user,
                    first_name="Admin",
                    last_name="User",
                    scout_name="Adler",
                    email="admin@admin.de",
                    birthday=datetime.date(1990, 5, 15),
                    gender=GenderChoices.MALE,
                    address="Musterstraße 1",
                    zip_code="35037",
                    city="Marburg",
                    is_owner=True,
                )
                self.stdout.write("  + Person (owner): Admin User / Adler")

            # Family members for admin
            admin_family = [
                {
                    "first_name": "Maria",
                    "last_name": "User",
                    "scout_name": "",
                    "birthday": datetime.date(2014, 8, 20),
                    "gender": GenderChoices.FEMALE,
                    "email": "",
                },
                {
                    "first_name": "Tim",
                    "last_name": "User",
                    "scout_name": "Dachs",
                    "birthday": datetime.date(2012, 3, 10),
                    "gender": GenderChoices.MALE,
                    "email": "",
                },
            ]
            for fam_data in admin_family:
                if not Person.objects.filter(
                    user=admin_user, first_name=fam_data["first_name"], last_name=fam_data["last_name"]
                ).exists():
                    Person.objects.create(user=admin_user, **fam_data)
                    self.stdout.write(f"  + Person (admin family): {fam_data['first_name']} {fam_data['last_name']}")

        # --- Persons for other users ---
        persons_data = [
            {
                "first_name": "Lena",
                "last_name": "Müller",
                "scout_name": "Eichhörnchen",
                "birthday": datetime.date(2012, 3, 15),
                "gender": GenderChoices.FEMALE,
                "email": "lena@example.com",
                "is_owner": True,
            },
            {
                "first_name": "Jonas",
                "last_name": "Schmidt",
                "scout_name": "Bär",
                "birthday": datetime.date(2011, 7, 22),
                "gender": GenderChoices.MALE,
                "email": "jonas@example.com",
                "is_owner": True,
            },
            {
                "first_name": "Sophie",
                "last_name": "Weber",
                "scout_name": "Fuchs",
                "birthday": datetime.date(2013, 1, 8),
                "gender": GenderChoices.FEMALE,
                "email": "sophie@example.com",
                "is_owner": True,
            },
        ]

        for i, p_data in enumerate(persons_data):
            user = self._pick_user(users, i + 1)  # skip admin (index 0)
            if not Person.objects.filter(
                user=user, first_name=p_data["first_name"], last_name=p_data["last_name"]
            ).exists():
                Person.objects.create(user=user, **p_data)
                self.stdout.write(f"  + Person: {p_data['scout_name']}")

        # Extra family members for user accounts
        extra_persons = [
            {
                "user_index": 1,
                "first_name": "Max",
                "last_name": "Müller",
                "scout_name": "Waschbär",
                "birthday": datetime.date(2014, 11, 3),
                "gender": GenderChoices.MALE,
                "email": "",
            },
            {
                "user_index": 2,
                "first_name": "Emma",
                "last_name": "Schmidt",
                "scout_name": "",
                "birthday": datetime.date(2015, 6, 12),
                "gender": GenderChoices.FEMALE,
                "email": "",
            },
            {
                "user_index": 2,
                "first_name": "Felix",
                "last_name": "Schmidt",
                "scout_name": "Wolf",
                "birthday": datetime.date(2010, 2, 28),
                "gender": GenderChoices.MALE,
                "email": "felix@example.com",
            },
        ]
        for ep in extra_persons:
            user = self._pick_user(users, ep["user_index"])
            data = {k: v for k, v in ep.items() if k != "user_index"}
            if not Person.objects.filter(user=user, first_name=data["first_name"], last_name=data["last_name"]).exists():
                Person.objects.create(user=user, **data)
                self.stdout.write(f"  + Person: {data['first_name']} {data['last_name']}")

        # --- Registrations & Participants for Sommerlager ---
        if sommerlager:
            booking_full = BookingOption.objects.filter(event=sommerlager, name="Ganzes Lager").first()
            booking_weekend = BookingOption.objects.filter(event=sommerlager, name="Wochenende").first()

            for user_idx in range(min(3, len(users))):
                reg_user = users[user_idx]
                if not Registration.objects.filter(user=reg_user, event=sommerlager).exists():
                    reg = Registration.objects.create(user=reg_user, event=sommerlager)
                    user_persons = Person.objects.filter(user=reg_user)
                    for person in user_persons:
                        booking = booking_full if person.is_owner else booking_weekend
                        Participant.create_from_person(reg, person, booking_option=booking)
                    self.stdout.write(f"  + Registration: {reg_user.username} for Sommerlager ({user_persons.count()} participants)")

            # Invite all users to sommerlager
            for user in users:
                sommerlager.invited_users.add(user)

        # --- Registrations for Pfingstlager ---
        if pfingstlager and admin_user:
            if not Registration.objects.filter(user=admin_user, event=pfingstlager).exists():
                booking = BookingOption.objects.filter(event=pfingstlager, name="Komplett (Fr-Mo)").first()
                reg = Registration.objects.create(user=admin_user, event=pfingstlager)
                for person in Person.objects.filter(user=admin_user):
                    Participant.create_from_person(reg, person, booking_option=booking)
                self.stdout.write("  + Registration: admin for Pfingstlager")

            # Invite users
            for user in users[:4]:
                pfingstlager.invited_users.add(user)

        self.stdout.write(self.style.SUCCESS(f"  Events total: {Event.objects.count()}"))

    # ------------------------------------------------------------------
    # Planner
    # ------------------------------------------------------------------

    def _seed_planner(self, users: list):
        self.stdout.write("Seeding planners...")

        from planner.models import (
            EntryStatusChoices,
            Meal,
            MealDay,
            MealItem,
            MealPlan,
            MealTypeChoices,
            Planner,
            PlannerCollaborator,
            PlannerEntry,
            WeekdayChoices,
        )

        from idea.models import Idea

        # --- Planners ---
        planners_data = [
            {
                "title": "Wölflings-Gruppenstunden Herbst 2026",
                "weekday": WeekdayChoices.FRIDAY,
                "time": datetime.time(17, 0),
            },
            {
                "title": "Pfadfinder-Gruppenstunden Winter 2026",
                "weekday": WeekdayChoices.WEDNESDAY,
                "time": datetime.time(18, 30),
            },
        ]

        created_planners = []
        for i, pl_data in enumerate(planners_data):
            if Planner.objects.filter(title=pl_data["title"]).exists():
                self.stdout.write(f"  Planner '{pl_data['title']}' already exists, skipping.")
                created_planners.append(Planner.objects.get(title=pl_data["title"]))
                continue
            planner = Planner.objects.create(
                owner=self._pick_user(users, i),
                **pl_data,
            )
            created_planners.append(planner)
            self.stdout.write(f"  + Planner: {pl_data['title']}")

        # --- PlannerEntries ---
        ideas = list(Idea.objects.filter(status="published")[:4])
        if created_planners:
            planner = created_planners[0]
            if not PlannerEntry.objects.filter(planner=planner).exists():
                base_date = datetime.date.today()
                for week in range(6):
                    entry_date = base_date + datetime.timedelta(weeks=week)
                    status = EntryStatusChoices.CANCELLED if week == 3 else EntryStatusChoices.PLANNED
                    entry = PlannerEntry.objects.create(
                        planner=planner,
                        date=entry_date,
                        status=status,
                        sort_order=week,
                        idea=ideas[week % len(ideas)] if ideas else None,
                        notes="Fällt wegen Feiertag aus" if week == 3 else "",
                    )
                self.stdout.write(f"  + 6 PlannerEntries for '{planner.title}'")

        # --- Collaborator ---
        if len(users) > 1 and created_planners:
            planner = created_planners[0]
            collaborator_user = self._pick_user(users, 1)
            if not PlannerCollaborator.objects.filter(planner=planner, user=collaborator_user).exists():
                PlannerCollaborator.objects.create(
                    planner=planner,
                    user=collaborator_user,
                    role=PlannerCollaborator.Role.EDITOR,
                )

        # --- MealPlan ---
        if not MealPlan.objects.exists():
            meal_plan = MealPlan.objects.create(
                name="Sommerlager Essensplan 2026",
                description="Essensplan für 7 Tage Sommerlager",
                created_by=self._pick_user(users, 0),
                norm_portions=25,
                activity_factor=1.6,
                reserve_factor=1.1,
            )
            self.stdout.write(f"  + MealPlan: {meal_plan.name}")

            # Create 7 days with meals
            from recipe.models import Recipe

            recipes = list(Recipe.objects.filter(status="published")[:10])

            for day_offset in range(7):
                day = MealDay.objects.create(
                    meal_plan=meal_plan,
                    date=datetime.date.today() + datetime.timedelta(days=day_offset),
                )

                # Breakfast, Lunch, Snack, Dinner
                for meal_type, factor in [
                    (MealTypeChoices.BREAKFAST, 0.25),
                    (MealTypeChoices.LUNCH, 0.35),
                    (MealTypeChoices.SNACK, 0.10),
                    (MealTypeChoices.DINNER, 0.30),
                ]:
                    meal = Meal.objects.create(
                        meal_day=day,
                        meal_type=meal_type,
                        day_part_factor=factor,
                    )
                    # Assign a recipe if available
                    if recipes:
                        recipe_idx = (day_offset * 4 + list(MealTypeChoices).index(meal_type)) % len(recipes)
                        MealItem.objects.create(
                            meal=meal,
                            recipe=recipes[recipe_idx],
                            factor=1.0,
                        )

            self.stdout.write(f"  + 7 MealDays with 28 Meals")

        # --- Second MealPlan (Pfingstlager) ---
        if not MealPlan.objects.filter(name="Pfingstlager Essensplan 2026").exists():
            from recipe.models import Recipe

            meal_plan2 = MealPlan.objects.create(
                name="Pfingstlager Essensplan 2026",
                description="Essensplan für 4 Tage Pfingstlager",
                created_by=self._pick_user(users, 0),
                norm_portions=15,
                activity_factor=1.4,
                reserve_factor=1.05,
            )
            self.stdout.write(f"  + MealPlan: {meal_plan2.name}")

            recipes = list(Recipe.objects.filter(status="published")[:10])
            for day_offset in range(4):
                day = MealDay.objects.create(
                    meal_plan=meal_plan2,
                    date=datetime.date.today() + datetime.timedelta(days=50 + day_offset),
                )
                for meal_type, factor in [
                    (MealTypeChoices.BREAKFAST, 0.25),
                    (MealTypeChoices.LUNCH, 0.35),
                    (MealTypeChoices.DINNER, 0.30),
                ]:
                    meal = Meal.objects.create(
                        meal_day=day,
                        meal_type=meal_type,
                        day_part_factor=factor,
                    )
                    if recipes:
                        recipe_idx = (day_offset * 3 + list(MealTypeChoices).index(meal_type)) % len(recipes)
                        MealItem.objects.create(
                            meal=meal,
                            recipe=recipes[recipe_idx],
                            factor=1.0,
                        )

            self.stdout.write(f"  + 4 MealDays with 12 Meals (Pfingstlager)")

        self.stdout.write(self.style.SUCCESS(f"  Planners total: {Planner.objects.count()}"))

    # ------------------------------------------------------------------
    # Profiles
    # ------------------------------------------------------------------

    def _seed_profiles(self, users: list):
        self.stdout.write("Seeding profiles...")

        from profiles.choices import MembershipRoleChoices
        from profiles.models import GroupMembership, UserGroup, UserProfile

        # --- UserProfiles (created via signal or here) ---
        scout_names = ["Adler", "Bär", "Fuchs", "Wolf", "Eule", "Falke"]
        for i, user in enumerate(users):
            if not UserProfile.objects.filter(user=user).exists():
                UserProfile.objects.create(
                    user=user,
                    scout_name=scout_names[i % len(scout_names)],
                    first_name=user.first_name or f"Pfadfinder{i + 1}",
                    last_name=user.last_name or f"Nachname{i + 1}",
                    about_me=f"Pfadfinder seit {2015 + i}",
                    is_public=True,
                )
                self.stdout.write(f"  + UserProfile for '{user.username}'")

        # --- UserGroups ---
        groups_data = [
            {
                "name": "Stamm Silberfüchse",
                "description": "Ein aktiver Stamm aus Marburg mit 50 Mitgliedern",
                "is_visible": True,
                "free_to_join": False,
            },
            {
                "name": "Stamm Waldläufer",
                "description": "Pfadfinderstamm aus Gießen",
                "is_visible": True,
                "free_to_join": True,
            },
        ]

        created_groups = []
        for g_data in groups_data:
            group, created = UserGroup.objects.get_or_create(
                name=g_data["name"],
                defaults=g_data,
            )
            created_groups.append(group)
            if created:
                self.stdout.write(f"  + UserGroup: {g_data['name']}")

        # --- Memberships ---
        if created_groups and users:
            group = created_groups[0]
            # First user = admin
            if not GroupMembership.objects.filter(user=users[0], group=group).exists():
                GroupMembership.objects.create(
                    user=users[0],
                    group=group,
                    role=MembershipRoleChoices.ADMIN,
                    is_active=True,
                )
            # Other users = members
            for user in users[1:3]:
                if not GroupMembership.objects.filter(user=user, group=group).exists():
                    GroupMembership.objects.create(
                        user=user,
                        group=group,
                        role=MembershipRoleChoices.MEMBER,
                        is_active=True,
                    )

        self.stdout.write(self.style.SUCCESS(f"  Groups total: {UserGroup.objects.count()}"))

    # ------------------------------------------------------------------
    # Packing Lists
    # ------------------------------------------------------------------

    def _seed_packing(self, users: list):
        self.stdout.write("Seeding packing lists...")

        from packinglist.models import PackingCategory, PackingItem, PackingList

        lists_data = [
            {
                "title": "Sommerlager Packliste",
                "description": "Alles was du für das Sommerlager brauchst",
                "categories": [
                    {
                        "name": "Kleidung",
                        "items": [
                            ("Regenjacke", "1", "Wasserdicht!"),
                            ("T-Shirts", "5", ""),
                            ("Lange Hose", "2", "Für abends und zum Wandern"),
                            ("Kurze Hose", "3", ""),
                            ("Pullover/Fleece", "2", "Für kühle Abende"),
                            ("Unterwäsche", "7", ""),
                            ("Socken", "7 Paar", "Plus 2 Paar Wandersocken"),
                            ("Schlafanzug", "1", ""),
                        ],
                    },
                    {
                        "name": "Ausrüstung",
                        "items": [
                            ("Schlafsack", "1", "Komforttemperatur beachten"),
                            ("Isomatte", "1", ""),
                            ("Taschenlampe", "1", "Mit Ersatzbatterien"),
                            ("Taschenmesser", "1", ""),
                            ("Trinkflasche", "1", "Min. 1 Liter"),
                            ("Teller + Besteck", "1 Set", "Campinggeschirr"),
                        ],
                    },
                    {
                        "name": "Hygiene",
                        "items": [
                            ("Zahnbürste + Zahnpasta", "1", ""),
                            ("Duschgel/Seife", "1", "Biologisch abbaubar"),
                            ("Handtuch", "2", "1 groß, 1 klein"),
                            ("Sonnencreme", "1", "LSF 30+"),
                            ("Mückenspray", "1", ""),
                        ],
                    },
                ],
            },
            {
                "title": "Hajk Packliste",
                "description": "Minimale Ausrüstung für eine 2-Tages-Wanderung",
                "categories": [
                    {
                        "name": "Rucksack",
                        "items": [
                            ("Rucksack", "1", "40-60 Liter"),
                            ("Regenhülle", "1", "Für den Rucksack"),
                            ("Müllbeutel", "3", "Für Schmutzwäsche und Müll"),
                        ],
                    },
                    {
                        "name": "Navigation",
                        "items": [
                            ("Karte", "1", "Topographische Karte 1:25000"),
                            ("Kompass", "1", ""),
                            ("Stift + Notizbuch", "1", ""),
                        ],
                    },
                    {
                        "name": "Verpflegung",
                        "items": [
                            ("Wasser", "2 Liter", "Trinkflasche + Reserve"),
                            ("Müsliriegel", "5", "Für unterwegs"),
                            ("Brot + Aufschnitt", "1", "Für Mittagspause"),
                        ],
                    },
                ],
            },
        ]

        for i, list_data in enumerate(lists_data):
            if PackingList.objects.filter(title=list_data["title"]).exists():
                self.stdout.write(f"  PackingList '{list_data['title']}' already exists, skipping.")
                continue

            packing_list = PackingList.objects.create(
                title=list_data["title"],
                description=list_data["description"],
                owner=self._pick_user(users, i),
            )
            self.stdout.write(f"  + PackingList: {list_data['title']}")

            for cat_order, cat_data in enumerate(list_data["categories"]):
                category = PackingCategory.objects.create(
                    packing_list=packing_list,
                    name=cat_data["name"],
                    sort_order=cat_order,
                )
                for item_order, (name, qty, desc) in enumerate(cat_data["items"]):
                    PackingItem.objects.create(
                        category=category,
                        name=name,
                        quantity=qty,
                        description=desc,
                        sort_order=item_order,
                    )

        self.stdout.write(self.style.SUCCESS(f"  PackingLists total: {PackingList.objects.count()}"))
