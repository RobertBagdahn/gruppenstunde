"""Idempotent command to restructure RetailSections onto the unified catalog.

Steps (see openspec/changes/retail-sections-restructure/design.md):
1. Rename the legacy "Getränke" group to "Alkoholfreie Getränke" (existing
   ingredients keep their assignment automatically).
2. Ensure every RETAIL_SECTIONS catalog entry exists with the correct `rank`
   (get_or_create + rank alignment) — idempotent, safe to re-run.
3. Re-map ingredients without a retail_section via keyword matching; anything
   still unmatched falls back to "Sonstiges".
4. Fix ingredients that ended up in "Alkoholfreie Getränke" but whose name/
   description matches an alcohol keyword — move them to "Alkoholische Getränke".

Run with --dry-run to preview without writing changes.
"""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand

from supply.data.retail_sections import LEGACY_GETRAENKE_RENAME, RETAIL_SECTIONS

# Keywords that indicate an ingredient is alcoholic (see retail_section_mapping.py D3).
ALCOHOL_KEYWORDS = ("BIER", "SPIRITUOSE", "SEKT", "LIKOER", "LIKÖR")


class Command(BaseCommand):
    help = "Idempotent restructuring of RetailSections onto the unified RETAIL_SECTIONS catalog."

    def add_arguments(self, parser: Any) -> None:
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Show planned actions without modifying the database.",
        )

    def handle(self, *args: Any, **options: Any) -> None:
        from supply.models import Ingredient, RetailSection
        from supply.services.retail_section_mapping import _get_retail_section_by_name, get_retail_section

        dry_run = options["dry_run"]

        if dry_run:
            self.stdout.write(self.style.WARNING("DRY RUN — keine Änderungen.\n"))

        # --- Step 1: Rename legacy "Getränke" -> "Alkoholfreie Getränke" ---
        old_name, new_name = LEGACY_GETRAENKE_RENAME
        legacy = RetailSection.objects.filter(name=old_name).first()
        if legacy is not None:
            count = legacy.ingredients.count()
            self.stdout.write(f'Umbenennen: "{old_name}" → "{new_name}" ({count} Zutaten)')
            if not dry_run:
                legacy.name = new_name
                legacy.save(update_fields=["name"])
        else:
            self.stdout.write(f'Keine Gruppe "{old_name}" gefunden (bereits umbenannt oder nie vorhanden).')

        # --- Step 2: Ensure catalog groups exist with correct rank ---
        self.stdout.write("\nKatalog-Gruppen abgleichen:")
        for entry in RETAIL_SECTIONS:
            section = RetailSection.objects.filter(name=entry["name"]).first()
            if section is None:
                self.stdout.write(f'  + Neu: "{entry["name"]}" (rank={entry["rank"]})')
                if not dry_run:
                    RetailSection.objects.create(name=entry["name"], rank=entry["rank"])
            elif section.rank != entry["rank"]:
                self.stdout.write(f'  ~ Rank-Update: "{entry["name"]}" {section.rank} → {entry["rank"]}')
                if not dry_run:
                    section.rank = entry["rank"]
                    section.save(update_fields=["rank"])

        # --- Step 3: Re-map ingredients without a retail_section ---
        # New groups may have just been created in Step 2 — clear the mapping
        # service's cached RetailSection lookup so they resolve correctly.
        _get_retail_section_by_name.cache_clear()
        sonstiges = RetailSection.objects.filter(name="Sonstiges").first()
        unassigned = Ingredient.objects.filter(retail_section__isnull=True)
        unassigned_count = unassigned.count()
        self.stdout.write(f"\nZutaten ohne Warengruppe: {unassigned_count}")

        remapped = 0
        fallback = 0
        for ing in unassigned.iterator():
            rs = get_retail_section(ing.name, ing.description)
            target = rs or sonstiges
            if target is None:
                continue
            if rs is None:
                fallback += 1
            else:
                remapped += 1
            self.stdout.write(f'  "{ing.name}" → "{target.name}"' + (" (Sonstiges)" if rs is None else ""))
            if not dry_run:
                ing.retail_section = target
                ing.save(update_fields=["retail_section"])

        self.stdout.write(f"  Automatisch zugeordnet: {remapped}, auf Sonstiges gefallen: {fallback}")

        # --- Step 4: Fix alcohol misassignments ---
        alkoholfrei = RetailSection.objects.filter(name="Alkoholfreie Getränke").first()
        alkoholisch = RetailSection.objects.filter(name="Alkoholische Getränke").first()
        fixed = 0
        if alkoholfrei is not None and alkoholisch is not None:
            self.stdout.write("\nAlkohol-Fehlzuordnungen prüfen:")
            candidates = Ingredient.objects.filter(retail_section=alkoholfrei)
            for ing in candidates.iterator():
                haystack = f"{ing.name} {ing.description}".upper()
                if any(keyword in haystack for keyword in ALCOHOL_KEYWORDS):
                    self.stdout.write(f'  "{ing.name}": Alkoholfreie Getränke → Alkoholische Getränke')
                    fixed += 1
                    if not dry_run:
                        ing.retail_section = alkoholisch
                        ing.save(update_fields=["retail_section"])
            self.stdout.write(f"  Korrigiert: {fixed}")

        if dry_run:
            self.stdout.write(self.style.WARNING("\nDry Run abgeschlossen. Keine Änderungen gespeichert."))
        else:
            self.stdout.write(self.style.SUCCESS("\nAlle Änderungen ausgeführt."))
