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
INGREDIENT_RE = re.compile(r"@([^@{]+?)\{([^}]*)\}")
INGREDIENT_NO_BRACES_RE = re.compile(r"@([\w\-äöüÄÖÜß]+)")
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

    def handle(self, *args, **options):
        source_dir = Path(options["source_dir"])
        dry_run = options["dry_run"]

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

        # Build unit map
        unit_map = {}
        for u in MeasuringUnit.objects.all():
            unit_map[u.name.lower()] = u

        # Common unit aliases
        unit_aliases = {
            "g": "gramm",
            "kg": "kilogramm",
            "ml": "milliliter",
            "l": "liter",
            "el": "esslöffel",
            "tl": "teelöffel",
            "stück": "stück",
            "stk": "stück",
            "prise": "prise",
            "prisen": "prise",
            "bund": "bund",
            "dose": "dose",
            "dosen": "dose",
            "becher": "becher",
            "scheibe": "scheibe",
            "scheiben": "scheibe",
            "portion": "portion",
            "portionen": "portion",
            "glas": "glas",
            "kleine": "stück",
            "kleines stück": "stück",
            "großes stück": "stück",
            "große": "stück",
            "etwas": "prise",
            "nach belieben": "prise",
        }

        # Build ingredient lookup (lowercase -> Ingredient)
        ingredient_map = {}
        for ing in Ingredient.objects.all():
            ingredient_map[ing.name.lower()] = ing
            # Also index aliases
            for alias in ing.aliases.all():
                ingredient_map[alias.name.lower()] = ing

        gram_unit = unit_map.get("gramm")
        created_count = 0
        skipped_count = 0
        ingredients_created = 0

        for (folder, _), filepath in sorted(deduped.items()):
            content = filepath.read_text(encoding="utf-8", errors="replace")
            parsed = parse_cooklang(content, filepath.name)
            recipe_type = FOLDER_TO_TYPE.get(folder, "warm_meal")

            # Skip if recipe with same title exists
            if Recipe.objects.filter(title=parsed["title"]).exists():
                skipped_count += 1
                continue

            recipe = Recipe.objects.create(
                title=parsed["title"],
                summary=f"Importiert aus Cooklang ({folder})",
                description=parsed["description"],
                servings=parsed["servings"],
                recipe_type=recipe_type,
                status=ContentStatus.APPROVED,
                owner=None,  # system recipe
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
                        quantity = float(re.match(r"[\d.,/]+", quantity_raw.replace(",", ".")).group(0).replace("/", ""))
                    except (AttributeError, ValueError):
                        # Try fraction like "1/2"
                        frac_match = re.match(r"(\d+)/(\d+)", quantity_raw)
                        if frac_match:
                            quantity = int(frac_match.group(1)) / int(frac_match.group(2))
                        else:
                            quantity = 1.0

                # Resolve unit
                measuring_unit = None
                if unit_raw:
                    unit_key = unit_raw.lower().strip()
                    resolved = unit_aliases.get(unit_key, unit_key)
                    measuring_unit = unit_map.get(resolved)

                if not measuring_unit:
                    measuring_unit = gram_unit

                # Resolve ingredient (auto-create if not found)
                ingredient = ingredient_map.get(ing_name.lower())
                if not ingredient:
                    slug = slugify(ing_name, allow_unicode=True)[:280] or f"ingredient-{ing_name[:20]}"
                    # Check DB by slug in case it exists but wasn't in our map
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

                RecipeItem.objects.create(
                    recipe=recipe,
                    ingredient=ingredient,
                    portion=None,
                    quantity=quantity or 1.0,
                    measuring_unit=measuring_unit,
                    sort_order=sort_idx,
                    note="",
                )

            created_count += 1
            self.stdout.write(f"  + {parsed['title']} ({len(parsed['ingredients'])} ingredients)")

        self.stdout.write(
            self.style.SUCCESS(
                f"\nImport complete: {created_count} recipes created, {skipped_count} skipped (already exist), "
                f"{ingredients_created} new ingredients auto-created."
            )
        )
