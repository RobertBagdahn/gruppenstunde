"""Tag existing prod ingredients and recipes with breakfast content tags.

Idempotent — only adds tags, never removes or duplicates.
Designed for prod where MeasuringUnit names differ from local (Gramm vs g, etc.).
"""

from django.core.management.base import BaseCommand
from django.db.models import Q

from content.models import Tag
from recipe.models import Recipe
from supply.models import Ingredient


class Command(BaseCommand):
    help = "Tag existing prod ingredients and recipes with breakfast content tags."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Preview without making changes")

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        # ── Ensure all tags exist ───────────────────────────────────────
        tags = self._ensure_tags(dry_run)

        # ── Tag base ingredients (bread) ────────────────────────────────
        self._tag_base_ingredients(tags["breakfast-base"], dry_run)

        # ── Tag fat ingredients ─────────────────────────────────────────
        self._tag_fat_ingredients(tags["breakfast-fat"], dry_run)

        # ── Tag topping ingredients ─────────────────────────────────────
        self._tag_topping_ingredients(tags["breakfast-topping"], dry_run)

        # ── Tag drink ingredients ───────────────────────────────────────
        self._tag_drink_ingredients(tags["breakfast-drink"], dry_run)

        # ── Tag drink recipes ──────────────────────────────────────────
        self._tag_drink_recipes(tags["breakfast-drink"], dry_run)

        # ── Tag warm meal recipes ───────────────────────────────────────
        self._tag_warm_meal_recipes(tags["breakfast-warm-meal"], dry_run)

        # ── Summary ────────────────────────────────────────────────────
        self.stdout.write(self.style.SUCCESS("\nDone!\n"))
        for tag_slug in ["breakfast-base", "breakfast-topping", "breakfast-fat",
                          "breakfast-drink", "breakfast-extra"]:
            tag = Tag.objects.filter(slug=tag_slug).first()
            if tag:
                ing_count = Ingredient.objects.filter(tags=tag).count()
                self.stdout.write(f"  Ingredients with {tag_slug}: {ing_count}")
        for tag_slug in ["breakfast-drink", "breakfast-warm-meal"]:
            tag = Tag.objects.filter(slug=tag_slug).first()
            if tag:
                rec_count = Recipe.objects.filter(tags=tag).count()
                self.stdout.write(f"  Recipes with {tag_slug}: {rec_count}")

        if dry_run:
            self.stdout.write(self.style.WARNING("\nDRY RUN — no changes made."))

    def _ensure_tags(self, dry_run):
        tag_defs = {
            "breakfast-base": "breakfast-base",
            "breakfast-topping": "breakfast-topping",
            "breakfast-fat": "breakfast-fat",
            "breakfast-extra": "breakfast-extra",
            "breakfast-drink": "breakfast-drink",
            "breakfast-warm-meal": "breakfast-warm-meal",
        }
        result = {}
        for slug, name in tag_defs.items():
            tag, created = Tag.objects.get_or_create(slug=slug, defaults={"name": name})
            if created:
                self.stdout.write(f"  Created tag: {slug} (id={tag.id})")
            else:
                self.stdout.write(f"  Tag exists: {slug} (id={tag.id})")
            result[slug] = tag
        return result

    def _tag_ingredients(self, tag, qs, label, dry_run):
        """Tag a queryset of ingredients with the given tag."""
        tagged = 0
        skipped = 0
        for ing in qs:
            if ing.tags.filter(id=tag.id).exists():
                skipped += 1
            else:
                tagged += 1
                if not dry_run:
                    ing.tags.add(tag)
                    self.stdout.write(f"  [{label}] Tagged: {ing.name} (id={ing.id})")
        if tagged:
            self.stdout.write(f"  [{label}] {tagged} tagged, {skipped} already had tag")
        else:
            self.stdout.write(f"  [{label}] All {skipped} already tagged")

    def _tag_base_ingredients(self, tag, dry_run):
        qs = Ingredient.objects.filter(is_standalone_food=True).filter(
            Q(name__icontains="brot") | Q(name__icontains="brötchen") |
            Q(name__icontains="stuten") | Q(name__icontains="toast") |
            Q(name__icontains="ciabatta") | Q(name__icontains="baguette")
        ).exclude(
            Q(name__icontains="gewürz") | Q(name__icontains="gewuerz") |
            Q(name__icontains="brotaufstrich") | Q(name__icontains="aufstrich") |
            Q(name__icontains="frischkäse") | Q(name__icontains="mischung") |
            Q(name__icontains="chips") | Q(name__icontains="knäcke") |
            Q(name__icontains="knusper") | Q(name__icontains="gebäck") |
            Q(name__icontains="mehl") | Q(name__icontains="krümel")
        ).order_by("name")
        self._tag_ingredients(tag, qs, "BASE", dry_run)

    def _tag_fat_ingredients(self, tag, dry_run):
        qs = Ingredient.objects.filter(is_standalone_food=True).filter(
            Q(name__icontains="butter") | Q(name__icontains="margarine") |
            Q(name__icontains="schmalz")
        ).exclude(
            Q(name__icontains="erdnuss") | Q(name__icontains="kakaobutter") |
            Q(name__icontains="keks") | Q(name__icontains="gebäck") |
            Q(name__icontains="bohne") | Q(name__icontains="kürbis") |
            Q(name__icontains="apfelbutter")
        ).order_by("name")
        self._tag_ingredients(tag, qs, "FAT", dry_run)

    def _tag_topping_ingredients(self, tag, dry_run):
        qs = Ingredient.objects.filter(is_standalone_food=True).filter(
            Q(name__icontains="nutella") |
            Q(name__icontains="marmelade") | Q(name__icontains="konfitüre") |
            Q(name__icontains="honig") |
            Q(name__icontains="erdnussbutter") |
            Q(name__icontains="avocado") |
            Q(name__icontains="gouda") | Q(name__icontains="edamer") |
            Q(name__icontains="emmentaler") | Q(name__icontains="tilsiter") |
            Q(name__icontains="mozzarella") | Q(name__icontains="camembert") |
            Q(name__icontains="brie") | Q(name__icontains="cheddar") |
            Q(name__icontains="salami") |
            Q(name__icontains="schinken") | Q(name__icontains="putenbrust") |
            Q(name__icontains="leberwurst") | Q(name__icontains="teewurst") |
            Q(name__icontains="mettwurst") | Q(name__icontains="streichwurst") |
            Q(name__icontains="frischkäse") | Q(name__icontains="hummus")
        ).exclude(
            Q(name__icontains="chips") | Q(name__icontains="flips") |
            Q(name__icontains="gebäck") | Q(name__icontains="knäcke") |
            Q(name__icontains="pizza") | Q(name__icontains="auflauf") |
            Q(name__icontains="suppe") | Q(name__icontains="soße") |
            Q(name__icontains="sosse") | Q(name__icontains="dip") |
            Q(name__icontains="creme") | Q(name__icontains="creme") |
            Q(name__icontains="salat") | Q(name__icontains="gemüse") |
            Q(name__icontains="käsegebäck") | Q(name__icontains="käsegebäck") |
            Q(name__icontains="käsesoße") | Q(name__icontains="käsesosse") |
            Q(name__icontains="käse-creme") | Q(name__icontains="käsecreme")
        ).order_by("name")
        self._tag_ingredients(tag, qs, "TOPPING", dry_run)

    def _tag_drink_ingredients(self, tag, dry_run):
        qs = Ingredient.objects.filter(is_standalone_food=True).filter(
            Q(name__icontains="milch") | Q(name__icontains="haferdrink") |
            Q(name__istartswith="Saft ") | Q(name__icontains="Saft (") |
            Q(name__icontains="saft ") | Q(name__icontains="saft (") |
            Q(name__icontains="Kakao") | Q(name__icontains="kakao") |
            Q(name__icontains="tee ") | Q(name__icontains="Tee ") |
            Q(name__iendswith="tee") | Q(name__iendswith="Tee")
        ).exclude(
            Q(name__icontains="pulver") | Q(name__icontains="kakaopulver") |
            Q(name__icontains="kakaobutter") | Q(name__icontains="schokolade") |
            Q(name__icontains="kondensmilch") | Q(name__icontains="milchpulver") |
            Q(name__icontains="milchreis") | Q(name__icontains="milchshake") |
            Q(name__icontains="milchbrötchen") | Q(name__icontains="milchschnitte") |
            Q(name__icontains="milchmix") | Q(name__icontains="buttermilch") |
            Q(name__icontains="zitronentee") | Q(name__icontains="pfirsichtee") |
            Q(name__icontains="früchtetee") | Q(name__icontains="kräutertee") |
            Q(name__icontains="teegetränk") | Q(name__icontains="eistee") |
            Q(name__icontains="tee konzentrat") | Q(name__icontains="matcha")
        ).order_by("name")
        self._tag_ingredients(tag, qs, "DRINK-ING", dry_run)

    def _tag_drink_recipes(self, tag, dry_run):
        qs = Recipe.objects.filter(recipe_type="drink", status="approved").order_by("title")
        tagged = 0
        skipped = 0
        for rec in qs:
            if rec.tags.filter(id=tag.id).exists():
                skipped += 1
            else:
                tagged += 1
                if not dry_run:
                    rec.tags.add(tag)
                    self.stdout.write(f"  [DRINK-REC] Tagged: {rec.title} (id={rec.id})")
        if tagged:
            self.stdout.write(f"  [DRINK-REC] {tagged} tagged, {skipped} already had tag")
        else:
            self.stdout.write(f"  [DRINK-REC] All {skipped} already tagged")

    def _tag_warm_meal_recipes(self, tag, dry_run):
        qs = Recipe.objects.filter(
            recipe_type="breakfast", status="approved"
        ).order_by("title")
        tagged = 0
        skipped = 0
        for rec in qs:
            if rec.tags.filter(id=tag.id).exists():
                skipped += 1
            else:
                tagged += 1
                if not dry_run:
                    rec.tags.add(tag)
                    self.stdout.write(f"  [WARM] Tagged: {rec.title} (id={rec.id})")
        if tagged:
            self.stdout.write(f"  [WARM] {tagged} tagged, {skipped} already had tag")
        else:
            self.stdout.write(f"  [WARM] All {skipped} already tagged")
