"""Clean up old ChangeAuditLog entries."""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from content.models import ChangeAuditLog, StaffFoodAccessLog


class Command(BaseCommand):
    help = "Delete ChangeAuditLog entries older than specified days"

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=90, help="Delete entries older than this many days")
        parser.add_argument("--staff-days", type=int, default=30, help="Delete Staff Food access entries older than this many days")

    def handle(self, *args, **options):
        days = options["days"]
        cutoff = timezone.now() - timedelta(days=days)
        deleted, _ = ChangeAuditLog.objects.filter(changed_at__lt=cutoff).delete()
        staff_cutoff = timezone.now() - timedelta(days=options["staff_days"])
        staff_qs = StaffFoodAccessLog.objects.filter(accessed_at__lt=staff_cutoff)
        staff_deleted = 0
        while True:
            ids = list(staff_qs.values_list("id", flat=True)[:10_000])
            if not ids:
                break
            StaffFoodAccessLog.objects.filter(id__in=ids).delete()
            staff_deleted += len(ids)
        self.stdout.write(
            self.style.SUCCESS(
                f"Deleted {deleted} audit log entries and {staff_deleted} Staff Food access entries"
            )
        )
