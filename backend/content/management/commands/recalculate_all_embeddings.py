"""
Management command to bulk recalculate embeddings for all content types.

Usage:
    python manage.py recalculate_all_embeddings [--force] [--content-type recipe|ingredient|blog|game|session]
"""

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from recipe.models import Recipe
from blog.models import Blog
from game.models import Game
from session.models import GroupSession
from supply.models import Ingredient
from content.services.embedding_service import update_content_embedding, update_ingredient_embedding


class Command(BaseCommand):
    help = "Bulk recalculate embeddings for all content types."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Force recalculation even if text hash hasn't changed",
        )
        parser.add_argument(
            "--content-type",
            type=str,
            choices=["ingredient"],
            help="Only recalculate for specific content type (currently only 'ingredient' is supported)",
        )

    def handle(self, *args, **options):
        force = options.get("force", False)
        content_type = options.get("content_type", "ingredient")  # Default to ingredient

        models_to_update = {
            "ingredient": Ingredient,
        }

        if content_type and content_type != "ingredient":
            raise CommandError(f"Content type '{content_type}' is not yet supported. Currently only 'ingredient' embeddings are active.")

        total_updated = 0

        for model_name, model_class in models_to_update.items():
            self.stdout.write(f"\n=== Recalculating {model_name} embeddings ===")
            self.stdout.flush()

            queryset = model_class.objects.all()
            total = queryset.count()
            updated = 0

            for i, obj in enumerate(queryset, start=1):
                try:
                    if model_name == "ingredient":
                        success = update_ingredient_embedding(obj, force=force)
                    else:
                        success = update_content_embedding(obj, force=force)

                    if success:
                        updated += 1

                    # Progress update every 50 items
                    if i % 50 == 0:
                        self.stdout.write(f"  {i}/{total} processed ({updated} updated)")
                        self.stdout.flush()

                except Exception as e:
                    self.stdout.write(
                        self.style.WARNING(f"  Error updating {model_name} #{obj.pk}: {e}")
                    )

            total_updated += updated
            self.stdout.write(
                self.style.SUCCESS(f"✓ {model_name}: {updated}/{total} embeddings updated")
            )

        self.stdout.write(
            self.style.SUCCESS(
                f"\n✓ Total: {total_updated} embeddings recalculated (force={force})"
            )
        )
