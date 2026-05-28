"""
Management command to seed the local development database with realistic test data.

This command creates dynamic test data across all apps using the factory functions
defined in each app's tests/__init__.py. It is idempotent — running it multiple times
will add more data (it does NOT deduplicate).

Static master data (Tags, ScoutLevels, MeasuringUnits, etc.) should be loaded
separately via `loaddata initial_data.json`.

Usage:
    uv run python manage.py seed_all                # seed everything
    uv run python manage.py seed_all --only content  # seed only content (sessions, blogs, games, materials)
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

SECTIONS = ["content", "recipes", "events", "planner", "profiles", "packing"]


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

            if only in (None, "content"):
                self._seed_content(users)
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
    # Content (GroupSession, Blog, Game, Material, Ingredients)
    # ------------------------------------------------------------------

    def _seed_content(self, users: list):
        self.stdout.write("Seeding content (sessions, blogs, games, materials, ingredients)...")

        from content.choices import ContentStatus, CostsRatingChoices, DifficultyChoices, ExecutionTimeChoices
        from content.models import ContentComment, ContentEmotion, FeaturedContent, Tag
        from session.models import GroupSession
        from blog.models import Blog
        from game.models import Game
        from supply.models import ContentMaterialItem, Ingredient, Material, MeasuringUnit, Portion
        from django.contrib.contenttypes.models import ContentType

        # --- GroupSessions ---
        session_data = [
            {
                "title": "Schnitzeljagd im Wald",
                "summary": "Eine spannende Schnitzeljagd durch den Wald mit Rätseln und Aufgaben",
                "description": "## Vorbereitung\n\nVerstecke vorab Hinweise an markanten Stellen im Wald.\n\n## Ablauf\n\n1. Teams bilden (3-5 Personen)\n2. Erste Hinweiskarte verteilen\n3. Teams folgen den Hinweisen\n4. Am Ziel wartet eine kleine Belohnung\n\n## Tipps\n\n- GPS-Koordinaten für ältere Gruppen verwenden\n- Schwierigkeitsgrad an die Altersgruppe anpassen",
                "difficulty": DifficultyChoices.MEDIUM,
                "execution_time": ExecutionTimeChoices.BETWEEN_60_90,
                "costs_rating": CostsRatingChoices.LESS_1,
                "status": ContentStatus.APPROVED,
                "session_type": "exploration",
                "location_type": "outdoor",
            },
            {
                "title": "Knotenkunde für Anfänger",
                "summary": "Die wichtigsten Knoten lernen und üben",
                "description": "## Knoten\n\n1. **Kreuzknoten** – zum Verbinden gleicher Seile\n2. **Palstek** – feste Schlaufe\n3. **Mastwurf** – Seil am Mast befestigen\n4. **Zimmermannsknoten** – Balken sichern\n\n## Methodik\n\nJeder Teilnehmer bekommt ein Seilstück und übt jeden Knoten mindestens 5 Mal.",
                "difficulty": DifficultyChoices.EASY,
                "execution_time": ExecutionTimeChoices.LESS_30,
                "costs_rating": CostsRatingChoices.FREE,
                "status": ContentStatus.APPROVED,
                "session_type": "scout_skills",
                "location_type": "both",
            },
            {
                "title": "Nachtwanderung mit Sternenbeobachtung",
                "summary": "Natur bei Nacht erleben und Sternbilder kennenlernen",
                "description": "## Planung\n\n- Route vorab abgehen (Sicherheit!)\n- Wetter prüfen (klarer Himmel nötig)\n- Taschenlampen und Stirnlampen einpacken\n\n## Programm\n\n1. Kurze Einführung zu Sternbildern\n2. Wanderung mit Stille-Phase\n3. Beobachtungsstation mit Fernglas\n4. Abschlussrunde am Lagerfeuer",
                "difficulty": DifficultyChoices.MEDIUM,
                "execution_time": ExecutionTimeChoices.MORE_90,
                "costs_rating": CostsRatingChoices.FREE,
                "status": ContentStatus.APPROVED,
                "session_type": "nature_study",
                "location_type": "outdoor",
            },
            {
                "title": "Feuer machen ohne Streichhölzer",
                "summary": "Verschiedene Methoden, um Feuer ohne moderne Hilfsmittel zu entzünden",
                "description": "## Methoden\n\n### Feuerbohren\nEin Stück weiches Holz und ein härterer Stab...\n\n### Feuerstein\nMit Feuerstein und Feuerstahl...\n\n### Lupe\nBei Sonnenschein kann eine Lupe oder ein Brillenglas...",
                "difficulty": DifficultyChoices.HARD,
                "execution_time": ExecutionTimeChoices.BETWEEN_30_60,
                "costs_rating": CostsRatingChoices.LESS_1,
                "status": ContentStatus.APPROVED,
                "session_type": "scout_skills",
                "location_type": "outdoor",
            },
            {
                "title": "Entwurf: Orientierung mit Karte und Kompass",
                "summary": "Grundlagen der Navigation mit Karte und Kompass",
                "description": "## Inhalte\n\n- Karte lesen (Legende, Maßstab, Höhenlinien)\n- Kompass einnorden\n- Marschzahl bestimmen\n- Peilen und Rückwärtseinschneiden",
                "difficulty": DifficultyChoices.HARD,
                "execution_time": ExecutionTimeChoices.BETWEEN_60_90,
                "costs_rating": CostsRatingChoices.BETWEEN_1_2,
                "status": ContentStatus.DRAFT,
                "session_type": "navigation",
                "location_type": "outdoor",
            },
        ]

        created_sessions = []
        for i, data in enumerate(session_data):
            if GroupSession.objects.filter(title=data["title"]).exists():
                self.stdout.write(f"  GroupSession '{data['title']}' already exists, skipping.")
                created_sessions.append(GroupSession.objects.get(title=data["title"]))
                continue
            gs = GroupSession.objects.create(**data)
            gs.authors.add(self._pick_user(users, i))
            tags = Tag.objects.filter(parent__isnull=False)[:3]
            if tags:
                gs.tags.set(tags)
            created_sessions.append(gs)
            self.stdout.write(f"  + GroupSession: {data['title']}")

        # --- Blogs ---
        blog_data = [
            {
                "title": "Erste-Hilfe-Wissen: Stabile Seitenlage",
                "summary": "Wissensartikel zur stabilen Seitenlage mit Schritt-für-Schritt-Anleitung",
                "description": "## Warum die stabile Seitenlage?\n\nDie stabile Seitenlage verhindert, dass eine bewusstlose Person an Erbrochenem oder der eigenen Zunge erstickt.\n\n## Schritt-für-Schritt\n\n1. Bewusstlosigkeit feststellen\n2. Notruf absetzen (112)\n3. Arm der Person anwinkeln\n4. Gegenüberliegendes Bein aufstellen\n5. Person zu sich rollen\n6. Kopf überstrecken\n7. Mund leicht öffnen\n\n## Häufige Fehler\n\n- Kopf nicht überstreckt → Atemwege blockiert\n- Person auf dem Rücken gelassen\n- Notruf vergessen",
                "difficulty": DifficultyChoices.EASY,
                "status": ContentStatus.APPROVED,
                "blog_type": "guide",
                "show_table_of_contents": True,
            },
            {
                "title": "Gruppenstunden-Methodik: Wie halte ich eine gute Gruppenstunde?",
                "summary": "Tipps und Tricks für erfolgreiche Gruppenstunden-Gestaltung",
                "description": "## Die 5 Phasen einer Gruppenstunde\n\n1. **Ankommen** (5-10 Min)\n2. **Einstieg** – Spiel oder Ritual\n3. **Hauptteil** – Thematische Aktivität\n4. **Reflexion** – Abschlussrunde\n5. **Verabschiedung**\n\n## Methodik-Tipps\n\n- Abwechslung zwischen aktiv und ruhig\n- Altersgerechte Ansprache\n- Immer einen Plan B haben",
                "difficulty": DifficultyChoices.MEDIUM,
                "status": ContentStatus.APPROVED,
                "blog_type": "methodology",
                "show_table_of_contents": True,
            },
        ]

        for i, data in enumerate(blog_data):
            if Blog.objects.filter(title=data["title"]).exists():
                self.stdout.write(f"  Blog '{data['title']}' already exists, skipping.")
                continue
            blog = Blog.objects.create(**data)
            blog.authors.add(self._pick_user(users, i))
            self.stdout.write(f"  + Blog: {data['title']}")

        # --- Games ---
        game_data = [
            {
                "title": "Capture the Flag",
                "summary": "Das klassische Geländespiel für große Gruppen",
                "description": "## Regeln\n\n- Zwei Teams\n- Jedes Team hat eine Flagge in seiner Basis\n- Ziel: die gegnerische Flagge erobern\n- Wer im gegnerischen Gebiet gefangen wird, muss ins 'Gefängnis'\n\n## Vorbereitung\n\n- Spielfeld markieren\n- Grenzen festlegen\n- Flaggen basteln (Stöcke + Tücher)",
                "rules": "1. Zwei gleich große Teams bilden\n2. Jedes Team versteckt eine Flagge in seiner Hälfte\n3. Ziel: gegnerische Flagge in eigene Basis bringen\n4. In gegnerischer Hälfte kann man gefangen werden\n5. Gefangene kommen ins Gefängnis (können befreit werden)",
                "difficulty": DifficultyChoices.MEDIUM,
                "execution_time": ExecutionTimeChoices.MORE_90,
                "costs_rating": CostsRatingChoices.FREE,
                "status": ContentStatus.APPROVED,
                "game_type": "field_game",
                "play_area": "field",
                "min_players": 10,
                "max_players": 40,
                "game_duration_minutes": 60,
            },
            {
                "title": "Werwolf",
                "summary": "Das beliebte Rollenspiel-Kartenspiel",
                "description": "## Spielidee\n\nIm Dorf treiben Werwölfe ihr Unwesen. Die Dorfbewohner müssen herausfinden, wer die Werwölfe sind.\n\n## Rollen\n\n- Werwolf, Seherin, Hexe, Jäger, Amor, Dorfbewohner",
                "rules": "Nachtphase: Werwölfe wählen ein Opfer. Tagphase: Diskussion und Abstimmung wer ein Werwolf ist.",
                "difficulty": DifficultyChoices.EASY,
                "execution_time": ExecutionTimeChoices.BETWEEN_30_60,
                "costs_rating": CostsRatingChoices.FREE,
                "status": ContentStatus.APPROVED,
                "game_type": "group_game",
                "play_area": "indoor",
                "min_players": 8,
                "max_players": 25,
                "game_duration_minutes": 30,
            },
            {
                "title": "Schmuggler",
                "summary": "Nachtspiel im Wald – Schmuggler gegen Zöllner",
                "description": "## Ablauf\n\nSchmuggler versuchen, Gegenstände von A nach B zu bringen. Zöllner patrouillieren und versuchen, Schmuggler abzufangen.",
                "rules": "Schmuggler tragen 'Schmuggelware'. Werden sie von Zöllnern angetippt, müssen sie ihre Ware abgeben.",
                "difficulty": DifficultyChoices.MEDIUM,
                "execution_time": ExecutionTimeChoices.BETWEEN_60_90,
                "costs_rating": CostsRatingChoices.FREE,
                "status": ContentStatus.APPROVED,
                "game_type": "night_game",
                "play_area": "forest",
                "min_players": 12,
                "max_players": 50,
                "game_duration_minutes": 45,
            },
        ]

        for i, data in enumerate(game_data):
            if Game.objects.filter(title=data["title"]).exists():
                self.stdout.write(f"  Game '{data['title']}' already exists, skipping.")
                continue
            game = Game.objects.create(**data)
            game.authors.add(self._pick_user(users, i))
            self.stdout.write(f"  + Game: {data['title']}")

        # --- Materials ---
        material_data = [
            {"name": "Seil (10m)", "material_category": "outdoor", "is_consumable": False},
            {"name": "Schreibpapier", "material_category": "stationery", "is_consumable": True},
            {"name": "Buntstifte", "material_category": "stationery", "is_consumable": False},
            {"name": "Taschenlampe", "material_category": "outdoor", "is_consumable": False},
            {"name": "Schere", "material_category": "tools", "is_consumable": False},
            {"name": "Klebeband", "material_category": "crafting", "is_consumable": True},
            {"name": "Kompass", "material_category": "outdoor", "is_consumable": False},
            {"name": "Topografische Karte", "material_category": "outdoor", "is_consumable": False},
        ]
        for mat_data in material_data:
            name = mat_data.pop("name")
            mat, created = Material.objects.get_or_create(name=name, defaults=mat_data)
            if created:
                self.stdout.write(f"  + Material: {name}")

        # --- ContentMaterialItems for sessions ---
        session_ct = ContentType.objects.get_for_model(GroupSession)
        approved_sessions = [s for s in created_sessions if s.status == ContentStatus.APPROVED]
        materials_for_sessions = [
            ("Schnitzeljagd im Wald", ["Schreibpapier", "Buntstifte"]),
            ("Knotenkunde für Anfänger", ["Seil (10m)"]),
            ("Nachtwanderung mit Sternenbeobachtung", ["Taschenlampe"]),
            ("Feuer machen ohne Streichhölzer", []),
        ]
        for session_title, mat_names in materials_for_sessions:
            gs = GroupSession.objects.filter(title=session_title).first()
            if gs and not ContentMaterialItem.objects.filter(content_type=session_ct, object_id=gs.id).exists():
                for idx, mat_name in enumerate(mat_names):
                    mat = Material.objects.filter(name=mat_name).first()
                    if mat:
                        ContentMaterialItem.objects.create(
                            content_type=session_ct,
                            object_id=gs.id,
                            material=mat,
                            quantity="1",
                            sort_order=idx,
                        )

        # --- Comments on approved sessions ---
        comments_data = [
            ("Super Idee! Haben wir letzten Freitag ausprobiert.", "approved"),
            ("Könnte man auch drinnen machen?", "approved"),
            ("Vorsicht bei nassem Wetter.", "pending"),
        ]
        for i, gs in enumerate(approved_sessions[:3]):
            text, status = comments_data[i % len(comments_data)]
            if not ContentComment.objects.filter(content_type=session_ct, object_id=gs.id, text=text).exists():
                ContentComment.objects.create(
                    content_type=session_ct,
                    object_id=gs.id,
                    text=text,
                    status=status,
                    author_name=f"Pfadfinder{i + 1}",
                    user=self._pick_user(users, i) if status == "approved" else None,
                )

        # --- Emotions on sessions ---
        from content.choices import EmotionType

        emotion_types = [EmotionType.IN_LOVE, EmotionType.HAPPY, EmotionType.HAPPY]
        for i, gs in enumerate(approved_sessions[:3]):
            if not ContentEmotion.objects.filter(content_type=session_ct, object_id=gs.id).exists():
                ContentEmotion.objects.create(
                    content_type=session_ct,
                    object_id=gs.id,
                    emotion_type=emotion_types[i % len(emotion_types)],
                    session_key=f"seed-session-{i}",
                )

        # --- Featured Content ---
        if approved_sessions and not FeaturedContent.objects.exists():
            FeaturedContent.objects.create(
                content_type=session_ct,
                object_id=approved_sessions[0].id,
                featured_from=datetime.date.today(),
                featured_until=datetime.date.today() + datetime.timedelta(days=7),
                reason="Unsere Empfehlung für diese Woche!",
                created_by=self._pick_user(users, 0),
            )

        # --- RetailSections ---
        from supply.models import NutritionalTag, RetailSection

        retail_sections_data = [
            {"name": "Obst & Gemüse", "description": "Frisches Obst und Gemüse", "rank": 1},
            {"name": "Milchprodukte", "description": "Milch, Käse, Joghurt, Butter", "rank": 2},
            {"name": "Fleisch & Wurst", "description": "Frisches Fleisch und Wurstwaren", "rank": 3},
            {"name": "Backwaren", "description": "Brot, Brötchen, Kuchen", "rank": 4},
            {"name": "Getreide & Teigwaren", "description": "Mehl, Nudeln, Reis, Haferflocken", "rank": 5},
            {"name": "Gewürze & Öle", "description": "Gewürze, Kräuter, Speiseöle", "rank": 6},
            {"name": "Getränke", "description": "Wasser, Säfte, Tee", "rank": 7},
            {"name": "Tiefkühl", "description": "Tiefgekühlte Lebensmittel", "rank": 8},
            {"name": "Konserven", "description": "Dosenware, eingelegtes Gemüse", "rank": 9},
            {"name": "Süßwaren & Snacks", "description": "Schokolade, Kekse, Chips", "rank": 10},
            {"name": "Grundnahrungsmittel", "description": "Zucker, Salz, Hefe, Backpulver", "rank": 11},
            {"name": "Hülsenfrüchte & Nüsse", "description": "Linsen, Bohnen, Mandeln, Walnüsse", "rank": 12},
        ]

        retail_section_map = {}
        for rs_data in retail_sections_data:
            rs, created = RetailSection.objects.get_or_create(name=rs_data["name"], defaults=rs_data)
            retail_section_map[rs_data["name"]] = rs
            if created:
                self.stdout.write(f"  + RetailSection: {rs_data['name']}")

        # --- NutritionalTags ---
        nutritional_tags_data = [
            {
                "name": "vegan",
                "name_opposite": "nicht vegan",
                "description": "Enthält keine tierischen Produkte",
                "rank": 1,
                "is_dangerous": False,
            },
            {
                "name": "vegetarisch",
                "name_opposite": "nicht vegetarisch",
                "description": "Enthält kein Fleisch oder Fisch",
                "rank": 2,
                "is_dangerous": False,
            },
            {
                "name": "laktosefrei",
                "name_opposite": "enthält Laktose",
                "description": "Enthält keine Laktose",
                "rank": 3,
                "is_dangerous": True,
            },
            {
                "name": "glutenfrei",
                "name_opposite": "enthält Gluten",
                "description": "Enthält kein Gluten",
                "rank": 4,
                "is_dangerous": True,
            },
            {
                "name": "nussfrei",
                "name_opposite": "enthält Nüsse",
                "description": "Enthält keine Nüsse",
                "rank": 5,
                "is_dangerous": True,
            },
            {
                "name": "eifrei",
                "name_opposite": "enthält Ei",
                "description": "Enthält kein Hühnerei",
                "rank": 6,
                "is_dangerous": True,
            },
            {
                "name": "sojafrei",
                "name_opposite": "enthält Soja",
                "description": "Enthält kein Soja",
                "rank": 7,
                "is_dangerous": True,
            },
        ]

        nutritional_tag_map = {}
        for nt_data in nutritional_tags_data:
            nt, created = NutritionalTag.objects.get_or_create(name=nt_data["name"], defaults=nt_data)
            nutritional_tag_map[nt_data["name"]] = nt
            if created:
                self.stdout.write(f"  + NutritionalTag: {nt_data['name']}")

        # --- Ingredients & Portions & Prices (for the ingredient database) ---
        # All nutritional values per 100g, prices per kg (EUR, German supermarket avg 2024/2025)
        ingredients_data = [
            {
                "name": "Mehl",
                "description": "Weizenmehl Typ 405",
                "physical_density": 0.6,
                "energy_kj": 1440.0,
                "protein_g": 10.0,
                "fat_g": 1.0,
                "fat_sat_g": 0.2,
                "carbohydrate_g": 72.0,
                "sugar_g": 0.7,
                "fibre_g": 3.0,
                "salt_g": 0.01,
                "price_per_kg": Decimal("0.89"),
                "retail_section": "Getreide & Teigwaren",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Butter",
                "description": "Deutsche Markenbutter",
                "physical_density": 0.9,
                "energy_kj": 3054.0,
                "protein_g": 0.7,
                "fat_g": 82.0,
                "fat_sat_g": 50.0,
                "carbohydrate_g": 0.6,
                "sugar_g": 0.6,
                "fibre_g": 0.0,
                "salt_g": 0.04,
                "price_per_kg": Decimal("7.96"),
                "retail_section": "Milchprodukte",
                "tags": ["vegetarisch", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Milch",
                "description": "Vollmilch 3,5%",
                "physical_density": 1.03,
                "energy_kj": 272.0,
                "protein_g": 3.4,
                "fat_g": 3.5,
                "fat_sat_g": 2.1,
                "carbohydrate_g": 4.8,
                "sugar_g": 4.8,
                "fibre_g": 0.0,
                "salt_g": 0.11,
                "price_per_kg": Decimal("1.09"),
                "retail_section": "Milchprodukte",
                "tags": ["vegetarisch", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Reis",
                "description": "Langkornreis, parboiled",
                "physical_density": 0.85,
                "energy_kj": 1506.0,
                "protein_g": 7.0,
                "fat_g": 0.6,
                "fat_sat_g": 0.2,
                "carbohydrate_g": 78.0,
                "sugar_g": 0.2,
                "fibre_g": 1.4,
                "salt_g": 0.01,
                "price_per_kg": Decimal("1.98"),
                "retail_section": "Getreide & Teigwaren",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Eier",
                "description": "Hühnereier, Größe M",
                "physical_density": 1.03,
                "energy_kj": 596.0,
                "protein_g": 12.6,
                "fat_g": 10.6,
                "fat_sat_g": 3.3,
                "carbohydrate_g": 0.3,
                "sugar_g": 0.3,
                "fibre_g": 0.0,
                "salt_g": 0.37,
                "price_per_kg": Decimal("3.45"),
                "retail_section": "Milchprodukte",
                "tags": ["vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "sojafrei"],
            },
            {
                "name": "Nudeln",
                "description": "Spaghetti, Hartweizen",
                "physical_density": 0.5,
                "energy_kj": 1507.0,
                "protein_g": 12.5,
                "fat_g": 1.8,
                "fat_sat_g": 0.3,
                "carbohydrate_g": 70.0,
                "sugar_g": 3.2,
                "fibre_g": 3.0,
                "salt_g": 0.01,
                "price_per_kg": Decimal("1.38"),
                "retail_section": "Getreide & Teigwaren",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "nussfrei", "sojafrei"],
            },
            {
                "name": "Tomaten (Dose)",
                "description": "Geschälte Tomaten in der Dose",
                "physical_density": 1.05,
                "energy_kj": 75.0,
                "protein_g": 1.2,
                "fat_g": 0.1,
                "fat_sat_g": 0.0,
                "carbohydrate_g": 3.0,
                "sugar_g": 2.7,
                "fibre_g": 1.0,
                "salt_g": 0.05,
                "price_per_kg": Decimal("1.73"),
                "retail_section": "Konserven",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Zwiebeln",
                "description": "Speisezwiebeln",
                "physical_density": 0.95,
                "energy_kj": 113.0,
                "protein_g": 1.3,
                "fat_g": 0.3,
                "fat_sat_g": 0.0,
                "carbohydrate_g": 5.0,
                "sugar_g": 4.2,
                "fibre_g": 1.4,
                "salt_g": 0.01,
                "price_per_kg": Decimal("1.49"),
                "retail_section": "Obst & Gemüse",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Knoblauch",
                "description": "Frischer Knoblauch",
                "physical_density": 0.8,
                "energy_kj": 590.0,
                "protein_g": 6.4,
                "fat_g": 0.5,
                "fat_sat_g": 0.1,
                "carbohydrate_g": 28.0,
                "sugar_g": 1.0,
                "fibre_g": 2.1,
                "salt_g": 0.02,
                "price_per_kg": Decimal("7.90"),
                "retail_section": "Obst & Gemüse",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Olivenöl",
                "description": "Natives Olivenöl extra",
                "physical_density": 0.92,
                "energy_kj": 3700.0,
                "protein_g": 0.0,
                "fat_g": 100.0,
                "fat_sat_g": 14.0,
                "carbohydrate_g": 0.0,
                "sugar_g": 0.0,
                "fibre_g": 0.0,
                "salt_g": 0.0,
                "price_per_kg": Decimal("7.98"),
                "retail_section": "Gewürze & Öle",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Kartoffeln",
                "description": "Festkochende Kartoffeln",
                "physical_density": 1.1,
                "energy_kj": 297.0,
                "protein_g": 2.0,
                "fat_g": 0.1,
                "fat_sat_g": 0.0,
                "carbohydrate_g": 15.0,
                "sugar_g": 0.8,
                "fibre_g": 2.1,
                "salt_g": 0.01,
                "price_per_kg": Decimal("1.29"),
                "retail_section": "Obst & Gemüse",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Käse (Gouda)",
                "description": "Gouda jung, 48% F.i.Tr.",
                "physical_density": 1.0,
                "energy_kj": 1500.0,
                "protein_g": 24.0,
                "fat_g": 27.0,
                "fat_sat_g": 17.0,
                "carbohydrate_g": 0.0,
                "sugar_g": 0.0,
                "fibre_g": 0.0,
                "salt_g": 2.0,
                "price_per_kg": Decimal("8.90"),
                "retail_section": "Milchprodukte",
                "tags": ["vegetarisch", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Haferflocken",
                "description": "Zarte Haferflocken",
                "physical_density": 0.4,
                "energy_kj": 1540.0,
                "protein_g": 13.5,
                "fat_g": 7.0,
                "fat_sat_g": 1.3,
                "carbohydrate_g": 58.7,
                "sugar_g": 1.0,
                "fibre_g": 10.0,
                "salt_g": 0.01,
                "price_per_kg": Decimal("1.78"),
                "retail_section": "Getreide & Teigwaren",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Zucker",
                "description": "Weißer Haushaltszucker",
                "physical_density": 0.85,
                "energy_kj": 1700.0,
                "protein_g": 0.0,
                "fat_g": 0.0,
                "fat_sat_g": 0.0,
                "carbohydrate_g": 100.0,
                "sugar_g": 100.0,
                "fibre_g": 0.0,
                "salt_g": 0.0,
                "price_per_kg": Decimal("1.15"),
                "retail_section": "Grundnahrungsmittel",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Salz",
                "description": "Jodsalz",
                "physical_density": 1.2,
                "energy_kj": 0.0,
                "protein_g": 0.0,
                "fat_g": 0.0,
                "fat_sat_g": 0.0,
                "carbohydrate_g": 0.0,
                "sugar_g": 0.0,
                "fibre_g": 0.0,
                "salt_g": 100.0,
                "price_per_kg": Decimal("0.49"),
                "retail_section": "Grundnahrungsmittel",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Paprika",
                "description": "Rote Paprika",
                "physical_density": 0.5,
                "energy_kj": 109.0,
                "protein_g": 1.0,
                "fat_g": 0.3,
                "fat_sat_g": 0.0,
                "carbohydrate_g": 4.2,
                "sugar_g": 4.2,
                "fibre_g": 1.7,
                "salt_g": 0.0,
                "price_per_kg": Decimal("3.99"),
                "retail_section": "Obst & Gemüse",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Brot (Vollkorn)",
                "description": "Vollkornbrot, geschnitten",
                "physical_density": 0.6,
                "energy_kj": 880.0,
                "protein_g": 8.0,
                "fat_g": 1.2,
                "fat_sat_g": 0.2,
                "carbohydrate_g": 40.0,
                "sugar_g": 3.5,
                "fibre_g": 7.0,
                "salt_g": 1.2,
                "price_per_kg": Decimal("2.78"),
                "retail_section": "Backwaren",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Äpfel",
                "description": "Frische Äpfel",
                "physical_density": 0.9,
                "energy_kj": 218.0,
                "protein_g": 0.3,
                "fat_g": 0.2,
                "fat_sat_g": 0.0,
                "carbohydrate_g": 11.4,
                "sugar_g": 10.3,
                "fibre_g": 2.4,
                "salt_g": 0.0,
                "fruit_factor": 1.0,
                "price_per_kg": Decimal("2.49"),
                "retail_section": "Obst & Gemüse",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Honig",
                "description": "Blütenhonig",
                "physical_density": 1.4,
                "energy_kj": 1360.0,
                "protein_g": 0.4,
                "fat_g": 0.0,
                "fat_sat_g": 0.0,
                "carbohydrate_g": 82.0,
                "sugar_g": 82.0,
                "fibre_g": 0.0,
                "salt_g": 0.01,
                "price_per_kg": Decimal("9.90"),
                "retail_section": "Grundnahrungsmittel",
                "tags": ["vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Joghurt (Natur)",
                "description": "Naturjoghurt 3,5%",
                "physical_density": 1.03,
                "energy_kj": 260.0,
                "protein_g": 4.0,
                "fat_g": 3.5,
                "fat_sat_g": 2.3,
                "carbohydrate_g": 4.7,
                "sugar_g": 4.7,
                "fibre_g": 0.0,
                "salt_g": 0.13,
                "price_per_kg": Decimal("1.58"),
                "retail_section": "Milchprodukte",
                "tags": ["vegetarisch", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            # --- 30 additional ingredients ---
            {
                "name": "Möhren",
                "description": "Frische Karotten",
                "physical_density": 1.0,
                "energy_kj": 109.0,
                "protein_g": 0.9,
                "fat_g": 0.2,
                "fat_sat_g": 0.0,
                "carbohydrate_g": 4.8,
                "sugar_g": 4.7,
                "fibre_g": 3.6,
                "salt_g": 0.08,
                "fruit_factor": 0.0,
                "price_per_kg": Decimal("1.29"),
                "retail_section": "Obst & Gemüse",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Zucchini",
                "description": "Grüne Zucchini",
                "physical_density": 1.0,
                "energy_kj": 67.0,
                "protein_g": 1.2,
                "fat_g": 0.3,
                "fat_sat_g": 0.1,
                "carbohydrate_g": 2.0,
                "sugar_g": 1.7,
                "fibre_g": 1.0,
                "salt_g": 0.01,
                "price_per_kg": Decimal("2.49"),
                "retail_section": "Obst & Gemüse",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Bananen",
                "description": "Frische Bananen",
                "physical_density": 1.0,
                "energy_kj": 371.0,
                "protein_g": 1.1,
                "fat_g": 0.3,
                "fat_sat_g": 0.1,
                "carbohydrate_g": 20.0,
                "sugar_g": 17.0,
                "fibre_g": 2.6,
                "salt_g": 0.0,
                "fruit_factor": 1.0,
                "price_per_kg": Decimal("1.49"),
                "retail_section": "Obst & Gemüse",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Gurke",
                "description": "Salatgurke",
                "physical_density": 1.0,
                "energy_kj": 50.0,
                "protein_g": 0.7,
                "fat_g": 0.1,
                "fat_sat_g": 0.0,
                "carbohydrate_g": 1.8,
                "sugar_g": 1.7,
                "fibre_g": 0.7,
                "salt_g": 0.01,
                "price_per_kg": Decimal("1.59"),
                "retail_section": "Obst & Gemüse",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Sahne",
                "description": "Schlagsahne 30%",
                "physical_density": 1.0,
                "energy_kj": 1230.0,
                "protein_g": 2.4,
                "fat_g": 30.0,
                "fat_sat_g": 19.0,
                "carbohydrate_g": 3.4,
                "sugar_g": 3.4,
                "fibre_g": 0.0,
                "salt_g": 0.07,
                "price_per_kg": Decimal("3.98"),
                "retail_section": "Milchprodukte",
                "tags": ["vegetarisch", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Frischkäse",
                "description": "Frischkäse Doppelrahmstufe",
                "physical_density": 1.0,
                "energy_kj": 1040.0,
                "protein_g": 6.0,
                "fat_g": 24.0,
                "fat_sat_g": 15.0,
                "carbohydrate_g": 3.0,
                "sugar_g": 3.0,
                "fibre_g": 0.0,
                "salt_g": 0.7,
                "price_per_kg": Decimal("4.95"),
                "retail_section": "Milchprodukte",
                "tags": ["vegetarisch", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Hackfleisch (gemischt)",
                "description": "Rind- und Schweinehack",
                "physical_density": 1.0,
                "energy_kj": 980.0,
                "protein_g": 17.0,
                "fat_g": 20.0,
                "fat_sat_g": 8.0,
                "carbohydrate_g": 0.0,
                "sugar_g": 0.0,
                "fibre_g": 0.0,
                "salt_g": 0.7,
                "price_per_kg": Decimal("7.99"),
                "retail_section": "Fleisch & Wurst",
                "tags": ["laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Hähnchenbrust",
                "description": "Hähnchenbrustfilet",
                "physical_density": 1.0,
                "energy_kj": 460.0,
                "protein_g": 23.0,
                "fat_g": 1.2,
                "fat_sat_g": 0.3,
                "carbohydrate_g": 0.0,
                "sugar_g": 0.0,
                "fibre_g": 0.0,
                "salt_g": 0.13,
                "price_per_kg": Decimal("9.99"),
                "retail_section": "Fleisch & Wurst",
                "tags": ["laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Würstchen",
                "description": "Wiener Würstchen",
                "physical_density": 1.0,
                "energy_kj": 1100.0,
                "protein_g": 12.0,
                "fat_g": 25.0,
                "fat_sat_g": 10.0,
                "carbohydrate_g": 1.0,
                "sugar_g": 0.5,
                "fibre_g": 0.0,
                "salt_g": 1.8,
                "price_per_kg": Decimal("5.49"),
                "retail_section": "Fleisch & Wurst",
                "tags": ["laktosefrei", "nussfrei", "sojafrei"],
            },
            {
                "name": "Linsen (rot)",
                "description": "Rote Linsen, getrocknet",
                "physical_density": 0.8,
                "energy_kj": 1380.0,
                "protein_g": 24.0,
                "fat_g": 1.5,
                "fat_sat_g": 0.2,
                "carbohydrate_g": 50.0,
                "sugar_g": 1.8,
                "fibre_g": 11.0,
                "salt_g": 0.02,
                "price_per_kg": Decimal("3.58"),
                "retail_section": "Hülsenfrüchte & Nüsse",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Kidneybohnen (Dose)",
                "description": "Rote Kidneybohnen in der Dose",
                "physical_density": 1.0,
                "energy_kj": 430.0,
                "protein_g": 8.0,
                "fat_g": 0.5,
                "fat_sat_g": 0.1,
                "carbohydrate_g": 14.0,
                "sugar_g": 0.5,
                "fibre_g": 6.0,
                "salt_g": 0.6,
                "price_per_kg": Decimal("2.38"),
                "retail_section": "Konserven",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Kokosmilch",
                "description": "Kokosmilch, Dose",
                "physical_density": 1.0,
                "energy_kj": 750.0,
                "protein_g": 1.6,
                "fat_g": 17.0,
                "fat_sat_g": 15.0,
                "carbohydrate_g": 2.7,
                "sugar_g": 2.0,
                "fibre_g": 0.0,
                "salt_g": 0.03,
                "price_per_kg": Decimal("3.48"),
                "retail_section": "Konserven",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Mais (Dose)",
                "description": "Zuckermais in der Dose",
                "physical_density": 1.0,
                "energy_kj": 350.0,
                "protein_g": 2.7,
                "fat_g": 1.2,
                "fat_sat_g": 0.2,
                "carbohydrate_g": 14.0,
                "sugar_g": 7.0,
                "fibre_g": 2.0,
                "salt_g": 0.4,
                "price_per_kg": Decimal("2.49"),
                "retail_section": "Konserven",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Sonnenblumenöl",
                "description": "Raffiniertes Sonnenblumenöl",
                "physical_density": 0.92,
                "energy_kj": 3700.0,
                "protein_g": 0.0,
                "fat_g": 100.0,
                "fat_sat_g": 11.0,
                "carbohydrate_g": 0.0,
                "sugar_g": 0.0,
                "fibre_g": 0.0,
                "salt_g": 0.0,
                "price_per_kg": Decimal("2.29"),
                "retail_section": "Gewürze & Öle",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Tomatenmark",
                "description": "Dreifach konzentriertes Tomatenmark",
                "physical_density": 1.1,
                "energy_kj": 380.0,
                "protein_g": 5.0,
                "fat_g": 0.5,
                "fat_sat_g": 0.1,
                "carbohydrate_g": 15.0,
                "sugar_g": 12.0,
                "fibre_g": 4.0,
                "salt_g": 1.5,
                "price_per_kg": Decimal("5.53"),
                "retail_section": "Konserven",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Pfeffer",
                "description": "Schwarzer Pfeffer, gemahlen",
                "physical_density": 0.5,
                "energy_kj": 1060.0,
                "protein_g": 10.0,
                "fat_g": 3.3,
                "fat_sat_g": 1.4,
                "carbohydrate_g": 44.0,
                "sugar_g": 0.6,
                "fibre_g": 25.0,
                "salt_g": 0.04,
                "price_per_kg": Decimal("19.80"),
                "retail_section": "Gewürze & Öle",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Zimt",
                "description": "Gemahlener Ceylon-Zimt",
                "physical_density": 0.5,
                "energy_kj": 1030.0,
                "protein_g": 4.0,
                "fat_g": 1.2,
                "fat_sat_g": 0.3,
                "carbohydrate_g": 56.0,
                "sugar_g": 2.2,
                "fibre_g": 53.0,
                "salt_g": 0.03,
                "price_per_kg": Decimal("15.80"),
                "retail_section": "Gewürze & Öle",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Hefe (frisch)",
                "description": "Frische Backhefe",
                "physical_density": 1.1,
                "energy_kj": 410.0,
                "protein_g": 11.0,
                "fat_g": 2.0,
                "fat_sat_g": 0.3,
                "carbohydrate_g": 11.0,
                "sugar_g": 0.0,
                "fibre_g": 8.0,
                "salt_g": 0.05,
                "price_per_kg": Decimal("2.33"),
                "retail_section": "Milchprodukte",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Backpulver",
                "description": "Backpulver, Beutel",
                "physical_density": 0.7,
                "energy_kj": 280.0,
                "protein_g": 0.0,
                "fat_g": 0.0,
                "fat_sat_g": 0.0,
                "carbohydrate_g": 18.0,
                "sugar_g": 0.0,
                "fibre_g": 0.0,
                "salt_g": 28.0,
                "price_per_kg": Decimal("6.60"),
                "retail_section": "Grundnahrungsmittel",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Walnüsse",
                "description": "Walnusskerne",
                "physical_density": 0.5,
                "energy_kj": 2738.0,
                "protein_g": 15.0,
                "fat_g": 65.0,
                "fat_sat_g": 6.0,
                "carbohydrate_g": 7.0,
                "sugar_g": 2.6,
                "fibre_g": 6.7,
                "salt_g": 0.01,
                "price_per_kg": Decimal("13.90"),
                "retail_section": "Hülsenfrüchte & Nüsse",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Rosinen",
                "description": "Sultaninen",
                "physical_density": 0.7,
                "energy_kj": 1252.0,
                "protein_g": 2.5,
                "fat_g": 0.5,
                "fat_sat_g": 0.2,
                "carbohydrate_g": 68.0,
                "sugar_g": 59.0,
                "fibre_g": 3.7,
                "salt_g": 0.05,
                "fruit_factor": 1.0,
                "price_per_kg": Decimal("4.98"),
                "retail_section": "Hülsenfrüchte & Nüsse",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Schokolade (Zartbitter)",
                "description": "Zartbitterschokolade, 70% Kakao",
                "physical_density": 1.0,
                "energy_kj": 2280.0,
                "protein_g": 8.0,
                "fat_g": 40.0,
                "fat_sat_g": 24.0,
                "carbohydrate_g": 36.0,
                "sugar_g": 30.0,
                "fibre_g": 10.0,
                "salt_g": 0.02,
                "price_per_kg": Decimal("7.90"),
                "retail_section": "Süßwaren & Snacks",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "nussfrei", "eifrei"],
            },
            {
                "name": "Senf",
                "description": "Mittelscharfer Senf",
                "physical_density": 1.1,
                "energy_kj": 410.0,
                "protein_g": 6.0,
                "fat_g": 5.0,
                "fat_sat_g": 0.3,
                "carbohydrate_g": 10.0,
                "sugar_g": 4.0,
                "fibre_g": 4.0,
                "salt_g": 4.5,
                "price_per_kg": Decimal("3.60"),
                "retail_section": "Gewürze & Öle",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Ketchup",
                "description": "Tomaten-Ketchup",
                "physical_density": 1.1,
                "energy_kj": 440.0,
                "protein_g": 1.5,
                "fat_g": 0.1,
                "fat_sat_g": 0.0,
                "carbohydrate_g": 24.0,
                "sugar_g": 22.0,
                "fibre_g": 0.8,
                "salt_g": 2.5,
                "price_per_kg": Decimal("2.98"),
                "retail_section": "Gewürze & Öle",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Gemüsebrühe",
                "description": "Gemüsebrühe, Pulver",
                "physical_density": 0.5,
                "energy_kj": 620.0,
                "protein_g": 8.0,
                "fat_g": 4.0,
                "fat_sat_g": 2.0,
                "carbohydrate_g": 22.0,
                "sugar_g": 8.0,
                "fibre_g": 0.5,
                "salt_g": 48.0,
                "price_per_kg": Decimal("11.80"),
                "retail_section": "Gewürze & Öle",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "nussfrei", "eifrei"],
            },
            {
                "name": "Sojasauce",
                "description": "Natürlich gebraute Sojasauce",
                "physical_density": 1.1,
                "energy_kj": 230.0,
                "protein_g": 8.0,
                "fat_g": 0.0,
                "fat_sat_g": 0.0,
                "carbohydrate_g": 5.0,
                "sugar_g": 1.0,
                "fibre_g": 0.0,
                "salt_g": 15.0,
                "price_per_kg": Decimal("5.90"),
                "retail_section": "Gewürze & Öle",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "nussfrei", "eifrei"],
            },
            {
                "name": "Zitrone",
                "description": "Frische Bio-Zitronen",
                "physical_density": 1.0,
                "energy_kj": 121.0,
                "protein_g": 0.7,
                "fat_g": 0.3,
                "fat_sat_g": 0.0,
                "carbohydrate_g": 3.2,
                "sugar_g": 2.5,
                "fibre_g": 1.3,
                "salt_g": 0.0,
                "fruit_factor": 1.0,
                "price_per_kg": Decimal("3.98"),
                "retail_section": "Obst & Gemüse",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Tiefkühl-Erbsen",
                "description": "Tiefgefrorene grüne Erbsen",
                "physical_density": 0.8,
                "energy_kj": 300.0,
                "protein_g": 5.0,
                "fat_g": 0.4,
                "fat_sat_g": 0.1,
                "carbohydrate_g": 8.0,
                "sugar_g": 3.0,
                "fibre_g": 5.0,
                "salt_g": 0.01,
                "price_per_kg": Decimal("1.89"),
                "retail_section": "Tiefkühl",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Tortilla-Wraps",
                "description": "Weizen-Tortillas",
                "physical_density": 0.6,
                "energy_kj": 1280.0,
                "protein_g": 8.0,
                "fat_g": 7.0,
                "fat_sat_g": 3.0,
                "carbohydrate_g": 50.0,
                "sugar_g": 3.0,
                "fibre_g": 2.5,
                "salt_g": 1.2,
                "price_per_kg": Decimal("4.50"),
                "retail_section": "Backwaren",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "nussfrei", "eifrei", "sojafrei"],
            },
            {
                "name": "Müsli (Basis)",
                "description": "Basismüsli ohne Zucker",
                "physical_density": 0.4,
                "energy_kj": 1490.0,
                "protein_g": 11.0,
                "fat_g": 6.0,
                "fat_sat_g": 1.0,
                "carbohydrate_g": 60.0,
                "sugar_g": 6.0,
                "fibre_g": 9.0,
                "salt_g": 0.03,
                "price_per_kg": Decimal("3.98"),
                "retail_section": "Getreide & Teigwaren",
                "tags": ["vegan", "vegetarisch", "laktosefrei", "eifrei", "sojafrei"],
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
            "Möhren": [
                ("1 Möhre (mittel)", 1.0, 80.0, "Stück"),
            ],
            "Zucchini": [
                ("1 Zucchini (mittel)", 1.0, 200.0, "Stück"),
            ],
            "Bananen": [
                ("1 Banane", 1.0, 120.0, "Stück"),
            ],
            "Gurke": [
                ("1 Salatgurke", 1.0, 400.0, "Stück"),
            ],
            "Sahne": [
                ("1 Becher Sahne", 1.0, 200.0, "Becher"),
            ],
            "Hackfleisch (gemischt)": [
                ("500g Packung", 1.0, 500.0, "Stück"),
            ],
            "Hähnchenbrust": [
                ("1 Filet", 1.0, 200.0, "Stück"),
            ],
            "Würstchen": [
                ("1 Würstchen", 1.0, 50.0, "Stück"),
            ],
            "Linsen (rot)": [
                ("1 Tasse Linsen", 1.0, 180.0, "Tasse"),
            ],
            "Kidneybohnen (Dose)": [
                ("1 Dose (240g abgetropft)", 1.0, 240.0, "Dose"),
            ],
            "Kokosmilch": [
                ("1 Dose (400ml)", 1.0, 400.0, "Dose"),
            ],
            "Mais (Dose)": [
                ("1 Dose (285g abgetropft)", 1.0, 285.0, "Dose"),
            ],
            "Tomatenmark": [
                ("1 EL Tomatenmark", 1.0, 15.0, "Esslöffel"),
            ],
            "Pfeffer": [
                ("1 Prise Pfeffer", 1.0, 0.3, "Prise"),
            ],
            "Zimt": [
                ("1 TL Zimt", 1.0, 3.0, "Teelöffel"),
            ],
            "Hefe (frisch)": [
                ("1 Würfel Hefe", 1.0, 42.0, "Stück"),
            ],
            "Walnüsse": [
                ("1 EL Walnüsse", 1.0, 10.0, "Esslöffel"),
                ("1 Handvoll", 1.0, 30.0, "Stück"),
            ],
            "Rosinen": [
                ("1 EL Rosinen", 1.0, 15.0, "Esslöffel"),
            ],
            "Schokolade (Zartbitter)": [
                ("1 Tafel (100g)", 1.0, 100.0, "Stück"),
            ],
            "Senf": [
                ("1 TL Senf", 1.0, 5.0, "Teelöffel"),
            ],
            "Ketchup": [
                ("1 EL Ketchup", 1.0, 15.0, "Esslöffel"),
            ],
            "Gemüsebrühe": [
                ("1 TL Brühpulver", 1.0, 5.0, "Teelöffel"),
            ],
            "Sojasauce": [
                ("1 EL Sojasauce", 1.0, 15.0, "Esslöffel"),
            ],
            "Zitrone": [
                ("1 Zitrone", 1.0, 80.0, "Stück"),
                ("Saft von 1 Zitrone", 1.0, 30.0, "Stück"),
            ],
            "Tiefkühl-Erbsen": [
                ("1 Portion TK-Erbsen", 1.0, 100.0, "Portion"),
            ],
            "Tortilla-Wraps": [
                ("1 Wrap", 1.0, 65.0, "Stück"),
            ],
        }

        # MeasuringUnits
        measuring_units_data = [
            ("Gramm", "Gewichtseinheit", 1.0, "g"),
            ("Kilogramm", "1000 Gramm", 1000.0, "g"),
            ("Milliliter", "Volumeneinheit", 1.0, "ml"),
            ("Liter", "1000 Milliliter", 1000.0, "ml"),
            ("Stück", "Einzelnes Stück", 1.0, "g"),
            ("Teelöffel", "ca. 5ml / 5g", 5.0, "g"),
            ("Esslöffel", "ca. 15ml / 10-15g", 10.0, "g"),
            ("Tasse", "ca. 250ml / 125-200g", 150.0, "g"),
            ("Prise", "Kleine Menge", 0.3, "g"),
            ("Dose", "Standarddose 400g", 400.0, "g"),
            ("Becher", "Standardbecher 150-200g", 150.0, "g"),
            ("Scheibe", "Eine Scheibe", 25.0, "g"),
            ("Portion", "Eine Portion", 100.0, "g"),
            ("Glas", "Ein Glas ca. 200ml", 200.0, "ml"),
            ("Bund", "Ein Bund Kräuter", 30.0, "g"),
        ]

        unit_map = {}
        for u_name, u_desc, u_qty, u_unit in measuring_units_data:
            unit, _ = MeasuringUnit.objects.get_or_create(
                name=u_name, defaults={"description": u_desc, "quantity": u_qty, "unit": u_unit}
            )
            unit_map[u_name] = unit

        gram_unit = unit_map["Gramm"]

        liquid_ingredients = {
            "Milch",
            "Olivenöl",
            "Joghurt (Natur)",
            "Sahne",
            "Kokosmilch",
            "Sojasauce",
            "Sonnenblumenöl",
        }

        for ing_data in ingredients_data:
            name = ing_data.pop("name")
            description = ing_data.pop("description")
            retail_section_name = ing_data.pop("retail_section", None)
            tag_names = ing_data.pop("tags", [])

            defaults = {
                "description": description,
                "physical_viscosity": "liquid" if name in liquid_ingredients else "solid",
                "status": "verified",
                **ing_data,
            }
            if retail_section_name and retail_section_name in retail_section_map:
                defaults["retail_section"] = retail_section_map[retail_section_name]

            # Use filter().first() to handle duplicate ingredient names gracefully
            ingredient = Ingredient.objects.filter(name=name).first()
            if ingredient:
                created = False
            else:
                ingredient = Ingredient.objects.create(name=name, **defaults)
                created = True

            if not created:
                # Update existing ingredients with new fields (price, fat_sat_g, retail_section)
                updated = False
                if ingredient.price_per_kg is None and "price_per_kg" in ing_data:
                    ingredient.price_per_kg = ing_data["price_per_kg"]
                    updated = True
                if ingredient.fat_sat_g is None and "fat_sat_g" in ing_data:
                    ingredient.fat_sat_g = ing_data["fat_sat_g"]
                    updated = True
                if (
                    ingredient.retail_section is None
                    and retail_section_name
                    and retail_section_name in retail_section_map
                ):
                    ingredient.retail_section = retail_section_map[retail_section_name]
                    updated = True
                if updated:
                    ingredient.save()
            else:
                self.stdout.write(f"  + Ingredient: {name}")

            # Assign nutritional tags
            if tag_names:
                current_tags = set(ingredient.nutritional_tags.values_list("name", flat=True))
                for t_name in tag_names:
                    if t_name in nutritional_tag_map and t_name not in current_tags:
                        ingredient.nutritional_tags.add(nutritional_tag_map[t_name])

            # Calculate and save nutri-score
            from supply.services.nutri_service import update_ingredient_nutri_score

            try:
                update_ingredient_nutri_score(ingredient)
            except Exception:
                pass

            # Create base 100g portion
            Portion.objects.get_or_create(
                ingredient=ingredient,
                measuring_unit=gram_unit,
                defaults={
                    "name": f"100g {name}",
                    "quantity": 1.0,
                    "weight_g": 100.0,
                    "rank": 1,
                },
            )

            # Create extra portions
            if name in extra_portions:
                for p_name, p_qty, p_weight, unit_name in extra_portions[name]:
                    unit_obj = (
                        unit_map.get(unit_name)
                        or MeasuringUnit.objects.get_or_create(name=unit_name, defaults={"description": unit_name})[0]
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

        self.stdout.write(
            self.style.SUCCESS(
                f"  Content seeded: {GroupSession.objects.count()} sessions, "
                f"{Blog.objects.count()} blogs, {Game.objects.count()} games, "
                f"{Material.objects.count()} materials"
            )
        )

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

        from supply.models import Ingredient, MeasuringUnit, Portion

        # All recipes normalized to servings=1 (one Normportion)
        recipe_data = [
            {
                "title": "Pfannkuchen",
                "summary": "Einfache Pfannkuchen – ein Klassiker für jede Gelegenheit",
                "description": "## Zubereitung\n\n1. Mehl, Eier und Milch verrühren\n2. Teig 10 Minuten ruhen lassen\n3. In heißer Pfanne von beiden Seiten goldbraun backen\n4. Mit Zucker und Zimt oder Nutella servieren",
                "difficulty": DifficultyChoices.EASY,
                "execution_time": ExecutionTimeChoices.LESS_30,
                "recipe_type": RecipeTypeChoices.WARM_MEAL,
                "servings": 1,
                "status": RecipeStatusChoices.APPROVED,
            },
            {
                "title": "Nudeln mit Tomatensoße",
                "summary": "Klassiker der Lagerküche – schnell, günstig und lecker",
                "description": "## Zubereitung\n\n1. Nudeln nach Packungsanweisung kochen\n2. Zwiebeln und Knoblauch anbraten\n3. Tomaten (Dose) hinzufügen und 15 Minuten köcheln\n4. Mit Basilikum, Salz und Pfeffer abschmecken",
                "difficulty": DifficultyChoices.EASY,
                "execution_time": ExecutionTimeChoices.BETWEEN_30_60,
                "recipe_type": RecipeTypeChoices.WARM_MEAL,
                "servings": 1,
                "status": RecipeStatusChoices.APPROVED,
            },
            {
                "title": "Müsli mit frischem Obst",
                "summary": "Gesundes Frühstück für den Lageralltag",
                "description": "## Zubereitung\n\n1. Haferflocken in Schüsseln verteilen\n2. Milch oder Joghurt dazugeben\n3. Frisches Obst schneiden und darüber geben\n4. Optional: Honig, Nüsse, Rosinen",
                "difficulty": DifficultyChoices.EASY,
                "execution_time": ExecutionTimeChoices.LESS_30,
                "recipe_type": RecipeTypeChoices.BREAKFAST,
                "servings": 1,
                "status": RecipeStatusChoices.APPROVED,
            },
            {
                "title": "Stockbrot",
                "summary": "Am Lagerfeuer gebackenes Brot am Stock – der Pfadfinder-Klassiker",
                "description": "## Teig\n\nMehl, lauwarmes Wasser, Trockenhefe, Salz und Öl verkneten.\n\n## Zubereitung\n\n1. Alle Zutaten verkneten\n2. 30 Min gehen lassen\n3. Um Stöcke wickeln\n4. Über dem Feuer backen (ca. 10-15 Min drehen)",
                "difficulty": DifficultyChoices.MEDIUM,
                "execution_time": ExecutionTimeChoices.BETWEEN_60_90,
                "recipe_type": RecipeTypeChoices.SNACK,
                "servings": 1,
                "status": RecipeStatusChoices.APPROVED,
            },
            {
                "title": "Kartoffelsuppe",
                "summary": "Deftige Kartoffelsuppe für kühle Abende am Lagerfeuer",
                "description": "## Zubereitung\n\n1. Kartoffeln schälen und würfeln\n2. Zwiebeln und Knoblauch anbraten\n3. Kartoffeln und Brühe hinzufügen\n4. 20 Minuten köcheln lassen\n5. Teilweise pürieren\n6. Mit Salz, Pfeffer und Muskat abschmecken",
                "difficulty": DifficultyChoices.EASY,
                "execution_time": ExecutionTimeChoices.BETWEEN_30_60,
                "recipe_type": RecipeTypeChoices.WARM_MEAL,
                "servings": 1,
                "status": RecipeStatusChoices.APPROVED,
            },
            {
                "title": "Overnight Oats",
                "summary": "Frühstück zum Vorbereiten am Vorabend – praktisch fürs Lager",
                "description": "## Zubereitung\n\n1. Haferflocken mit Milch/Joghurt mischen\n2. Honig und Zimt hinzufügen\n3. Über Nacht in den Kühlschrank stellen\n4. Morgens mit frischem Obst und Nüssen toppen",
                "difficulty": DifficultyChoices.EASY,
                "execution_time": ExecutionTimeChoices.LESS_30,
                "recipe_type": RecipeTypeChoices.BREAKFAST,
                "servings": 1,
                "status": RecipeStatusChoices.APPROVED,
            },
            {
                "title": "Gemüsepfanne mit Reis",
                "summary": "Bunte Gemüsepfanne auf Reis – schnell und gesund",
                "description": "## Zubereitung\n\n1. Reis nach Packungsanweisung kochen\n2. Paprika, Zwiebeln und Zucchini in Streifen schneiden\n3. Gemüse in Olivenöl anbraten\n4. Mit Sojasauce und Gewürzen abschmecken\n5. Auf Reis servieren",
                "difficulty": DifficultyChoices.EASY,
                "execution_time": ExecutionTimeChoices.BETWEEN_30_60,
                "recipe_type": RecipeTypeChoices.WARM_MEAL,
                "servings": 1,
                "status": RecipeStatusChoices.APPROVED,
            },
            {
                "title": "Obstsalat",
                "summary": "Frischer Obstsalat als leichter Nachtisch",
                "description": "## Zubereitung\n\n1. Äpfel, Bananen und Beeren waschen und schneiden\n2. In einer Schüssel mischen\n3. Mit etwas Zitronensaft und Honig verfeinern",
                "difficulty": DifficultyChoices.EASY,
                "execution_time": ExecutionTimeChoices.LESS_30,
                "recipe_type": RecipeTypeChoices.DESSERT,
                "servings": 1,
                "status": RecipeStatusChoices.APPROVED,
            },
            {
                "title": "Nudelauflauf mit Käse",
                "summary": "Überbackener Nudelauflauf – Liebling aller Pfadfinder",
                "description": "## Zubereitung\n\n1. Nudeln al dente kochen\n2. Mit Tomatensoße und Gemüse mischen\n3. In eine Auflaufform geben\n4. Käse darüber streuen\n5. 20 Minuten bei 200°C überbacken",
                "difficulty": DifficultyChoices.MEDIUM,
                "execution_time": ExecutionTimeChoices.BETWEEN_60_90,
                "recipe_type": RecipeTypeChoices.WARM_MEAL,
                "servings": 1,
                "status": RecipeStatusChoices.APPROVED,
            },
            {
                "title": "Käsebrot-Platte",
                "summary": "Schnelle kalte Platte für Abendessen im Lager",
                "description": "## Zubereitung\n\n1. Verschiedene Brote aufschneiden\n2. Käse anrichten\n3. Gemüse-Sticks (Paprika, Gurke, Möhren) dazu\n4. Butter und Frischkäse bereitstellen",
                "difficulty": DifficultyChoices.EASY,
                "execution_time": ExecutionTimeChoices.LESS_30,
                "recipe_type": RecipeTypeChoices.COLD_MEAL,
                "servings": 1,
                "status": RecipeStatusChoices.APPROVED,
            },
            {
                "title": "Linsensuppe",
                "summary": "Sättigende Linsensuppe mit Möhren und Gewürzen",
                "description": "## Zubereitung\n\n1. Zwiebeln und Knoblauch in Olivenöl anbraten\n2. Möhren und Kartoffeln würfeln und dazugeben\n3. Rote Linsen und Gemüsebrühe hinzufügen\n4. 20 Minuten köcheln bis die Linsen weich sind\n5. Mit Zitronensaft, Salz und Pfeffer abschmecken",
                "difficulty": DifficultyChoices.EASY,
                "execution_time": ExecutionTimeChoices.BETWEEN_30_60,
                "recipe_type": RecipeTypeChoices.WARM_MEAL,
                "servings": 1,
                "status": RecipeStatusChoices.APPROVED,
            },
            {
                "title": "Wraps mit Gemüsefüllung",
                "summary": "Schnelle Wraps mit bunter Gemüsefüllung – ideal für unterwegs",
                "description": "## Zubereitung\n\n1. Paprika, Möhren und Gurke in Streifen schneiden\n2. Frischkäse auf die Wraps streichen\n3. Gemüse darauf verteilen\n4. Fest einrollen und halbieren",
                "difficulty": DifficultyChoices.EASY,
                "execution_time": ExecutionTimeChoices.LESS_30,
                "recipe_type": RecipeTypeChoices.COLD_MEAL,
                "servings": 1,
                "status": RecipeStatusChoices.APPROVED,
            },
        ]

        created_recipes = []
        for i, data in enumerate(recipe_data):
            if Recipe.objects.filter(title=data["title"]).exists():
                self.stdout.write(f"  Recipe '{data['title']}' already exists, skipping.")
                created_recipes.append(Recipe.objects.filter(title=data["title"]).first())
                continue
            recipe = Recipe.objects.create(**data)
            recipe.authors.add(self._pick_user(users, i))
            created_recipes.append(recipe)
            self.stdout.write(f"  + Recipe: {data['title']}")

        # --- Tags (hierarchical: parent categories with child tags) ---
        from content.models import ScoutLevel, Tag

        parent_tags_data = [
            {"name": "Kochen", "slug": "kochen", "icon": "restaurant", "sort_order": 1},
            {"name": "Anlass", "slug": "anlass", "icon": "calendar_month", "sort_order": 2},
            {"name": "Ernährung", "slug": "ernaehrung", "icon": "favorite", "sort_order": 3},
        ]

        parent_tag_map = {}
        for pt_data in parent_tags_data:
            pt, created = Tag.objects.update_or_create(slug=pt_data["slug"], defaults=pt_data)
            parent_tag_map[pt_data["name"]] = pt
            if created:
                self.stdout.write(f"  + Tag (parent): {pt_data['name']}")

        child_tags_data = [
            {"name": "Lagerfeuer", "slug": "lagerfeuer", "parent": "Kochen", "sort_order": 1},
            {"name": "Wanderproviant", "slug": "wanderproviant", "parent": "Kochen", "sort_order": 2},
            {"name": "Gruppenkochen", "slug": "gruppenkochen", "parent": "Kochen", "sort_order": 3},
            {"name": "Schnell & Einfach", "slug": "schnell-einfach", "parent": "Kochen", "sort_order": 4},
            {"name": "Frühstück", "slug": "fruehstueck", "parent": "Anlass", "sort_order": 1},
            {"name": "Mittagessen", "slug": "mittagessen", "parent": "Anlass", "sort_order": 2},
            {"name": "Abendessen", "slug": "abendessen", "parent": "Anlass", "sort_order": 3},
            {"name": "Dessert & Snack", "slug": "dessert-snack", "parent": "Anlass", "sort_order": 4},
            {"name": "Gesund", "slug": "gesund", "parent": "Ernährung", "sort_order": 1},
            {"name": "Vegetarisch", "slug": "vegetarisch", "parent": "Ernährung", "sort_order": 2},
            {"name": "Vegan", "slug": "vegan", "parent": "Ernährung", "sort_order": 3},
        ]

        child_tag_map = {}
        for ct_data in child_tags_data:
            parent = parent_tag_map[ct_data.pop("parent")]
            ct, created = Tag.objects.get_or_create(
                slug=ct_data["slug"],
                defaults={**ct_data, "parent": parent},
            )
            child_tag_map[ct_data["name"]] = ct
            if created:
                self.stdout.write(f"  + Tag (child): {ct_data['name']}")

        # Assign tags to recipes
        recipe_tags_map = {
            "Pfannkuchen": ["Schnell & Einfach", "Gruppenkochen", "Vegetarisch"],
            "Nudeln mit Tomatensoße": ["Gruppenkochen", "Mittagessen", "Schnell & Einfach", "Vegan"],
            "Müsli mit frischem Obst": ["Frühstück", "Schnell & Einfach", "Gesund", "Vegetarisch"],
            "Stockbrot": ["Lagerfeuer", "Dessert & Snack", "Vegan"],
            "Kartoffelsuppe": ["Gruppenkochen", "Mittagessen", "Gesund"],
            "Overnight Oats": ["Frühstück", "Schnell & Einfach", "Gesund", "Vegetarisch"],
            "Gemüsepfanne mit Reis": ["Gruppenkochen", "Mittagessen", "Gesund", "Vegan"],
            "Obstsalat": ["Dessert & Snack", "Schnell & Einfach", "Gesund", "Vegan"],
            "Nudelauflauf mit Käse": ["Gruppenkochen", "Mittagessen", "Vegetarisch"],
            "Käsebrot-Platte": ["Abendessen", "Schnell & Einfach", "Vegetarisch"],
            "Linsensuppe": ["Gruppenkochen", "Mittagessen", "Gesund", "Vegan"],
            "Wraps mit Gemüsefüllung": ["Wanderproviant", "Schnell & Einfach", "Vegetarisch"],
        }

        for recipe in created_recipes:
            if recipe.title in recipe_tags_map:
                tag_names = recipe_tags_map[recipe.title]
                tags_to_set = [child_tag_map[t] for t in tag_names if t in child_tag_map]
                if tags_to_set and not recipe.tags.exists():
                    recipe.tags.set(tags_to_set)

        # --- ScoutLevels ---
        scout_levels_data = [
            {"name": "Wölflinge", "sorting": 1, "icon": "pets"},
            {"name": "Jungpfadfinder", "sorting": 2, "icon": "explore"},
            {"name": "Pfadfinder", "sorting": 3, "icon": "camping"},
            {"name": "Rover", "sorting": 4, "icon": "landscape"},
        ]

        scout_level_map = {}
        for sl_data in scout_levels_data:
            sl, created = ScoutLevel.objects.update_or_create(name=sl_data["name"], defaults=sl_data)
            scout_level_map[sl_data["name"]] = sl
            if created:
                self.stdout.write(f"  + ScoutLevel: {sl_data['name']}")

        # Assign scout levels to recipes (most recipes are suitable for all levels)
        all_levels = list(scout_level_map.values())
        older_levels = [scout_level_map["Jungpfadfinder"], scout_level_map["Pfadfinder"], scout_level_map["Rover"]]

        recipe_levels_map = {
            "Pfannkuchen": all_levels,
            "Nudeln mit Tomatensoße": all_levels,
            "Müsli mit frischem Obst": all_levels,
            "Stockbrot": all_levels,
            "Kartoffelsuppe": older_levels,
            "Overnight Oats": all_levels,
            "Gemüsepfanne mit Reis": older_levels,
            "Obstsalat": all_levels,
            "Nudelauflauf mit Käse": older_levels,
            "Käsebrot-Platte": all_levels,
            "Linsensuppe": older_levels,
            "Wraps mit Gemüsefüllung": all_levels,
        }

        for recipe in created_recipes:
            if recipe.title in recipe_levels_map:
                levels = recipe_levels_map[recipe.title]
                if levels and not recipe.scout_levels.exists():
                    recipe.scout_levels.set(levels)

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
        moehren = Ingredient.objects.filter(name="Möhren").first()
        linsen = Ingredient.objects.filter(name="Linsen (rot)").first()
        gemuese_bruehe = Ingredient.objects.filter(name="Gemüsebrühe").first()
        zitrone = Ingredient.objects.filter(name="Zitrone").first()
        pfeffer = Ingredient.objects.filter(name="Pfeffer").first()
        frischkaese = Ingredient.objects.filter(name="Frischkäse").first()
        gurke = Ingredient.objects.filter(name="Gurke").first()
        tortilla_wraps = Ingredient.objects.filter(name="Tortilla-Wraps").first()

        gram_unit = MeasuringUnit.objects.filter(name="Gramm").first()

        # Map recipe -> [(ingredient, quantity_g, note)]
        # All quantities normalized to 1 Normportion (servings=1)
        recipe_ingredients_map = {
            "Pfannkuchen": [
                (mehl, 50.0, ""),
                (milch, 75.0, ""),
                (eier, 29.0, "ca. 1/2 Ei"),
                (zucker, 2.4, ""),
                (salz_ing, 0.15, "1 Prise"),
                (butter, 5.0, "zum Braten"),
            ],
            "Nudeln mit Tomatensoße": [
                (nudeln, 125.0, ""),
                (tomaten, 160.0, ""),
                (zwiebeln, 16.0, ""),
                (knoblauch, 1.2, ""),
                (olivenoel, 3.3, ""),
                (salz_ing, 0.5, ""),
                (zucker, 0.5, ""),
            ],
            "Müsli mit frischem Obst": [
                (haferflocken, 50.0, ""),
                (milch, 100.0, "oder Joghurt"),
                (aepfel, 45.0, ""),
                (honig, 6.0, ""),
            ],
            "Stockbrot": [
                (mehl, 50.0, ""),
                (salz_ing, 0.5, ""),
                (olivenoel, 1.1, ""),
            ],
            "Kartoffelsuppe": [
                (kartoffeln, 200.0, ""),
                (zwiebeln, 16.0, ""),
                (knoblauch, 0.8, ""),
                (butter, 3.0, "zum Anbraten"),
                (milch, 20.0, "zum Verfeinern"),
                (salz_ing, 0.5, ""),
            ],
            "Overnight Oats": [
                (haferflocken, 50.0, ""),
                (joghurt, 75.0, ""),
                (milch, 50.0, ""),
                (honig, 6.0, ""),
                (aepfel, 30.0, ""),
            ],
            "Gemüsepfanne mit Reis": [
                (reis, 75.0, ""),
                (paprika, 40.0, ""),
                (zwiebeln, 24.0, ""),
                (olivenoel, 3.3, ""),
                (salz_ing, 0.5, ""),
            ],
            "Obstsalat": [
                (aepfel, 60.0, ""),
                (honig, 4.0, ""),
                (zucker, 1.2, ""),
            ],
            "Nudelauflauf mit Käse": [
                (nudeln, 150.0, ""),
                (tomaten, 120.0, ""),
                (kaese, 40.0, "zum Überbacken"),
                (zwiebeln, 16.0, ""),
                (knoblauch, 0.8, ""),
                (olivenoel, 2.2, ""),
                (salz_ing, 0.5, ""),
            ],
            "Käsebrot-Platte": [
                (brot, 100.0, ""),
                (kaese, 50.0, "diverse Sorten"),
                (butter, 12.5, ""),
                (paprika, 20.0, "in Streifen"),
            ],
            "Linsensuppe": [
                (linsen, 30.0, ""),
                (moehren, 25.0, ""),
                (kartoffeln, 40.0, ""),
                (zwiebeln, 15.0, ""),
                (knoblauch, 1.0, ""),
                (olivenoel, 2.0, ""),
                (gemuese_bruehe, 1.5, "Brühpulver"),
                (zitrone, 3.0, "Saft"),
                (salz_ing, 0.3, ""),
                (pfeffer, 0.1, ""),
            ],
            "Wraps mit Gemüsefüllung": [
                (tortilla_wraps, 65.0, "1 Wrap"),
                (frischkaese, 20.0, ""),
                (paprika, 25.0, "in Streifen"),
                (moehren, 20.0, "in Streifen"),
                (gurke, 25.0, "in Streifen"),
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

        # --- RecipeHints (rule-based, comprehensive) ---
        # Migrated from old Inspi project + extended with vitamin/mineral rules
        hints_data = [
            # --- Energy (per 100g) ---
            {
                "name": "Etwas weniger Energie",
                "description": "Der Energiegehalt ist etwas hoch (über 3000 kJ/100g).",
                "improvement_text": "Ersetze fettreiche Zutaten wie Butter oder Sahne durch leichtere Alternativen wie Joghurt oder Gemüsebrühe.",
                "parameter": HintParameterChoices.ENERGY_KJ,
                "value": 3000.0,
                "min_max": HintMinMaxChoices.MAX,
                "hint_level": HintLevelChoices.WARN,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            {
                "name": "Viel weniger Energie",
                "description": "Der Energiegehalt ist sehr hoch (über 4000 kJ/100g).",
                "improvement_text": "Reduziere energiedichte Zutaten stark. Verwende mehr Gemüse und Vollkornprodukte statt Weißmehl und Zucker.",
                "parameter": HintParameterChoices.ENERGY_KJ,
                "value": 4000.0,
                "min_max": HintMinMaxChoices.MAX,
                "hint_level": HintLevelChoices.ERROR,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            {
                "name": "Etwas mehr Energie",
                "description": "Der Energiegehalt ist etwas niedrig (unter 1900 kJ/100g).",
                "improvement_text": "Füge energiereichere Zutaten hinzu: Nüsse, Haferflocken, Hülsenfrüchte oder Vollkornprodukte.",
                "parameter": HintParameterChoices.ENERGY_KJ,
                "value": 1900.0,
                "min_max": HintMinMaxChoices.MIN,
                "hint_level": HintLevelChoices.WARN,
                "recipe_objective": RecipeObjectiveChoices.FULFILLMENT,
            },
            {
                "name": "Viel mehr Energie",
                "description": "Der Energiegehalt ist sehr niedrig (unter 1500 kJ/100g).",
                "improvement_text": "Das Rezept liefert kaum Energie. Ergänze sättigende Zutaten wie Kartoffeln, Reis, Nudeln oder Hülsenfrüchte.",
                "parameter": HintParameterChoices.ENERGY_KJ,
                "value": 1500.0,
                "min_max": HintMinMaxChoices.MIN,
                "hint_level": HintLevelChoices.ERROR,
                "recipe_objective": RecipeObjectiveChoices.FULFILLMENT,
            },
            # --- Weight (total recipe weight) ---
            {
                "name": "Viel mehr Gewicht",
                "description": "Das Gesamtgewicht ist sehr niedrig (unter 200g).",
                "improvement_text": "Ergänze Gemüse, Salat oder eine Beilage, um das Volumen zu erhöhen.",
                "parameter": HintParameterChoices.WEIGHT_G,
                "value": 200.0,
                "min_max": HintMinMaxChoices.MIN,
                "hint_level": HintLevelChoices.ERROR,
                "recipe_objective": RecipeObjectiveChoices.FULFILLMENT,
            },
            {
                "name": "Etwas mehr Gewicht",
                "description": "Das Gesamtgewicht ist etwas niedrig (unter 300g).",
                "improvement_text": "Mehr Volumen sorgt für bessere Sättigung. Füge wasserreiche Zutaten wie Gurke, Tomate oder Paprika hinzu.",
                "parameter": HintParameterChoices.WEIGHT_G,
                "value": 300.0,
                "min_max": HintMinMaxChoices.MIN,
                "hint_level": HintLevelChoices.WARN,
                "recipe_objective": RecipeObjectiveChoices.FULFILLMENT,
            },
            {
                "name": "Etwas weniger Gewicht",
                "description": "Das Gesamtgewicht ist hoch (über 650g).",
                "improvement_text": "Die Portion ist sehr groß. Prüfe, ob die Mengenangaben für eine Portion korrekt sind.",
                "parameter": HintParameterChoices.WEIGHT_G,
                "value": 650.0,
                "min_max": HintMinMaxChoices.MAX,
                "hint_level": HintLevelChoices.WARN,
                "recipe_objective": RecipeObjectiveChoices.FULFILLMENT,
            },
            {
                "name": "Viel weniger Gewicht",
                "description": "Das Gesamtgewicht ist sehr hoch (über 750g).",
                "improvement_text": "Über 750g pro Portion ist ungewöhnlich viel. Reduziere die Mengen oder teile das Rezept auf mehr Portionen auf.",
                "parameter": HintParameterChoices.WEIGHT_G,
                "value": 750.0,
                "min_max": HintMinMaxChoices.MAX,
                "hint_level": HintLevelChoices.ERROR,
                "recipe_objective": RecipeObjectiveChoices.FULFILLMENT,
            },
            # --- Protein ---
            {
                "name": "Viel mehr Eiweiß",
                "description": "Der Eiweißgehalt ist sehr niedrig (unter 10g/100g).",
                "improvement_text": "Ergänze eiweißreiche Zutaten: Hülsenfrüchte (Linsen, Kichererbsen), Tofu, Eier, Quark oder mageres Fleisch.",
                "parameter": HintParameterChoices.PROTEIN_G,
                "value": 10.0,
                "min_max": HintMinMaxChoices.MIN,
                "hint_level": HintLevelChoices.ERROR,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            {
                "name": "Mehr Eiweiß",
                "description": "Der Eiweißgehalt ist niedrig (unter 30g/100g).",
                "improvement_text": "Für aktive Pfadfinder ist Eiweiß wichtig. Füge Nüsse, Samen, Joghurt oder Hülsenfrüchte hinzu.",
                "parameter": HintParameterChoices.PROTEIN_G,
                "value": 30.0,
                "min_max": HintMinMaxChoices.MIN,
                "hint_level": HintLevelChoices.WARN,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            # --- Nutri-Score class ---
            {
                "name": "Nicht gesund genug",
                "description": "Der Nutri-Score ist schlecht (D oder E).",
                "improvement_text": "Ersetze stark verarbeitete Zutaten durch frisches Gemüse und Vollkornprodukte. Reduziere Zucker, Salz und gesättigte Fette.",
                "parameter": HintParameterChoices.NUTRI_CLASS,
                "value": 3.0,
                "min_max": HintMinMaxChoices.MAX,
                "hint_level": HintLevelChoices.ERROR,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            {
                "name": "Verbesserungsfähig",
                "description": "Der Nutri-Score könnte besser sein (C oder schlechter).",
                "improvement_text": "Mehr Ballaststoffe und Eiweiß verbessern den Nutri-Score. Versuche mehr Obst, Gemüse und Hülsenfrüchte einzubauen.",
                "parameter": HintParameterChoices.NUTRI_CLASS,
                "value": 2.0,
                "min_max": HintMinMaxChoices.MAX,
                "hint_level": HintLevelChoices.WARN,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            # --- Sugar ---
            {
                "name": "Viel Zucker",
                "description": "Der Zuckergehalt ist erhöht (über 20g/100g).",
                "improvement_text": "Reduziere Haushaltszucker. Verwende stattdessen reife Bananen, Datteln oder ungesüßtes Apfelmus als natürliche Süße.",
                "parameter": HintParameterChoices.SUGAR_G,
                "value": 20.0,
                "min_max": HintMinMaxChoices.MAX,
                "hint_level": HintLevelChoices.WARN,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            {
                "name": "Viel zu viel Zucker",
                "description": "Der Zuckergehalt ist sehr hoch (über 40g/100g).",
                "improvement_text": "Halbiere die Zuckermenge und ersetze durch Zimt, Vanille oder frisches Obst. Kinder gewöhnen sich schnell an weniger Süße.",
                "parameter": HintParameterChoices.SUGAR_G,
                "value": 40.0,
                "min_max": HintMinMaxChoices.MAX,
                "hint_level": HintLevelChoices.ERROR,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            # --- Saturated fat ---
            {
                "name": "Viel gesättigte Fettsäuren",
                "description": "Der Gehalt an gesättigten Fettsäuren ist erhöht (über 20g/100g).",
                "improvement_text": "Ersetze Butter durch Rapsöl oder Olivenöl. Verwende fettärmere Milchprodukte.",
                "parameter": HintParameterChoices.FAT_SAT_G,
                "value": 20.0,
                "min_max": HintMinMaxChoices.MAX,
                "hint_level": HintLevelChoices.WARN,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            {
                "name": "Viel zu viel gesättigte Fettsäuren",
                "description": "Der Gehalt an gesättigten Fettsäuren ist sehr hoch (über 40g/100g).",
                "improvement_text": "Stark reduzieren: Ersetze Schmalz, Kokosöl oder Sahne durch pflanzliche Alternativen. Hafermilch statt Sahne funktioniert in vielen Rezepten.",
                "parameter": HintParameterChoices.FAT_SAT_G,
                "value": 40.0,
                "min_max": HintMinMaxChoices.MAX,
                "hint_level": HintLevelChoices.ERROR,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            # --- Fat (total) ---
            {
                "name": "Hoher Fettgehalt",
                "description": "Der Fettgehalt ist hoch (über 20g/100g).",
                "improvement_text": "Reduziere Öl und Fett beim Kochen. Dünsten und Dampfgaren statt Braten spart viel Fett.",
                "parameter": HintParameterChoices.FAT_G,
                "value": 20.0,
                "min_max": HintMinMaxChoices.MAX,
                "hint_level": HintLevelChoices.WARN,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            {
                "name": "Sehr hoher Fettgehalt",
                "description": "Der Fettgehalt ist sehr hoch (über 35g/100g).",
                "improvement_text": "Tausche frittierte gegen gebackene Varianten. Verwende beschichtete Pfannen mit wenig Öl.",
                "parameter": HintParameterChoices.FAT_G,
                "value": 35.0,
                "min_max": HintMinMaxChoices.MAX,
                "hint_level": HintLevelChoices.ERROR,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            # --- Salt ---
            {
                "name": "Zu viel Salz",
                "description": "Der Salzgehalt ist erhöht (über 2g/100g).",
                "improvement_text": "Würze statt mit Salz lieber mit Kräutern, Zitronensaft, Knoblauch oder Pfeffer.",
                "parameter": HintParameterChoices.SALT_G,
                "value": 2.0,
                "min_max": HintMinMaxChoices.MAX,
                "hint_level": HintLevelChoices.WARN,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            {
                "name": "Viel zu viel Salz",
                "description": "Der Salzgehalt ist sehr hoch (über 4g/100g).",
                "improvement_text": "Stark reduzieren! Kochsalz durch Kräutersalz ersetzen und Fertigprodukte (Brühe, Sojasoße) sparsam einsetzen.",
                "parameter": HintParameterChoices.SALT_G,
                "value": 4.0,
                "min_max": HintMinMaxChoices.MAX,
                "hint_level": HintLevelChoices.ERROR,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            # --- Sodium ---
            {
                "name": "Viel Natrium",
                "description": "Der Natriumgehalt ist erhöht (über 500mg/100g).",
                "improvement_text": "Achte auf verstecktes Natrium in Fertigprodukten, Käse und Wurst. Frisch kochen senkt den Natriumgehalt.",
                "parameter": HintParameterChoices.SODIUM_MG,
                "value": 500.0,
                "min_max": HintMinMaxChoices.MAX,
                "hint_level": HintLevelChoices.WARN,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            {
                "name": "Zu viel Natrium",
                "description": "Der Natriumgehalt ist sehr hoch (über 1000mg/100g).",
                "improvement_text": "Natriumgehalt dringend reduzieren. Verzichte auf Fertigbrühe und verwende selbstgemachte Gemüsebrühe.",
                "parameter": HintParameterChoices.SODIUM_MG,
                "value": 1000.0,
                "min_max": HintMinMaxChoices.MAX,
                "hint_level": HintLevelChoices.ERROR,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            # --- Fibre ---
            {
                "name": "Mehr Ballaststoffe",
                "description": "Der Ballaststoffgehalt ist niedrig (unter 3g/100g).",
                "improvement_text": "Verwende Vollkornmehl statt Weißmehl. Ergänze Leinsamen, Chiasamen oder Haferflocken.",
                "parameter": HintParameterChoices.FIBRE_G,
                "value": 3.0,
                "min_max": HintMinMaxChoices.MIN,
                "hint_level": HintLevelChoices.WARN,
                "recipe_objective": RecipeObjectiveChoices.FULFILLMENT,
            },
            {
                "name": "Viel mehr Ballaststoffe",
                "description": "Der Ballaststoffgehalt ist sehr niedrig (unter 1g/100g).",
                "improvement_text": "Ergänze ballaststoffreiche Zutaten: Vollkornprodukte, Hülsenfrüchte, Brokkoli, Erbsen oder Nüsse.",
                "parameter": HintParameterChoices.FIBRE_G,
                "value": 1.0,
                "min_max": HintMinMaxChoices.MIN,
                "hint_level": HintLevelChoices.ERROR,
                "recipe_objective": RecipeObjectiveChoices.FULFILLMENT,
            },
            # --- Carbohydrates ---
            {
                "name": "Sehr viele Kohlenhydrate",
                "description": "Der Kohlenhydratgehalt ist sehr hoch (über 60g/100g).",
                "improvement_text": "Ersetze einen Teil der Kohlenhydrate durch Gemüse oder Hülsenfrüchte für eine ausgewogenere Mahlzeit.",
                "parameter": HintParameterChoices.CARBOHYDRATE_G,
                "value": 60.0,
                "min_max": HintMinMaxChoices.MAX,
                "hint_level": HintLevelChoices.INFO,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            {
                "name": "Wenig Kohlenhydrate",
                "description": "Der Kohlenhydratgehalt ist niedrig (unter 15g/100g).",
                "improvement_text": "Für Energie bei aktiven Pfadfindern: Ergänze Kartoffeln, Reis, Nudeln oder Brot.",
                "parameter": HintParameterChoices.CARBOHYDRATE_G,
                "value": 15.0,
                "min_max": HintMinMaxChoices.MIN,
                "hint_level": HintLevelChoices.INFO,
                "recipe_objective": RecipeObjectiveChoices.FULFILLMENT,
            },
            # --- Vitamin C ---
            {
                "name": "Wenig Vitamin C",
                "description": "Der Vitamin-C-Gehalt ist niedrig.",
                "improvement_text": "Ergänze Paprika, Brokkoli, Zitronensaft oder Petersilie. Schon eine halbe Paprika liefert den Tagesbedarf.",
                "parameter": HintParameterChoices.VITAMIN_C_MG,
                "value": 5.0,
                "min_max": HintMinMaxChoices.MIN,
                "hint_level": HintLevelChoices.INFO,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            {
                "name": "Kein Vitamin C",
                "description": "Das Rezept enthält kaum Vitamin C.",
                "improvement_text": "Vitamin C ist wichtig für das Immunsystem. Serviere frisches Obst als Nachtisch oder füge Zitronensaft zum Dressing hinzu.",
                "parameter": HintParameterChoices.VITAMIN_C_MG,
                "value": 1.0,
                "min_max": HintMinMaxChoices.MIN,
                "hint_level": HintLevelChoices.WARN,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            # --- Vitamin A ---
            {
                "name": "Wenig Vitamin A",
                "description": "Der Vitamin-A-Gehalt ist niedrig.",
                "improvement_text": "Karotten, Süßkartoffeln, Spinat und Kürbis sind reich an Beta-Carotin (Provitamin A). Schon eine kleine Karotte hilft.",
                "parameter": HintParameterChoices.VITAMIN_A_MG,
                "value": 0.05,
                "min_max": HintMinMaxChoices.MIN,
                "hint_level": HintLevelChoices.INFO,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            # --- Vitamin D ---
            {
                "name": "Wenig Vitamin D",
                "description": "Das Rezept enthält kaum Vitamin D.",
                "improvement_text": "Vitamin D findet sich in fettem Fisch (Lachs, Hering), Eiern und Champignons. Im Lager hilft auch Zeit an der Sonne.",
                "parameter": HintParameterChoices.VITAMIN_D_UG,
                "value": 0.5,
                "min_max": HintMinMaxChoices.MIN,
                "hint_level": HintLevelChoices.INFO,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            # --- Vitamin B12 ---
            {
                "name": "Wenig Vitamin B12",
                "description": "Der Vitamin-B12-Gehalt ist niedrig.",
                "improvement_text": "Vitamin B12 kommt fast nur in tierischen Produkten vor: Eier, Milchprodukte, Fleisch, Fisch. Bei rein pflanzlichen Rezepten B12-angereichertes Müsli verwenden.",
                "parameter": HintParameterChoices.VITAMIN_B12_UG,
                "value": 0.2,
                "min_max": HintMinMaxChoices.MIN,
                "hint_level": HintLevelChoices.INFO,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            # --- Folate ---
            {
                "name": "Wenig Folat",
                "description": "Der Folatgehalt ist niedrig.",
                "improvement_text": "Grünes Blattgemüse (Spinat, Feldsalat), Hülsenfrüchte und Vollkornprodukte sind gute Folatquellen. Als Beilage Salat anbieten.",
                "parameter": HintParameterChoices.FOLATE_UG,
                "value": 20.0,
                "min_max": HintMinMaxChoices.MIN,
                "hint_level": HintLevelChoices.INFO,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            {
                "name": "Kein Folat",
                "description": "Das Rezept enthält kaum Folat.",
                "improvement_text": "Folat ist essenziell für Zellwachstum. Ergänze eine Handvoll Spinat, Grünkohl oder Kichererbsen.",
                "parameter": HintParameterChoices.FOLATE_UG,
                "value": 5.0,
                "min_max": HintMinMaxChoices.MIN,
                "hint_level": HintLevelChoices.WARN,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            # --- Calcium ---
            {
                "name": "Wenig Calcium",
                "description": "Der Calciumgehalt ist niedrig.",
                "improvement_text": "Milchprodukte, Brokkoli, Mandeln und Sesam liefern viel Calcium. Ein Becher Joghurt als Nachtisch hilft.",
                "parameter": HintParameterChoices.CALCIUM_MG,
                "value": 50.0,
                "min_max": HintMinMaxChoices.MIN,
                "hint_level": HintLevelChoices.INFO,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            {
                "name": "Kein Calcium",
                "description": "Das Rezept enthält kaum Calcium.",
                "improvement_text": "Calcium ist wichtig für Knochen und Zähne. Ergänze Käse, Joghurt, angereicherte Pflanzenmilch oder Sesam.",
                "parameter": HintParameterChoices.CALCIUM_MG,
                "value": 10.0,
                "min_max": HintMinMaxChoices.MIN,
                "hint_level": HintLevelChoices.WARN,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            # --- Iron ---
            {
                "name": "Wenig Eisen",
                "description": "Der Eisengehalt ist niedrig.",
                "improvement_text": "Hülsenfrüchte, Haferflocken, Spinat und Vollkornbrot sind eisenreich. Vitamin C (Paprika, Zitrone) verbessert die Aufnahme.",
                "parameter": HintParameterChoices.IRON_MG,
                "value": 1.0,
                "min_max": HintMinMaxChoices.MIN,
                "hint_level": HintLevelChoices.INFO,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            {
                "name": "Kein Eisen",
                "description": "Das Rezept enthält kaum Eisen.",
                "improvement_text": "Eisenmangel ist häufig bei Kindern. Ergänze rote Linsen, Kürbiskerne oder Spinat und serviere Obst als Vitamin-C-Quelle dazu.",
                "parameter": HintParameterChoices.IRON_MG,
                "value": 0.3,
                "min_max": HintMinMaxChoices.MIN,
                "hint_level": HintLevelChoices.WARN,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            # --- Magnesium ---
            {
                "name": "Wenig Magnesium",
                "description": "Der Magnesiumgehalt ist niedrig.",
                "improvement_text": "Nüsse, Vollkornprodukte, Bananen und dunkle Schokolade sind magnesiumreich. Haferflocken zum Frühstück sind ideal.",
                "parameter": HintParameterChoices.MAGNESIUM_MG,
                "value": 20.0,
                "min_max": HintMinMaxChoices.MIN,
                "hint_level": HintLevelChoices.INFO,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            # --- Zinc ---
            {
                "name": "Wenig Zink",
                "description": "Der Zinkgehalt ist niedrig.",
                "improvement_text": "Kürbiskerne, Cashews, Linsen und Käse sind gute Zinkquellen. Streue Kürbiskerne über Salate oder Suppen.",
                "parameter": HintParameterChoices.ZINC_MG,
                "value": 0.5,
                "min_max": HintMinMaxChoices.MIN,
                "hint_level": HintLevelChoices.INFO,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            # --- Potassium ---
            {
                "name": "Wenig Kalium",
                "description": "Der Kaliumgehalt ist niedrig.",
                "improvement_text": "Bananen, Kartoffeln, Tomaten und Hülsenfrüchte sind kaliumreich. Wichtig für aktive Pfadfinder gegen Muskelkrämpfe.",
                "parameter": HintParameterChoices.POTASSIUM_MG,
                "value": 100.0,
                "min_max": HintMinMaxChoices.MIN,
                "hint_level": HintLevelChoices.INFO,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            # --- Recipe-type-specific: Breakfast ---
            {
                "name": "Frühstück: Zu wenig Energie",
                "description": "Dieses Frühstück liefert wenig Energie für den Tag.",
                "improvement_text": "Ein Frühstück sollte ca. 25% des Tagesbedarfs liefern. Ergänze Haferflocken, Vollkornbrot oder Nüsse.",
                "parameter": HintParameterChoices.ENERGY_KJ,
                "value": 1200.0,
                "min_max": HintMinMaxChoices.MIN,
                "hint_level": HintLevelChoices.WARN,
                "recipe_type": RecipeTypeChoices.BREAKFAST,
                "recipe_objective": RecipeObjectiveChoices.FULFILLMENT,
            },
            {
                "name": "Frühstück: Zu viel Zucker",
                "description": "Dieses Frühstück enthält viel Zucker.",
                "improvement_text": "Ersetze gezuckerte Cerealien durch Haferflocken mit frischem Obst. Honig statt Zucker verwenden.",
                "parameter": HintParameterChoices.SUGAR_G,
                "value": 15.0,
                "min_max": HintMinMaxChoices.MAX,
                "hint_level": HintLevelChoices.WARN,
                "recipe_type": RecipeTypeChoices.BREAKFAST,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            {
                "name": "Frühstück: Wenig Ballaststoffe",
                "description": "Dieses Frühstück enthält wenig Ballaststoffe.",
                "improvement_text": "Vollkornbrot statt Weißbrot, Haferflocken statt Cornflakes. Ein Löffel Leinsamen im Müsli wirkt Wunder.",
                "parameter": HintParameterChoices.FIBRE_G,
                "value": 3.0,
                "min_max": HintMinMaxChoices.MIN,
                "hint_level": HintLevelChoices.INFO,
                "recipe_type": RecipeTypeChoices.BREAKFAST,
                "recipe_objective": RecipeObjectiveChoices.FULFILLMENT,
            },
            # --- Recipe-type-specific: Snack ---
            {
                "name": "Snack: Zu viel Energie",
                "description": "Dieser Snack ist sehr energiereich.",
                "improvement_text": "Ein Snack sollte leicht sein. Obst, Gemüsesticks oder Nüsse statt Kuchen oder Schokoriegel.",
                "parameter": HintParameterChoices.ENERGY_KJ,
                "value": 1500.0,
                "min_max": HintMinMaxChoices.MAX,
                "hint_level": HintLevelChoices.WARN,
                "recipe_type": RecipeTypeChoices.SNACK,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            {
                "name": "Snack: Zu viel Zucker",
                "description": "Dieser Snack enthält viel Zucker.",
                "improvement_text": "Trockenfrüchte, Nüsse oder selbstgemachte Müsliriegel sind gesündere Alternativen zu Süßigkeiten.",
                "parameter": HintParameterChoices.SUGAR_G,
                "value": 10.0,
                "min_max": HintMinMaxChoices.MAX,
                "hint_level": HintLevelChoices.WARN,
                "recipe_type": RecipeTypeChoices.SNACK,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            {
                "name": "Snack: Zu viel Fett",
                "description": "Dieser Snack enthält viel Fett.",
                "improvement_text": "Wähle fettärmere Snacks: Reiswaffeln, Obst oder Gemüsesticks mit Hummus statt Chips.",
                "parameter": HintParameterChoices.FAT_G,
                "value": 15.0,
                "min_max": HintMinMaxChoices.MAX,
                "hint_level": HintLevelChoices.WARN,
                "recipe_type": RecipeTypeChoices.SNACK,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            # --- Recipe-type-specific: Drink ---
            {
                "name": "Getränk: Zu viel Zucker",
                "description": "Dieses Getränk enthält viel Zucker.",
                "improvement_text": "Verdünne Saft mit Wasser (Schorle) oder verwende ungesüßte Tees. Wasser ist das beste Getränk auf Fahrt.",
                "parameter": HintParameterChoices.SUGAR_G,
                "value": 8.0,
                "min_max": HintMinMaxChoices.MAX,
                "hint_level": HintLevelChoices.WARN,
                "recipe_type": RecipeTypeChoices.DRINK,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            {
                "name": "Getränk: Viel zu viel Zucker",
                "description": "Dieses Getränk hat einen sehr hohen Zuckergehalt.",
                "improvement_text": "Stark gesüßte Getränke wie Limo oder Eistee meiden. Selbstgemachte Limonade mit wenig Zucker und Zitrone ist besser.",
                "parameter": HintParameterChoices.SUGAR_G,
                "value": 15.0,
                "min_max": HintMinMaxChoices.MAX,
                "hint_level": HintLevelChoices.ERROR,
                "recipe_type": RecipeTypeChoices.DRINK,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            # --- Additional general hints ---
            {
                "name": "Wenig Natrium (zu salzig für Kinder)",
                "description": "Für Kinder sollte der Natriumgehalt niedrig sein (unter 300mg/100g).",
                "improvement_text": "Kinder brauchen weniger Natrium als Erwachsene. Verwende Kräuter statt Salz beim Kochen für Kinder.",
                "parameter": HintParameterChoices.SODIUM_MG,
                "value": 300.0,
                "min_max": HintMinMaxChoices.MIN,
                "hint_level": HintLevelChoices.WARN,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            {
                "name": "Zu wenig Obst/Gemüse-Anteil",
                "description": "Der Obst- und Gemüseanteil ist niedrig.",
                "improvement_text": "Die DGE empfiehlt 5 Portionen Obst und Gemüse am Tag. Ergänze frisches Gemüse als Beilage oder Obst als Nachtisch.",
                "parameter": HintParameterChoices.FRUIT_FACTOR,
                "value": 0.3,
                "min_max": HintMinMaxChoices.MIN,
                "hint_level": HintLevelChoices.INFO,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
            {
                "name": "Sehr hoher Obst/Gemüse-Anteil",
                "description": "Sehr guter Obst-/Gemüseanteil!",
                "improvement_text": "Super! Weiter so. Der hohe Obst- und Gemüseanteil sorgt für viele Vitamine und Mineralstoffe.",
                "parameter": HintParameterChoices.FRUIT_FACTOR,
                "value": 0.8,
                "min_max": HintMinMaxChoices.MIN,
                "hint_level": HintLevelChoices.INFO,
                "recipe_objective": RecipeObjectiveChoices.HEALTH,
            },
        ]

        for hint_data in hints_data:
            RecipeHint.objects.update_or_create(
                name=hint_data["name"],
                defaults=hint_data,
            )
            self.stdout.write(f"  + RecipeHint: {hint_data['name']}")

        # --- HealthRules (cockpit traffic-light thresholds) ---
        from recipe.models import HealthRule

        health_rules_data = [
            # --- Existing macro rules ---
            {
                "name": "Zuckergehalt pro Mahlzeit",
                "description": "Bewertung des Zuckergehalts pro 100g der Mahlzeit",
                "parameter": "sugar_g",
                "scope": "meal",
                "min_green": 10.0,
                "min_yellow": 20.0,
                "unit": "g",
                "tip_text": "Versuche, den Zuckeranteil zu reduzieren. Ersetze gesüßte Zutaten durch natürliche Alternativen.",
                "sort_order": 1,
            },
            {
                "name": "Energiegehalt pro Tag",
                "description": "Tägliche Energiezufuhr (kJ) für die gesamte Verpflegung",
                "parameter": "energy_kj",
                "scope": "day",
                "min_green": 9000.0,
                "min_yellow": 12000.0,
                "unit": "kJ",
                "tip_text": "Der Tagesenergiegehalt ist hoch. Prüfe die Portionsgrößen oder ersetze kalorienreiche Zutaten.",
                "sort_order": 2,
            },
            {
                "name": "Gesamtkosten pro Tag",
                "description": "Geschätzte Kosten aller Mahlzeiten eines Tages",
                "parameter": "price_total",
                "scope": "day",
                "min_green": 8.0,
                "min_yellow": 15.0,
                "unit": "EUR",
                "tip_text": "Die Tageskosten sind hoch. Günstigere Zutaten oder Saisongemüse können helfen.",
                "sort_order": 3,
            },
            {
                "name": "Nutri-Score Durchschnitt",
                "description": "Durchschnittlicher Nutri-Score aller Rezepte im Essensplan",
                "parameter": "nutri_class",
                "scope": "meal_event",
                "min_green": 2.5,
                "min_yellow": 3.5,
                "unit": "",
                "tip_text": "Der durchschnittliche Nutri-Score ist niedrig. Ersetze einige Rezepte durch gesündere Alternativen.",
                "sort_order": 4,
            },
            {
                "name": "Zuckergehalt pro Tag",
                "description": "Täglicher Zuckergehalt über alle Mahlzeiten",
                "parameter": "sugar_g",
                "scope": "day",
                "min_green": 25.0,
                "min_yellow": 50.0,
                "unit": "g",
                "tip_text": "Die WHO empfiehlt max. 25g freien Zucker pro Tag. Reduziere gesüßte Getränke und Desserts.",
                "sort_order": 5,
            },
            {
                "name": "Energiegehalt pro Mahlzeit",
                "description": "Energiegehalt einer einzelnen Mahlzeit",
                "parameter": "energy_kj",
                "scope": "meal",
                "min_green": 3000.0,
                "min_yellow": 4500.0,
                "unit": "kJ",
                "tip_text": "Diese Mahlzeit ist sehr energiereich. Reduziere fettreiche Zutaten oder die Portionsgröße.",
                "sort_order": 6,
            },
            # --- New: day-scope vitamin/mineral rules ---
            {
                "name": "Vitamin C pro Tag",
                "description": "Tägliche Vitamin-C-Zufuhr über alle Mahlzeiten",
                "parameter": "vitamin_c_mg",
                "scope": "day",
                "min_green": 90.0,
                "min_yellow": 45.0,
                "unit": "mg",
                "tip_text": "Die tägliche Vitamin-C-Zufuhr ist niedrig. Mehr Obst und Gemüse in den Speiseplan aufnehmen.",
                "sort_order": 10,
            },
            {
                "name": "Vitamin A pro Tag",
                "description": "Tägliche Vitamin-A-Zufuhr",
                "parameter": "vitamin_a_mg",
                "scope": "day",
                "min_green": 0.8,
                "min_yellow": 0.4,
                "unit": "mg",
                "tip_text": "Zu wenig Vitamin A. Karotten, Süßkartoffeln und Spinat sind gute Quellen.",
                "sort_order": 11,
            },
            {
                "name": "Calcium pro Tag",
                "description": "Tägliche Calciumzufuhr",
                "parameter": "calcium_mg",
                "scope": "day",
                "min_green": 1000.0,
                "min_yellow": 500.0,
                "unit": "mg",
                "tip_text": "Calcium ist wichtig für Knochen. Milchprodukte, Brokkoli oder angereicherte Pflanzenmilch ergänzen.",
                "sort_order": 12,
            },
            {
                "name": "Eisen pro Tag",
                "description": "Tägliche Eisenzufuhr",
                "parameter": "iron_mg",
                "scope": "day",
                "min_green": 10.0,
                "min_yellow": 5.0,
                "unit": "mg",
                "tip_text": "Eisenmangel ist häufig. Hülsenfrüchte, Vollkorn und Vitamin-C-reiche Beilagen verbessern die Versorgung.",
                "sort_order": 13,
            },
            {
                "name": "Magnesium pro Tag",
                "description": "Tägliche Magnesiumzufuhr",
                "parameter": "magnesium_mg",
                "scope": "day",
                "min_green": 300.0,
                "min_yellow": 150.0,
                "unit": "mg",
                "tip_text": "Magnesium beugt Muskelkrämpfen vor. Nüsse, Vollkorn und Bananen in den Speiseplan integrieren.",
                "sort_order": 14,
            },
            {
                "name": "Zink pro Tag",
                "description": "Tägliche Zinkzufuhr",
                "parameter": "zinc_mg",
                "scope": "day",
                "min_green": 7.0,
                "min_yellow": 3.5,
                "unit": "mg",
                "tip_text": "Zink stärkt das Immunsystem. Kürbiskerne, Cashews und Linsen sind gute Quellen.",
                "sort_order": 15,
            },
            {
                "name": "Kalium pro Tag",
                "description": "Tägliche Kaliumzufuhr",
                "parameter": "potassium_mg",
                "scope": "day",
                "min_green": 2000.0,
                "min_yellow": 1000.0,
                "unit": "mg",
                "tip_text": "Kalium ist wichtig bei viel Bewegung. Bananen, Kartoffeln und Tomaten liefern viel Kalium.",
                "sort_order": 16,
            },
            {
                "name": "Vitamin D pro Tag",
                "description": "Tägliche Vitamin-D-Zufuhr",
                "parameter": "vitamin_d_ug",
                "scope": "day",
                "min_green": 15.0,
                "min_yellow": 5.0,
                "unit": "µg",
                "tip_text": "Vitamin D kommt hauptsächlich über Sonnenlicht. Fetter Fisch und Eier helfen bei der Versorgung über Nahrung.",
                "sort_order": 17,
            },
            {
                "name": "Vitamin B12 pro Tag",
                "description": "Tägliche Vitamin-B12-Zufuhr",
                "parameter": "vitamin_b12_ug",
                "scope": "day",
                "min_green": 4.0,
                "min_yellow": 2.0,
                "unit": "µg",
                "tip_text": "B12 kommt fast nur in tierischen Lebensmitteln vor. Bei vegetarischer Verpflegung auf B12-angereicherte Produkte achten.",
                "sort_order": 18,
            },
            {
                "name": "Folat pro Tag",
                "description": "Tägliche Folatzufuhr",
                "parameter": "folate_ug",
                "scope": "day",
                "min_green": 300.0,
                "min_yellow": 150.0,
                "unit": "µg",
                "tip_text": "Grünes Blattgemüse und Hülsenfrüchte sind die besten Folatquellen.",
                "sort_order": 19,
            },
            {
                "name": "Ballaststoffe pro Tag",
                "description": "Tägliche Ballaststoffzufuhr",
                "parameter": "fibre_g",
                "scope": "day",
                "min_green": 25.0,
                "min_yellow": 15.0,
                "unit": "g",
                "tip_text": "Mindestens 25g Ballaststoffe pro Tag. Vollkornprodukte und Hülsenfrüchte sind die besten Quellen.",
                "sort_order": 20,
            },
            {
                "name": "Eiweiß pro Tag",
                "description": "Tägliche Eiweißzufuhr",
                "parameter": "protein_g",
                "scope": "day",
                "min_green": 50.0,
                "min_yellow": 30.0,
                "unit": "g",
                "tip_text": "Ausreichend Eiweiß ist wichtig für wachsende Kinder. Kombiniere pflanzliche und tierische Eiweißquellen.",
                "sort_order": 21,
            },
            # --- New: meal-scope vitamin/mineral rules ---
            {
                "name": "Vitamin C pro Mahlzeit",
                "description": "Vitamin-C-Gehalt einer einzelnen Mahlzeit",
                "parameter": "vitamin_c_mg",
                "scope": "meal",
                "min_green": 30.0,
                "min_yellow": 10.0,
                "unit": "mg",
                "tip_text": "Diese Mahlzeit enthält wenig Vitamin C. Frisches Obst oder Salat als Beilage ergänzen.",
                "sort_order": 30,
            },
            {
                "name": "Calcium pro Mahlzeit",
                "description": "Calciumgehalt einer einzelnen Mahlzeit",
                "parameter": "calcium_mg",
                "scope": "meal",
                "min_green": 300.0,
                "min_yellow": 100.0,
                "unit": "mg",
                "tip_text": "Diese Mahlzeit liefert wenig Calcium. Ein Glas Milch oder Joghurt als Nachtisch ergänzt die Versorgung.",
                "sort_order": 31,
            },
            {
                "name": "Eisen pro Mahlzeit",
                "description": "Eisengehalt einer einzelnen Mahlzeit",
                "parameter": "iron_mg",
                "scope": "meal",
                "min_green": 3.0,
                "min_yellow": 1.0,
                "unit": "mg",
                "tip_text": "Diese Mahlzeit liefert wenig Eisen. Hülsenfrüchte oder Vollkornbrot als Beilage helfen.",
                "sort_order": 32,
            },
        ]

        for rule_data in health_rules_data:
            HealthRule.objects.update_or_create(
                name=rule_data["name"],
                defaults=rule_data,
            )
            self.stdout.write(f"  + HealthRule: {rule_data['name']}")

        # --- DGE Reference Data (from D-A-CH Referenzwerte) ---
        # SKIPPED: DgeReference model was simplified, seed data is outdated
        # from supply.models import DgeReference

        dge_data = [
            # Male age groups
            {
                "age_min": 1,
                "age_max": 3,
                "gender": "male",
                "energy_kj": 5100,
                "protein_g": 14,
                "fat_g": 45,
                "carbohydrate_g": 150,
                "fibre_g": 10,
                "sugar_g_max": 30,
                "salt_g_max": 2,
                "fat_sat_g_max": 15,
                "sodium_mg_max": 800,
                "vitamin_a_mg": 0.6,
                "vitamin_b1_mg": 0.6,
                "vitamin_b2_mg": 0.7,
                "vitamin_b6_mg": 0.4,
                "vitamin_b12_ug": 1.0,
                "vitamin_c_mg": 20,
                "vitamin_d_ug": 20,
                "vitamin_e_mg": 6,
                "vitamin_k_ug": 15,
                "niacin_mg": 8,
                "folate_ug": 120,
                "pantothenic_acid_mg": 4,
                "biotin_ug": 10,
                "calcium_mg": 600,
                "iron_mg": 8,
                "magnesium_mg": 80,
                "zinc_mg": 3,
                "potassium_mg": 1100,
                "phosphorus_mg": 500,
                "iodine_ug": 100,
                "selenium_ug": 15,
                "copper_mg": 0.5,
                "manganese_mg": 1.0,
                "chromium_ug": 20,
                "fluoride_mg": 0.7,
            },
            {
                "age_min": 4,
                "age_max": 6,
                "gender": "male",
                "energy_kj": 6400,
                "protein_g": 18,
                "fat_g": 55,
                "carbohydrate_g": 200,
                "fibre_g": 15,
                "sugar_g_max": 38,
                "salt_g_max": 3,
                "fat_sat_g_max": 18,
                "sodium_mg_max": 1200,
                "vitamin_a_mg": 0.7,
                "vitamin_b1_mg": 0.7,
                "vitamin_b2_mg": 0.8,
                "vitamin_b6_mg": 0.5,
                "vitamin_b12_ug": 1.5,
                "vitamin_c_mg": 30,
                "vitamin_d_ug": 20,
                "vitamin_e_mg": 8,
                "vitamin_k_ug": 20,
                "niacin_mg": 9,
                "folate_ug": 140,
                "pantothenic_acid_mg": 4,
                "biotin_ug": 15,
                "calcium_mg": 750,
                "iron_mg": 8,
                "magnesium_mg": 120,
                "zinc_mg": 5,
                "potassium_mg": 1300,
                "phosphorus_mg": 600,
                "iodine_ug": 120,
                "selenium_ug": 20,
                "copper_mg": 0.5,
                "manganese_mg": 1.5,
                "chromium_ug": 25,
                "fluoride_mg": 1.1,
            },
            {
                "age_min": 7,
                "age_max": 9,
                "gender": "male",
                "energy_kj": 7600,
                "protein_g": 24,
                "fat_g": 65,
                "carbohydrate_g": 240,
                "fibre_g": 18,
                "sugar_g_max": 45,
                "salt_g_max": 4,
                "fat_sat_g_max": 22,
                "sodium_mg_max": 1400,
                "vitamin_a_mg": 0.8,
                "vitamin_b1_mg": 0.9,
                "vitamin_b2_mg": 1.0,
                "vitamin_b6_mg": 0.7,
                "vitamin_b12_ug": 2.0,
                "vitamin_c_mg": 45,
                "vitamin_d_ug": 20,
                "vitamin_e_mg": 10,
                "vitamin_k_ug": 30,
                "niacin_mg": 11,
                "folate_ug": 180,
                "pantothenic_acid_mg": 5,
                "biotin_ug": 20,
                "calcium_mg": 900,
                "iron_mg": 10,
                "magnesium_mg": 170,
                "zinc_mg": 7,
                "potassium_mg": 2000,
                "phosphorus_mg": 800,
                "iodine_ug": 140,
                "selenium_ug": 25,
                "copper_mg": 0.7,
                "manganese_mg": 2.0,
                "chromium_ug": 25,
                "fluoride_mg": 1.5,
            },
            {
                "age_min": 10,
                "age_max": 12,
                "gender": "male",
                "energy_kj": 9200,
                "protein_g": 34,
                "fat_g": 78,
                "carbohydrate_g": 290,
                "fibre_g": 20,
                "sugar_g_max": 55,
                "salt_g_max": 5,
                "fat_sat_g_max": 26,
                "sodium_mg_max": 1600,
                "vitamin_a_mg": 0.9,
                "vitamin_b1_mg": 1.0,
                "vitamin_b2_mg": 1.2,
                "vitamin_b6_mg": 1.0,
                "vitamin_b12_ug": 3.0,
                "vitamin_c_mg": 65,
                "vitamin_d_ug": 20,
                "vitamin_e_mg": 13,
                "vitamin_k_ug": 40,
                "niacin_mg": 13,
                "folate_ug": 240,
                "pantothenic_acid_mg": 5,
                "biotin_ug": 25,
                "calcium_mg": 1100,
                "iron_mg": 12,
                "magnesium_mg": 230,
                "zinc_mg": 9,
                "potassium_mg": 2900,
                "phosphorus_mg": 1250,
                "iodine_ug": 180,
                "selenium_ug": 35,
                "copper_mg": 1.0,
                "manganese_mg": 2.0,
                "chromium_ug": 30,
                "fluoride_mg": 2.0,
            },
            {
                "age_min": 13,
                "age_max": 14,
                "gender": "male",
                "energy_kj": 10600,
                "protein_g": 46,
                "fat_g": 90,
                "carbohydrate_g": 330,
                "fibre_g": 25,
                "sugar_g_max": 63,
                "salt_g_max": 6,
                "fat_sat_g_max": 30,
                "sodium_mg_max": 2000,
                "vitamin_a_mg": 1.1,
                "vitamin_b1_mg": 1.2,
                "vitamin_b2_mg": 1.4,
                "vitamin_b6_mg": 1.4,
                "vitamin_b12_ug": 4.0,
                "vitamin_c_mg": 85,
                "vitamin_d_ug": 20,
                "vitamin_e_mg": 14,
                "vitamin_k_ug": 50,
                "niacin_mg": 15,
                "folate_ug": 300,
                "pantothenic_acid_mg": 6,
                "biotin_ug": 30,
                "calcium_mg": 1200,
                "iron_mg": 12,
                "magnesium_mg": 310,
                "zinc_mg": 12,
                "potassium_mg": 3600,
                "phosphorus_mg": 1250,
                "iodine_ug": 200,
                "selenium_ug": 45,
                "copper_mg": 1.0,
                "manganese_mg": 3.0,
                "chromium_ug": 35,
                "fluoride_mg": 3.2,
            },
            {
                "age_min": 15,
                "age_max": 18,
                "gender": "male",
                "energy_kj": 11800,
                "protein_g": 60,
                "fat_g": 100,
                "carbohydrate_g": 370,
                "fibre_g": 30,
                "sugar_g_max": 70,
                "salt_g_max": 6,
                "fat_sat_g_max": 33,
                "sodium_mg_max": 2300,
                "vitamin_a_mg": 1.1,
                "vitamin_b1_mg": 1.4,
                "vitamin_b2_mg": 1.6,
                "vitamin_b6_mg": 1.6,
                "vitamin_b12_ug": 4.0,
                "vitamin_c_mg": 105,
                "vitamin_d_ug": 20,
                "vitamin_e_mg": 15,
                "vitamin_k_ug": 70,
                "niacin_mg": 17,
                "folate_ug": 300,
                "pantothenic_acid_mg": 6,
                "biotin_ug": 35,
                "calcium_mg": 1200,
                "iron_mg": 12,
                "magnesium_mg": 400,
                "zinc_mg": 14,
                "potassium_mg": 4000,
                "phosphorus_mg": 1250,
                "iodine_ug": 200,
                "selenium_ug": 60,
                "copper_mg": 1.0,
                "manganese_mg": 3.5,
                "chromium_ug": 35,
                "fluoride_mg": 3.5,
            },
            {
                "age_min": 19,
                "age_max": 24,
                "gender": "male",
                "energy_kj": 10500,
                "protein_g": 57,
                "fat_g": 90,
                "carbohydrate_g": 330,
                "fibre_g": 30,
                "sugar_g_max": 63,
                "salt_g_max": 6,
                "fat_sat_g_max": 30,
                "sodium_mg_max": 2300,
                "vitamin_a_mg": 1.0,
                "vitamin_b1_mg": 1.3,
                "vitamin_b2_mg": 1.4,
                "vitamin_b6_mg": 1.5,
                "vitamin_b12_ug": 4.0,
                "vitamin_c_mg": 110,
                "vitamin_d_ug": 20,
                "vitamin_e_mg": 15,
                "vitamin_k_ug": 70,
                "niacin_mg": 16,
                "folate_ug": 300,
                "pantothenic_acid_mg": 6,
                "biotin_ug": 40,
                "calcium_mg": 1000,
                "iron_mg": 10,
                "magnesium_mg": 400,
                "zinc_mg": 14,
                "potassium_mg": 4000,
                "phosphorus_mg": 700,
                "iodine_ug": 200,
                "selenium_ug": 70,
                "copper_mg": 1.0,
                "manganese_mg": 3.5,
                "chromium_ug": 35,
                "fluoride_mg": 3.8,
            },
            {
                "age_min": 25,
                "age_max": 50,
                "gender": "male",
                "energy_kj": 10000,
                "protein_g": 57,
                "fat_g": 85,
                "carbohydrate_g": 310,
                "fibre_g": 30,
                "sugar_g_max": 60,
                "salt_g_max": 6,
                "fat_sat_g_max": 28,
                "sodium_mg_max": 2300,
                "vitamin_a_mg": 1.0,
                "vitamin_b1_mg": 1.2,
                "vitamin_b2_mg": 1.4,
                "vitamin_b6_mg": 1.5,
                "vitamin_b12_ug": 4.0,
                "vitamin_c_mg": 110,
                "vitamin_d_ug": 20,
                "vitamin_e_mg": 14,
                "vitamin_k_ug": 70,
                "niacin_mg": 15,
                "folate_ug": 300,
                "pantothenic_acid_mg": 6,
                "biotin_ug": 40,
                "calcium_mg": 1000,
                "iron_mg": 10,
                "magnesium_mg": 350,
                "zinc_mg": 14,
                "potassium_mg": 4000,
                "phosphorus_mg": 700,
                "iodine_ug": 200,
                "selenium_ug": 70,
                "copper_mg": 1.0,
                "manganese_mg": 3.5,
                "chromium_ug": 35,
                "fluoride_mg": 3.8,
            },
            {
                "age_min": 51,
                "age_max": 64,
                "gender": "male",
                "energy_kj": 9200,
                "protein_g": 57,
                "fat_g": 78,
                "carbohydrate_g": 290,
                "fibre_g": 30,
                "sugar_g_max": 55,
                "salt_g_max": 6,
                "fat_sat_g_max": 26,
                "sodium_mg_max": 2300,
                "vitamin_a_mg": 1.0,
                "vitamin_b1_mg": 1.1,
                "vitamin_b2_mg": 1.3,
                "vitamin_b6_mg": 1.5,
                "vitamin_b12_ug": 4.0,
                "vitamin_c_mg": 110,
                "vitamin_d_ug": 20,
                "vitamin_e_mg": 13,
                "vitamin_k_ug": 80,
                "niacin_mg": 14,
                "folate_ug": 300,
                "pantothenic_acid_mg": 6,
                "biotin_ug": 40,
                "calcium_mg": 1000,
                "iron_mg": 10,
                "magnesium_mg": 350,
                "zinc_mg": 14,
                "potassium_mg": 4000,
                "phosphorus_mg": 700,
                "iodine_ug": 200,
                "selenium_ug": 70,
                "copper_mg": 1.0,
                "manganese_mg": 3.5,
                "chromium_ug": 30,
                "fluoride_mg": 3.8,
            },
            {
                "age_min": 65,
                "age_max": 99,
                "gender": "male",
                "energy_kj": 8500,
                "protein_g": 57,
                "fat_g": 72,
                "carbohydrate_g": 270,
                "fibre_g": 30,
                "sugar_g_max": 50,
                "salt_g_max": 6,
                "fat_sat_g_max": 24,
                "sodium_mg_max": 2300,
                "vitamin_a_mg": 1.0,
                "vitamin_b1_mg": 1.0,
                "vitamin_b2_mg": 1.2,
                "vitamin_b6_mg": 1.5,
                "vitamin_b12_ug": 4.0,
                "vitamin_c_mg": 110,
                "vitamin_d_ug": 20,
                "vitamin_e_mg": 12,
                "vitamin_k_ug": 80,
                "niacin_mg": 13,
                "folate_ug": 300,
                "pantothenic_acid_mg": 6,
                "biotin_ug": 40,
                "calcium_mg": 1000,
                "iron_mg": 10,
                "magnesium_mg": 350,
                "zinc_mg": 14,
                "potassium_mg": 4000,
                "phosphorus_mg": 700,
                "iodine_ug": 200,
                "selenium_ug": 70,
                "copper_mg": 1.0,
                "manganese_mg": 3.5,
                "chromium_ug": 30,
                "fluoride_mg": 3.8,
            },
            # Female age groups
            {
                "age_min": 1,
                "age_max": 3,
                "gender": "female",
                "energy_kj": 4800,
                "protein_g": 14,
                "fat_g": 42,
                "carbohydrate_g": 140,
                "fibre_g": 10,
                "sugar_g_max": 28,
                "salt_g_max": 2,
                "fat_sat_g_max": 14,
                "sodium_mg_max": 800,
                "vitamin_a_mg": 0.6,
                "vitamin_b1_mg": 0.6,
                "vitamin_b2_mg": 0.7,
                "vitamin_b6_mg": 0.4,
                "vitamin_b12_ug": 1.0,
                "vitamin_c_mg": 20,
                "vitamin_d_ug": 20,
                "vitamin_e_mg": 6,
                "vitamin_k_ug": 15,
                "niacin_mg": 8,
                "folate_ug": 120,
                "pantothenic_acid_mg": 4,
                "biotin_ug": 10,
                "calcium_mg": 600,
                "iron_mg": 8,
                "magnesium_mg": 80,
                "zinc_mg": 3,
                "potassium_mg": 1100,
                "phosphorus_mg": 500,
                "iodine_ug": 100,
                "selenium_ug": 15,
                "copper_mg": 0.5,
                "manganese_mg": 1.0,
                "chromium_ug": 20,
                "fluoride_mg": 0.7,
            },
            {
                "age_min": 4,
                "age_max": 6,
                "gender": "female",
                "energy_kj": 5800,
                "protein_g": 18,
                "fat_g": 50,
                "carbohydrate_g": 180,
                "fibre_g": 15,
                "sugar_g_max": 35,
                "salt_g_max": 3,
                "fat_sat_g_max": 17,
                "sodium_mg_max": 1200,
                "vitamin_a_mg": 0.7,
                "vitamin_b1_mg": 0.7,
                "vitamin_b2_mg": 0.8,
                "vitamin_b6_mg": 0.5,
                "vitamin_b12_ug": 1.5,
                "vitamin_c_mg": 30,
                "vitamin_d_ug": 20,
                "vitamin_e_mg": 8,
                "vitamin_k_ug": 20,
                "niacin_mg": 9,
                "folate_ug": 140,
                "pantothenic_acid_mg": 4,
                "biotin_ug": 15,
                "calcium_mg": 750,
                "iron_mg": 8,
                "magnesium_mg": 120,
                "zinc_mg": 5,
                "potassium_mg": 1300,
                "phosphorus_mg": 600,
                "iodine_ug": 120,
                "selenium_ug": 20,
                "copper_mg": 0.5,
                "manganese_mg": 1.5,
                "chromium_ug": 25,
                "fluoride_mg": 1.1,
            },
            {
                "age_min": 7,
                "age_max": 9,
                "gender": "female",
                "energy_kj": 7100,
                "protein_g": 24,
                "fat_g": 60,
                "carbohydrate_g": 220,
                "fibre_g": 18,
                "sugar_g_max": 42,
                "salt_g_max": 4,
                "fat_sat_g_max": 20,
                "sodium_mg_max": 1400,
                "vitamin_a_mg": 0.8,
                "vitamin_b1_mg": 0.8,
                "vitamin_b2_mg": 0.9,
                "vitamin_b6_mg": 0.7,
                "vitamin_b12_ug": 2.0,
                "vitamin_c_mg": 45,
                "vitamin_d_ug": 20,
                "vitamin_e_mg": 9,
                "vitamin_k_ug": 30,
                "niacin_mg": 10,
                "folate_ug": 180,
                "pantothenic_acid_mg": 5,
                "biotin_ug": 20,
                "calcium_mg": 900,
                "iron_mg": 10,
                "magnesium_mg": 170,
                "zinc_mg": 7,
                "potassium_mg": 2000,
                "phosphorus_mg": 800,
                "iodine_ug": 140,
                "selenium_ug": 25,
                "copper_mg": 0.7,
                "manganese_mg": 2.0,
                "chromium_ug": 25,
                "fluoride_mg": 1.5,
            },
            {
                "age_min": 10,
                "age_max": 12,
                "gender": "female",
                "energy_kj": 8200,
                "protein_g": 34,
                "fat_g": 70,
                "carbohydrate_g": 260,
                "fibre_g": 20,
                "sugar_g_max": 49,
                "salt_g_max": 5,
                "fat_sat_g_max": 23,
                "sodium_mg_max": 1600,
                "vitamin_a_mg": 0.9,
                "vitamin_b1_mg": 1.0,
                "vitamin_b2_mg": 1.1,
                "vitamin_b6_mg": 1.0,
                "vitamin_b12_ug": 3.0,
                "vitamin_c_mg": 65,
                "vitamin_d_ug": 20,
                "vitamin_e_mg": 11,
                "vitamin_k_ug": 40,
                "niacin_mg": 11,
                "folate_ug": 240,
                "pantothenic_acid_mg": 5,
                "biotin_ug": 25,
                "calcium_mg": 1100,
                "iron_mg": 15,
                "magnesium_mg": 250,
                "zinc_mg": 7,
                "potassium_mg": 2900,
                "phosphorus_mg": 1250,
                "iodine_ug": 180,
                "selenium_ug": 35,
                "copper_mg": 1.0,
                "manganese_mg": 2.0,
                "chromium_ug": 30,
                "fluoride_mg": 2.0,
            },
            {
                "age_min": 13,
                "age_max": 14,
                "gender": "female",
                "energy_kj": 9200,
                "protein_g": 46,
                "fat_g": 78,
                "carbohydrate_g": 290,
                "fibre_g": 25,
                "sugar_g_max": 55,
                "salt_g_max": 6,
                "fat_sat_g_max": 26,
                "sodium_mg_max": 2000,
                "vitamin_a_mg": 1.0,
                "vitamin_b1_mg": 1.1,
                "vitamin_b2_mg": 1.2,
                "vitamin_b6_mg": 1.4,
                "vitamin_b12_ug": 4.0,
                "vitamin_c_mg": 85,
                "vitamin_d_ug": 20,
                "vitamin_e_mg": 12,
                "vitamin_k_ug": 50,
                "niacin_mg": 13,
                "folate_ug": 300,
                "pantothenic_acid_mg": 6,
                "biotin_ug": 30,
                "calcium_mg": 1200,
                "iron_mg": 15,
                "magnesium_mg": 310,
                "zinc_mg": 7,
                "potassium_mg": 3600,
                "phosphorus_mg": 1250,
                "iodine_ug": 200,
                "selenium_ug": 45,
                "copper_mg": 1.0,
                "manganese_mg": 3.0,
                "chromium_ug": 35,
                "fluoride_mg": 2.9,
            },
            {
                "age_min": 15,
                "age_max": 18,
                "gender": "female",
                "energy_kj": 9400,
                "protein_g": 48,
                "fat_g": 80,
                "carbohydrate_g": 295,
                "fibre_g": 30,
                "sugar_g_max": 56,
                "salt_g_max": 6,
                "fat_sat_g_max": 27,
                "sodium_mg_max": 2300,
                "vitamin_a_mg": 0.9,
                "vitamin_b1_mg": 1.1,
                "vitamin_b2_mg": 1.2,
                "vitamin_b6_mg": 1.2,
                "vitamin_b12_ug": 4.0,
                "vitamin_c_mg": 105,
                "vitamin_d_ug": 20,
                "vitamin_e_mg": 12,
                "vitamin_k_ug": 60,
                "niacin_mg": 13,
                "folate_ug": 300,
                "pantothenic_acid_mg": 6,
                "biotin_ug": 35,
                "calcium_mg": 1200,
                "iron_mg": 15,
                "magnesium_mg": 350,
                "zinc_mg": 7,
                "potassium_mg": 4000,
                "phosphorus_mg": 1250,
                "iodine_ug": 200,
                "selenium_ug": 60,
                "copper_mg": 1.0,
                "manganese_mg": 3.0,
                "chromium_ug": 30,
                "fluoride_mg": 3.1,
            },
            {
                "age_min": 19,
                "age_max": 24,
                "gender": "female",
                "energy_kj": 8400,
                "protein_g": 48,
                "fat_g": 72,
                "carbohydrate_g": 265,
                "fibre_g": 30,
                "sugar_g_max": 50,
                "salt_g_max": 6,
                "fat_sat_g_max": 24,
                "sodium_mg_max": 2300,
                "vitamin_a_mg": 0.8,
                "vitamin_b1_mg": 1.0,
                "vitamin_b2_mg": 1.1,
                "vitamin_b6_mg": 1.2,
                "vitamin_b12_ug": 4.0,
                "vitamin_c_mg": 95,
                "vitamin_d_ug": 20,
                "vitamin_e_mg": 12,
                "vitamin_k_ug": 60,
                "niacin_mg": 12,
                "folate_ug": 300,
                "pantothenic_acid_mg": 6,
                "biotin_ug": 40,
                "calcium_mg": 1000,
                "iron_mg": 15,
                "magnesium_mg": 310,
                "zinc_mg": 7,
                "potassium_mg": 4000,
                "phosphorus_mg": 700,
                "iodine_ug": 200,
                "selenium_ug": 60,
                "copper_mg": 1.0,
                "manganese_mg": 3.0,
                "chromium_ug": 30,
                "fluoride_mg": 3.1,
            },
            {
                "age_min": 25,
                "age_max": 50,
                "gender": "female",
                "energy_kj": 8000,
                "protein_g": 47,
                "fat_g": 68,
                "carbohydrate_g": 250,
                "fibre_g": 30,
                "sugar_g_max": 48,
                "salt_g_max": 6,
                "fat_sat_g_max": 23,
                "sodium_mg_max": 2300,
                "vitamin_a_mg": 0.8,
                "vitamin_b1_mg": 1.0,
                "vitamin_b2_mg": 1.1,
                "vitamin_b6_mg": 1.2,
                "vitamin_b12_ug": 4.0,
                "vitamin_c_mg": 95,
                "vitamin_d_ug": 20,
                "vitamin_e_mg": 12,
                "vitamin_k_ug": 60,
                "niacin_mg": 12,
                "folate_ug": 300,
                "pantothenic_acid_mg": 6,
                "biotin_ug": 40,
                "calcium_mg": 1000,
                "iron_mg": 15,
                "magnesium_mg": 300,
                "zinc_mg": 7,
                "potassium_mg": 4000,
                "phosphorus_mg": 700,
                "iodine_ug": 200,
                "selenium_ug": 60,
                "copper_mg": 1.0,
                "manganese_mg": 3.0,
                "chromium_ug": 30,
                "fluoride_mg": 3.1,
            },
            {
                "age_min": 51,
                "age_max": 64,
                "gender": "female",
                "energy_kj": 7500,
                "protein_g": 47,
                "fat_g": 64,
                "carbohydrate_g": 235,
                "fibre_g": 30,
                "sugar_g_max": 45,
                "salt_g_max": 6,
                "fat_sat_g_max": 21,
                "sodium_mg_max": 2300,
                "vitamin_a_mg": 0.8,
                "vitamin_b1_mg": 1.0,
                "vitamin_b2_mg": 1.0,
                "vitamin_b6_mg": 1.2,
                "vitamin_b12_ug": 4.0,
                "vitamin_c_mg": 95,
                "vitamin_d_ug": 20,
                "vitamin_e_mg": 12,
                "vitamin_k_ug": 65,
                "niacin_mg": 11,
                "folate_ug": 300,
                "pantothenic_acid_mg": 6,
                "biotin_ug": 40,
                "calcium_mg": 1000,
                "iron_mg": 10,
                "magnesium_mg": 300,
                "zinc_mg": 7,
                "potassium_mg": 4000,
                "phosphorus_mg": 700,
                "iodine_ug": 200,
                "selenium_ug": 60,
                "copper_mg": 1.0,
                "manganese_mg": 3.0,
                "chromium_ug": 30,
                "fluoride_mg": 3.1,
            },
            {
                "age_min": 65,
                "age_max": 99,
                "gender": "female",
                "energy_kj": 6800,
                "protein_g": 47,
                "fat_g": 58,
                "carbohydrate_g": 215,
                "fibre_g": 30,
                "sugar_g_max": 41,
                "salt_g_max": 6,
                "fat_sat_g_max": 19,
                "sodium_mg_max": 2300,
                "vitamin_a_mg": 0.8,
                "vitamin_b1_mg": 1.0,
                "vitamin_b2_mg": 1.0,
                "vitamin_b6_mg": 1.2,
                "vitamin_b12_ug": 4.0,
                "vitamin_c_mg": 95,
                "vitamin_d_ug": 20,
                "vitamin_e_mg": 11,
                "vitamin_k_ug": 65,
                "niacin_mg": 11,
                "folate_ug": 300,
                "pantothenic_acid_mg": 6,
                "biotin_ug": 40,
                "calcium_mg": 1000,
                "iron_mg": 10,
                "magnesium_mg": 300,
                "zinc_mg": 7,
                "potassium_mg": 4000,
                "phosphorus_mg": 700,
                "iodine_ug": 200,
                "selenium_ug": 60,
                "copper_mg": 1.0,
                "manganese_mg": 3.0,
                "chromium_ug": 30,
                "fluoride_mg": 3.1,
            },
        ]

        for ref_data in dge_data:
            pass  # SKIPPED: DgeReference model was simplified
            # DgeReference.objects.update_or_create(
            #     age_min=ref_data["age_min"],
            #     age_max=ref_data["age_max"],
            #     gender=ref_data["gender"],
            #     defaults=ref_data,
            # )
            # self.stdout.write(f"  + DgeReference: {ref_data['age_min']}-{ref_data['age_max']} {ref_data['gender']}")

        # --- Recalculate recipe caches (nutrition, nutri-score, price) ---
        from recipe.services.recipe_checks import recalculate_recipe_cache

        for recipe in created_recipes:
            try:
                recalculate_recipe_cache(recipe)
                self.stdout.write(f"  ~ Cache recalculated: {recipe.title}")
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"  ! Cache recalculation failed for {recipe.title}: {e}"))

        self.stdout.write(self.style.SUCCESS(f"  Recipes total: {Recipe.objects.count()}"))

    # ------------------------------------------------------------------
    # Events
    # ------------------------------------------------------------------

    def _seed_events(self, users: list):
        self.stdout.write("Seeding events...")

        from event.choices import GenderChoices, PaymentMethodChoices, TimelineActionChoices, CustomFieldTypeChoices
        from event.models import (
            BookingOption,
            CustomField,
            CustomFieldValue,
            Event,
            EventLocation,
            Participant,
            ParticipantLabel,
            Payment,
            Person,
            Registration,
            TimelineEntry,
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
            if not Person.objects.filter(
                user=user, first_name=data["first_name"], last_name=data["last_name"]
            ).exists():
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
                    self.stdout.write(
                        f"  + Registration: {reg_user.username} for Sommerlager ({user_persons.count()} participants)"
                    )

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
        # New dashboard models: Labels, Custom Fields, Payments, Timeline
        # ------------------------------------------------------------------

        # --- Participant Labels for Sommerlager ---
        if sommerlager:
            labels_data = [
                {"name": "Sippe Adler", "color": "#3b82f6"},
                {"name": "Sippe Bären", "color": "#ef4444"},
                {"name": "Sippe Wölfe", "color": "#22c55e"},
                {"name": "Küchendienst", "color": "#f59e0b"},
                {"name": "Erste Hilfe", "color": "#ec4899"},
            ]
            for lbl_data in labels_data:
                label, created = ParticipantLabel.objects.get_or_create(
                    event=sommerlager,
                    name=lbl_data["name"],
                    defaults={"color": lbl_data["color"]},
                )
                if created:
                    self.stdout.write(f"  + Label: {lbl_data['name']}")

            # Assign labels to participants
            sommerlager_participants = list(Participant.objects.filter(registration__event=sommerlager))
            sommerlager_labels = list(ParticipantLabel.objects.filter(event=sommerlager))
            for i, participant in enumerate(sommerlager_participants):
                if sommerlager_labels and not participant.labels.exists():
                    # Each participant gets 1-2 labels
                    participant.labels.add(sommerlager_labels[i % len(sommerlager_labels)])
                    if i % 3 == 0 and len(sommerlager_labels) > 1:
                        participant.labels.add(sommerlager_labels[(i + 1) % len(sommerlager_labels)])

        # --- Custom Fields for Sommerlager ---
        if sommerlager:
            custom_fields_data = [
                {
                    "label": "T-Shirt-Größe",
                    "field_type": CustomFieldTypeChoices.SELECT,
                    "options": ["XS", "S", "M", "L", "XL"],
                    "is_required": True,
                    "sort_order": 0,
                },
                {
                    "label": "Schwimmer?",
                    "field_type": CustomFieldTypeChoices.CHECKBOX,
                    "is_required": False,
                    "sort_order": 1,
                },
                {
                    "label": "Allergien / Sonstiges",
                    "field_type": CustomFieldTypeChoices.TEXT,
                    "is_required": False,
                    "sort_order": 2,
                },
                {
                    "label": "Anreisedatum",
                    "field_type": CustomFieldTypeChoices.DATE,
                    "is_required": False,
                    "sort_order": 3,
                },
            ]
            for cf_data in custom_fields_data:
                cf, created = CustomField.objects.get_or_create(
                    event=sommerlager,
                    label=cf_data["label"],
                    defaults=cf_data,
                )
                if created:
                    self.stdout.write(f"  + CustomField: {cf_data['label']}")

            # Set custom field values for some participants
            tshirt_field = CustomField.objects.filter(event=sommerlager, label="T-Shirt-Größe").first()
            swimmer_field = CustomField.objects.filter(event=sommerlager, label="Schwimmer?").first()
            sizes = ["S", "M", "L", "XL", "M"]
            for i, participant in enumerate(sommerlager_participants):
                if (
                    tshirt_field
                    and not CustomFieldValue.objects.filter(participant=participant, custom_field=tshirt_field).exists()
                ):
                    CustomFieldValue.objects.create(
                        participant=participant,
                        custom_field=tshirt_field,
                        value=sizes[i % len(sizes)],
                    )
                if (
                    swimmer_field
                    and i % 2 == 0
                    and not CustomFieldValue.objects.filter(
                        participant=participant, custom_field=swimmer_field
                    ).exists()
                ):
                    CustomFieldValue.objects.create(
                        participant=participant,
                        custom_field=swimmer_field,
                        value="true",
                    )

        # --- Payments for Sommerlager ---
        if sommerlager:
            for i, participant in enumerate(sommerlager_participants):
                if participant.booking_option and not Payment.objects.filter(participant=participant).exists():
                    # Some participants have paid fully, some partially, some not at all
                    if i % 3 == 0:
                        # Full payment
                        Payment.objects.create(
                            participant=participant,
                            amount=participant.booking_option.price,
                            method=PaymentMethodChoices.UEBERWEISUNG,
                            received_at=timezone.now() - datetime.timedelta(days=10 - i),
                            created_by=self._pick_user(users, 0),
                            note="Vollständig bezahlt",
                        )
                        self.stdout.write(
                            f"  + Payment: {participant.first_name} {participant.last_name} – {participant.booking_option.price}€ (full)"
                        )
                    elif i % 3 == 1:
                        # Partial payment
                        partial = participant.booking_option.price / 2
                        Payment.objects.create(
                            participant=participant,
                            amount=partial,
                            method=PaymentMethodChoices.BAR,
                            received_at=timezone.now() - datetime.timedelta(days=5),
                            created_by=self._pick_user(users, 0),
                            note="Anzahlung",
                        )
                        self.stdout.write(
                            f"  + Payment: {participant.first_name} {participant.last_name} – {partial}€ (partial)"
                        )
                    # i % 3 == 2 → no payment

        # --- Timeline Entries for Sommerlager ---
        if sommerlager and not TimelineEntry.objects.filter(event=sommerlager).exists():
            manager_user = self._pick_user(users, 0)
            base_time = timezone.now() - datetime.timedelta(days=14)

            # Registration timeline entries
            for i, participant in enumerate(sommerlager_participants):
                TimelineEntry.objects.create(
                    event=sommerlager,
                    action_type=TimelineActionChoices.REGISTERED,
                    description=f"{participant.first_name} {participant.last_name} angemeldet",
                    participant=participant,
                    user=participant.registration.user,
                    created_at=base_time + datetime.timedelta(days=i, hours=i * 2),
                )

            # Payment timeline entries
            for payment in Payment.objects.filter(participant__registration__event=sommerlager):
                TimelineEntry.objects.create(
                    event=sommerlager,
                    action_type=TimelineActionChoices.PAYMENT_RECEIVED,
                    description=f"Zahlung von {payment.amount}€ für {payment.participant.first_name} {payment.participant.last_name}",
                    participant=payment.participant,
                    user=manager_user,
                    metadata={"amount": str(payment.amount), "method": payment.method},
                    created_at=payment.received_at,
                )

            # Label assignment entries
            for participant in sommerlager_participants:
                for label in participant.labels.all():
                    TimelineEntry.objects.create(
                        event=sommerlager,
                        action_type=TimelineActionChoices.LABEL_ADDED,
                        description=f"Label '{label.name}' zu {participant.first_name} {participant.last_name} hinzugefügt",
                        participant=participant,
                        user=manager_user,
                        metadata={"label_name": label.name, "label_color": label.color},
                        created_at=base_time + datetime.timedelta(days=7),
                    )

            timeline_count = TimelineEntry.objects.filter(event=sommerlager).count()
            self.stdout.write(f"  + {timeline_count} TimelineEntries for Sommerlager")

    # ------------------------------------------------------------------
    # Planner
    # ------------------------------------------------------------------

    def _seed_planner(self, users: list):
        self.stdout.write("Seeding planners...")

        from planner.models import (
            EntryStatusChoices,
            Meal,
            MealPlan,
            MealItem,
            MealTypeChoices,
            Planner,
            PlannerCollaborator,
            PlannerEntry,
            WeekdayChoices,
        )

        from session.models import GroupSession
        from content.choices import ContentStatus

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
        sessions = list(GroupSession.objects.filter(status=ContentStatus.APPROVED)[:4])
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
                        session=sessions[week % len(sessions)] if sessions else None,
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

            recipes = list(Recipe.objects.filter(status="approved")[:10])

            for day_offset in range(7):
                day_date = datetime.date.today() + datetime.timedelta(days=day_offset)
                meal_plan.create_default_meals_for_date(day_date)

                # Assign recipes to meals if available
                if recipes:
                    day_meals = Meal.objects.filter(
                        meal_plan=meal_plan,
                        start_datetime__date=day_date,
                    )
                    for idx, meal in enumerate(day_meals):
                        recipe_idx = (day_offset * 4 + idx) % len(recipes)
                        MealItem.objects.create(
                            meal=meal,
                            recipe=recipes[recipe_idx],
                            factor=1.0,
                        )

            self.stdout.write(f"  + 7 days with Meals")

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

            recipes = list(Recipe.objects.filter(status="approved")[:10])
            for day_offset in range(4):
                day_date = datetime.date.today() + datetime.timedelta(days=50 + day_offset)
                meal_plan2.create_default_meals_for_date(day_date)

                if recipes:
                    day_meals = Meal.objects.filter(
                        meal_plan=meal_plan2,
                        start_datetime__date=day_date,
                    )
                    for idx, meal in enumerate(day_meals):
                        recipe_idx = (day_offset * 3 + idx) % len(recipes)
                        MealItem.objects.create(
                            meal=meal,
                            recipe=recipes[recipe_idx],
                            factor=1.0,
                        )

            self.stdout.write(f"  + 4 days with Meals (Pfingstlager)")

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
