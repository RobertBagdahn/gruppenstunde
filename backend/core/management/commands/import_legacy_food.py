"""
Management command to bulk-import legacy food data from the old Inspi project.

Reads four Django fixture JSON files from the legacy Inspi data directory
and maps them into the gruppenstunde data models. Unlike `import_inspi_data`,
this command does NOT deduplicate content rows (Ingredients, Portions, Recipes,
RecipeItems) — every legacy row becomes a new DB row. Master data
(MeasuringUnit, RetailSection, NutritionalTag, RecipeHint) remains idempotent
via get_or_create.

Input files (in order):
  0_init_data.json          — MeasuringUnits, RetailSections, NutritionalTags, RecipeHints
  1_data_food_inspi.json    — Ingredients (REWE), Portions, Prices (dropped)
  2_food_inspi_import_old.json — Ingredients (FDC), Portions, Prices (dropped)
  3_food_inspi_import_recipe_old.json — Recipes, RecipeItems

Target models:
  supply.MeasuringUnit, supply.RetailSection, supply.NutritionalTag,
  supply.Ingredient, supply.Portion,
  recipe.Recipe, recipe.RecipeItem, recipe.RecipeHint

Usage:
    uv run python manage.py import_legacy_food
    uv run python manage.py import_legacy_food --data-dir /path/to/food
    uv run python manage.py import_legacy_food --files 0,1 --dry-run
    uv run python manage.py import_legacy_food --batch-size 200
"""

from __future__ import annotations

import json
import time
from collections import defaultdict
from contextlib import contextmanager
from decimal import Decimal, InvalidOperation
from pathlib import Path
from typing import Any

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models.signals import post_delete, post_save
from django.utils.text import slugify

DEFAULT_DATA_DIR = "/Users/robertbagdahn/code/inspi/data/food"

FILE_MAP: dict[int, str] = {
    0: "0_init_data.json",
    1: "1_data_food_inspi.json",
    2: "2_food_inspi_import_old.json",
    3: "3_food_inspi_import_recipe_old.json",
}


class LegacyPkMap:
    """In-memory mapping from (model_key, legacy_pk) to new_pk."""

    def __init__(self) -> None:
        self._map: dict[str, dict[int, int]] = defaultdict(dict)
        self._misses: int = 0

    def add(self, model_key: str, legacy_pk: int, new_pk: int) -> None:
        self._map[model_key][legacy_pk] = new_pk

    def get(self, model_key: str, legacy_pk: int | None) -> int | None:
        if legacy_pk is None:
            return None
        result = self._map.get(model_key, {}).get(legacy_pk)
        if result is None:
            self._misses += 1
        return result

    @property
    def total_misses(self) -> int:
        return self._misses


@contextmanager
def disabled_recipe_signals():
    """Temporarily disconnect recipe cache signals."""
    from recipe.models import RecipeItem
    from recipe.signals import (
        invalidate_recipes_on_ingredient_change,
        recalculate_recipe_cache_on_item_change,
    )
    from supply.models import Ingredient

    post_save.disconnect(recalculate_recipe_cache_on_item_change, sender=RecipeItem)
    post_delete.disconnect(recalculate_recipe_cache_on_item_change, sender=RecipeItem)
    post_save.disconnect(invalidate_recipes_on_ingredient_change, sender=Ingredient)
    try:
        yield
    finally:
        post_save.connect(recalculate_recipe_cache_on_item_change, sender=RecipeItem)
        post_delete.connect(recalculate_recipe_cache_on_item_change, sender=RecipeItem)
        post_save.connect(invalidate_recipes_on_ingredient_change, sender=Ingredient)


class Command(BaseCommand):
    help = (
        "Bulk-import legacy food data from the old Inspi project. "
        "Does NOT deduplicate content rows — every legacy row creates a new DB row."
    )

    def __init__(self, *args: Any, **kwargs: Any) -> None:
        super().__init__(*args, **kwargs)
        self.pk_map = LegacyPkMap()
        self.counters: dict[str, dict[str, int]] = defaultdict(
            lambda: {"created": 0, "skipped": 0, "dropped": 0}
        )
        self.imported_recipe_ids: list[int] = []
        self.batch_size: int = 500
        self.warnings: list[str] = []

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument(
            "--data-dir",
            type=str,
            default=DEFAULT_DATA_DIR,
            help=f"Pfad zum Legacy-Food-Datenverzeichnis (Standard: {DEFAULT_DATA_DIR})",
        )
        parser.add_argument(
            "--files",
            type=str,
            default="0,1,2,3",
            help="Komma-separierte Liste der Datei-Nummern (Standard: 0,1,2,3)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Mapping durchlaufen, aber keine DB-Änderungen persistieren",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=500,
            help="Batch-Größe für bulk_create (Standard: 500)",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        data_dir = Path(options["data_dir"])
        if not data_dir.is_dir():
            raise CommandError(f"Datenverzeichnis existiert nicht: {data_dir}")

        file_nums = self._parse_file_nums(options["files"])
        self.batch_size = options["batch_size"]
        dry_run = options["dry_run"]

        # Validate that requested files exist
        for num in file_nums:
            filename = FILE_MAP.get(num)
            if filename is None:
                raise CommandError(f"Ungültige Dateinummer: {num}. Erlaubt: 0, 1, 2, 3")
            path = data_dir / filename
            if not path.exists():
                raise CommandError(f"Datei nicht gefunden: {path}")

        self.data_dir = data_dir
        self.stdout.write(f"Importiere Legacy-Food-Daten aus: {data_dir}")
        if dry_run:
            self.stdout.write(self.style.WARNING("  DRY-RUN Modus — keine DB-Änderungen"))
        self.stdout.write(f"  Dateien: {', '.join(FILE_MAP[n] for n in file_nums)}")
        self.stdout.write(f"  Batch-Größe: {self.batch_size}")

        overall_start = time.time()

        with disabled_recipe_signals():
            if dry_run:
                with transaction.atomic():
                    self._run_import(file_nums)
                    transaction.set_rollback(True)
            else:
                self._run_import(file_nums)

        overall_duration = time.time() - overall_start
        self._print_summary(overall_duration, dry_run)

    def _run_import(self, file_nums: list[int]) -> None:
        """Execute the import for selected files."""
        dispatchers: dict[int, callable] = {
            0: self._import_file_0_master_data,
            1: lambda: self._import_file_ingredients("1_data_food_inspi.json", "REWE"),
            2: lambda: self._import_file_ingredients("2_food_inspi_import_old.json", "FDC"),
            3: self._import_file_3_recipes,
        }

        for num in file_nums:
            fn = dispatchers[num]
            file_start = time.time()
            self.stdout.write(self.style.MIGRATE_HEADING(f"Datei {num}: {FILE_MAP[num]}"))

            if num > 0:  # master data (file 0) has no content rows needing atomic
                with transaction.atomic():
                    fn()
            else:
                with transaction.atomic():
                    fn()

            file_duration = time.time() - file_start
            self.stdout.write(f"  Dauer: {file_duration:.1f}s\n")

        # Recalculate recipe caches after all files
        if self.imported_recipe_ids:
            self._recalculate_caches()

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _parse_file_nums(self, files_str: str) -> list[int]:
        """Parse comma-separated file numbers."""
        try:
            nums = sorted(set(int(x.strip()) for x in files_str.split(",")))
        except ValueError:
            raise CommandError(f"Ungültiges --files Format: '{files_str}'. Erwartet: z.B. '0,1,2,3'")
        return nums

    def _load_fixture(self, filename: str) -> list[dict]:
        """Load a JSON fixture file."""
        path = self.data_dir / filename
        with open(path, encoding="utf-8") as f:
            return json.load(f)

    def _group_by_model(self, entries: list[dict]) -> dict[str, list[dict]]:
        """Group fixture entries by their 'model' key."""
        grouped: dict[str, list[dict]] = defaultdict(list)
        for entry in entries:
            grouped[entry["model"]].append(entry)
        return grouped

    def _safe_decimal(self, value: Any) -> Decimal | None:
        if value is None:
            return None
        try:
            return Decimal(str(value))
        except (InvalidOperation, ValueError):
            return None

    def _safe_float(self, value: Any) -> float | None:
        if value is None:
            return None
        try:
            return float(value)
        except (ValueError, TypeError):
            return None

    def _safe_int(self, value: Any) -> int | None:
        if value is None:
            return None
        try:
            return int(float(value))
        except (ValueError, TypeError):
            return None

    def _count(self, entity: str, action: str = "created") -> None:
        self.counters[entity][action] += 1

    def _generate_slug(self, name: str, existing_slugs: set[str]) -> str:
        """Generate a unique slug using an in-memory set for collision detection."""
        base_slug = slugify(name, allow_unicode=False)[:250]
        if not base_slug:
            base_slug = "zutat"
        slug = base_slug
        counter = 1
        while slug in existing_slugs:
            slug = f"{base_slug}-{counter}"
            counter += 1
        existing_slugs.add(slug)
        return slug

    # ------------------------------------------------------------------
    # File 0: Master Data (idempotent)
    # ------------------------------------------------------------------

    def _import_file_0_master_data(self) -> None:
        from recipe.models import Recipe, RecipeItem
        from supply.models import MeasuringUnit, NutritionalTag, RetailSection

        entries = self._load_fixture("0_init_data.json")
        grouped = self._group_by_model(entries)

        # MeasuringUnits
        self.stdout.write("  MeasuringUnits...")
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
            self.pk_map.add("measuring_unit", pk, obj.pk)
            self._count("MeasuringUnit", "created" if created else "skipped")

        self.stdout.write(
            f"    {self.counters['MeasuringUnit']['created']} erstellt, "
            f"{self.counters['MeasuringUnit']['skipped']} übersprungen"
        )

        # RetailSections
        self.stdout.write("  RetailSections...")
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
            self.pk_map.add("retail_section", pk, obj.pk)
            self._count("RetailSection", "created" if created else "skipped")

        self.stdout.write(
            f"    {self.counters['RetailSection']['created']} erstellt, "
            f"{self.counters['RetailSection']['skipped']} übersprungen"
        )

        # NutritionalTags
        self.stdout.write("  NutritionalTags...")
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
            self.pk_map.add("nutritional_tag", pk, obj.pk)
            self._count("NutritionalTag", "created" if created else "skipped")

        self.stdout.write(
            f"    {self.counters['NutritionalTag']['created']} erstellt, "
            f"{self.counters['NutritionalTag']['skipped']} übersprungen"
        )

        # RecipeHints — DEPRECATED: merged into Rule model
        self.stdout.write("  RecipeHints... (übersprungen — nutze seed_rules)")

    # ------------------------------------------------------------------
    # File 1 & 2: Ingredients + Portions
    # ------------------------------------------------------------------

    def _import_file_ingredients(self, filename: str, source_label: str) -> None:
        from supply.choices import IngredientStatusChoices
        from supply.models import Ingredient, Portion

        entries = self._load_fixture(filename)
        if not entries:
            return

        grouped = self._group_by_model(entries)

        # Pass A: Build MetaInfo lookup
        metainfo_lookup: dict[int, dict] = {}
        for entry in grouped.get("food.metainfo", []):
            metainfo_lookup[entry["pk"]] = entry["fields"]

        self.stdout.write(f"  MetaInfos geladen: {len(metainfo_lookup)}")

        # Pass B: Build Ingredient objects
        ingredient_entries = grouped.get("food.ingredient", [])
        self.stdout.write(f"  Ingredients importieren ({source_label}): {len(ingredient_entries)} Zeilen...")

        # Pre-load existing slugs for collision detection
        existing_slugs: set[str] = set(Ingredient.objects.values_list("slug", flat=True))
        ingredients_to_create: list[Ingredient] = []
        legacy_pks_in_order: list[int] = []
        ingredient_ref_deferred: dict[int, int] = {}  # legacy_pk -> legacy_ref_pk

        for entry in ingredient_entries:
            pk = entry["pk"]
            fields = entry["fields"]
            name = fields.get("name", "")
            if not name:
                continue

            # Get metainfo
            meta_pk = fields.get("meta_info")
            meta = metainfo_lookup.get(meta_pk, {}) if meta_pk else {}

            # Resolve retail_section FK
            rs_legacy_pk = fields.get("retail_section")
            rs_new_pk = self.pk_map.get("retail_section", rs_legacy_pk) if rs_legacy_pk else None

            if not rs_new_pk:
                from supply.services.retail_section_mapping import get_retail_section
                rs_obj = get_retail_section(name, fields.get("description", ""))
                if rs_obj:
                    rs_new_pk = rs_obj.pk

            # Generate unique slug
            slug = self._generate_slug(name, existing_slugs)

            # EAN normalization
            ean_raw = fields.get("ean")
            ean = str(ean_raw)[:20] if ean_raw else ""

            # FDC ID
            fdc_id = self._safe_int(fields.get("fdc_id"))

            ingredient = Ingredient(
                name=name,
                slug=slug,
                description=(fields.get("description", "") or "")[:1000],
                physical_density=self._safe_float(fields.get("physical_density")) or 1.0,
                physical_viscosity=fields.get("physical_viscosity", "solid"),
                status=IngredientStatusChoices.USER_CONTENT,
                # Nutritional data from metainfo
                energy_kj=self._safe_float(meta.get("energy_kj")),
                protein_g=self._safe_float(meta.get("protein_g")),
                fat_g=self._safe_float(meta.get("fat_g")),
                fat_sat_g=self._safe_float(meta.get("fat_sat_g")),
                carbohydrate_g=self._safe_float(meta.get("carbohydrate_g")),
                sugar_g=self._safe_float(meta.get("sugar_g")),
                fibre_g=self._safe_float(meta.get("fibre_g")),
                salt_g=self._safe_float(meta.get("salt_g")),
                sodium_mg=self._safe_float(meta.get("sodium_mg")),
                fruit_factor=self._safe_float(meta.get("fruit_factor")),
                nutri_score=self._safe_int(meta.get("nutri_points")),
                nutri_class=self._safe_int(meta.get("nutri_class")),
                price_per_kg=self._safe_decimal(meta.get("price_per_kg")),
                # Scores
                child_score=self._safe_int(fields.get("child_frendly_score")),
                scout_score=self._safe_int(fields.get("scout_frendly_score")),
                # External IDs
                fdc_id=fdc_id,
                nan_art_id_rewe=self._safe_int(fields.get("nan_art_id_rewe")),
                ean=ean,
                retail_section_id=rs_new_pk,
            )

            if not meta and meta_pk:
                self.warnings.append(f"Ingredient {pk} ({name}): MetaInfo {meta_pk} nicht gefunden")

            ingredients_to_create.append(ingredient)
            legacy_pks_in_order.append(pk)

            # Deferred ingredient_ref
            ref_pk = fields.get("ingredient_ref")
            if ref_pk:
                ingredient_ref_deferred[pk] = ref_pk

        # Bulk create in batches
        total_created = 0
        for i in range(0, len(ingredients_to_create), self.batch_size):
            batch = ingredients_to_create[i : i + self.batch_size]
            created = Ingredient.objects.bulk_create(batch, batch_size=self.batch_size)
            # Collect PKs
            for j, obj in enumerate(created):
                legacy_pk = legacy_pks_in_order[i + j]
                self.pk_map.add("ingredient", legacy_pk, obj.pk)
                self._count(f"Ingredient ({source_label})")
            total_created += len(created)

        self.stdout.write(f"    Ingredients: {total_created} erstellt")

        # Second pass: ingredient_ref (self-FK)
        if ingredient_ref_deferred:
            updates = []
            for legacy_pk, ref_legacy_pk in ingredient_ref_deferred.items():
                new_pk = self.pk_map.get("ingredient", legacy_pk)
                ref_new_pk = self.pk_map.get("ingredient", ref_legacy_pk)
                if new_pk and ref_new_pk:
                    updates.append((new_pk, ref_new_pk))

            if updates:
                # Use bulk_update
                objs_to_update = []
                pk_to_ref = dict(updates)
                for obj in Ingredient.objects.filter(pk__in=[u[0] for u in updates]):
                    obj.ingredient_ref_id = pk_to_ref[obj.pk]
                    objs_to_update.append(obj)
                if objs_to_update:
                    Ingredient.objects.bulk_update(objs_to_update, fields=["ingredient_ref"], batch_size=self.batch_size)
                self.stdout.write(f"    ingredient_ref: {len(objs_to_update)} aktualisiert")

        # Portions
        portion_entries = grouped.get("food.portion", [])
        self.stdout.write(f"  Portions importieren: {len(portion_entries)} Zeilen...")

        from supply.models import MeasuringUnit, Portion
        mu_cache = {mu.pk: mu for mu in MeasuringUnit.objects.all()}

        # Load existing portions for dedup
        existing_portions_qs = Portion.objects.filter(deleted_at__isnull=True).values(
            'id', 'ingredient_id', 'name', 'measuring_unit_id', 'quantity'
        )
        existing_portions = {
            (p['ingredient_id'], p['name'].strip().lower(), p['measuring_unit_id'], float(p['quantity'])): p['id']
            for p in existing_portions_qs
        }

        portions_to_create: list[Portion] = []
        prepared_portions = {}  # (ingredient_id, name.lower(), measuring_unit_id, quantity) -> list of legacy_pks

        for entry in portion_entries:
            pk = entry["pk"]
            fields = entry["fields"]

            legacy_ing_pk = fields.get("ingredient")
            new_ing_pk = self.pk_map.get("ingredient", legacy_ing_pk)
            if not new_ing_pk:
                self._count(f"Portion ({source_label})", "skipped")
                continue

            legacy_mu_pk = fields.get("measuring_unit")
            new_mu_pk = self.pk_map.get("measuring_unit", legacy_mu_pk)
            if not new_mu_pk:
                # Fallback to default measuring unit (gram)
                default_mu = MeasuringUnit.objects.filter(name__icontains="gramm").first()
                if not default_mu:
                    default_mu = MeasuringUnit.objects.first()
                new_mu_pk = default_mu.pk if default_mu else None
                if not new_mu_pk:
                    self._count(f"Portion ({source_label})", "skipped")
                    continue

            # weight_g from portion's metainfo
            portion_meta_pk = fields.get("meta_info")
            portion_meta = metainfo_lookup.get(portion_meta_pk, {}) if portion_meta_pk else {}
            weight_g = self._safe_float(portion_meta.get("weight_g"))

            # Derive and clean name (Task 4.3)
            raw_name = fields.get("name", "") or ""
            cleaned_name = raw_name.strip()
            if not cleaned_name or cleaned_name == "g":
                mu = mu_cache.get(new_mu_pk)
                cleaned_name = mu.name if mu else "Stück"
            if not cleaned_name:
                cleaned_name = "Stück"

            quantity = self._safe_float(fields.get("quantity")) or 1.0

            # Form deduplication key
            key = (new_ing_pk, cleaned_name.lower(), new_mu_pk, float(quantity))

            if key in existing_portions:
                self.pk_map.add("portion", pk, existing_portions[key])
                self._count(f"Portion ({source_label})")
                continue

            if key in prepared_portions:
                prepared_portions[key].append(pk)
                continue

            prepared_portions[key] = [pk]

            # Temporary portion instance to compute weight
            temp_portion = Portion(
                name=cleaned_name,
                measuring_unit_id=new_mu_pk,
                ingredient_id=new_ing_pk,
                quantity=quantity,
                weight_g=weight_g,
                rank=self._safe_int(fields.get("rank")) or 1,
            )
            # Use central weight_g-calculation (Task 4.1)
            temp_portion.weight_g = temp_portion.compute_weight_g(temp_portion.weight_g)

            portions_to_create.append(temp_portion)

        # Bulk create portions
        total_portions = 0
        for i in range(0, len(portions_to_create), self.batch_size):
            batch = portions_to_create[i : i + self.batch_size]
            created = Portion.objects.bulk_create(batch, batch_size=self.batch_size)
            for obj in created:
                key = (obj.ingredient_id, obj.name.lower(), obj.measuring_unit_id, float(obj.quantity))
                legacy_pks = prepared_portions.get(key, [])
                for legacy_pk in legacy_pks:
                    self.pk_map.add("portion", legacy_pk, obj.pk)
                    self._count(f"Portion ({source_label})")
                existing_portions[key] = obj.pk
            total_portions += len(created)

        self.stdout.write(f"    Portions: {total_portions} erstellt (Dedupliziert/Berechnet)")

        # Prices: count and drop
        price_count = len(grouped.get("food.price", []))
        if price_count:
            self.counters[f"Price ({source_label})"]["dropped"] = price_count
            self.stdout.write(f"    Prices: {price_count} verworfen (kein Price-Model)")

    # ------------------------------------------------------------------
    # File 3: Recipes + RecipeItems
    # ------------------------------------------------------------------

    def _import_file_3_recipes(self) -> None:
        from recipe.models import Recipe, RecipeItem
        from supply.models import Portion

        entries = self._load_fixture("3_food_inspi_import_recipe_old.json")
        if not entries:
            return

        grouped = self._group_by_model(entries)

        # MetaInfo lookup (for spot-check logging only)
        metainfo_lookup: dict[int, dict] = {}
        for entry in grouped.get("food.metainfo", []):
            metainfo_lookup[entry["pk"]] = entry["fields"]

        # Also import portions from this file into the pk_map
        portion_entries = grouped.get("food.portion", [])
        if portion_entries:
            self.stdout.write(f"  Portions aus Rezept-Datei: {len(portion_entries)} Zeilen...")
            from supply.models import MeasuringUnit, Portion
            mu_cache = {mu.pk: mu for mu in MeasuringUnit.objects.all()}

            # Load existing portions for dedup
            existing_portions_qs = Portion.objects.filter(deleted_at__isnull=True).values(
                'id', 'ingredient_id', 'name', 'measuring_unit_id', 'quantity'
            )
            existing_portions = {
                (p['ingredient_id'], p['name'].strip().lower(), p['measuring_unit_id'], float(p['quantity'])): p['id']
                for p in existing_portions_qs
            }

            portions_to_create: list[Portion] = []
            prepared_portions = {}  # (ingredient_id, name.lower(), measuring_unit_id, quantity) -> list of legacy_pks

            for entry in portion_entries:
                pk = entry["pk"]
                fields = entry["fields"]

                legacy_ing_pk = fields.get("ingredient")
                new_ing_pk = self.pk_map.get("ingredient", legacy_ing_pk)
                if not new_ing_pk:
                    self._count("Portion (Recipe)", "skipped")
                    continue

                legacy_mu_pk = fields.get("measuring_unit")
                new_mu_pk = self.pk_map.get("measuring_unit", legacy_mu_pk)
                if not new_mu_pk:
                    default_mu = MeasuringUnit.objects.filter(name__icontains="gramm").first()
                    if not default_mu:
                        default_mu = MeasuringUnit.objects.first()
                    new_mu_pk = default_mu.pk if default_mu else None
                    if not new_mu_pk:
                        self._count("Portion (Recipe)", "skipped")
                        continue

                portion_meta_pk = fields.get("meta_info")
                portion_meta = metainfo_lookup.get(portion_meta_pk, {}) if portion_meta_pk else {}
                weight_g = self._safe_float(portion_meta.get("weight_g"))

                # Derive and clean name (Task 4.3)
                raw_name = fields.get("name", "") or ""
                cleaned_name = raw_name.strip()
                if not cleaned_name or cleaned_name == "g":
                    mu = mu_cache.get(new_mu_pk)
                    cleaned_name = mu.name if mu else "Stück"
                if not cleaned_name:
                    cleaned_name = "Stück"

                quantity = self._safe_float(fields.get("quantity")) or 1.0

                # Form deduplication key
                key = (new_ing_pk, cleaned_name.lower(), new_mu_pk, float(quantity))

                if key in existing_portions:
                    self.pk_map.add("portion", pk, existing_portions[key])
                    self._count("Portion (Recipe)")
                    continue

                if key in prepared_portions:
                    prepared_portions[key].append(pk)
                    continue

                prepared_portions[key] = [pk]

                # Temporary portion instance to compute weight
                temp_portion = Portion(
                    name=cleaned_name,
                    measuring_unit_id=new_mu_pk,
                    ingredient_id=new_ing_pk,
                    quantity=quantity,
                    weight_g=weight_g,
                    rank=self._safe_int(fields.get("rank")) or 1,
                )
                # Use central weight_g-calculation (Task 4.1)
                temp_portion.weight_g = temp_portion.compute_weight_g(temp_portion.weight_g)

                portions_to_create.append(temp_portion)

            total_portions = 0
            for i in range(0, len(portions_to_create), self.batch_size):
                batch = portions_to_create[i : i + self.batch_size]
                created = Portion.objects.bulk_create(batch, batch_size=self.batch_size)
                for obj in created:
                    key = (obj.ingredient_id, obj.name.lower(), obj.measuring_unit_id, float(obj.quantity))
                    legacy_pks = prepared_portions.get(key, [])
                    for legacy_pk in legacy_pks:
                        self.pk_map.add("portion", legacy_pk, obj.pk)
                        self._count("Portion (Recipe)")
                    existing_portions[key] = obj.pk
                total_portions += len(created)

            self.stdout.write(f"    Portions: {total_portions} erstellt (Dedupliziert/Berechnet)")

        # Recipes (use .save() for slug generation via Content.save())
        recipe_entries = grouped.get("food.recipe", [])
        self.stdout.write(f"  Recipes importieren: {len(recipe_entries)} Zeilen...")

        for entry in recipe_entries:
            pk = entry["pk"]
            fields = entry["fields"]
            name = fields.get("name", "")
            if not name:
                continue

            recipe = Recipe(
                title=name,
                description=fields.get("description") or "",
                owner=None,
                status="approved",
                visibility=None,
                servings=1,
            )
            recipe.save()
            self.pk_map.add("recipe", pk, recipe.pk)
            self.imported_recipe_ids.append(recipe.pk)
            self._count("Recipe")

        self.stdout.write(f"    Recipes: {self.counters['Recipe']['created']} erstellt")

        # RecipeItems
        recipeitem_entries = grouped.get("food.recipeitem", [])
        self.stdout.write(f"  RecipeItems importieren: {len(recipeitem_entries)} Zeilen...")

        # Load all portion IDs into a set for fast lookup to avoid DB queries per row
        existing_portion_ids = set(Portion.objects.values_list("id", flat=True))

        items_to_create: list[RecipeItem] = []
        skipped = 0

        for entry in recipeitem_entries:
            fields = entry["fields"]

            legacy_recipe_pk = fields.get("recipe")
            new_recipe_pk = self.pk_map.get("recipe", legacy_recipe_pk)
            if not new_recipe_pk:
                skipped += 1
                self._count("RecipeItem", "skipped")
                continue

            legacy_portion_pk = fields.get("portion")
            new_portion_pk = self.pk_map.get("portion", legacy_portion_pk)

            if not new_portion_pk or new_portion_pk not in existing_portion_ids:
                skipped += 1
                self._count("RecipeItem", "skipped")
                continue

            quantity = self._safe_float(fields.get("quantity")) or 1.0

            item = RecipeItem(
                recipe_id=new_recipe_pk,
                portion_id=new_portion_pk,
                quantity=quantity,
                sort_order=0,
                note="",
            )
            items_to_create.append(item)

        # Assign sort_order per recipe
        recipe_sort_counters: dict[int, int] = defaultdict(int)
        for item in items_to_create:
            item.sort_order = recipe_sort_counters[item.recipe_id]
            recipe_sort_counters[item.recipe_id] += 1

        # Bulk create
        total_items = 0
        for i in range(0, len(items_to_create), self.batch_size):
            batch = items_to_create[i : i + self.batch_size]
            RecipeItem.objects.bulk_create(batch, batch_size=self.batch_size)
            total_items += len(batch)
            for _ in batch:
                self._count("RecipeItem")

        self.stdout.write(f"    RecipeItems: {total_items} erstellt, {skipped} übersprungen")

    # ------------------------------------------------------------------
    # Cache Recalculation
    # ------------------------------------------------------------------

    def _recalculate_caches(self) -> None:
        from recipe.models import Recipe
        from recipe.services.recipe_checks import recalculate_recipe_cache

        self.stdout.write(self.style.MIGRATE_HEADING("Rezept-Caches neu berechnen"))
        count = 0
        errors = 0
        total = len(self.imported_recipe_ids)

        for i, recipe_id in enumerate(self.imported_recipe_ids):
            try:
                recipe = Recipe.objects.get(pk=recipe_id)
                recalculate_recipe_cache(recipe)
                count += 1
            except Exception as e:
                errors += 1
                self.stdout.write(self.style.WARNING(f"    Cache-Fehler für Recipe {recipe_id}: {e}"))

            if (i + 1) % 50 == 0 or (i + 1) == total:
                self.stdout.write(f"  {i + 1}/{total} Rezepte verarbeitet...")

        self.stdout.write(f"    {count} Caches berechnet, {errors} Fehler")

    # ------------------------------------------------------------------
    # Summary
    # ------------------------------------------------------------------

    def _print_summary(self, duration: float, dry_run: bool) -> None:
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 60))
        title = "Import abgeschlossen (DRY-RUN)" if dry_run else "Import abgeschlossen!"
        self.stdout.write(self.style.SUCCESS(title))
        self.stdout.write(self.style.SUCCESS("=" * 60))

        total_created = 0
        total_skipped = 0
        total_dropped = 0
        for entity, counts in sorted(self.counters.items()):
            created = counts["created"]
            skipped = counts["skipped"]
            dropped = counts["dropped"]
            total_created += created
            total_skipped += skipped
            total_dropped += dropped
            parts = [f"{created:>6} erstellt"]
            if skipped:
                parts.append(f"{skipped:>6} übersprungen")
            if dropped:
                parts.append(f"{dropped:>6} verworfen")
            self.stdout.write(f"  {entity:35s}  {', '.join(parts)}")

        self.stdout.write(self.style.SUCCESS("-" * 60))
        self.stdout.write(
            f"  {'GESAMT':35s}  {total_created:>6} erstellt, "
            f"{total_skipped:>6} übersprungen, {total_dropped:>6} verworfen"
        )
        self.stdout.write(f"  Laufzeit: {duration:.1f}s")

        if self.pk_map.total_misses:
            self.stdout.write(
                self.style.WARNING(f"\n  Warnung: {self.pk_map.total_misses} FK-Lookups nicht aufgelöst")
            )

        if self.warnings:
            self.stdout.write(self.style.WARNING(f"\n  {len(self.warnings)} Warnungen (fehlende MetaInfos etc.)"))
