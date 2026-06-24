"""Management command to clean up old analytics data (GDPR data retention)."""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

BATCH_SIZE = 10_000


class Command(BaseCommand):
    help = "Delete ContentView and SearchLog entries older than the retention period."

    def add_arguments(self, parser):
        parser.add_argument(
            "--retention-months",
            type=int,
            default=12,
            help="Delete entries older than this many months (default: 12)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show how many entries would be deleted without actually deleting",
        )

    def handle(self, *args, **options):
        from content.models import ContentView, SearchLog

        retention_months = options["retention_months"]
        dry_run = options["dry_run"]
        cutoff = timezone.now() - timedelta(days=retention_months * 30)

        self.stdout.write(f"Retention period: {retention_months} months (cutoff: {cutoff.date()})")

        if dry_run:
            view_count = ContentView.objects.filter(created_at__lt=cutoff).count()
            search_count = SearchLog.objects.filter(created_at__lt=cutoff).count()
            self.stdout.write(f"[DRY RUN] Would delete {view_count} ContentView entries")
            self.stdout.write(f"[DRY RUN] Would delete {search_count} SearchLog entries")
            return

        view_deleted = self._batch_delete(ContentView, cutoff)
        search_deleted = self._batch_delete(SearchLog, cutoff)

        self.stdout.write(
            self.style.SUCCESS(
                f"{view_deleted} ContentView-Einträge gelöscht, {search_deleted} SearchLog-Einträge gelöscht"
            )
        )

    def _batch_delete(self, model, cutoff) -> int:
        """Delete old entries in batches to avoid lock contention."""
        total_deleted = 0
        while True:
            ids = list(model.objects.filter(created_at__lt=cutoff).values_list("id", flat=True)[:BATCH_SIZE])
            if not ids:
                break
            deleted_count, _ = model.objects.filter(id__in=ids).delete()
            total_deleted += deleted_count
            self.stdout.write(f"  Deleted batch of {deleted_count} {model.__name__} entries")
        return total_deleted
