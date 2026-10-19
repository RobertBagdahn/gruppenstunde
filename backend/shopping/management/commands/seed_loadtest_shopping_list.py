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
EVENT_NAME = "Lasttest Event"


class Command(BaseCommand):
    help = "Create a shared list with N entries (ingredient, package and sources each) and print its invitation token."

    def add_arguments(self, parser):
        parser.add_argument("--items", type=int, default=50, help="Number of entries (default: 50)")
        parser.add_argument(
            "--sources-per-item", type=int, default=3, help="Recipe/meal sources per entry (default: 3)"
        )
        parser.add_argument(
            "--event-meals",
            type=int,
            default=0,
            help="Also create an event with a meal plan of N meals and three trips (for the plan endpoint probe)",
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
        if options["event_meals"] > 0:
            event = self._seed_event(owner, options["event_meals"], min(count, 30))
            self.stdout.write(f"event_slug={event.slug}")
            self.stdout.write(f"planner_email={owner.email}")

    def _seed_event(self, owner, meals: int, ingredient_count: int):
        """Event with one plan of `meals` meals (each with the first ingredients) and three trips."""
        import datetime as dt
        from decimal import Decimal

        from event.models import Event, EventMealPlanRelation
        from planner.models import Meal, MealItem, MealPlan
        from shopping.models import SourceType, Store
        from supply.models import MeasuringUnit

        Event.objects.filter(created_by=owner, name=EVENT_NAME).delete()
        MealPlan.objects.filter(created_by=owner, name=EVENT_NAME).delete()
        start = dt.datetime(2026, 10, 23, 0, 0, tzinfo=dt.UTC)
        days = (meals + 2) // 3
        end = start + dt.timedelta(days=days)
        event = Event.objects.create(name=EVENT_NAME, created_by=owner, start_date=start, end_date=end, is_public=False)
        event.responsible_persons.add(owner)
        plan = MealPlan.objects.create(
            name=EVENT_NAME,
            created_by=owner,
            owner=owner,
            norm_portions=40,
            reserve_factor=1.1,
            start_datetime=start,
            end_datetime=end,
        )
        EventMealPlanRelation.objects.create(event=event, meal_plan=plan)
        gram, _ = MeasuringUnit.objects.get_or_create(name="Gramm", defaults={"quantity": 1.0, "unit": "g"})
        ingredients = list(
            Ingredient.objects.filter(slug__startswith="lasttest-zutat-").order_by("slug")[:ingredient_count]
        )
        slots = (("breakfast", 8), ("lunch", 12), ("dinner", 18))
        for index in range(meals):
            day, (meal_type, hour) = divmod(index, 3)[0], slots[index % 3]
            begins = start + dt.timedelta(days=day, hours=hour)
            meal = Meal.objects.create(
                meal_plan=plan,
                meal_type=meal_type,
                start_datetime=begins,
                end_datetime=begins + dt.timedelta(hours=1),
                day_part_factor=0.3,
            )
            MealItem.objects.bulk_create(
                MealItem(meal=meal, ingredient=ingredient, quantity=Decimal(50), measuring_unit=gram, factor=1.0)
                for ingredient in ingredients
            )
        for number, offset_hours in enumerate((-12, 24 * (days // 2), 24 * days - 12), start=1):
            store, _ = Store.objects.get_or_create(owner=owner, name=f"Lasttest Laden {number}")
            ShoppingList.objects.create(
                name=f"Lasttest Einkauf {number}",
                owner=owner,
                event=event,
                store=store,
                scheduled_at=start + dt.timedelta(hours=offset_hours),
                source_type=SourceType.EVENT_TRIP,
            )
        return event
