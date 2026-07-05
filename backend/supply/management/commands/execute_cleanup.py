#!/usr/bin/env python
"""
Execute cleanup based on a candidate file.

Usage:
    uv run python manage.py execute_cleanup --file cleanup_candidates.txt

This will read the candidate file (after you've edited it) and remove
only the ingredients that remain in the file.
"""
import json
import os
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = 'Execute cleanup based on candidate file'

    def add_arguments(self, parser):
        parser.add_argument(
            '--file',
            type=str,
            required=True,
            help='Path to candidate file'
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Preview without making changes'
        )

    def handle(self, *args, **options):
        candidate_file = options['file']
        dry_run = options.get('dry_run', False)
        
        if not os.path.exists(candidate_file):
            self.stdout.write(
                self.style.ERROR(f"File not found: {candidate_file}")
            )
            return
        
        # Parse candidate file
        pks_to_remove = set()
        candidates = []
        
        self.stdout.write(f"Reading: {candidate_file}")
        with open(candidate_file, 'r', encoding='utf-8') as f:
            for line in f:
                line = line.strip()
                if not line or line.startswith('#'):
                    continue
                
                parts = line.split('|')
                if len(parts) >= 1:
                    try:
                        pk = int(parts[0])
                        name = parts[1] if len(parts) > 1 else ''
                        pks_to_remove.add(pk)
                        candidates.append({'pk': pk, 'name': name})
                    except ValueError:
                        pass
        
        self.stdout.write(f"✓ Parsed {len(candidates)} candidates")
        
        # Get fixture
        backend_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
        fixture_path = os.path.join(backend_root, 'data', 'food', 'supply_ingredient.json')
        
        self.stdout.write(f"Loading fixture: {fixture_path}")
        with open(fixture_path, 'r', encoding='utf-8') as f:
            fixture_data = json.load(f)
        
        # Count current
        initial_count = len([x for x in fixture_data if x.get('model') == 'supply.ingredient'])
        
        # Filter
        new_fixture_data = [
            item for item in fixture_data
            if not (item.get('model') == 'supply.ingredient' and item.get('pk') in pks_to_remove)
        ]
        
        final_count = len([x for x in new_fixture_data if x.get('model') == 'supply.ingredient'])
        
        # Show summary
        self.stdout.write(
            self.style.WARNING(
                f"\nWill remove: {initial_count - final_count} ingredients"
            )
        )
        
        for item in candidates[:10]:
            self.stdout.write(f"  • pk {item['pk']}: {item['name'][:50]}")
        
        if len(candidates) > 10:
            self.stdout.write(f"  ... and {len(candidates) - 10} more")
        
        if dry_run:
            self.stdout.write(self.style.WARNING("\nDRY RUN: No changes made"))
            return
        
        # Write
        self.stdout.write(f"\nWriting updated fixture...")
        with open(fixture_path, 'w', encoding='utf-8') as f:
            json.dump(new_fixture_data, f, indent=2, ensure_ascii=False)
        
        self.stdout.write(
            self.style.SUCCESS(
                f"✓ Ingredients: {initial_count} → {final_count}"
            )
        )
        self.stdout.write(
            self.style.SUCCESS(f"✓ Updated: {fixture_path}")
        )
