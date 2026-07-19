from django.core.management.base import BaseCommand
from django.db import connection


class Command(BaseCommand):
    help = "Reset all PostgreSQL auto-increment sequences to MAX(id)+1"

    def handle(self, **options):
        with connection.cursor() as cursor:
            cursor.execute(
                """
                SELECT c.relname, replace(c.relname, '_id_seq', '')
                FROM pg_class c
                WHERE c.relkind = 'S'
                  AND c.relname LIKE '%_id_seq'
                ORDER BY c.relname
                """
            )
            pairs = [(row[0], row[1]) for row in cursor.fetchall()]

        fixed = 0
        skipped = 0

        for seq_name, tbl_name in pairs:
            try:
                with connection.cursor() as cursor:
                    cursor.execute(
                        f"SELECT setval('{seq_name}'::regclass, COALESCE((SELECT MAX(id) FROM {tbl_name}), 1) + 1)"
                    )
                fixed += 1
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"  SKIP {seq_name}: {e}"))
                skipped += 1

        self.stdout.write(self.style.SUCCESS(f"Fixed {fixed} sequences, skipped {skipped}"))
