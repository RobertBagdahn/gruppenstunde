"""Merge the duplicate egg ingredients into ``Hühnerei (Größe M)`` and add the egg aliases.

Dry-run by default; ``--apply`` writes. The merge reuses ``merge_ingredient`` (portions, recipe items,
meal items and the source names as aliases move to the target).
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import models as db_models
from django.db import transaction

from supply.models import Ingredient, IngredientAlias
from supply.services.ingredient_merge import merge_ingredient, preview_ingredient_merge

# The most used egg ingredient is the target (22 uses in production); the merge stores every merged name as alias.
TARGET_NAME = "Hühnerei (Größe M)"
DUPLICATE_NAMES = ("Eier (Größe M)", "Hühnereier Größe M", "Hühnerei", "Hühnereier")
ALIAS_NAMES = ("Ei", "Eier")


class Command(BaseCommand):
    help = f"Dry-run by default: merge egg duplicates into '{TARGET_NAME}' and add aliases; --apply writes."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", help="Write the merge and aliases (default is a dry-run).")

    def handle(self, *args, **options):
        apply = options["apply"]
        target = Ingredient.objects.filter(name__iexact=TARGET_NAME, deleted_at__isnull=True).order_by("id").first()
        if target is None:
            raise CommandError(f"Target ingredient '{TARGET_NAME}' not found.")

        sources = []
        for name in DUPLICATE_NAMES:
            source = Ingredient.objects.filter(name__iexact=name, deleted_at__isnull=True).exclude(pk=target.pk).first()
            if source is None:
                self.stdout.write(f"skip: '{name}' not found (already merged?)")
                continue
            sources.append(source)
            preview = preview_ingredient_merge(source, target)
            self.stdout.write(
                f"merge '{source.name}' (id {source.id}) -> '{target.name}' (id {target.id}): "
                f"{preview['affected_recipe_items']} recipe item(s), {preview['affected_meal_items']} meal item(s), "
                f"{preview['affected_portions']} portion(s)"
            )

        existing_alias_names = {name.lower() for name in target.aliases.values_list("name", flat=True)}
        planned_aliases = []
        for alias_name in ALIAS_NAMES:
            if alias_name.lower() in existing_alias_names or alias_name.lower() == target.name.lower():
                self.stdout.write(f"skip alias '{alias_name}': already present")
                continue
            clash = Ingredient.objects.filter(name__iexact=alias_name, deleted_at__isnull=True).exclude(pk=target.pk)
            if clash.exists():
                self.stdout.write(f"skip alias '{alias_name}': an ingredient with this name exists")
                continue
            planned_aliases.append(alias_name)
            self.stdout.write(f"alias '{alias_name}' -> '{target.name}'")

        if not apply:
            self.stdout.write(
                f"Dry-run: {len(sources)} merge(s), {len(planned_aliases)} alias(es). Re-run with --apply."
            )
            return

        with transaction.atomic():
            for source in sources:
                merge_ingredient(source, target)
            rank = IngredientAlias.objects.filter(ingredient=target).aggregate(m=db_models.Max("rank"))["m"] or 0
            for offset, alias_name in enumerate(planned_aliases, start=1):
                if not IngredientAlias.objects.filter(ingredient=target, name__iexact=alias_name).exists():
                    IngredientAlias.objects.create(ingredient=target, name=alias_name, rank=rank + offset)
        self.stdout.write(
            self.style.SUCCESS(f"Merged {len(sources)} duplicate(s), added {len(planned_aliases)} alias(es).")
        )
