"""
Management command to seed packing list templates from presets.

Uses PRESETS + build_dynamic_list() to generate template packing lists
dynamically based on context combinations.

Usage:
    uv run python manage.py seed_packing_lists
    uv run python manage.py seed_packing_lists --clear  # remove existing templates first
"""

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from packinglist.models import PackingCategory, PackingItem, PackingList
from packinglist.services.suggestion_service import PRESETS, build_dynamic_list

User = get_user_model()


def _get_or_create_template_user():
    """Get or create a system user for template ownership."""
    user, _ = User.objects.get_or_create(
        email="system@gruppenstunde.de",
        defaults={
            "username": "system",
            "is_active": True,
            "is_staff": True,
        },
    )
    return user


class Command(BaseCommand):
    help = "Seed packing list templates from presets using the dynamic builder."

    def add_arguments(self, parser):
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Remove all existing template packing lists before seeding.",
        )

    @transaction.atomic
    def handle(self, *args, **options):
        if options["clear"]:
            count, _ = PackingList.objects.filter(is_template=True).delete()
            self.stdout.write(self.style.WARNING(f"Removed {count} existing template objects."))

        owner = _get_or_create_template_user()
        created_count = 0
        skipped_count = 0

        for preset in PRESETS:
            title = preset["name"]

            # Skip if template with same title already exists
            if PackingList.objects.filter(title=title, is_template=True).exists():
                skipped_count += 1
                self.stdout.write(f"  Skipped (exists): {title}")
                continue

            context = preset["context"]
            built = build_dynamic_list(context)

            packing_list = PackingList.objects.create(
                title=title,
                description=preset["description"],
                owner=owner,
                is_template=True,
                activity_type=context.get("activity"),
                duration=context.get("duration"),
                season=context.get("season"),
                age_group=context.get("age_group"),
            )

            total_items = 0
            dnb_count = 0

            for sort_order, (cat_name, items) in enumerate(built.items()):
                category = PackingCategory.objects.create(
                    packing_list=packing_list,
                    name=cat_name,
                    sort_order=sort_order,
                )

                for idx, item_data in enumerate(items):
                    is_dnb = item_data.get("is_do_not_bring", False)
                    PackingItem.objects.create(
                        category=category,
                        name=item_data["name"],
                        quantity=item_data.get("quantity", ""),
                        description=item_data.get("description", ""),
                        is_do_not_bring=is_dnb,
                        sort_order=idx,
                    )
                    total_items += 1
                    if is_dnb:
                        dnb_count += 1

            created_count += 1
            cat_count = len(built)
            dnb_info = f", {dnb_count} nicht-mitbringen" if dnb_count else ""
            self.stdout.write(f"  Created: {title} ({cat_count} categories, {total_items} items{dnb_info})")

        self.stdout.write(self.style.SUCCESS(f"\nDone! Created {created_count} templates, skipped {skipped_count}."))
