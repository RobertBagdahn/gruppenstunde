"""Fix ingredient names (ugly REWE names) and fill missing nutritional data via AI.

Usage:
    uv run python manage.py fix_ingredients --dry-run          # Preview changes
    uv run python manage.py fix_ingredients --fix-names        # Only fix ugly names
    uv run python manage.py fix_ingredients --fill-data        # Only fill missing data
    uv run python manage.py fix_ingredients --fix-names --fill-data  # Both
"""

from __future__ import annotations

import logging
import re
import time

from django.core.management.base import BaseCommand
from django.db.models import Q
from pydantic import BaseModel, Field

from core.services.gemini import GeminiUnavailableError, gemini_call
from supply.models import Ingredient
from supply.services.nutri_service import update_ingredient_nutri_score

logger = logging.getLogger(__name__)


class CleanNameSchema(BaseModel):
    """AI response for cleaning an ingredient name."""

    clean_name: str = Field(description="Bereinigter, lesbarer deutscher Name der Zutat")


class NutritionFillSchema(BaseModel):
    """AI response for filling missing nutrition data."""

    energy_kj: float | None = Field(None, description="Energie in kJ pro 100g")
    protein_g: float | None = Field(None, description="Eiweiß in g pro 100g")
    fat_g: float | None = Field(None, description="Fett in g pro 100g")
    fat_sat_g: float | None = Field(None, description="Gesättigte Fettsäuren in g pro 100g")
    carbohydrate_g: float | None = Field(None, description="Kohlenhydrate in g pro 100g")
    sugar_g: float | None = Field(None, description="Zucker in g pro 100g")
    fibre_g: float | None = Field(None, description="Ballaststoffe in g pro 100g")
    salt_g: float | None = Field(None, description="Salz in g pro 100g")
    sodium_mg: float | None = Field(None, description="Natrium in mg pro 100g")
    nova_score: int | None = Field(None, description="NOVA-Verarbeitungsgrad (1-4)")
    child_score: int | None = Field(None, description="Kinderfreundlichkeit (1-10)")
    scout_score: int | None = Field(None, description="Pfadfindereignung (1-10)")
    environmental_score: int | None = Field(None, description="Umweltfreundlichkeit (1-10)")
    fruit_factor: float | None = Field(None, description="Obst-/Gemüse-Anteil (0.0-1.0)")
    physical_density: float | None = Field(None, description="Dichte in g/ml")
    physical_viscosity: str | None = Field(None, description="'solid', 'beverage', oder 'powder'")


GEMINI_MODEL = "gemini-3.1-flash-lite-preview"


def is_ugly_name(name: str) -> bool:
    """Detect ugly REWE-style names like '10 STEINOFENBROETCHEN', 'KNACK&BACK SONNTAGSBROETCHEN'."""
    # All caps with more than 3 chars
    if len(name) > 3 and name == name.upper():
        return True
    # Starts with a number followed by space
    if re.match(r"^\d+\s+", name):
        return True
    # Contains 'OE', 'UE', 'AE' as umlaut replacements in all-caps context
    if re.search(r"[A-Z](?:OE|UE|AE)[A-Z]", name):
        return True
    # KNACK&BACK style brand prefixes in caps
    if re.match(r"^[A-Z&]+\s", name) and len(name.split()[0]) > 3:
        return True
    return False


def clean_name_via_ai(name: str) -> str | None:
    """Use AI to generate a clean German name for a product."""
    from google.genai import types

    prompt = (
        f"Der folgende Name stammt aus einem REWE-Supermarkt-Import und ist hässlich formatiert: '{name}'\n\n"
        f"Erstelle einen sauberen, lesbaren deutschen Namen für diese Zutat. Regeln:\n"
        f"- Normale Groß-/Kleinschreibung (kein ALL CAPS)\n"
        f"- Echte Umlaute verwenden (ä, ö, ü, ß statt ae, oe, ue, ss)\n"
        f"- Keine Mengenangaben am Anfang (z.B. '10 Steinofenbrötchen' → 'Steinofenbrötchen')\n"
        f"- Keine Markennamen (z.B. 'KNACK&BACK' weglassen)\n"
        f"- Wenn es ein Tiefkühlprodukt ist (erkennbar am Kontext), 'Tiefkühl' voranstellen\n"
        f"- Kurz und prägnant, wie man es in einem Rezept schreiben würde\n"
    )

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=CleanNameSchema,
    )

    try:
        response = gemini_call(
            user=None,
            model=GEMINI_MODEL,
            contents=prompt,
            config=config,
            context="fix_ingredient_name",
            bypass_limits=True,
        )
        if response:
            result = CleanNameSchema.model_validate_json(response.text)
            return result.clean_name
    except (GeminiUnavailableError, Exception) as e:
        logger.warning(f"AI name fix failed for '{name}': {e}")
    return None


def fill_missing_data_via_ai(ingredient: Ingredient) -> dict | None:
    """Use AI to fill missing nutritional data."""
    from google.genai import types

    missing_fields = []
    # Treat 0 as missing for nutrition fields (legacy import set everything to 0)
    if not ingredient.energy_kj:
        missing_fields.append("energy_kj")
    if not ingredient.protein_g:
        missing_fields.append("protein_g")
    if not ingredient.fat_g:
        missing_fields.append("fat_g")
    if ingredient.fat_sat_g is None:
        missing_fields.append("fat_sat_g")
    if not ingredient.carbohydrate_g:
        missing_fields.append("carbohydrate_g")
    if not ingredient.sugar_g:
        missing_fields.append("sugar_g")
    if not ingredient.fibre_g:
        missing_fields.append("fibre_g")
    if not ingredient.salt_g:
        missing_fields.append("salt_g")
    if ingredient.nova_score is None:
        missing_fields.append("nova_score")
    if ingredient.child_score is None:
        missing_fields.append("child_score")
    if ingredient.scout_score is None:
        missing_fields.append("scout_score")
    if ingredient.environmental_score is None:
        missing_fields.append("environmental_score")
    if ingredient.fruit_factor is None:
        missing_fields.append("fruit_factor")

    if not missing_fields:
        return None

    prompt = (
        f"Recherchiere die fehlenden Nährwerte und Bewertungen für das Lebensmittel '{ingredient.name}'.\n"
        f"Fehlende Felder: {', '.join(missing_fields)}\n\n"
        f"Verwende offizielle Nährwert-Datenbanken. "
        f"Gib nur die fehlenden Felder zurück, setze bekannte auf den korrekten Wert und unbekannte auf null."
    )

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=NutritionFillSchema,
    )

    try:
        response = gemini_call(
            user=None,
            model=GEMINI_MODEL,
            contents=prompt,
            config=config,
            context="fix_ingredient_fill",
            bypass_limits=True,
        )
        if response:
            result = NutritionFillSchema.model_validate_json(response.text)
            return {k: v for k, v in result.model_dump().items() if v is not None and k in missing_fields}
    except (GeminiUnavailableError, Exception) as e:
        logger.warning(f"AI fill failed for '{ingredient.name}': {e}")
    return None


class Command(BaseCommand):
    help = "Fix ugly ingredient names and fill missing nutritional data via AI"

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Preview without saving")
        parser.add_argument("--fix-names", action="store_true", help="Fix ugly REWE names")
        parser.add_argument("--fill-data", action="store_true", help="Fill missing nutritional data")
        parser.add_argument("--limit", type=int, default=0, help="Max ingredients to process (0=all)")

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        fix_names = options["fix_names"]
        fill_data = options["fill_data"]
        limit = options["limit"]

        if not fix_names and not fill_data:
            self.stdout.write(self.style.ERROR("Specify --fix-names and/or --fill-data"))
            return

        if dry_run:
            self.stdout.write(self.style.WARNING("=== DRY RUN ==="))

        if fix_names:
            self._fix_names(dry_run, limit)

        if fill_data:
            self._fill_data(dry_run, limit)

    def _fix_names(self, dry_run: bool, limit: int):
        self.stdout.write(self.style.MIGRATE_HEADING("Fixing ugly names..."))

        ingredients = Ingredient.objects.all().order_by("name")
        ugly = [i for i in ingredients if is_ugly_name(i.name)]

        self.stdout.write(f"Found {len(ugly)} ingredients with ugly names")

        if limit:
            ugly = ugly[:limit]

        fixed = 0
        for ing in ugly:
            clean = clean_name_via_ai(ing.name)
            if clean and clean != ing.name:
                self.stdout.write(f"  '{ing.name}' → '{clean}'")
                if not dry_run:
                    ing.name = clean
                    ing.slug = self._unique_slug(clean, ing.pk)
                    ing.save(update_fields=["name", "slug"])
                fixed += 1
                time.sleep(0.5)  # Rate limiting
            else:
                self.stdout.write(f"  '{ing.name}' → (no change)")

        self.stdout.write(self.style.SUCCESS(f"Fixed {fixed}/{len(ugly)} names"))

    def _fill_data(self, dry_run: bool, limit: int):
        self.stdout.write(self.style.MIGRATE_HEADING("Filling missing nutritional data..."))

        # Find ingredients with missing core data (0 counts as missing for nutrition)
        ingredients = Ingredient.objects.filter(
            Q(energy_kj__isnull=True) | Q(energy_kj=0)
            | Q(protein_g__isnull=True) | Q(protein_g=0)
            | Q(fat_g__isnull=True) | Q(fat_g=0)
            | Q(carbohydrate_g__isnull=True) | Q(carbohydrate_g=0)
            | Q(nova_score__isnull=True)
            | Q(child_score__isnull=True)
            | Q(scout_score__isnull=True)
            | Q(environmental_score__isnull=True)
        ).order_by("name")

        self.stdout.write(f"Found {ingredients.count()} ingredients with missing data")

        if limit:
            ingredients = ingredients[:limit]

        filled = 0
        for ing in ingredients:
            data = fill_missing_data_via_ai(ing)
            if data:
                fields_updated = []
                for field, value in data.items():
                    setattr(ing, field, value)
                    fields_updated.append(field)

                self.stdout.write(f"  '{ing.name}': filled {', '.join(fields_updated)}")
                if not dry_run:
                    ing.save(update_fields=fields_updated)
                    # Recalculate nutri score
                    update_ingredient_nutri_score(ing)
                filled += 1
                time.sleep(0.5)  # Rate limiting
            else:
                self.stdout.write(f"  '{ing.name}': nothing to fill")

        self.stdout.write(self.style.SUCCESS(f"Filled data for {filled} ingredients"))

    def _unique_slug(self, name: str, exclude_pk: int) -> str:
        from django.utils.text import slugify

        base = slugify(name)
        slug = base
        counter = 1
        while Ingredient.objects.filter(slug=slug).exclude(pk=exclude_pk).exists():
            slug = f"{base}-{counter}"
            counter += 1
        return slug
