"""
Enrich seed data: import fixtures, fill missing data, export clean fixtures.

Imports all food fixture data from backend/data/, enriches it via Django ORM
(filling missing nutrients, fixing generic names, cleaning portions, generating
aliases, recalculating recipe caches, regenerating embeddings), and exports
clean fixture files via dumpdata.

Usage:
    uv run python manage.py enrich_seeds
    uv run python manage.py enrich_seeds --data-dir /path/to/data
    uv run python manage.py enrich_seeds --dry-run
    uv run python manage.py enrich_seeds --skip-embeddings
"""

from __future__ import annotations

import hashlib
import json
import os
from collections import Counter
from contextlib import contextmanager
from dataclasses import dataclass, field
from decimal import Decimal
from pathlib import Path
from typing import Any

from django.core.management import call_command
from django.core.management.base import BaseCommand, CommandError
from django.db import models, transaction

DEFAULT_DATA_DIR = Path(__file__).resolve().parent.parent.parent.parent / "data"

# Valid ranges for AI-estimated nutrients
NUTRIENT_RANGES: dict[str, tuple[float, float]] = {
    "energy_kcal": (0, 900),
    "protein_g": (0, 100),
    "fat_g": (0, 100),
    "fat_sat_g": (0, 100),
    "carbohydrate_g": (0, 100),
    "sugar_g": (0, 100),
    "fibre_g": (0, 60),
    "salt_g": (0, 100),
}

# Default portion definitions by retail section pattern
PORTION_DEFAULTS: dict[str, list[dict]] = {
    "Gemüse": [
        {"name": "1 Stück (150g)", "quantity": 1.0, "weight_g": 150.0, "rank": 1, "unit": "stk"},
        {"name": "100g", "quantity": 100.0, "weight_g": 100.0, "rank": 2, "unit": "g"},
        {"name": "1 kg (Netz)", "quantity": 1000.0, "weight_g": 1000.0, "rank": 8, "unit": "g"},
    ],
    "Obst": [
        {"name": "1 Stück (150g)", "quantity": 1.0, "weight_g": 150.0, "rank": 1, "unit": "stk"},
        {"name": "100g", "quantity": 100.0, "weight_g": 100.0, "rank": 2, "unit": "g"},
        {"name": "1 kg (Schale)", "quantity": 1000.0, "weight_g": 1000.0, "rank": 8, "unit": "g"},
    ],
    "Gewürze & Kräuter": [
        {"name": "1 TL (2g)", "quantity": 2.0, "weight_g": 2.0, "rank": 1, "unit": "g"},
        {"name": "1 Prise (0,5g)", "quantity": 0.5, "weight_g": 0.5, "rank": 2, "unit": "g"},
        {"name": "50g (Streuer)", "quantity": 50.0, "weight_g": 50.0, "rank": 8, "unit": "g"},
    ],
    "Fleisch & Wurst": [
        {"name": "1 Portion (150g)", "quantity": 150.0, "weight_g": 150.0, "rank": 1, "unit": "g"},
        {"name": "100g", "quantity": 100.0, "weight_g": 100.0, "rank": 2, "unit": "g"},
        {"name": "500g (Packung)", "quantity": 500.0, "weight_g": 500.0, "rank": 8, "unit": "g"},
    ],
    "Fisch & Meeresfrüchte": [
        {"name": "1 Portion (150g)", "quantity": 150.0, "weight_g": 150.0, "rank": 1, "unit": "g"},
        {"name": "100g", "quantity": 100.0, "weight_g": 100.0, "rank": 2, "unit": "g"},
    ],
    "Milchprodukte & Käse": [
        {"name": "100g", "quantity": 100.0, "weight_g": 100.0, "rank": 1, "unit": "g"},
        {"name": "200g", "quantity": 200.0, "weight_g": 200.0, "rank": 2, "unit": "g"},
        {"name": "500g (Becher)", "quantity": 500.0, "weight_g": 500.0, "rank": 8, "unit": "g"},
    ],
    "Öle & Soßen": [
        {"name": "1 EL (10ml)", "quantity": 10.0, "weight_g": 10.0, "rank": 1, "unit": "ml"},
        {"name": "100 ml", "quantity": 100.0, "weight_g": 100.0, "rank": 2, "unit": "ml"},
        {"name": "500 ml (Flasche)", "quantity": 500.0, "weight_g": 500.0, "rank": 8, "unit": "ml"},
    ],
    "Nudeln & Reis & Getreide": [
        {"name": "1 Portion trocken (100g)", "quantity": 100.0, "weight_g": 100.0, "rank": 1, "unit": "g"},
        {"name": "100g", "quantity": 100.0, "weight_g": 100.0, "rank": 2, "unit": "g"},
        {"name": "500g (Packung)", "quantity": 500.0, "weight_g": 500.0, "rank": 8, "unit": "g"},
    ],
    "Brot & Backwaren": [
        {"name": "1 Scheibe (50g)", "quantity": 50.0, "weight_g": 50.0, "rank": 1, "unit": "g"},
        {"name": "100g", "quantity": 100.0, "weight_g": 100.0, "rank": 2, "unit": "g"},
        {"name": "500g (Laib)", "quantity": 500.0, "weight_g": 500.0, "rank": 8, "unit": "g"},
    ],
    "Getränke": [
        {"name": "200 ml", "quantity": 200.0, "weight_g": 200.0, "rank": 1, "unit": "ml"},
        {"name": "1 Liter", "quantity": 1000.0, "weight_g": 1000.0, "rank": 2, "unit": "ml"},
        {"name": "1,5 Liter (Flasche)", "quantity": 1500.0, "weight_g": 1500.0, "rank": 8, "unit": "ml"},
    ],
    "Hülsenfrüchte & Nüsse": [
        {"name": "1 Handvoll (30g)", "quantity": 30.0, "weight_g": 30.0, "rank": 1, "unit": "g"},
        {"name": "100g", "quantity": 100.0, "weight_g": 100.0, "rank": 2, "unit": "g"},
        {"name": "500g (Packung)", "quantity": 500.0, "weight_g": 500.0, "rank": 8, "unit": "g"},
    ],
    "Konserven & Gläser": [
        {"name": "100g", "quantity": 100.0, "weight_g": 100.0, "rank": 1, "unit": "g"},
        {"name": "200g", "quantity": 200.0, "weight_g": 200.0, "rank": 2, "unit": "g"},
        {"name": "400g (Dose)", "quantity": 400.0, "weight_g": 400.0, "rank": 8, "unit": "g"},
    ],
    "Süßwaren": [
        {"name": "1 Stück (25g)", "quantity": 25.0, "weight_g": 25.0, "rank": 1, "unit": "g"},
        {"name": "100g", "quantity": 100.0, "weight_g": 100.0, "rank": 2, "unit": "g"},
        {"name": "100g (Tafel)", "quantity": 100.0, "weight_g": 100.0, "rank": 8, "unit": "g"},
    ],
}


@dataclass
class EnrichmentReport:
    """Tracks all changes made during enrichment."""

    ingredients_renamed: int = 0
    nutrients_filled: int = 0
    portions_deleted: int = 0
    portions_created: int = 0
    aliases_created: int = 0
    recipe_caches_updated: int = 0
    embeddings_regenerated: int = 0
    ingredients_skipped: int = 0
    ingredients_unmatched: int = 0
    viscosities_fixed: int = 0
    nutri_scores_calculated: int = 0
    _nutrient_field_counts: Counter = field(default_factory=Counter)

    def add_nutrient(self, field: str) -> None:
        self._nutrient_field_counts[field] += 1
        self.nutrients_filled += 1

    def print_report(self, stdout) -> None:
        lines = [
            "",
            "=" * 50,
            "  ENRICHMENT REPORT",
            "=" * 50,
            f"  Ingredients renamed:     {self.ingredients_renamed}",
            f"  Nutrients filled:        {self.nutrients_filled}",
            f"  Portions deleted:        {self.portions_deleted}",
            f"  Portions created:        {self.portions_created}",
            f"  Aliases created:         {self.aliases_created}",
            f"  Recipe caches updated:   {self.recipe_caches_updated}",
            f"  Embeddings regenerated:  {self.embeddings_regenerated}",
            f"  Ingredients skipped:     {self.ingredients_skipped}",
            f"  Ingredients unmatched:   {self.ingredients_unmatched}",
            f"  Viscosities fixed:       {self.viscosities_fixed}",
            f"  Nutri-scores calculated: {self.nutri_scores_calculated}",
            "=" * 50,
            "",
        ]
        for line in lines:
            stdout.write(line)

@contextmanager
def _silence_signals():
    import recipe.signals  # noqa: F401
    import supply.signals  # noqa: F401
    from django.db.models.signals import post_delete, post_save, pre_save

    signals = [pre_save, post_save, post_delete]
    saved: dict[int, list] = {}
    for sig in signals:
        saved[id(sig)] = sig.receivers[:]
        sig.receivers = []
    try:
        yield
    finally:
        for sig in signals:
            sig.receivers = saved[id(sig)]


def _get_generic_term_names() -> set[str]:
    from supply.data.ingredient_specs import GENERIC_TERM_MAP
    return {name.lower() for name in GENERIC_TERM_MAP}


class Command(BaseCommand):
    help = "Enrich seed data: import fixtures, fill missing data, export clean fixtures."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument(
            "--data-dir",
            type=str,
            default=str(DEFAULT_DATA_DIR),
            help=f"Data directory (default: {DEFAULT_DATA_DIR})",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show what would be done without making changes",
        )
        parser.add_argument(
            "--skip-embeddings",
            action="store_true",
            help="Skip embedding regeneration (faster for testing)",
        )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.report = EnrichmentReport()

    def handle(self, *args: Any, **options: Any) -> None:
        self._data_dir = Path(options["data_dir"])
        dry_run = options["dry_run"]
        skip_embeddings = options["skip_embeddings"]

        self._verify_fixtures(self._data_dir)

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — no changes will be made"))
        else:
            self._ensure_data_loaded(self._data_dir)

        self._run_enrichment(dry_run, skip_embeddings)

        if not dry_run:
            self._export_fixtures(self._data_dir, skip_embeddings)

        self.report.print_report(self.stdout)

    # ------------------------------------------------------------------
    # Setup
    # ------------------------------------------------------------------

    def _verify_fixtures(self, data_dir: Path) -> None:
        food_dir = data_dir / "food"
        required = ["supply_ingredient.json", "supply_portion.json", "recipe_recipe.json"]
        for fname in required:
            if not (food_dir / fname).exists():
                raise CommandError(f"Fixture missing: {food_dir / fname}")

    def _ensure_data_loaded(self, data_dir: Path) -> None:
        from supply.models import Ingredient
        if Ingredient.objects.count() < 100:
            self.stdout.write("Importing fixtures...")
            with _silence_signals():
                call_command("import_prod_data", data_dir=str(data_dir), only="masterdata")
                call_command("import_prod_data", data_dir=str(data_dir), only="food")

    # ------------------------------------------------------------------
    # Enrichment
    # ------------------------------------------------------------------

    def _run_enrichment(self, dry_run: bool, skip_embeddings: bool) -> None:
        from supply.models import Ingredient
        from supply.data.ingredient_specs import get_all_specs

        specs = get_all_specs(data_dir=str(self._data_dir))
        spec_by_name = {s.canonical_name.lower(): s for s in specs}
        generic_names = _get_generic_term_names()

        ingredients = list(Ingredient.objects.all().order_by("id"))
        self.stdout.write(f"Processing {len(ingredients)} ingredients...")

        with _silence_signals():
            for i, ingredient in enumerate(ingredients):
                if (i + 1) % 500 == 0:
                    self.stdout.write(f"  {i + 1}/{len(ingredients)}...")

                if not dry_run and self._is_already_enriched(ingredient, generic_names):
                    self.report.ingredients_skipped += 1
                    continue

                spec = self._match_to_spec(ingredient, spec_by_name, specs)
                if spec:
                    if not dry_run:
                        self._apply_spec(ingredient, spec)
                    self._rename_if_generic(ingredient, spec, generic_names, dry_run)
                    self._enrich_nutrients(ingredient, spec, dry_run)
                    self._fix_structure(ingredient, spec, dry_run)
                else:
                    self.report.ingredients_unmatched += 1

            if not dry_run:
                self._cleanup_portions(specs)
                self._generate_aliases(specs)
                self._generate_generic_aliases(generic_names)

        self._recalculate_recipe_caches(dry_run)
        self._recalculate_nutri_scores(dry_run)
        if not skip_embeddings and not dry_run:
            self._regenerate_embeddings()

    # ------------------------------------------------------------------
    # Matching
    # ------------------------------------------------------------------

    def _is_already_enriched(self, ingredient, generic_names: set[str]) -> bool:
        from supply.models import Portion

        name_lower = ingredient.name.lower().strip()
        if name_lower in generic_names:
            return False
        if not ingredient.energy_kcal or ingredient.energy_kcal <= 0:
            legit_zero = name_lower in ("leitungswasser",) or any(
                kw in name_lower for kw in ("salz", "pfeffer", "gewürz", "kräuter", "essig")
            )
            if not legit_zero:
                return False
        rank1 = Portion.objects.filter(
            ingredient=ingredient, deleted_at__isnull=True, rank=1
        ).first()
        if rank1 and (rank1.weight_g is None or rank1.weight_g <= 1.0):
            return False
        return True

    def _match_to_spec(self, ingredient, spec_by_name: dict, specs: list) -> object | None:
        name_lower = ingredient.name.lower().strip()

        if name_lower in spec_by_name:
            return spec_by_name[name_lower]

        for spec in specs:
            if name_lower in [n.lower() for n in spec.rewe_product_names]:
                return spec

            if name_lower in [n.lower() for n in spec.generic_names]:
                return spec

            for alias in spec.aliases:
                alias_lower = alias.lower()
                if alias_lower in name_lower or name_lower in alias_lower:
                    return spec

        return None

    # ------------------------------------------------------------------
    # Name Concretization
    # ------------------------------------------------------------------

    def _rename_if_generic(self, ingredient, spec, generic_names: set[str], dry_run: bool) -> None:
        name_lower = ingredient.name.lower().strip()
        if name_lower in generic_names and spec.canonical_name.lower() != name_lower:
            if dry_run:
                self.report.ingredients_renamed += 1
            else:
                ingredient.name = spec.canonical_name
                ingredient.slug = ""
                ingredient.save()
                self.report.ingredients_renamed += 1

    # ------------------------------------------------------------------
    # Nutritional Enrichment
    # ------------------------------------------------------------------

    def _enrich_nutrients(self, ingredient, spec, dry_run: bool) -> None:
        nutrient_fields = [
            "energy_kcal", "protein_g", "fat_g", "fat_sat_g", "carbohydrate_g",
            "sugar_g", "fibre_g", "salt_g", "sodium_mg", "fructose_g",
            "lactose_g", "vitamin_c_mg",
        ]
        updated = False
        for field in nutrient_fields:
            current = getattr(ingredient, field, None)
            spec_val = getattr(spec, field, None)
            if (current is None or current == 0) and spec_val is not None:
                if not dry_run:
                    setattr(ingredient, field, spec_val)
                self.report.add_nutrient(field)
                updated = True

        if not ingredient.price_per_kg and spec.price_per_kg:
            if not dry_run:
                ingredient.price_per_kg = spec.price_per_kg
            self.report.add_nutrient("price_per_kg")
            updated = True

        if updated and not dry_run:
            ingredient.save()

    def _recalculate_nutri_scores(self, dry_run: bool) -> None:
        from supply.models import Ingredient
        from supply.services.nutri_service import calculate_nutri_score

        ingredients = Ingredient.objects.filter(
            nutri_score__isnull=True, energy_kcal__gt=0
        )
        count = ingredients.count()
        if dry_run:
            self.report.nutri_scores_calculated = count
            return

        for ingredient in ingredients:
            try:
                ns_total, ns_class = calculate_nutri_score(ingredient)
                ingredient.nutri_score = ns_total
                ingredient.nutri_class = ns_class
                ingredient.save(update_fields=["nutri_score", "nutri_class"])
                self.report.nutri_scores_calculated += 1
            except Exception:
                pass

    # ------------------------------------------------------------------
    # Structural Fixes
    # ------------------------------------------------------------------

    def _apply_spec(self, ingredient, spec) -> None:
        updated = False
        if spec.description and not ingredient.description:
            ingredient.description = spec.description
            updated = True
        if spec.physical_density != 1.0:
            ingredient.physical_density = spec.physical_density
            updated = True
        if ingredient.physical_viscosity == "solid" and spec.physical_viscosity != "solid":
            ingredient.physical_viscosity = spec.physical_viscosity
            self.report.viscosities_fixed += 1
            updated = True
        if updated:
            ingredient.save()

    def _fix_structure(self, ingredient, spec, dry_run: bool) -> None:
        if spec.physical_viscosity != "solid" and ingredient.physical_viscosity == "solid":
            if not dry_run:
                ingredient.physical_viscosity = spec.physical_viscosity
                ingredient.save(update_fields=["physical_viscosity"])
            self.report.viscosities_fixed += 1

    # ------------------------------------------------------------------
    # Portions
    # ------------------------------------------------------------------

    def _cleanup_portions(self, specs: list) -> None:
        from supply.models import Ingredient, MeasuringUnit, Portion

        g_unit = MeasuringUnit.objects.filter(name="g").first()
        spec_by_name = {s.canonical_name.lower(): s for s in specs}

        ingredients = Ingredient.objects.all()
        total = ingredients.count()
        for idx, ingredient in enumerate(ingredients):
            if (idx + 1) % 1000 == 0:
                self.stdout.write(f"  Portions: {idx + 1}/{total}...")

            name_lower = ingredient.name.lower().strip()
            spec = spec_by_name.get(name_lower)
            if not spec:
                for s in specs:
                    if name_lower in [n.lower() for n in s.aliases]:
                        spec = s
                        break
                    if name_lower in [n.lower() for n in s.generic_names]:
                        spec = s
                        break

            self._delete_garbage_portions(ingredient)

            if spec and spec.portions:
                self._replace_with_spec_portions(ingredient, spec, g_unit)
            elif not spec:
                has_good_portions = Portion.objects.filter(
                    ingredient=ingredient, deleted_at__isnull=True, rank__lte=3, weight_g__gt=1.0
                ).exists()
                if not has_good_portions:
                    self._add_default_portions(ingredient, g_unit)

            self._ensure_g_portions(ingredient, g_unit)

    def _delete_garbage_portions(self, ingredient) -> None:
        from supply.models import Portion
        from django.utils import timezone

        now = timezone.now()

        # Delete rank=9999 sentinels
        sentinels = Portion.objects.filter(
            ingredient=ingredient, deleted_at__isnull=True, rank=9999
        )
        self.report.portions_deleted += sentinels.count()
        sentinels.update(deleted_at=now)

        # Delete "1 Portion" with weight_g <= 1.0 (generic placeholder)
        garbage1 = Portion.objects.filter(
            ingredient=ingredient, deleted_at__isnull=True,
            name__iexact="1 Portion", weight_g__lte=1.0
        )
        count = garbage1.update(deleted_at=now)
        self.report.portions_deleted += count

        # Delete "ml" name with weight_g=1.0 on solids
        garbage_ml = Portion.objects.filter(
            ingredient=ingredient, deleted_at__isnull=True,
            name__iexact="ml", weight_g__lte=1.0
        )
        for p in garbage_ml:
            visc = ingredient.physical_viscosity
            if visc and visc not in ("liquid", "beverage"):
                p.deleted_at = now
                p.save(update_fields=["deleted_at"])
                self.report.portions_deleted += 1

        # Delete "* in ml" pattern portions with weight_g=1.0
        garbage_in_ml = Portion.objects.filter(
            ingredient=ingredient, deleted_at__isnull=True,
            name__icontains=" in ml", weight_g__lte=1.0
        )
        count = garbage_in_ml.update(deleted_at=now)
        self.report.portions_deleted += count

        # Delete known garbage names
        garbage_names = {"Gramm", "evtl.", "große"}
        garbage = Portion.objects.filter(
            ingredient=ingredient, deleted_at__isnull=True, name__in=garbage_names
        )
        for p in garbage:
            p.deleted_at = now
            p.save(update_fields=["deleted_at"])
            self.report.portions_deleted += 1

        # Delete "Stück"/"Packung"/"Becher"/"Glas" with weight_g=None or <= 1.0
        for name in ("Stück", "Packung", "Becher", "Glas"):
            garbage_empty = Portion.objects.filter(
                ingredient=ingredient, deleted_at__isnull=True, name__iexact=name
            ).filter(
                models.Q(weight_g__isnull=True) | models.Q(weight_g__lte=1.0)
            )
            count = garbage_empty.update(deleted_at=now)
            self.report.portions_deleted += count

    def _replace_with_spec_portions(self, ingredient, spec, g_unit) -> None:
        from supply.models import MeasuringUnit, Portion

        for ps in spec.portions:
            mu = MeasuringUnit.objects.filter(name=ps.measuring_unit).first() or g_unit
            existing = Portion.objects.filter(
                ingredient=ingredient, name=ps.name, deleted_at__isnull=True
            ).first()
            if existing:
                existing.rank = ps.rank
                existing.weight_g = ps.weight_g
                existing.quantity = ps.quantity
                existing.measuring_unit = mu
                existing.save()
            else:
                Portion.objects.create(
                    ingredient=ingredient,
                    measuring_unit=mu,
                    name=ps.name,
                    quantity=ps.quantity,
                    weight_g=ps.weight_g,
                    rank=ps.rank,
                )
                self.report.portions_created += 1

    def _get_spec_for_ingredient(self, ingredient) -> list:
        from supply.data.ingredient_specs import get_all_specs
        specs = get_all_specs(data_dir=str(self._data_dir))
        result = []
        name_lower = ingredient.name.lower().strip()
        for s in specs:
            if s.canonical_name.lower() == name_lower:
                result.append(s)
            elif name_lower in [n.lower() for n in s.aliases]:
                result.append(s)
            elif name_lower in [n.lower() for n in s.generic_names]:
                result.append(s)
        return result

    def _add_default_portions(self, ingredient, g_unit) -> None:
        from supply.models import MeasuringUnit, Portion

        section_name = None
        if ingredient.retail_section:
            section_name = ingredient.retail_section.name

        defaults = None
        for pattern, portion_defs in PORTION_DEFAULTS.items():
            if section_name and pattern in section_name:
                defaults = portion_defs
                break

        if not defaults:
            visc = ingredient.physical_viscosity
            if visc in ("liquid", "beverage"):
                defaults = [
                    {"name": "100 ml", "quantity": 100.0, "weight_g": 100.0, "rank": 1, "unit": "ml"},
                    {"name": "200 ml", "quantity": 200.0, "weight_g": 200.0, "rank": 2, "unit": "ml"},
                    {"name": "1 Liter (Flasche)", "quantity": 1000.0, "weight_g": 1000.0, "rank": 8, "unit": "ml"},
                ]
            elif visc == "powder":
                defaults = [
                    {"name": "1 TL (3g)", "quantity": 3.0, "weight_g": 3.0, "rank": 1, "unit": "g"},
                    {"name": "100g", "quantity": 100.0, "weight_g": 100.0, "rank": 2, "unit": "g"},
                    {"name": "500g (Packung)", "quantity": 500.0, "weight_g": 500.0, "rank": 8, "unit": "g"},
                ]
            else:
                defaults = [
                    {"name": "100g", "quantity": 100.0, "weight_g": 100.0, "rank": 1, "unit": "g"},
                    {"name": "500g (Packung)", "quantity": 500.0, "weight_g": 500.0, "rank": 8, "unit": "g"},
                ]

        for pd in defaults:
            mu_name = pd.get("unit", "g")
            mu = MeasuringUnit.objects.filter(name=mu_name).first() or g_unit
            _, created = Portion.objects.get_or_create(
                ingredient=ingredient,
                name=pd["name"],
                defaults={
                    "measuring_unit": mu,
                    "quantity": pd["quantity"],
                    "weight_g": pd["weight_g"],
                    "rank": pd["rank"],
                },
            )
            if created:
                self.report.portions_created += 1

    def _ensure_g_portions(self, ingredient, g_unit) -> None:
        from supply.models import Portion
        existing_g = Portion.objects.filter(
            ingredient=ingredient, name="g", deleted_at__isnull=True
        ).first()
        if not existing_g and g_unit:
            Portion.objects.create(
                ingredient=ingredient,
                measuring_unit=g_unit,
                name="g",
                quantity=1.0,
                weight_g=1.0,
                rank=9999,
            )
            self.report.portions_created += 1

    # ------------------------------------------------------------------
    # Aliases
    # ------------------------------------------------------------------

    def _generate_aliases(self, specs: list) -> None:
        from supply.models import Ingredient, IngredientAlias

        IngredientAlias.objects.all().delete()

        for spec in specs:
            ingredient = Ingredient.objects.filter(name__iexact=spec.canonical_name).first()
            if not ingredient:
                continue
            for alias_name in spec.aliases:
                if not IngredientAlias.objects.filter(
                    ingredient=ingredient, name__iexact=alias_name
                ).exists():
                    rank = ingredient.aliases.count() + 1
                    IngredientAlias.objects.create(
                        ingredient=ingredient,
                        name=alias_name,
                        rank=rank,
                        is_generic=False,
                    )
                    self.report.aliases_created += 1

    def _generate_generic_aliases(self, generic_names: set[str]) -> None:
        from supply.models import Ingredient, IngredientAlias
        from supply.data.ingredient_specs import GENERIC_TERM_MAP

        for generic_term, canonical_names in GENERIC_TERM_MAP.items():
            for canonical_name in canonical_names:
                ingredient = Ingredient.objects.filter(name__iexact=canonical_name).first()
                if not ingredient:
                    continue
                exists = IngredientAlias.objects.filter(
                    ingredient=ingredient, name__iexact=generic_term
                ).exists()
                if not exists:
                    rank = ingredient.aliases.count() + 1
                    IngredientAlias.objects.create(
                        ingredient=ingredient,
                        name=generic_term,
                        rank=rank,
                        is_generic=True,
                    )
                    self.report.aliases_created += 1

    # ------------------------------------------------------------------
    # Recipe Caches
    # ------------------------------------------------------------------

    def _recalculate_recipe_caches(self, dry_run: bool) -> None:
        from recipe.models import Recipe
        from recipe.services.recipe_checks import recalculate_recipe_cache

        recipes = Recipe.objects.all()
        if dry_run:
            self.report.recipe_caches_updated = recipes.count()
            return

        for recipe in recipes:
            try:
                recalculate_recipe_cache(recipe)
                self.report.recipe_caches_updated += 1
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"  Cache failed for {recipe.title}: {e}"))

    # ------------------------------------------------------------------
    # Embeddings
    # ------------------------------------------------------------------

    def _regenerate_embeddings(self) -> None:
        from supply.models import Ingredient
        from core.services.gemini import gemini_embed

        ingredients = list(Ingredient.objects.all())
        total = len(ingredients)
        for i, ingredient in enumerate(ingredients):
            if (i + 1) % 500 == 0:
                self.stdout.write(f"  Embeddings: {i + 1}/{total}...")
            try:
                text = f"{ingredient.name} {ingredient.description or ''}".strip()
                embedding = gemini_embed(contents=text, output_dimensionality=768, bypass_limits=True)
                if embedding:
                    ingredient.embedding = embedding
                    ingredient.embedding_text_hash = hashlib.sha256(
                        text.encode()
                    ).hexdigest()[:32]
                    ingredient.save(update_fields=["embedding", "embedding_text_hash"])
                    self.report.embeddings_regenerated += 1
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"  Embedding failed for {ingredient.name}: {e}"))

    # ------------------------------------------------------------------
    # Export
    # ------------------------------------------------------------------

    def _export_fixtures(self, data_dir: Path, skip_embeddings: bool) -> None:
        from django.core.management import call_command

        food_dir = data_dir / "food"
        food_dir.mkdir(parents=True, exist_ok=True)

        export_models = [
            ("supply.Ingredient", "supply_ingredient.json"),
            ("supply.Portion", "supply_portion.json"),
            ("supply.IngredientAlias", "supply_ingredientalias.json"),
            ("recipe.Recipe", "recipe_recipe.json"),
            ("recipe.RecipeItem", "recipe_recipeitem.json"),
            ("recipe.RecipeTypeStats", "recipe_recipetypestats.json"),
            ("recipe.Rule", "recipe_rule.json"),
        ]

        self.stdout.write("\nExporting fixtures...")
        for model_label, filename in export_models:
            out_path = food_dir / filename
            with open(out_path, "w") as f:
                call_command("dumpdata", model_label, stdout=f, indent=2)
            self.stdout.write(f"  ✓ {filename}")

        if not skip_embeddings:
            self._export_embeddings(food_dir)

        self.stdout.write(self.style.SUCCESS("\nFixtures exported to backend/data/food/"))

    def _export_embeddings(self, food_dir: Path) -> None:
        from supply.models import Ingredient

        embeddings = []
        for ingredient in Ingredient.objects.filter(embedding__isnull=False):
            embeddings.append({
                "pk": ingredient.pk,
                "name": ingredient.name,
                "description": ingredient.description or "",
                "embedding": ingredient.embedding,
                "embedding_text_hash": ingredient.embedding_text_hash or "",
                "embedding_updated_at": (
                    ingredient.embedding_updated_at.isoformat()
                    if ingredient.embedding_updated_at else None
                ),
                "retail_section": (
                    ingredient.retail_section.name if ingredient.retail_section else None
                ),
            })

        out_path = food_dir / "supply_ingredient_embeddings.json"
        with open(out_path, "w") as f:
            json.dump(embeddings, f, indent=2, ensure_ascii=False)
        self.stdout.write(f"  ✓ supply_ingredient_embeddings.json ({len(embeddings)} entries)")
