"""Clean up old ChangeAuditLog entries."""

from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from content.models import ChangeAuditLog


class Command(BaseCommand):
    help = "Delete ChangeAuditLog entries older than specified days"

    def add_arguments(self, parser):
        parser.add_argument("--days", type=int, default=90, help="Delete entries older than this many days")

    def handle(self, *args, **options):
        days = options["days"]
        cutoff = timezone.now() - timedelta(days=days)
        deleted, _ = ChangeAuditLog.objects.filter(changed_at__lt=cutoff).delete()
        self.stdout.write(self.style.SUCCESS(f"Deleted {deleted} audit log entries older than {days} days"))
