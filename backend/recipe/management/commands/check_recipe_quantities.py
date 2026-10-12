import csv
from pathlib import Path

from django.core.management.base import BaseCommand, CommandParser

from recipe.services.quantity_report import alias_conflicts, recipe_quantity_outliers, suspicious_portions


class Command(BaseCommand):
    help = (
        "Report unusually high recipe quantities, undivided lines, unconfirmed 150 g piece portions and "
        "ingredient alias conflicts. Report only: nothing is changed."
    )

    def add_arguments(self, parser: CommandParser) -> None:
        parser.add_argument("--csv", type=Path, help="Write all findings to this CSV file")

    def handle(self, *args, **options) -> None:
        high = recipe_quantity_outliers(kind="high_quantity")
        undivided = recipe_quantity_outliers(kind="undivided")
        portions = suspicious_portions()
        conflicts = alias_conflicts()
        csv_rows: list[list[str]] = []

        self._section("Auffällig hohe Mengen", len(high))
        for row in high:
            line = f"#{row.recipe_id} {row.recipe_title} · {row.ingredient_name}: {row.outlier.message}"
            self.stdout.write(f"  [{row.outlier.severity}] {line}")
            csv_rows.append(["high_quantity", row.outlier.severity, str(row.recipe_id), row.recipe_title, line])

        self._section("Vermutlich ungeteilte Zeilen", len(undivided))
        for row in undivided:
            line = f"#{row.recipe_id} {row.recipe_title} · {row.ingredient_name}: {row.outlier.message}"
            self.stdout.write(f"  {line}")
            csv_rows.append(["undivided", row.outlier.severity, str(row.recipe_id), row.recipe_title, line])

        self._section("Unbestätigte 150-g-Stückportionen in Verwendung", len(portions))
        for row in portions:
            line = (
                f"#{row.ingredient_id} {row.ingredient_name} · '{row.portion_name}' "
                f"({row.recipe_count} Rezepte, {row.meal_item_count} Plan-Einträge)"
            )
            self.stdout.write(f"  {line}")
            csv_rows.append(["suspicious_portion", "", str(row.ingredient_id), row.ingredient_name, line])

        self._section("Alias-Konflikte", len(conflicts))
        for row in conflicts:
            line = (
                f"'{row.alias}': #{row.ingredient_id} {row.ingredient_name} ({row.ingredient_usage}) ↔ "
                f"#{row.conflicting_ingredient_id} {row.conflicting_ingredient_name} ({row.conflicting_ingredient_usage})"
            )
            self.stdout.write(f"  {line}")
            csv_rows.append(["alias_conflict", row.kind, str(row.ingredient_id), row.ingredient_name, line])

        if options.get("csv"):
            with options["csv"].open("w", newline="", encoding="utf-8") as handle:
                writer = csv.writer(handle)
                writer.writerow(["check", "detail", "id", "name", "finding"])
                writer.writerows(csv_rows)
            self.stdout.write(self.style.SUCCESS(f"CSV geschrieben: {options['csv']}"))

    def _section(self, title: str, count: int) -> None:
        self.stdout.write(f"\n== {title}: {count}")
