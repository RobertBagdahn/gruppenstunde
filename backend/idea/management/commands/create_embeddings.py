"""Management command to create embeddings for all ideas and tags."""

import struct
import logging

from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Create embeddings for all ideas and all tags using gemini-embedding-001"

    def add_arguments(self, parser):
        parser.add_argument(
            "--ideas-only",
            action="store_true",
            help="Only create embeddings for ideas",
        )
        parser.add_argument(
            "--tags-only",
            action="store_true",
            help="Only create embeddings for tags",
        )
        parser.add_argument(
            "--force",
            action="store_true",
            help="Overwrite existing embeddings",
        )

    def handle(self, *args, **options):
        from idea.models import Idea, Tag
        from idea.services.ai_service import AIService

        service = AIService()
        ideas_only = options["ideas_only"]
        tags_only = options["tags_only"]
        force = options["force"]
        do_all = not ideas_only and not tags_only

        if do_all or ideas_only:
            self._create_idea_embeddings(service, force)

        if do_all or tags_only:
            self._create_tag_embeddings(service, force)

    def _create_idea_embeddings(self, service, force):
        from idea.models import Idea

        ideas = Idea.objects.all()
        if not force:
            ideas = ideas.filter(embedding__isnull=True)

        total = ideas.count()
        self.stdout.write(f"Creating embeddings for {total} ideas...")

        success = 0
        failed = 0
        for i, idea in enumerate(ideas.iterator(), 1):
            text = f"{idea.title}. {idea.summary}. {idea.description}"
            embedding = service.create_embedding(text)
            if embedding:
                idea.embedding = struct.pack(f"{len(embedding)}f", *embedding)
                idea.save(update_fields=["embedding"])
                success += 1
            else:
                failed += 1
                self.stderr.write(f"  Failed: Idea #{idea.id} '{idea.title}'")

            if i % 10 == 0:
                self.stdout.write(f"  Progress: {i}/{total}")

        self.stdout.write(self.style.SUCCESS(
            f"Ideas done: {success} created, {failed} failed (of {total})"
        ))

    def _create_tag_embeddings(self, service, force):
        from idea.models import Tag

        tags = Tag.objects.all()
        if not force:
            tags = tags.filter(embedding__isnull=True)

        total = tags.count()
        self.stdout.write(f"Creating embeddings for {total} tags...")

        success = 0
        failed = 0
        for i, tag in enumerate(tags.iterator(), 1):
            # Build text from tag name and parent context
            parts = [tag.name]
            if tag.parent:
                parts.insert(0, tag.parent.name)
            text = " – ".join(parts)

            embedding = service.create_embedding(text)
            if embedding:
                tag.embedding = struct.pack(f"{len(embedding)}f", *embedding)
                tag.save(update_fields=["embedding"])
                success += 1
            else:
                failed += 1
                self.stderr.write(f"  Failed: Tag #{tag.id} '{tag.name}'")

            if i % 10 == 0:
                self.stdout.write(f"  Progress: {i}/{total}")

        self.stdout.write(self.style.SUCCESS(
            f"Tags done: {success} created, {failed} failed (of {total})"
        ))
