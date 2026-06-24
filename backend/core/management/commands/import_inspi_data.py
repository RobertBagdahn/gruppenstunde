"""
Management command to import data from the legacy Inspi project.

Reads Django fixture JSON files from the Inspi data directory and maps them
into the gruppenstunde data models. This is a one-time bulk import for
development/staging — not intended for production.

Usage:
    uv run python manage.py import_inspi_data
    uv run python manage.py import_inspi_data --data-dir /path/to/inspi/data
"""

from __future__ import annotations

import html as html_module
import json
import re
from collections import defaultdict
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from django.contrib.contenttypes.models import ContentType
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils.text import slugify

DEFAULT_DATA_DIR = "/Users/robertbagdahn/code/inspi/data"

# Inspi activity_type PKs
ACTIVITY_TYPE_SPIEL = 31
ACTIVITY_TYPE_LERNEN = 53
ACTIVITY_TYPE_FORSCHEN = 38
ACTIVITY_TYPE_KREATIVES = 41
ACTIVITY_TYPE_REZEPT = 75

# Inspi location PKs
LOCATION_DRINNEN = 46
LOCATION_DRAUSSEN = 47
LOCATION_WALD = 59
LOCATION_GARTEN = 76
LOCATION_AUSFLUG = 63


def html_to_markdown(html: str) -> str:
    """Convert simple HTML to Markdown. Handles the common tags found in Inspi data."""
    if not html or not html.strip():
        return ""

    text = html

    # Headings
    for level in range(6, 0, -1):
        prefix = "#" * level
        text = re.sub(
            rf"<h{level}[^>]*>(.*?)</h{level}>",
            rf"\n{prefix} \1\n",
            text,
            flags=re.DOTALL | re.IGNORECASE,
        )

    # Bold / italic
    text = re.sub(r"<(b|strong)[^>]*>(.*?)</\1>", r"**\2**", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<(i|em)[^>]*>(.*?)</\1>", r"*\2*", text, flags=re.DOTALL | re.IGNORECASE)

    # Links
    text = re.sub(r'<a[^>]*href="([^"]*)"[^>]*>(.*?)</a>', r"[\2](\1)", text, flags=re.DOTALL | re.IGNORECASE)

    # Lists
    text = re.sub(r"<ul[^>]*>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</ul>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<ol[^>]*>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"</ol>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<li[^>]*>(.*?)</li>", r"- \1\n", text, flags=re.DOTALL | re.IGNORECASE)

    # Paragraphs and line breaks
    text = re.sub(r"<p[^>]*>(.*?)</p>", r"\1\n\n", text, flags=re.DOTALL | re.IGNORECASE)
    text = re.sub(r"<br\s*/?>", "\n", text, flags=re.IGNORECASE)
    text = re.sub(r"<div[^>]*>(.*?)</div>", r"\1\n", text, flags=re.DOTALL | re.IGNORECASE)

    # Strip remaining tags
    text = re.sub(r"<[^>]+>", "", text)

    # Decode HTML entities (including &ouml;, &auml;, &uuml;, etc.)
    text = html_module.unescape(text)

    # Collapse excessive whitespace but keep double newlines for paragraphs
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


class Command(BaseCommand):
    help = "Import data from the legacy Inspi project into gruppenstunde models."

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        # PK mapping dicts: inspi_pk -> gruppenstunde object
        self.mu_map: dict[int, Any] = {}  # MeasuringUnit
        self.rs_map: dict[int, Any] = {}  # RetailSection
        self.nt_map: dict[int, Any] = {}  # NutritionalTag
        self.tag_map: dict[int, Any] = {}  # Tag (from topics)
        self.sl_map: dict[int, Any] = {}  # ScoutLevel
        self.ingredient_map: dict[int, Any] = {}  # Ingredient
        self.portion_map: dict[int, Any] = {}  # Portion
        self.material_map: dict[int, Any] = {}  # Material
        self.activity_map: dict[int, Any] = {}  # Activity -> GroupSession/Game
        self.recipe_map: dict[int, Any] = {}  # Recipe
        self.metainfo_cache: dict[int, dict] = {}  # MetaInfo fields by PK

        # Counters
        self.counters: dict[str, dict[str, int]] = defaultdict(lambda: {"created": 0, "skipped": 0})

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument(
            "--data-dir",
            type=str,
            default=DEFAULT_DATA_DIR,
            help=f"Path to the Inspi data directory (default: {DEFAULT_DATA_DIR})",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        data_dir = Path(options["data_dir"])
        if not data_dir.is_dir():
            raise CommandError(f"Datenverzeichnis existiert nicht: {data_dir}")

        self.data_dir = data_dir
        self.stdout.write(f"Importiere Inspi-Daten aus: {data_dir}\n")

        with transaction.atomic():
            # Phase 1: Master data
            self.stdout.write(self.style.MIGRATE_HEADING("Phase 1: Master-Daten"))
            self._import_measuring_units()
            self._import_retail_sections()
            self._import_nutritional_tags()
            self._import_tags()
            self._import_scout_levels()
            self._import_recipe_hints()

            # Phase 2: Ingredients + Portions
            self.stdout.write(self.style.MIGRATE_HEADING("Phase 2: Zutaten"))
            self._import_ingredients_and_portions("food/1_data_food_inspi.json", source_label="REWE")
            self._import_ingredients_and_portions("food/2_food_inspi_import_old.json", source_label="FDC")

            # Phase 3: Recipes + RecipeItems
            self.stdout.write(self.style.MIGRATE_HEADING("Phase 3: Rezepte"))
            self._import_recipes()

            # Phase 4: Materials
            self.stdout.write(self.style.MIGRATE_HEADING("Phase 4: Materialien"))
            self._import_materials()

            # Phase 5: Activities
            self.stdout.write(self.style.MIGRATE_HEADING("Phase 5: Activities"))
            self._import_activities()

            # Phase 6: Material-Zuordnungen
            self.stdout.write(self.style.MIGRATE_HEADING("Phase 6: Material-Zuordnungen"))
            self._import_material_items()

            # Phase 7: Recipe cache recalculation
            self.stdout.write(self.style.MIGRATE_HEADING("Phase 7: Rezept-Caches"))
            self._recalculate_recipe_caches()

        # Summary
        self._print_summary()

    # ------------------------------------------------------------------
    # Fixture loading helpers
    # ------------------------------------------------------------------

    def _load_fixture(self, relative_path: str) -> list[dict]:
        """Load a JSON fixture file and return the list of entries."""
        path = self.data_dir / relative_path
        if not path.exists():
            self.stdout.write(self.style.WARNING(f"  Datei nicht gefunden: {path}"))
            return []
        with open(path, encoding="utf-8") as f:
            return json.load(f)

    def _group_by_model(self, entries: list[dict]) -> dict[str, list[dict]]:
        """Group fixture entries by their 'model' key."""
        grouped: dict[str, list[dict]] = defaultdict(list)
        for entry in entries:
            grouped[entry["model"]].append(entry)
        return grouped

    def _safe_decimal(self, value: Any) -> Decimal | None:
        """Safely convert a value to Decimal."""
        if value is None:
            return None
        try:
            return Decimal(str(value))
        except (InvalidOperation, ValueError):
            return None

    def _safe_float(self, value: Any) -> float | None:
        """Safely convert a value to float."""
        if value is None:
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None

    def _safe_int(self, value: Any) -> int | None:
        """Safely convert a value to int."""
        if value is None:
            return None
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return None

    def _count(self, entity: str, created: bool) -> None:
        """Increment counter for an entity type."""
        key = "created" if created else "skipped"
        self.counters[entity][key] += 1

    # ------------------------------------------------------------------
    # Phase 1: Master Data
    # ------------------------------------------------------------------

    def _import_measuring_units(self) -> None:
        from supply.models import MeasuringUnit

        self.stdout.write("  MeasuringUnits importieren...")
        entries = self._load_fixture("food/0_init_data.json")
        grouped = self._group_by_model(entries)

        for entry in grouped.get("food.measuringunit", []):
            pk = entry["pk"]
            fields = entry["fields"]
            obj, created = MeasuringUnit.objects.get_or_create(
                name=fields["name"],
                defaults={
                    "description": fields.get("description", ""),
                    "quantity": float(fields.get("quantity", 1)),
                    "unit": fields.get("unit", "g"),
                },
            )
            self.mu_map[pk] = obj
            self._count("MeasuringUnit", created)

        self.stdout.write(
            f"    {self.counters['MeasuringUnit']['created']} erstellt, "
            f"{self.counters['MeasuringUnit']['skipped']} übersprungen"
        )

    def _import_retail_sections(self) -> None:
        from supply.models import RetailSection

        self.stdout.write("  RetailSections importieren...")
        entries = self._load_fixture("food/0_init_data.json")
        grouped = self._group_by_model(entries)

        for entry in grouped.get("food.retailsection", []):
            pk = entry["pk"]
            fields = entry["fields"]
            obj, created = RetailSection.objects.get_or_create(
                name=fields["name"],
                defaults={
                    "description": fields.get("description", ""),
                    "rank": int(fields.get("rank", 0)),
                },
            )
            self.rs_map[pk] = obj
            self._count("RetailSection", created)

        self.stdout.write(
            f"    {self.counters['RetailSection']['created']} erstellt, "
            f"{self.counters['RetailSection']['skipped']} übersprungen"
        )

    def _import_nutritional_tags(self) -> None:
        from supply.models import NutritionalTag

        self.stdout.write("  NutritionalTags importieren...")
        entries = self._load_fixture("food/0_init_data.json")
        grouped = self._group_by_model(entries)

        for entry in grouped.get("food.nutritionaltag", []):
            pk = entry["pk"]
            fields = entry["fields"]
            obj, created = NutritionalTag.objects.get_or_create(
                name=fields["name"],
                defaults={
                    "name_opposite": fields.get("name_opposite", ""),
                    "description": fields.get("description", ""),
                    "rank": int(fields.get("rank", 1)),
                },
            )
            self.nt_map[pk] = obj
            self._count("NutritionalTag", created)

        self.stdout.write(
            f"    {self.counters['NutritionalTag']['created']} erstellt, "
            f"{self.counters['NutritionalTag']['skipped']} übersprungen"
        )

    def _import_tags(self) -> None:
        from content.models import Tag

        self.stdout.write("  Tags (aus Topics) importieren...")
        entries = self._load_fixture("activity/master-data/1_topic.json")

        for entry in entries:
            pk = entry["pk"]
            fields = entry["fields"]
            name = fields["name"]
            slug = slugify(name, allow_unicode=True)
            if not slug:
                slug = f"topic-{pk}"

            obj, created = Tag.objects.get_or_create(
                slug=slug,
                defaults={
                    "name": name,
                    "sort_order": int(fields.get("sorting", 0)),
                    "is_approved": True,
                },
            )
            self.tag_map[pk] = obj
            self._count("Tag", created)

        self.stdout.write(
            f"    {self.counters['Tag']['created']} erstellt, {self.counters['Tag']['skipped']} übersprungen"
        )

    def _import_scout_levels(self) -> None:
        from content.models import ScoutLevel

        self.stdout.write("  ScoutLevels importieren...")
        entries = self._load_fixture("activity/master-data/3_scout_level_choice.json")

        for entry in entries:
            pk = entry["pk"]
            fields = entry["fields"]
            obj, created = ScoutLevel.objects.get_or_create(
                name=fields["name"],
                defaults={
                    "sorting": int(fields.get("sorting", 0)),
                },
            )
            self.sl_map[pk] = obj
            self._count("ScoutLevel", created)

        self.stdout.write(
            f"    {self.counters['ScoutLevel']['created']} erstellt, "
            f"{self.counters['ScoutLevel']['skipped']} übersprungen"
        )

    def _import_recipe_hints(self) -> None:
        # DEPRECATED: RecipeHint merged into Rule model.
        # Legacy import skipped — use `python manage.py seed_rules` instead.
        self.stdout.write("  RecipeHints importieren... (übersprungen — nutze seed_rules)")
        return

    # ------------------------------------------------------------------
    # Phase 2: Ingredients + Portions
    # ------------------------------------------------------------------

    def _import_ingredients_and_portions(self, fixture_path: str, source_label: str) -> None:
        from supply.models import Ingredient, Portion

        self.stdout.write(f"  Zutaten importieren ({source_label}) aus {fixture_path}...")
        entries = self._load_fixture(fixture_path)
        if not entries:
            return

        grouped = self._group_by_model(entries)

        # Step 1: Cache all metainfo entries
        for entry in grouped.get("food.metainfo", []):
            self.metainfo_cache[entry["pk"]] = entry["fields"]

        # Step 2: Import ingredients
        ingredient_label = f"Ingredient ({source_label})"
        for entry in grouped.get("food.ingredient", []):
            pk = entry["pk"]
            fields = entry["fields"]

            # Skip if already imported (from another file)
            slug_raw = fields.get("slug", "")
            name = fields.get("name", "")
            if not name:
                continue

            # Generate slug
            slug = slugify(slug_raw or name, allow_unicode=True)[:280]
            if not slug:
                slug = f"ingredient-{pk}"

            # Check if already exists
            existing = Ingredient.objects.filter(slug=slug).first()
            if existing:
                self.ingredient_map[pk] = existing
                self._count(ingredient_label, created=False)
                continue

            # Get metainfo
            meta_pk = fields.get("meta_info")
            meta = self.metainfo_cache.get(meta_pk, {}) if meta_pk else {}

            # Resolve retail_section from description keywords
            from supply.services.retail_section_mapping import get_retail_section

            retail_section = get_retail_section(name, fields.get("description", ""))

            ingredient = Ingredient(
                name=name,
                slug=slug,
                description=fields.get("description", "")[:1000] if fields.get("description") else "",
                physical_density=self._safe_float(fields.get("physical_density")) or 1.0,
                physical_viscosity=fields.get("physical_viscosity", "solid"),
                status="verified",
                # Nutritional data from metainfo
                energy_kcal=self._safe_float(meta.get("energy_kcal")) or 0,
                protein_g=self._safe_float(meta.get("protein_g")) or 0,
                fat_g=self._safe_float(meta.get("fat_g")) or 0,
                fat_sat_g=self._safe_float(meta.get("fat_sat_g")),
                carbohydrate_g=self._safe_float(meta.get("carbohydrate_g")) or 0,
                sugar_g=self._safe_float(meta.get("sugar_g")) or 0,
                fibre_g=self._safe_float(meta.get("fibre_g")) or 0,
                salt_g=self._safe_float(meta.get("salt_g")) or 0,
                sodium_mg=self._safe_float(meta.get("sodium_mg")),
                fruit_factor=self._safe_float(meta.get("fruit_factor")),
                nutri_score=self._safe_int(meta.get("nutri_points")),
                nutri_class=self._safe_int(meta.get("nutri_class")),
                price_per_kg=self._safe_decimal(meta.get("price_per_kg")),
                # Scores
                child_score=self._safe_int(fields.get("child_frendly_score")),
                scout_score=self._safe_int(fields.get("scout_frendly_score")),
                # External IDs
                fdc_id=self._safe_int(fields.get("fdc_id")),
                ean=str(fields.get("ean", "") or "")[:20],
                retail_section=retail_section,
            )
            ingredient.save()

            # M2M: nutritional tags
            tag_pks = fields.get("nutritional_tags", [])
            if tag_pks:
                nt_objs = [self.nt_map[t] for t in tag_pks if t in self.nt_map]
                if nt_objs:
                    ingredient.nutritional_tags.set(nt_objs)

            self.ingredient_map[pk] = ingredient
            self._count(ingredient_label, created=True)

        self.stdout.write(
            f"    Zutaten: {self.counters[ingredient_label]['created']} erstellt, "
            f"{self.counters[ingredient_label]['skipped']} übersprungen"
        )

        # Step 3: Import portions
        portion_label = f"Portion ({source_label})"
        for entry in grouped.get("food.portion", []):
            pk = entry["pk"]
            fields = entry["fields"]

            ingredient_pk = fields.get("ingredient")
            ingredient = self.ingredient_map.get(ingredient_pk)
            if not ingredient:
                self._count(portion_label, created=False)
                continue

            mu_pk = fields.get("measuring_unit")
            measuring_unit = self.mu_map.get(mu_pk)

            # Get portion-specific metainfo for weight_g
            portion_meta_pk = fields.get("meta_info")
            portion_meta = self.metainfo_cache.get(portion_meta_pk, {}) if portion_meta_pk else {}
            weight_g = self._safe_float(portion_meta.get("weight_g")) or self._safe_float(fields.get("quantity")) or 0

            name = fields.get("name") or ""
            quantity = self._safe_float(fields.get("quantity")) or 1.0
            rank = self._safe_int(fields.get("rank")) or 1

            # Check for existing portion
            existing = Portion.objects.filter(
                ingredient=ingredient,
                measuring_unit=measuring_unit,
                rank=rank,
            ).first()
            if existing:
                self.portion_map[pk] = existing
                self._count(portion_label, created=False)
                continue

            portion = Portion(
                name=name,
                measuring_unit=measuring_unit,
                ingredient=ingredient,
                quantity=quantity,
                weight_g=weight_g,
                rank=rank,
            )
            portion.save()

            self.portion_map[pk] = portion
            self._count(portion_label, created=True)

        self.stdout.write(
            f"    Portionen: {self.counters[portion_label]['created']} erstellt, "
            f"{self.counters[portion_label]['skipped']} übersprungen"
        )

        # Step 4: Import prices (food.price -> Ingredient.price_per_kg)
        price_label = f"Price ({source_label})"
        for entry in grouped.get("food.price", []):
            fields = entry["fields"]
            price_eur = self._safe_float(fields.get("price_eur"))
            portion_pk = fields.get("portion")
            portion = self.portion_map.get(portion_pk)

            if not portion or not price_eur:
                self._count(price_label, created=False)
                continue

            ingredient = portion.ingredient
            # Formula: price_per_kg = price_eur / (portion.weight_g * quantity / 1000)
            # where quantity = number of portions in the package
            weight_g = portion.weight_g or 0
            quantity = self._safe_float(fields.get("quantity")) or 1.0
            total_weight_g = weight_g * quantity
            if total_weight_g > 0:
                price_per_kg = price_eur / (total_weight_g / 1000.0)
                if not ingredient.price_per_kg:
                    ingredient.price_per_kg = round(price_per_kg, 2)
                    ingredient.save(update_fields=["price_per_kg"])
                    self._count(price_label, created=True)
                else:
                    self._count(price_label, created=False)
            else:
                self._count(price_label, created=False)

        if self.counters.get(price_label):
            self.stdout.write(
                f"    Preise: {self.counters[price_label]['created']} erstellt, "
                f"{self.counters[price_label]['skipped']} übersprungen"
            )

    # ------------------------------------------------------------------
    # Phase 3: Recipes
    # ------------------------------------------------------------------

    def _import_recipes(self) -> None:
        from recipe.models import Recipe, RecipeItem
        from supply.models import MeasuringUnit

        self.stdout.write("  Rezepte importieren...")
        entries = self._load_fixture("food/3_food_inspi_import_recipe_old.json")
        if not entries:
            return

        grouped = self._group_by_model(entries)

        # Cache metainfo from this file too
        for entry in grouped.get("food.metainfo", []):
            self.metainfo_cache[entry["pk"]] = entry["fields"]

        # Also cache portions from this file (may have new ones)
        for entry in grouped.get("food.portion", []):
            pk = entry["pk"]
            if pk not in self.portion_map:
                fields = entry["fields"]
                ingredient_pk = fields.get("ingredient")
                ingredient = self.ingredient_map.get(ingredient_pk)
                mu_pk = fields.get("measuring_unit")
                measuring_unit = self.mu_map.get(mu_pk)

                if ingredient and measuring_unit:
                    portion_meta_pk = fields.get("meta_info")
                    portion_meta = self.metainfo_cache.get(portion_meta_pk, {}) if portion_meta_pk else {}
                    weight_g = (
                        self._safe_float(portion_meta.get("weight_g")) or self._safe_float(fields.get("quantity")) or 0
                    )
                    rank = self._safe_int(fields.get("rank")) or 1

                    existing = Portion.objects.filter(
                        ingredient=ingredient,
                        measuring_unit=measuring_unit,
                        rank=rank,
                    ).first()
                    if existing:
                        self.portion_map[pk] = existing
                    else:
                        from supply.models import Portion

                        portion = Portion(
                            name=fields.get("name") or "",
                            measuring_unit=measuring_unit,
                            ingredient=ingredient,
                            quantity=self._safe_float(fields.get("quantity")) or 1.0,
                            weight_g=weight_g,
                            rank=rank,
                        )
                        portion.save()
                        self.portion_map[pk] = portion

        # Import recipes
        for entry in grouped.get("food.recipe", []):
            pk = entry["pk"]
            fields = entry["fields"]
            name = fields.get("name", "")
            if not name:
                continue

            slug = slugify(name, allow_unicode=True)[:280]
            if not slug:
                slug = f"recipe-{pk}"

            existing = Recipe.objects.filter(slug=slug).first()
            if existing:
                self.recipe_map[pk] = existing
                self._count("Recipe", created=False)
                continue

            description = fields.get("description") or ""

            recipe = Recipe(
                title=name,
                slug=slug,
                description=description,
                status="approved",
                recipe_type="warm_meal",  # default, most are simple meals
                portions=1,
                visibility="public",
            )
            recipe.save()

            self.recipe_map[pk] = recipe
            self._count("Recipe", created=True)

        self.stdout.write(
            f"    Rezepte: {self.counters['Recipe']['created']} erstellt, "
            f"{self.counters['Recipe']['skipped']} übersprungen"
        )

        # Import recipe items
        # Get default measuring unit (g)
        default_mu = MeasuringUnit.objects.filter(name="g").first()

        for entry in grouped.get("food.recipeitem", []):
            fields = entry["fields"]
            recipe_pk = fields.get("recipe")
            recipe = self.recipe_map.get(recipe_pk)
            if not recipe:
                self._count("RecipeItem", created=False)
                continue

            portion_pk = fields.get("portion")
            portion = self.portion_map.get(portion_pk)

            # Resolve ingredient via portion
            ingredient = portion.ingredient if portion else None
            measuring_unit = portion.measuring_unit if portion else default_mu
            quantity = self._safe_float(fields.get("quantity")) or 1.0

            # Check for duplicate
            if RecipeItem.objects.filter(recipe=recipe, portion=portion, ingredient=ingredient).exists():
                self._count("RecipeItem", created=False)
                continue

            RecipeItem.objects.create(
                recipe=recipe,
                portion=portion,
                ingredient=ingredient,
                quantity=quantity,
                measuring_unit=measuring_unit,
                sort_order=RecipeItem.objects.filter(recipe=recipe).count(),
            )
            self._count("RecipeItem", created=True)

        self.stdout.write(
            f"    RecipeItems: {self.counters['RecipeItem']['created']} erstellt, "
            f"{self.counters['RecipeItem']['skipped']} übersprungen"
        )

    # ------------------------------------------------------------------
    # Phase 4: Materials
    # ------------------------------------------------------------------

    def _import_materials(self) -> None:
        from supply.models import Material

        self.stdout.write("  Materialien importieren...")
        entries = self._load_fixture("activity/test-data/1_material_name.json")

        for entry in entries:
            pk = entry["pk"]
            fields = entry["fields"]
            name = fields.get("name", "").strip()
            if not name:
                continue

            slug = slugify(name, allow_unicode=True)[:280]
            if not slug:
                slug = f"material-{pk}"

            existing = Material.objects.filter(slug=slug).first()
            if existing:
                self.material_map[pk] = existing
                self._count("Material", created=False)
                continue

            material = Material(
                name=name,
                slug=slug,
                description=fields.get("description", ""),
                material_category="other",
                is_consumable=False,
            )
            material.save()

            self.material_map[pk] = material
            self._count("Material", created=True)

        self.stdout.write(
            f"    Materialien: {self.counters['Material']['created']} erstellt, "
            f"{self.counters['Material']['skipped']} übersprungen"
        )

    # ------------------------------------------------------------------
    # Phase 5: Activities → GroupSession / Game
    # ------------------------------------------------------------------

    def _import_activities(self) -> None:
        from content.choices import ContentStatus, DifficultyChoices, ExecutionTimeChoices
        from game.models import Game
        from session.models import GroupSession

        self.stdout.write("  Activities importieren...")
        entries = self._load_fixture("activity/test-data/3_activity.json")

        # Inspi numeric values → gruppenstunde choice values
        difficulty_map = {
            0: DifficultyChoices.EASY,
            1: DifficultyChoices.EASY,
            2: DifficultyChoices.MEDIUM,
            3: DifficultyChoices.HARD,
        }
        execution_time_map = {
            0: ExecutionTimeChoices.LESS_30,
            1: ExecutionTimeChoices.LESS_30,
            2: ExecutionTimeChoices.BETWEEN_30_60,
            3: ExecutionTimeChoices.BETWEEN_60_90,
        }

        costs_map = {}

        # Location → Game play_area / GroupSession location_type
        location_to_play_area = {
            LOCATION_DRINNEN: "indoor",
            LOCATION_DRAUSSEN: "outdoor",
            LOCATION_WALD: "forest",
            LOCATION_GARTEN: "outdoor",
            LOCATION_AUSFLUG: "any",
        }
        location_to_location_type = {
            LOCATION_DRINNEN: "indoor",
            LOCATION_DRAUSSEN: "outdoor",
            LOCATION_WALD: "outdoor",
            LOCATION_GARTEN: "outdoor",
            LOCATION_AUSFLUG: "outdoor",
        }

        for entry in entries:
            pk = entry["pk"]
            fields = entry["fields"]
            title = fields.get("title", "").strip()
            if not title:
                continue

            activity_types = fields.get("activity_types", [])

            # Determine target model
            primary_type = activity_types[0] if activity_types else None

            # Skip recipes — they come from food data
            if primary_type == ACTIVITY_TYPE_REZEPT:
                self._count("Activity (skipped recipe)", created=False)
                continue

            is_game = primary_type == ACTIVITY_TYPE_SPIEL

            # Map fields
            description = html_to_markdown(fields.get("description", ""))
            summary = html_to_markdown(fields.get("summary", ""))
            difficulty_raw = self._safe_int(fields.get("difficulty")) or 0
            exec_time_raw = self._safe_int(fields.get("execution_time")) or 0
            status = ContentStatus.APPROVED if fields.get("status") == "2" else ContentStatus.DRAFT

            slug = slugify(title, allow_unicode=True)[:280]
            if not slug:
                slug = f"activity-{pk}"

            # Resolve locations
            locations = fields.get("locations", [])

            if is_game:
                # Check if game already exists
                existing = Game.objects.filter(slug=slug).first()
                if existing:
                    self.activity_map[pk] = existing
                    self._count("Game", created=False)
                    continue

                # Determine play_area from locations
                play_area = "any"
                for loc_pk in locations:
                    if loc_pk in location_to_play_area:
                        play_area = location_to_play_area[loc_pk]
                        break

                obj = Game(
                    title=title,
                    slug=slug,
                    summary=summary,
                    description=description,
                    difficulty=difficulty_map.get(difficulty_raw, DifficultyChoices.EASY),
                    execution_time=execution_time_map.get(exec_time_raw, ExecutionTimeChoices.LESS_30),
                    status=status,
                    game_type="group_game",
                    play_area=play_area,
                )
                obj.save()
                self._count("Game", created=True)
            else:
                # GroupSession
                existing = GroupSession.objects.filter(slug=slug).first()
                if existing:
                    self.activity_map[pk] = existing
                    self._count("GroupSession", created=False)
                    continue

                # Determine location_type
                location_type = "both"
                has_indoor = LOCATION_DRINNEN in locations
                has_outdoor = any(
                    loc in locations for loc in [LOCATION_DRAUSSEN, LOCATION_WALD, LOCATION_GARTEN, LOCATION_AUSFLUG]
                )
                if has_indoor and not has_outdoor:
                    location_type = "indoor"
                elif has_outdoor and not has_indoor:
                    location_type = "outdoor"

                # Determine session_type from topics/activity_types
                session_type = self._guess_session_type(fields)

                obj = GroupSession(
                    title=title,
                    slug=slug,
                    summary=summary,
                    description=description,
                    difficulty=difficulty_map.get(difficulty_raw, DifficultyChoices.EASY),
                    execution_time=execution_time_map.get(exec_time_raw, ExecutionTimeChoices.LESS_30),
                    status=status,
                    session_type=session_type,
                    location_type=location_type,
                )
                obj.save()
                self._count("GroupSession", created=True)

            self.activity_map[pk] = obj

            # M2M: Tags
            topic_pks = fields.get("topics", [])
            tag_objs = [self.tag_map[t] for t in topic_pks if t in self.tag_map]
            if tag_objs:
                obj.tags.set(tag_objs)

            # M2M: Scout Levels
            sl_pks = fields.get("scout_levels", [])
            sl_objs = [self.sl_map[s] for s in sl_pks if s in self.sl_map]
            if sl_objs:
                obj.scout_levels.set(sl_objs)

        self.stdout.write(
            f"    Games: {self.counters['Game']['created']} erstellt, {self.counters['Game']['skipped']} übersprungen"
        )
        self.stdout.write(
            f"    GroupSessions: {self.counters['GroupSession']['created']} erstellt, "
            f"{self.counters['GroupSession']['skipped']} übersprungen"
        )

    def _guess_session_type(self, fields: dict) -> str:
        """Heuristic to determine GroupSession session_type from inspi topics/types."""
        topics = fields.get("topics", [])
        activity_types = fields.get("activity_types", [])

        # Map topic PKs to session types
        # 16=Knoten, 12=Karte Kompass → scout_skills/navigation
        # 10=Feuer machen → outdoor_cooking
        # 9=1. Hilfe → first_aid
        # 17=Küche, 2=Backen → outdoor_cooking
        # 34=Basteln, 30=Handwerkliches → crafts
        # 20=Musisches → community
        # 29=Sternenkunde, 37=Pflanzen, 4=Unsere Erde, 24=Baum → nature_study
        # 40=Bewegung → active_games
        # 23=Haik → exploration
        # 1=Schnitzen → crafts
        # 19=Schwarzzelte → scout_skills

        topic_to_session: dict[int, str] = {
            16: "scout_skills",  # Knoten
            19: "scout_skills",  # Schwarzzelte
            12: "navigation",  # Karte Kompass
            29: "nature_study",  # Sternenkunde
            37: "nature_study",  # Pflanzen
            4: "nature_study",  # Unsere Erde
            24: "nature_study",  # Baum
            66: "nature_study",  # Tier
            34: "crafts",  # Basteln
            30: "crafts",  # Handwerkliches
            1: "crafts",  # Schnitzen
            10: "outdoor_cooking",  # Feuer machen
            17: "outdoor_cooking",  # Küche
            2: "outdoor_cooking",  # Backen
            9: "first_aid",  # 1. Hilfe
            20: "community",  # Musisches
            64: "community",  # Gesellschaftliches
            40: "active_games",  # Bewegung
            23: "exploration",  # Haik
            35: "campfire_culture",  # Geschichten
        }

        for topic_pk in topics:
            if topic_pk in topic_to_session:
                return topic_to_session[topic_pk]

        # Fallback based on activity_type
        if ACTIVITY_TYPE_KREATIVES in activity_types:
            return "crafts"
        if ACTIVITY_TYPE_FORSCHEN in activity_types:
            return "exploration"

        return "scout_skills"

    # ------------------------------------------------------------------
    # Phase 6: Material Items (Activity ↔ Material links)
    # ------------------------------------------------------------------

    def _import_material_items(self) -> None:
        from supply.models import ContentMaterialItem

        self.stdout.write("  Material-Zuordnungen importieren...")
        entries = self._load_fixture("activity/test-data/4_materialitem.json")

        for entry in entries:
            fields = entry["fields"]
            activity_pk = fields.get("activity_id")
            material_pk = fields.get("material_name_id")

            activity_obj = self.activity_map.get(activity_pk)
            material_obj = self.material_map.get(material_pk)

            if not activity_obj or not material_obj:
                self._count("ContentMaterialItem", created=False)
                continue

            ct = ContentType.objects.get_for_model(activity_obj)

            # Check for existing link
            if ContentMaterialItem.objects.filter(
                content_type=ct, object_id=activity_obj.id, material=material_obj
            ).exists():
                self._count("ContentMaterialItem", created=False)
                continue

            quantity_raw = fields.get("quantity", 1)

            ContentMaterialItem.objects.create(
                content_type=ct,
                object_id=activity_obj.id,
                material=material_obj,
                quantity=str(quantity_raw),
                sort_order=ContentMaterialItem.objects.filter(content_type=ct, object_id=activity_obj.id).count(),
            )
            self._count("ContentMaterialItem", created=True)

        self.stdout.write(
            f"    Material-Zuordnungen: {self.counters['ContentMaterialItem']['created']} erstellt, "
            f"{self.counters['ContentMaterialItem']['skipped']} übersprungen"
        )

    # ------------------------------------------------------------------
    # Phase 7: Recipe cache recalculation
    # ------------------------------------------------------------------

    def _recalculate_recipe_caches(self) -> None:
        from recipe.services.recipe_checks import recalculate_recipe_cache

        self.stdout.write("  Rezept-Caches neu berechnen...")
        count = 0
        for recipe in self.recipe_map.values():
            try:
                recalculate_recipe_cache(recipe)
                count += 1
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"    Cache-Fehler für '{recipe.title}': {e}"))

        self.stdout.write(f"    {count} Rezept-Caches berechnet")

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------

    def _print_summary(self) -> None:
        self.stdout.write("\n" + self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.SUCCESS("Import abgeschlossen!"))
        self.stdout.write(self.style.SUCCESS("=" * 60))

        total_created = 0
        total_skipped = 0
        for entity, counts in sorted(self.counters.items()):
            created = counts["created"]
            skipped = counts["skipped"]
            total_created += created
            total_skipped += skipped
            self.stdout.write(f"  {entity:30s}  {created:>6} erstellt  {skipped:>6} übersprungen")

        self.stdout.write(self.style.SUCCESS("-" * 60))
        self.stdout.write(f"  {'GESAMT':30s}  {total_created:>6} erstellt  {total_skipped:>6} übersprungen")
