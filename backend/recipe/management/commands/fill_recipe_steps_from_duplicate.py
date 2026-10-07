"""Copy preparation steps from a duplicate recipe into a recipe that has none.

Dry-run by default; nothing is written without --apply. A target that already
has steps is left untouched, so the command is idempotent.

Usage:
    uv run python manage.py fill_recipe_steps_from_duplicate --source 515 --target 523
    uv run python manage.py fill_recipe_steps_from_duplicate --source 515 --target 523 \
        --append-step "Burger belegen und servieren." --apply
"""

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from recipe.models import Recipe, RecipeStep


class Command(BaseCommand):
    help = "Copy RecipeSteps from --source into --target if the target has no steps (dry-run unless --apply)."

    def add_arguments(self, parser):
        parser.add_argument("--source", type=int, required=True, help="Recipe id to copy steps from")
        parser.add_argument("--target", type=int, required=True, help="Recipe id that receives the steps")
        parser.add_argument(
            "--append-step",
            action="append",
            default=[],
            help="Extra step text appended after the copied steps (repeatable)",
        )
        parser.add_argument("--apply", action="store_true", help="Write the steps (default: dry-run)")

    def handle(self, *args, **options):
        if options["source"] == options["target"]:
            raise CommandError("--source and --target must differ.")
        try:
            source = Recipe.objects.get(pk=options["source"])
            target = Recipe.objects.get(pk=options["target"])
        except Recipe.DoesNotExist as exc:
            raise CommandError(f"Recipe not found: {exc}") from exc

        source_steps = list(source.steps.order_by("sort_order"))
        if not source_steps:
            raise CommandError(f"Source recipe {source.pk} '{source.title}' has no steps.")
        if target.steps.exists():
            self.stdout.write(
                self.style.WARNING(f"Target {target.pk} '{target.title}' already has steps; nothing to do.")
            )
            return

        rows = [(s.instruction, s.duration_minutes, s.section) for s in source_steps]
        rows += [(text, None, "") for text in options["append_step"]]

        mode = "APPLY" if options["apply"] else "DRY-RUN"
        self.stdout.write(f"[{mode}] {len(rows)} step(s): {source.pk} '{source.title}' -> {target.pk} '{target.title}'")
        for idx, (instruction, duration, _section) in enumerate(rows, 1):
            suffix = f" ({duration} Min.)" if duration else ""
            self.stdout.write(f"  {idx}. {instruction}{suffix}")

        if not options["apply"]:
            self.stdout.write(self.style.WARNING("Dry-run only. Re-run with --apply to write."))
            return

        with transaction.atomic():
            RecipeStep.objects.bulk_create(
                [
                    RecipeStep(
                        recipe=target,
                        sort_order=idx,
                        instruction=instruction,
                        duration_minutes=duration,
                        section=section,
                    )
                    for idx, (instruction, duration, section) in enumerate(rows)
                ]
            )
        self.stdout.write(self.style.SUCCESS(f"Wrote {len(rows)} step(s) to recipe {target.pk}."))
