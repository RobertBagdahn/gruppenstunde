"""Seed the starter catalog of recipe materials.

Idempotent: existing materials (matched by case-insensitive name) are never changed.

Usage:
  manage.py seed_materials             # dry-run, nothing is written
  manage.py seed_materials --apply
"""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand
from django.db import transaction

from supply.data.seed_materials import SEED_MATERIALS
from supply.models import Material


class Command(BaseCommand):
    help = "Legt gängige Materialien (Geräte, Verbrauchsmaterial) an. Standard: Dry-Run."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument("--apply", action="store_true", help="Änderungen speichern (Standard: Dry-Run).")

    def handle(self, *args: Any, **options: Any) -> None:
        apply = options["apply"]
        created: list[str] = []
        skipped: list[str] = []
        with transaction.atomic():
            for entry in SEED_MATERIALS:
                if Material.all_objects.filter(name__iexact=entry["name"]).exists():
                    skipped.append(entry["name"])
                    continue
                Material.objects.create(
                    name=entry["name"],
                    material_category=entry["category"],
                    is_consumable=entry["is_consumable"],
                    package_size=entry["package_size"],
                )
                created.append(entry["name"])
            if not apply:
                transaction.set_rollback(True)

        mode = "angelegt" if apply else "würden angelegt (Dry-Run)"
        self.stdout.write(f"{len(created)} Materialien {mode}, {len(skipped)} bereits vorhanden.")
        for name in created:
            self.stdout.write(f"  + {name}")
