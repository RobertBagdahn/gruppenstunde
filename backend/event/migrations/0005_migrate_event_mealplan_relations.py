import logging

from django.db import migrations

logger = logging.getLogger(__name__)


def migrate_relations(apps, schema_editor):
    Event = apps.get_model("event", "Event")
    MealPlan = apps.get_model("planner", "MealPlan")
    Relation = apps.get_model("event", "EventMealPlanRelation")

    relation_pairs: dict[int, int] = {}
    conflicts: list[tuple[int, int, int]] = []

    for meal_plan in MealPlan.objects.exclude(event_id=None).only("id", "event_id"):
        relation_pairs[meal_plan.id] = meal_plan.event_id

    for event in Event.objects.exclude(meal_plan_id=None).only("id", "meal_plan_id"):
        current_event_id = relation_pairs.get(event.meal_plan_id)
        if current_event_id is None:
            relation_pairs[event.meal_plan_id] = event.id
        elif current_event_id != event.id:
            conflicts.append((event.meal_plan_id, current_event_id, event.id))

    for meal_plan_id, event_id in relation_pairs.items():
        Relation.objects.create(meal_plan_id=meal_plan_id, event_id=event_id)

    if conflicts:
        logger.warning(
            "Event/MealPlan relation conflicts (MealPlan-side link kept): "
            + ", ".join(
                f"meal_plan={meal_plan_id}:kept={kept}:ignored={ignored}"
                for meal_plan_id, kept, ignored in conflicts
            )
        )


def reverse_relations(apps, schema_editor):
    Relation = apps.get_model("event", "EventMealPlanRelation")
    for relation in Relation.objects.select_related("event", "meal_plan"):
        relation.meal_plan.event_id = relation.event_id
        relation.meal_plan.save(update_fields=["event"])
        relation.event.meal_plan_id = relation.meal_plan_id
        relation.event.save(update_fields=["meal_plan"])


class Migration(migrations.Migration):
    dependencies = [("event", "0004_eventmealplanrelation")]

    operations = [migrations.RunPython(migrate_relations, reverse_relations)]
