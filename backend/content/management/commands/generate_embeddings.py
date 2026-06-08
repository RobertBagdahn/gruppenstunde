"""
Management command to generate missing embeddings for all content types.

Uses Gemini text-embedding-004 via the embedding service.
"""

import time

from django.core.management.base import BaseCommand

from content.services.embedding_service import update_content_embedding, update_ingredient_embedding


class Command(BaseCommand):
    help = "Generate missing embeddings for all content types using Gemini"

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Regenerate all embeddings, even if already present",
        )
        parser.add_argument(
            "--type",
            type=str,
            choices=["session", "blog", "game", "recipe", "ingredient"],
            help="Only process a specific content type",
        )
        parser.add_argument(
            "--batch-size",
            type=int,
            default=50,
            help="Number of items to process per batch (default: 50)",
        )
        parser.add_argument(
            "--delay",
            type=float,
            default=0.5,
            help="Delay in seconds between API calls (default: 0.5)",
        )

    def handle(self, *args, **options):
        from blog.models import Blog
        from game.models import Game
        from recipe.models import Recipe
        from session.models import GroupSession
        from supply.models import Ingredient

        force = options["force"]
        content_type = options["type"]
        batch_size = options["batch_size"]
        delay = options["delay"]

        models = {
            "session": GroupSession,
            "blog": Blog,
            "game": Game,
            "recipe": Recipe,
            "ingredient": Ingredient,
        }

        if content_type:
            models = {content_type: models[content_type]}

        total_updated = 0
        total_skipped = 0
        total_failed = 0

        for name, model in models.items():
            if force:
                qs = model.objects.all()
            else:
                qs = model.objects.filter(embedding__isnull=True)
                qs = qs.distinct()

            count = qs.count()
            if count == 0:
                self.stdout.write(f"  {name}: no items need embeddings")
                continue

            self.stdout.write(f"  {name}: processing {count} items...")

            updated = 0
            skipped = 0
            failed = 0

            # Choose update function based on model
            if model is Ingredient:
                update_fn = update_ingredient_embedding
                get_title = lambda obj, i: f"[{i}/{count}] {obj.name[:50]}" if obj.name else f"[{i}/{count}] #{obj.pk}"
            else:
                update_fn = update_content_embedding
                get_title = lambda obj, i: f"[{i}/{count}] {obj.title[:50]}" if obj.title else f"[{i}/{count}] #{obj.pk}"

            for i, obj in enumerate(qs[:batch_size], 1):
                try:
                    result = update_fn(obj, force=force)
                    if result:
                        updated += 1
                        self.stdout.write(f"    {get_title(obj, i)} — updated")
                    else:
                        skipped += 1
                        self.stdout.write(f"    {get_title(obj, i)} — skipped")
                except Exception as e:
                    failed += 1
                    self.stderr.write(f"    {get_title(obj, i)} — ERROR: {e}")

                if delay > 0 and i < count:
                    time.sleep(delay)

            self.stdout.write(
                f"  {name}: {updated} updated, {skipped} skipped, {failed} failed"
            )
            total_updated += updated
            total_skipped += skipped
            total_failed += failed

        self.stdout.write(
            self.style.SUCCESS(
                f"\nDone: {total_updated} updated, {total_skipped} skipped, {total_failed} failed"
            )
        )
