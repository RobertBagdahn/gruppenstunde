"""
Management command to convert existing HTML content to Markdown.

Converts:
  - Idea.description, Idea.summary, Idea.summary_long
  - Event.description, Event.invitation_text
  - IdeaOfTheWeek.description
  - Recipe.description, Recipe.summary, Recipe.summary_long

Usage:
  uv run python manage.py convert_html_to_markdown          # dry-run (default)
  uv run python manage.py convert_html_to_markdown --apply   # apply changes
"""

import html2text
from django.core.management.base import BaseCommand

from event.models import Event
from idea.models import Idea, IdeaOfTheWeek
from recipe.models import Recipe


def _is_html(text: str) -> bool:
    """Check if text looks like HTML (contains common tags)."""
    if not text:
        return False
    html_indicators = [
        "<p>",
        "<br",
        "<h1",
        "<h2",
        "<h3",
        "<ul>",
        "<ol>",
        "<li>",
        "<strong>",
        "<em>",
        "<a ",
        "<div",
        "<span",
        "<blockquote",
    ]
    text_lower = text.lower()
    return any(tag in text_lower for tag in html_indicators)


def _html_to_markdown(html: str) -> str:
    """Convert HTML to Markdown using html2text."""
    h = html2text.HTML2Text()
    h.body_width = 0  # Don't wrap lines
    h.unicode_snob = True
    h.protect_links = True
    h.single_line_break = True
    return h.handle(html).strip()


class Command(BaseCommand):
    help = "Convert existing HTML content fields to Markdown"

    def add_arguments(self, parser):
        parser.add_argument(
            "--apply",
            action="store_true",
            default=False,
            help="Actually apply the changes (default is dry-run)",
        )

    def handle(self, *args, **options):
        apply = options["apply"]
        mode = "APPLYING" if apply else "DRY-RUN"
        self.stdout.write(f"\n=== HTML → Markdown Conversion ({mode}) ===\n")

        total = 0
        converted = 0

        # --- Idea fields ---
        idea_fields = ["description", "summary", "summary_long"]
        ideas = Idea.objects.all()
        total += ideas.count()

        for idea in ideas:
            changed = False
            for field in idea_fields:
                value = getattr(idea, field, "")
                if value and _is_html(value):
                    md = _html_to_markdown(value)
                    self.stdout.write(
                        f"  Idea #{idea.pk} ({idea.slug}) .{field}: HTML ({len(value)} chars) → MD ({len(md)} chars)"
                    )
                    if apply:
                        setattr(idea, field, md)
                        changed = True

            if changed:
                idea.save(update_fields=idea_fields)
                converted += 1

        # --- Event fields ---
        event_fields = ["description", "invitation_text"]
        events = Event.objects.all()
        total += events.count()

        for event in events:
            changed = False
            for field in event_fields:
                value = getattr(event, field, "")
                if value and _is_html(value):
                    md = _html_to_markdown(value)
                    self.stdout.write(
                        f"  Event #{event.pk} ({event.slug}) .{field}: HTML ({len(value)} chars) → MD ({len(md)} chars)"
                    )
                    if apply:
                        setattr(event, field, md)
                        changed = True

            if changed:
                event.save(update_fields=event_fields)
                converted += 1

        # --- IdeaOfTheWeek ---
        iotw_items = IdeaOfTheWeek.objects.all()
        total += iotw_items.count()

        for item in iotw_items:
            if item.description and _is_html(item.description):
                md = _html_to_markdown(item.description)
                self.stdout.write(
                    f"  IdeaOfTheWeek #{item.pk}: HTML ({len(item.description)} chars) → MD ({len(md)} chars)"
                )
                if apply:
                    item.description = md
                    item.save(update_fields=["description"])
                    converted += 1

        # --- Recipe fields ---
        recipe_fields = ["description", "summary", "summary_long"]
        recipes = Recipe.objects.all()
        total += recipes.count()

        for recipe in recipes:
            changed = False
            for field in recipe_fields:
                value = getattr(recipe, field, "")
                if value and _is_html(value):
                    md = _html_to_markdown(value)
                    self.stdout.write(
                        f"  Recipe #{recipe.pk} ({recipe.slug}) .{field}: HTML ({len(value)} chars) → MD ({len(md)} chars)"
                    )
                    if apply:
                        setattr(recipe, field, md)
                        changed = True

            if changed:
                recipe.save(update_fields=recipe_fields)
                converted += 1
                    converted += 1

        self.stdout.write(f"\n=== Done: {converted} records converted out of {total} total ===")
        if not apply:
            self.stdout.write(self.style.WARNING("\n  This was a DRY-RUN. Use --apply to actually save changes.\n"))
        else:
            self.stdout.write(self.style.SUCCESS("\n  Changes have been saved.\n"))
