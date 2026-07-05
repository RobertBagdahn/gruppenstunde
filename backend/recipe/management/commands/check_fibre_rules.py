"""Check that fiber rules don't have maximum thresholds set (idempotent).

Usage:
    uv run python manage.py check_fibre_rules
    uv run python manage.py check_fibre_rules --fix  # Fix any violations
"""

from django.core.management.base import BaseCommand
from django.db import models

from recipe.models import Rule


class Command(BaseCommand):
    help = (
        "Check that fiber rules have no max_green/max_yellow set. "
        "Use --fix to remove max thresholds from any fiber rules."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--fix",
            action="store_true",
            help="Fix violations by removing max thresholds from fiber rules",
        )

    def handle(self, *args, **options):
        # Find all fiber rules
        fibre_rules = Rule.objects.filter(parameter="fibre_g")

        if not fibre_rules.exists():
            self.stdout.write(self.style.WARNING("No fiber rules found."))
            return

        violations = fibre_rules.filter(
            models.Q(max_green__isnull=False) | models.Q(max_yellow__isnull=False)
        )

        if not violations.exists():
            self.stdout.write(
                self.style.SUCCESS(
                    f"✓ All {fibre_rules.count()} fiber rules are correct "
                    "(no max_green or max_yellow set)."
                )
            )
            return

        # Found violations
        violation_count = violations.count()
        self.stdout.write(
            self.style.ERROR(f"✗ Found {violation_count} fiber rule violation(s):")
        )

        for rule in violations:
            self.stdout.write(
                f"  - {rule.name} (scope: {rule.scope}) "
                f"max_green={rule.max_green}, max_yellow={rule.max_yellow}"
            )

        if options["fix"]:
            violations.update(max_green=None, max_yellow=None)
            self.stdout.write(
                self.style.SUCCESS(f"✓ Fixed {violation_count} fiber rule(s).")
            )
        else:
            self.stdout.write(
                self.style.WARNING(
                    "Use --fix flag to automatically remove max thresholds."
                )
            )
