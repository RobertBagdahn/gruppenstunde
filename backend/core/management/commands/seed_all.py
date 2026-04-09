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

        recipe_data = [
            {
                "title": "Pfannkuchen",
                "summary": "Einfache Pfannkuchen für große Gruppen",
                "description": "## Zubereitung\n\n1. Mehl, Eier und Milch verrühren\n2. Teig 10 Minuten ruhen lassen\n3. In heißer Pfanne von beiden Seiten goldbraun backen\n4. Mit Zucker und Zimt oder Nutella servieren",
                "difficulty": DifficultyChoices.EASY,
                "execution_time": ExecutionTimeChoices.LESS_30,
                "recipe_type": RecipeTypeChoices.WARM_MEAL,
                "servings": 10,
                "status": RecipeStatusChoices.APPROVED,
            },
            {
                "title": "Nudeln mit Tomatensoße",
                "summary": "Klassiker der Lagerküche",
                "description": "## Zubereitung\n\n1. Nudeln nach Packungsanweisung kochen\n2. Zwiebeln und Knoblauch anbraten\n3. Tomaten (Dose) hinzufügen und 15 Minuten köcheln\n4. Mit Basilikum, Salz und Pfeffer abschmecken",
                "difficulty": DifficultyChoices.EASY,
                "execution_time": ExecutionTimeChoices.BETWEEN_30_60,
                "recipe_type": RecipeTypeChoices.WARM_MEAL,
                "servings": 10,
                "status": RecipeStatusChoices.APPROVED,
            },
            {
                "title": "Müsli mit frischem Obst",
                "summary": "Gesundes Frühstück für den Lageralltag",
                "description": "## Zubereitung\n\n1. Haferflocken in Schüsseln verteilen\n2. Milch oder Joghurt dazugeben\n3. Frisches Obst schneiden und darüber geben\n4. Optional: Honig, Nüsse, Rosinen",
                "difficulty": DifficultyChoices.EASY,
                "execution_time": ExecutionTimeChoices.LESS_30,
                "recipe_type": RecipeTypeChoices.BREAKFAST,
                "servings": 10,
                "status": RecipeStatusChoices.APPROVED,
            },
            {
                "title": "Stockbrot",
                "summary": "Am Lagerfeuer gebackenes Brot am Stock",
                "description": "## Teig\n\n- 500g Mehl\n- 250ml lauwarmes Wasser\n- 1 Päckchen Trockenhefe\n- 1 TL Salz\n- 1 EL Öl\n\n## Zubereitung\n\n1. Alle Zutaten verkneten\n2. 30 Min gehen lassen\n3. Um Stöcke wickeln\n4. Über dem Feuer backen (ca. 10-15 Min drehen)",
                "difficulty": DifficultyChoices.MEDIUM,
                "execution_time": ExecutionTimeChoices.BETWEEN_60_90,
                "recipe_type": RecipeTypeChoices.SNACK,
                "servings": 8,
                "status": RecipeStatusChoices.APPROVED,
            },
            {
                "title": "Kartoffelsuppe",
                "summary": "Deftige Kartoffelsuppe für kühle Abende",
                "description": "## Zubereitung\n\n1. Kartoffeln schälen und würfeln\n2. Zwiebeln und Knoblauch anbraten\n3. Kartoffeln und Brühe hinzufügen\n4. 20 Minuten köcheln lassen\n5. Teilweise pürieren\n6. Mit Salz, Pfeffer und Muskat abschmecken",
                "difficulty": DifficultyChoices.EASY,
                "execution_time": ExecutionTimeChoices.BETWEEN_30_60,
                "recipe_type": RecipeTypeChoices.WARM_MEAL,
                "servings": 12,
                "status": RecipeStatusChoices.APPROVED,
            },
            {
                "title": "Overnight Oats",
                "summary": "Frühstück zum Vorbereiten am Vorabend",
                "description": "## Zubereitung\n\n1. Haferflocken mit Milch/Joghurt mischen\n2. Honig und Zimt hinzufügen\n3. Über Nacht in den Kühlschrank stellen\n4. Morgens mit frischem Obst und Nüssen toppen",
                "difficulty": DifficultyChoices.EASY,
                "execution_time": ExecutionTimeChoices.LESS_30,
                "recipe_type": RecipeTypeChoices.BREAKFAST,
                "servings": 10,
                "status": RecipeStatusChoices.APPROVED,
            },
            {
                "title": "Gemüsepfanne mit Reis",
                "summary": "Bunte Gemüsepfanne auf Reis – schnell und gesund",
                "description": "## Zubereitung\n\n1. Reis nach Packungsanweisung kochen\n2. Paprika, Zwiebeln und Zucchini in Streifen schneiden\n3. Gemüse in Olivenöl anbraten\n4. Mit Sojasauce und Gewürzen abschmecken\n5. Auf Reis servieren",
                "difficulty": DifficultyChoices.EASY,
                "execution_time": ExecutionTimeChoices.BETWEEN_30_60,
                "recipe_type": RecipeTypeChoices.WARM_MEAL,
                "servings": 10,
                "status": RecipeStatusChoices.APPROVED,
            },
            {
                "title": "Obstsalat",
                "summary": "Frischer Obstsalat als leichter Nachtisch",
                "description": "## Zubereitung\n\n1. Äpfel, Bananen, Orangen und Beeren waschen und schneiden\n2. In einer großen Schüssel mischen\n3. Mit etwas Zitronensaft und Honig verfeinern",
                "difficulty": DifficultyChoices.EASY,
                "execution_time": ExecutionTimeChoices.LESS_30,
                "recipe_type": RecipeTypeChoices.DESSERT,
                "servings": 10,
                "status": RecipeStatusChoices.APPROVED,
            },
            {
                "title": "Nudelauflauf mit Käse",
                "summary": "Überbackener Nudelauflauf – Liebling aller Pfadfinder",
                "description": "## Zubereitung\n\n1. Nudeln al dente kochen\n2. Mit Tomatensoße und Gemüse mischen\n3. In eine Auflaufform geben\n4. Käse darüber streuen\n5. 20 Minuten bei 200°C überbacken",
                "difficulty": DifficultyChoices.MEDIUM,
                "execution_time": ExecutionTimeChoices.BETWEEN_60_90,
                "recipe_type": RecipeTypeChoices.WARM_MEAL,
                "servings": 12,
                "status": RecipeStatusChoices.APPROVED,
            },
            {
                "title": "Käsebrot-Platte",
                "summary": "Schnelle kalte Platte für Abendessen",
                "description": "## Zubereitung\n\n1. Verschiedene Brote aufschneiden\n2. Käse und Aufschnitt anrichten\n3. Gemüse-Sticks (Paprika, Gurke, Karotten) dazu\n4. Butter und Frischkäse bereitstellen",
                "difficulty": DifficultyChoices.EASY,
                "execution_time": ExecutionTimeChoices.LESS_30,
                "recipe_type": RecipeTypeChoices.COLD_MEAL,
                "servings": 10,
                "status": RecipeStatusChoices.APPROVED,
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

        # --- HealthRules (cockpit traffic-light thresholds) ---
        from recipe.models import HealthRule

        health_rules_data = [
            {
                "name": "Zuckergehalt pro Mahlzeit",
                "description": "Bewertung des Zuckergehalts pro 100g der Mahlzeit",
                "parameter": "sugar_g",
                "scope": "meal",
                "threshold_green": 10.0,
                "threshold_yellow": 20.0,
                "unit": "g",
                "tip_text": "Versuche, den Zuckeranteil zu reduzieren. Ersetze gesüßte Zutaten durch natürliche Alternativen.",
                "sort_order": 1,
            },
            {
                "name": "Energiegehalt pro Tag",
                "description": "Tägliche Energiezufuhr (kJ) für die gesamte Verpflegung",
                "parameter": "energy_kj",
                "scope": "day",
                "threshold_green": 9000.0,
                "threshold_yellow": 12000.0,
                "unit": "kJ",
                "tip_text": "Der Tagesenergiegehalt ist hoch. Prüfe die Portionsgrößen oder ersetze kalorienreiche Zutaten.",
                "sort_order": 2,
            },
            {
                "name": "Gesamtkosten pro Tag",
                "description": "Geschätzte Kosten aller Mahlzeiten eines Tages",
                "parameter": "price_total",
                "scope": "day",
                "threshold_green": 8.0,
                "threshold_yellow": 15.0,
                "unit": "EUR",
                "tip_text": "Die Tageskosten sind hoch. Günstigere Zutaten oder Saisongemüse können helfen.",
                "sort_order": 3,
            },
            {
                "name": "Nutri-Score Durchschnitt",
                "description": "Durchschnittlicher Nutri-Score aller Rezepte im Essensplan",
                "parameter": "nutri_class",
                "scope": "meal_event",
                "threshold_green": 2.5,
                "threshold_yellow": 3.5,
                "unit": "",
                "tip_text": "Der durchschnittliche Nutri-Score ist niedrig. Ersetze einige Rezepte durch gesündere Alternativen.",
                "sort_order": 4,
            },
            {
                "name": "Zuckergehalt pro Tag",
                "description": "Täglicher Zuckergehalt über alle Mahlzeiten",
                "parameter": "sugar_g",
                "scope": "day",
                "threshold_green": 25.0,
                "threshold_yellow": 50.0,
                "unit": "g",
                "tip_text": "Die WHO empfiehlt max. 25g freien Zucker pro Tag. Reduziere gesüßte Getränke und Desserts.",
                "sort_order": 5,
            },
            {
                "name": "Energiegehalt pro Mahlzeit",
                "description": "Energiegehalt einer einzelnen Mahlzeit",
                "parameter": "energy_kj",
                "scope": "meal",
                "threshold_green": 3000.0,
                "threshold_yellow": 4500.0,
                "unit": "kJ",
                "tip_text": "Diese Mahlzeit ist sehr energiereich. Reduziere fettreiche Zutaten oder die Portionsgröße.",
                "sort_order": 6,
            },
        ]

        for rule_data in health_rules_data:
            if not HealthRule.objects.filter(name=rule_data["name"]).exists():
                HealthRule.objects.create(**rule_data)
                self.stdout.write(f"  + HealthRule: {rule_data['name']}")

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
            MealEvent,
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

        # --- MealEvent ---
        if not MealEvent.objects.exists():
            meal_event = MealEvent.objects.create(
                name="Sommerlager Essensplan 2026",
                description="Essensplan für 7 Tage Sommerlager",
                created_by=self._pick_user(users, 0),
                norm_portions=25,
                activity_factor=1.6,
                reserve_factor=1.1,
            )
            self.stdout.write(f"  + MealEvent: {meal_event.name}")

            # Create 7 days with meals
            from recipe.models import Recipe

            recipes = list(Recipe.objects.filter(status="approved")[:10])

            for day_offset in range(7):
                day_date = datetime.date.today() + datetime.timedelta(days=day_offset)
                meal_event.create_default_meals_for_date(day_date)

                # Assign recipes to meals if available
                if recipes:
                    day_meals = Meal.objects.filter(
                        meal_event=meal_event,
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

        # --- Second MealEvent (Pfingstlager) ---
        if not MealEvent.objects.filter(name="Pfingstlager Essensplan 2026").exists():
            from recipe.models import Recipe

            meal_event2 = MealEvent.objects.create(
                name="Pfingstlager Essensplan 2026",
                description="Essensplan für 4 Tage Pfingstlager",
                created_by=self._pick_user(users, 0),
                norm_portions=15,
                activity_factor=1.4,
                reserve_factor=1.05,
            )
            self.stdout.write(f"  + MealEvent: {meal_event2.name}")

            recipes = list(Recipe.objects.filter(status="approved")[:10])
            for day_offset in range(4):
                day_date = datetime.date.today() + datetime.timedelta(days=50 + day_offset)
                meal_event2.create_default_meals_for_date(day_date)

                if recipes:
                    day_meals = Meal.objects.filter(
                        meal_event=meal_event2,
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
