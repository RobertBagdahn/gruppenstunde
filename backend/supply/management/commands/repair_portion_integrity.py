"""Compatibility entry point for the audit-aware portion repair workflow."""

import logging

from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Repair Portion/RecipeItem integrity: dedupe rank=1, rebind dead portion refs, AI-repair implausible quantities."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Report candidates without writing findings.")
        parser.add_argument("--apply", action="store_true", help="Apply ready, audit-approved findings.")
        parser.add_argument("--min-confidence", type=float, default=None)
        parser.add_argument("--limit", type=int, default=None)

    def handle(self, *args, **options):
        from supply.management.commands.repair_portion_data import Command as AuditCommand

        delegated = {
            "dry_run": options["dry_run"],
            "apply": options["apply"],
            "min_confidence": options["min_confidence"],
            "limit": options["limit"],
        }
        AuditCommand().handle(**delegated)
