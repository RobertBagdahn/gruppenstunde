"""Create a shared shopping list for scripts/loadtest/shopping_group.py (local or test databases only)."""

import uuid

from django.conf import settings
from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from shopping.models import ShoppingList, ShoppingListItem, ShoppingListItemSource
from supply.models import Ingredient, Package
from supply.models.ingredient import IngredientStatusChoices

OWNER_USERNAME = "loadtest-owner"
LIST_NAME = "Lasttest Gruppeneinkauf"


class Command(BaseCommand):
    help = "Create a shared list with N entries (ingredient, package and sources each) and print its invitation token."

    def add_arguments(self, parser):
        parser.add_argument("--items", type=int, default=50, help="Number of entries (default: 50)")
        parser.add_argument(
            "--sources-per-item", type=int, default=3, help="Recipe/meal sources per entry (default: 3)"
        )
        parser.add_argument("--force", action="store_true", help="Allow running with DEBUG off (never on production)")

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEBUG and not options["force"]:
            raise CommandError("Refusing to seed a load-test list with DEBUG off; pass --force for a test database.")
        count = options["items"]
        if count < 1:
            raise CommandError("--items must be at least 1.")

        owner, _ = get_user_model().objects.get_or_create(
            username=OWNER_USERNAME, defaults={"email": "loadtest-owner@example.invalid"}
        )
        ShoppingList.objects.filter(owner=owner, name=LIST_NAME).delete()
        shopping_list = ShoppingList.objects.create(name=LIST_NAME, owner=owner)
        for index in range(1, count + 1):
            ingredient, _ = Ingredient.objects.get_or_create(
                slug=f"lasttest-zutat-{index:03d}",
                defaults={"name": f"Lasttest Zutat {index:03d}", "status": IngredientStatusChoices.VERIFIED},
            )
            Package.objects.get_or_create(ingredient=ingredient, rank=1, defaults={"name": "Packung", "weight_g": 500})
            item = ShoppingListItem.objects.create(
                shopping_list=shopping_list,
                ingredient=ingredient,
                name=ingredient.name,
                quantity_g=250 + index * 10,
                unit="g",
                sort_order=index,
            )
            ShoppingListItemSource.objects.bulk_create(
                ShoppingListItemSource(
                    shopping_list_item=item,
                    ingredient=ingredient,
                    quantity_g=item.quantity_g / options["sources_per_item"],
                    recipe_name=f"Lasttest Rezept {source:02d}",
                    recipe_slug=f"lasttest-rezept-{source:02d}",
                    meal_label=f"Tag {source} Mittagessen",
                )
                for source in range(1, options["sources_per_item"] + 1)
            )
        shopping_list.share_token = uuid.uuid4()
        shopping_list.save(update_fields=["share_token", "updated_at"])
        self.stdout.write(f"list_id={shopping_list.id}")
        self.stdout.write(f"invite_token={shopping_list.share_token}")
