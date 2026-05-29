"""
Management command to import Cooklang (.cook) recipe files as seed data.

Parses Cooklang syntax:
- `>> key: value` — metadata (title, servings, time, etc.)
- `@Ingredient{amount%unit}` — ingredient with quantity and unit
- `-- Section` — step section headers
- `#Cookware{}` — cookware (ignored for DB import)
- `~{time%unit}` — timer (ignored for DB import)

Usage:
    uv run python manage.py import_cooklang /path/to/cooklang/folder
    uv run python manage.py import_cooklang /path/to/cooklang/folder --dry-run
"""

import os
import re
from pathlib import Path

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils.text import slugify

User = get_user_model()

# Regex patterns for Cooklang syntax
METADATA_RE = re.compile(r"^>>\s*(\w[\w\s]*?):\s*(.+)$")
INGREDIENT_RE = re.compile(r"@([A-Za-zÄÖÜäöüß][^@{]{0,50}?)\{([^}]*)\}")
INGREDIENT_NO_BRACES_RE = re.compile(r"@([A-Za-zÄÖÜäöüß][\w\-äöüÄÖÜß]*)")
SECTION_RE = re.compile(r"^--\s*(.+)$")

# Map folder names to recipe_type
FOLDER_TO_TYPE = {
    "01 Hauptmahlzeiten": "warm_meal",
    "02 Low Calorie - High Protein": "warm_meal",
    "03 Vegan": "warm_meal",
    "04 Brot Aufstriche_ Dips_ Soßen": "side_dish",
    "05 Salate": "cold_meal",
    "06 Nachtisch_ Süßes": "dessert",
    "07 Getränke": "drink",
}


def parse_cooklang(content: str, filename: str) -> dict:
    """Parse a .cook file and return structured recipe data."""
    metadata = {}
    ingredients = []
    steps_text = []
    seen_ingredients = set()

    for line in content.split("\n"):
        line = line.strip()
        if not line:
            continue

        # Metadata
        meta_match = METADATA_RE.match(line)
        if meta_match:
            key = meta_match.group(1).strip().lower()
            value = meta_match.group(2).strip()
            metadata[key] = value
            continue

        # Section header -> add to description
        section_match = SECTION_RE.match(line)
        if section_match:
            steps_text.append(f"\n## {section_match.group(1)}\n")
            continue

        # Extract ingredients from line
        for match in INGREDIENT_RE.finditer(line):
            name = match.group(1).strip()
            qty_unit = match.group(2).strip()
            quantity = None
            unit = None
            if "%" in qty_unit:
                parts = qty_unit.split("%", 1)
                quantity = parts[0].strip()
                unit = parts[1].strip()
            elif qty_unit:
                quantity = qty_unit

            ingredient_key = name.lower()
            if ingredient_key not in seen_ingredients:
                seen_ingredients.add(ingredient_key)
                ingredients.append({
                    "name": name,
                    "quantity": quantity,
                    "unit": unit,
                })

        # Also catch @Ingredient without braces (rare)
        stripped_line = INGREDIENT_RE.sub("", line)
        for match in INGREDIENT_NO_BRACES_RE.finditer(stripped_line):
            name = match.group(1).strip()
            ingredient_key = name.lower()
            if ingredient_key not in seen_ingredients:
                seen_ingredients.add(ingredient_key)
                ingredients.append({
                    "name": name,
                    "quantity": None,
                    "unit": None,
                })

        # Clean line for description (remove cooklang syntax)
        clean_line = INGREDIENT_RE.sub(lambda m: m.group(1), line)
        clean_line = re.sub(r"#\w+\{[^}]*\}", "", clean_line)  # remove cookware
        clean_line = re.sub(r"~\{[^}]*\}", "", clean_line)  # remove timers
        clean_line = INGREDIENT_NO_BRACES_RE.sub(lambda m: m.group(1), clean_line)
        clean_line = clean_line.strip()
        if clean_line:
            steps_text.append(clean_line)

    # Title from metadata or filename
    title = metadata.get("title", Path(filename).stem)

    # Servings
    servings_raw = metadata.get("servings", "4")
    try:
        # Handle ranges like "3-4" -> take first number
        servings = int(re.match(r"(\d+)", servings_raw).group(1))
    except (AttributeError, ValueError):
        servings = 4

    return {
        "title": title,
        "servings": servings,
        "metadata": metadata,
        "ingredients": ingredients,
        "description": "\n".join(steps_text),
    }


class Command(BaseCommand):
    help = "Import Cooklang (.cook) recipe files as seed data into the Recipe model."

    def add_arguments(self, parser):
        parser.add_argument(
            "source_dir",
            type=str,
            help="Path to the directory containing .cook files (with category subfolders).",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Parse and display results without writing to DB.",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Delete all previously imported Cooklang recipes before re-importing.",
        )

    def handle(self, *args, **options):
        source_dir = Path(options["source_dir"])
        dry_run = options["dry_run"]
        force = options["force"]

        if not source_dir.exists():
            self.stderr.write(f"Directory not found: {source_dir}")
            return

        # Collect all .cook files
        cook_files = []
        for root, dirs, files in os.walk(source_dir):
            # Skip config folder
            if "config" in root:
                continue
            for f in files:
                if f.endswith(".cook"):
                    cook_files.append(Path(root) / f)

        self.stdout.write(f"Found {len(cook_files)} .cook files in {source_dir}")

        # Deduplicate: files ending with (1), (2) etc are duplicates
        deduped = {}
        for fp in cook_files:
            # Strip trailing (1), (2) etc from stem
            stem = re.sub(r"\(\d+\)$", "", fp.stem).strip()
            key = (fp.parent.name, stem.lower())
            if key not in deduped:
                deduped[key] = fp

        self.stdout.write(f"After deduplication: {len(deduped)} unique recipes")

        if dry_run:
            self._dry_run(deduped)
            return

        with transaction.atomic():
            if force:
                from recipe.models import Recipe
                deleted = Recipe.objects.filter(
                    summary__startswith="Importiert aus Cooklang"
                ).delete()
                deleted_count = deleted[0] if isinstance(deleted, tuple) else deleted
                self.stdout.write(
                    self.style.WARNING(f"Deleted {deleted_count} previously imported Cooklang recipes.")
                )
            self._import(deduped)

    def _dry_run(self, deduped: dict):
        for (folder, _), filepath in sorted(deduped.items()):
            content = filepath.read_text(encoding="utf-8", errors="replace")
            parsed = parse_cooklang(content, filepath.name)
            recipe_type = FOLDER_TO_TYPE.get(folder, "warm_meal")
            self.stdout.write(
                f"  [{recipe_type}] {parsed['title']} "
                f"(servings={parsed['servings']}, ingredients={len(parsed['ingredients'])})"
            )
            for ing in parsed["ingredients"]:
                self.stdout.write(f"    - {ing['name']}: {ing['quantity']} {ing['unit'] or ''}")

    def _import(self, deduped: dict):
        from content.choices import ContentStatus
        from recipe.models import Recipe, RecipeItem
        from supply.choices import RecipeTypeChoices
        from supply.models import Ingredient, MeasuringUnit, Portion

        # Build unit map (lowercase name -> MeasuringUnit)
        unit_map = {}
        for u in MeasuringUnit.objects.all():
            unit_map[u.name.lower()] = u

        # Common unit aliases: Cooklang string -> DB unit name (lowercase)
        # None = portion-based unit (will create/use Portion on ingredient)
        unit_aliases = {
            "gramm": "g", "gram": "g", "g": "g",
            "kilogramm": "g", "kg": "g",
            "milliliter": "ml", "ml": "ml",
            "liter": "ml", "l": "ml",
            "esslöffel": "el", "eßlöffel": "el", "el": "el",
            "teelöffel": "tl", "tl": "tl",
            "messerspitze": "msp", "msp": "msp",
            "prise": "pr", "prisen": "pr", "pr": "pr",
            "spritzer": "sp", "sp": "sp",
            "stück": None, "stk": None,
            "bund": None, "dose": None, "dosen": None,
            "becher": None, "scheibe": None, "scheiben": None,
            "packung": None, "paket": None, "päckchen": None, "tüte": None,
            "kleines paket": None, "großes paket": None,
            "pack": None, "pck.": None, "pk.": None,
            "tasse": None, "tassen": None,
            "nach belieben": "pr", "etwas": "pr",
            "kleine": None, "große": None, "mittelgroße": None,
            "zehen": None, "zehe": None,
            "handvoll": None, "glas": None,
            "kugel": None, "pinnchen": None,
            "zweige": None, "stangen": None,
            "streifen": None, "tropfen": None,
            "tube": None, "streuer": None,
            "bd.": None, "gehäufter tl": None, "gehäufter el": None,
            "ganze (65g)": None, "evtl.": None,
            "große dose": None, "dosen (à 400g)": None,
            "kleines stück": None, "großes stück": None,
            "glasfüllung": None, "zum anbraten": None,
            "cm": None, "n. b.": None,
            "zitrone": None, "hauaidbih": None,
            "ta": None,
        }

        # Default weight estimates (g) for portion-based units
        PORTION_WEIGHT_DEFAULTS = {
            "stück": 100, "stk": 100,
            "kleine": 70, "große": 150, "mittelgroße": 100,
            "kleines stück": 50, "großes stück": 200,
            "dose": 400, "dosen": 400, "große dose": 800, "dosen (à 400g)": 400,
            "packung": 500, "paket": 500, "päckchen": 40, "tüte": 40,
            "pack": 500, "pck.": 500, "pk.": 500, "kleines paket": 250, "großes paket": 1000,
            "becher": 200,
            "scheibe": 30, "scheiben": 30,
            "bund": 50, "bd.": 50,
            "tasse": 250, "tassen": 250, "ta": 250,
            "glas": 250, "glasfüllung": 250,
            "handvoll": 30,
            "zehe": 5, "zehen": 5,
            "kugel": 70, "pinnchen": 20,
            "zweige": 5, "stangen": 30,
            "streifen": 20, "tropfen": 1,
            "tube": 125, "streuer": 50,
            "gehäufter tl": 8, "gehäufter el": 20,
            "ganze (65g)": 65,
            "zitrone": 80,
            "cm": 10,
            "zum anbraten": 15,
            "evtl.": 50, "n. b.": 50, "hauaidbih": 50,
            "nach belieben": 5, "etwas": 5,
        }

        # Conversion factors: source unit (lowercase) -> multiply quantity by factor
        # Applied BEFORE unit alias resolution to convert to base units
        unit_conversions: dict[str, float] = {
            "kg": 1000.0,
            "kilogramm": 1000.0,
            "l": 1000.0,
            "liter": 1000.0,
        }

        # Build ingredient lookup (lowercase -> Ingredient)
        ingredient_map = {}
        for ing in Ingredient.objects.all():
            ingredient_map[ing.name.lower()] = ing
            for alias in ing.aliases.all():
                ingredient_map[alias.name.lower()] = ing

        gram_unit = unit_map.get("g")
        created_count = 0
        skipped_count = 0
        ingredients_created = 0
        unit_warnings = set()

        for (folder, _), filepath in sorted(deduped.items()):
            content = filepath.read_text(encoding="utf-8", errors="replace")
            parsed = parse_cooklang(content, filepath.name)
            recipe_type = FOLDER_TO_TYPE.get(folder, "warm_meal")
            servings = parsed["servings"]

            # Skip if recipe with same title exists
            if Recipe.objects.filter(title=parsed["title"]).exists():
                skipped_count += 1
                continue

            recipe = Recipe.objects.create(
                title=parsed["title"],
                summary=f"Importiert aus Cooklang ({folder})",
                description=parsed["description"],
                servings=servings,
                recipe_type=recipe_type,
                status=ContentStatus.APPROVED,
                owner=None,
            )

            # Create RecipeItems
            for sort_idx, ing_data in enumerate(parsed["ingredients"]):
                ing_name = ing_data["name"]
                quantity_raw = ing_data["quantity"]
                unit_raw = ing_data["unit"]

                # Parse quantity (handle ranges like "1-2" -> take first)
                quantity = None
                if quantity_raw:
                    try:
                        quantity = float(
                            re.match(r"[\d.,]+", quantity_raw.replace(",", ".")).group(0)
                        )
                    except (AttributeError, ValueError):
                        # Try fraction like "1/2"
                        frac_match = re.match(r"(\d+)/(\d+)", quantity_raw)
                        if frac_match:
                            quantity = int(frac_match.group(1)) / int(frac_match.group(2))
                        else:
                            quantity = 1.0

                if quantity is None:
                    quantity = 1.0

                # Resolve unit and apply conversion factors
                measuring_unit = None
                is_portion_unit = False
                unit_key = ""
                if unit_raw:
                    unit_key = unit_raw.lower().strip()

                    # Apply conversion factor (kg→g, L→ml)
                    conversion_factor = unit_conversions.get(unit_key)
                    if conversion_factor:
                        quantity = quantity * conversion_factor

                    resolved = unit_aliases.get(unit_key, unit_key)
                    if resolved is not None:
                        measuring_unit = unit_map.get(resolved)
                        if not measuring_unit:
                            # Unknown unit not in aliases — treat as portion-based
                            is_portion_unit = True
                            if unit_key not in unit_warnings:
                                unit_warnings.add(unit_key)
                                self.stderr.write(
                                    self.style.WARNING(f"  Unit '{unit_raw}' → portion-based (weight_g={PORTION_WEIGHT_DEFAULTS.get(unit_key, 100)})")
                                )
                    else:
                        # resolved=None → portion-based unit (Stück, Dose, etc.)
                        is_portion_unit = True
                else:
                    # No unit specified — default to gram
                    measuring_unit = gram_unit

                # Convert to per-person quantity (after unit conversion)
                quantity_per_person = quantity / servings

                # Resolve ingredient (auto-create if not found)
                ingredient = ingredient_map.get(ing_name.lower())
                if not ingredient:
                    slug = slugify(ing_name, allow_unicode=True)[:280] or f"ingredient-{ing_name[:20]}"
                    ingredient = Ingredient.objects.filter(slug=slug).first()
                    if not ingredient:
                        ingredient = Ingredient.objects.create(
                            name=ing_name,
                            slug=slug,
                            status="user_content",
                            physical_viscosity="solid",
                            physical_density=1.0,
                        )
                        # Create default "1 g" portion
                        if gram_unit:
                            Portion.objects.create(
                                name="",
                                measuring_unit=gram_unit,
                                ingredient=ingredient,
                                quantity=1.0,
                                weight_g=1.0,
                            )
                        ingredients_created += 1
                    ingredient_map[ing_name.lower()] = ingredient

                # For portion-based units: find or create a Portion on the ingredient
                portion_ref = None
                if is_portion_unit and ingredient:
                    # Normalize portion name for display
                    portion_name = unit_raw.strip() if unit_raw else "Stück"
                    weight_g = PORTION_WEIGHT_DEFAULTS.get(unit_key, 100)

                    # Look for existing portion with this name
                    portion_ref = Portion.objects.filter(
                        ingredient=ingredient,
                        name__iexact=portion_name,
                    ).first()

                    if not portion_ref and gram_unit:
                        portion_ref = Portion.objects.create(
                            name=portion_name,
                            measuring_unit=gram_unit,
                            ingredient=ingredient,
                            quantity=1.0,
                            weight_g=weight_g,
                        )

                    # For portion-based items, quantity is in "portions" not grams
                    # measuring_unit stays None (display comes from portion name)
                    measuring_unit = None

                # Store original unit text in note if unit was not in aliases
                note = ""
                if unit_raw and is_portion_unit and unit_key not in unit_aliases:
                    note = f"Einheit: {unit_raw.strip()}"

                RecipeItem.objects.create(
                    recipe=recipe,
                    ingredient=ingredient,
                    portion=portion_ref,
                    quantity=quantity_per_person,
                    measuring_unit=measuring_unit,
                    sort_order=sort_idx,
                    note=note,
                )

            created_count += 1
            self.stdout.write(f"  + {parsed['title']} ({len(parsed['ingredients'])} ingredients)")

        self.stdout.write(
            self.style.SUCCESS(
                f"\nImport complete: {created_count} recipes created, {skipped_count} skipped (already exist), "
                f"{ingredients_created} new ingredients auto-created."
            )
        )
