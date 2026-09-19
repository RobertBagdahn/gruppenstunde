"""AI-assisted portion data repair.

Workflow:
  1. Deterministic scan for suspicious portions (piece names, 1-g
     placeholders, missing weights, unit mismatches, implausible rank-1).
  2. Gemini evaluation with structured proposals and confidence.
  3. Optional application of explicitly approved findings.

Flags:
  --dry-run        Report only; write nothing to the database.
   --apply          Apply explicitly approved findings only. Findings must
                    have been approved in the admin workflow first.
  --min-confidence Override the high-confidence threshold (default 0.90).
  --limit          Only scan/evaluate the first N candidates.
"""

import logging

from django.core.management.base import BaseCommand

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Scan suspicious portions, evaluate them with Gemini and optionally apply high-confidence repairs."

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Report candidates without writing anything to the database.",
        )
        parser.add_argument(
            "--apply",
            action="store_true",
            help="Apply explicitly approved findings after evaluation.",
        )
        parser.add_argument(
            "--min-confidence",
            type=float,
            default=None,
            help="Override the high-confidence threshold (default from settings).",
        )
        parser.add_argument(
            "--limit",
            type=int,
            default=None,
            help="Only process the first N candidates (mainly for testing).",
        )

    def handle(self, *args, **options):
        dry_run = options["dry_run"]
        apply_flag = options["apply"]
        min_confidence = options["min_confidence"]
        limit = options["limit"]

        from supply.choices import PortionRepairStatus
        from supply.services.portion_repair import scan_suspicious_portions

        self.stdout.write("Step 1/3: Deterministic scan for suspicious portions...")
        reports = scan_suspicious_portions(dry_run=dry_run, limit=limit)
        self.stdout.write(self.style.SUCCESS(f"  {len(reports)} candidate(s) found"))
        for report in reports:
            self.stdout.write(
                f"    portion {report['portion_id']} '{report['ingredient_name']}': "
                f"{report['reason']} ({len(report['recipe_item_ids'])} recipe item(s))"
            )

        if dry_run:
            self.stdout.write(self.style.WARNING("Dry-run: no findings created, no AI evaluation."))
            return

        # --- Step 2: AI evaluation -------------------------------------------
        from supply.models import PortionRepairFinding
        from supply.services.portion_repair_ai import evaluate_finding

        self.stdout.write("Step 2/3: AI evaluation via Gemini...")
        pending = PortionRepairFinding.objects.filter(status=PortionRepairStatus.CANDIDATE)
        if limit is not None:
            pending = pending[:limit]

        ready_count = 0
        review_count = 0
        skipped_count = 0
        failed_count = 0
        for finding in pending:
            try:
                evaluated = evaluate_finding(finding, min_confidence=min_confidence)
                if evaluated.status == PortionRepairStatus.READY:
                    ready_count += 1
                elif evaluated.status == PortionRepairStatus.PENDING_REVIEW:
                    review_count += 1
                else:
                    skipped_count += 1
            except Exception:
                logger.exception("AI evaluation failed for finding %s", finding.id)
                failed_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"  {ready_count} ready, {review_count} pending review, {skipped_count} skipped, {failed_count} failed"
            )
        )

        # --- Step 3: Apply -----------------------------------------------------
        if apply_flag:
            from supply.services.portion_repair import apply_finding

            self.stdout.write("Step 3/3: Applying explicitly approved findings...")
            applied = 0
            approved = PortionRepairFinding.objects.filter(
                status=PortionRepairStatus.READY,
                approved_by__isnull=False,
                approved_at__isnull=False,
            )
            for finding in approved:
                result = apply_finding(finding)
                if result["applied"]:
                    applied += 1
                    self.stdout.write(
                        f"    Applied finding {finding.id}: portion {finding.portion_id} "
                        f"→ {result['applied_portion_id']}, moved {len(result['moved_recipe_item_ids'])} item(s)"
                    )
            self.stdout.write(self.style.SUCCESS(f"  {applied} approved finding(s) applied"))
        else:
            self.stdout.write("Step 3/3: skipped (use --apply to apply READY findings)")

        self.stdout.write(self.style.SUCCESS("Done."))
