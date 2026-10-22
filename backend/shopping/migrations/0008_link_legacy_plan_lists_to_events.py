from django.db import migrations


def link_legacy_lists(apps, schema_editor):
    """Give meal_event lists the event of their plan; idempotent, untouched lists stay as they are."""
    ShoppingList = apps.get_model("shopping", "ShoppingList")
    Relation = apps.get_model("event", "EventMealPlanRelation")

    event_by_plan = dict(Relation.objects.values_list("meal_plan_id", "event_id"))
    if not event_by_plan:
        return

    lists = ShoppingList.objects.filter(
        source_type="meal_event",
        source_id__in=list(event_by_plan),
        event__isnull=True,
    )
    for shopping_list in lists.iterator():
        shopping_list.event_id = event_by_plan[shopping_list.source_id]
        shopping_list.materialized_at = shopping_list.created_at
        shopping_list.plan_synced_at = shopping_list.created_at
        shopping_list.save(update_fields=["event", "materialized_at", "plan_synced_at"])


class Migration(migrations.Migration):
    dependencies = [
        ("shopping", "0007_event_trips"),
        ("event", "0006_remove_event_meal_plan"),
    ]

    operations = [
        migrations.RunPython(link_legacy_lists, migrations.RunPython.noop),
    ]
