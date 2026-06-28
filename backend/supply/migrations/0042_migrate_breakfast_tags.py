from django.db import migrations

BREAKFAST_TAGS = {
    "breakfast-base": {"name": "breakfast-base", "description": "Breakfast base ingredients (bread, rolls)"},
    "breakfast-topping": {"name": "breakfast-topping", "description": "Breakfast topping ingredients (spreads, cheese, meat)"},
    "breakfast-drink": {"name": "breakfast-drink", "description": "Breakfast drink recipes"},
    "breakfast-warm-meal": {"name": "breakfast-warm-meal", "description": "Warm breakfast meal recipes"},
}

OLD_TAG_NAMES = ["frühstücks-basis", "frühstücks-belag", "frühstücks-getränk"]

TAG_MAP = {
    "frühstücks-basis": "breakfast-base",
    "frühstücks-belag": "breakfast-topping",
    "frühstücks-getränk": "breakfast-drink",
}


def migrate_tags_forward(apps, schema_editor):
    Tag = apps.get_model("content", "Tag")
    NutritionalTag = apps.get_model("supply", "NutritionalTag")
    Ingredient = apps.get_model("supply", "Ingredient")
    Recipe = apps.get_model("recipe", "Recipe")

    for slug, defaults in BREAKFAST_TAGS.items():
        Tag.objects.get_or_create(slug=slug, defaults={"name": defaults["name"]})

    for old_name, new_slug in TAG_MAP.items():
        new_tag = Tag.objects.get(slug=new_slug)
        old_tags = NutritionalTag.objects.filter(name=old_name)
        if not old_tags.exists():
            continue

        for ing in Ingredient.objects.filter(nutritional_tags__in=old_tags):
            ing.tags.add(new_tag)

        for recipe in Recipe.objects.filter(nutritional_tags__in=old_tags):
            recipe.tags.add(new_tag)

    NutritionalTag.objects.filter(name__in=OLD_TAG_NAMES).delete()


def migrate_tags_reverse(apps, schema_editor):
    Tag = apps.get_model("content", "Tag")
    NutritionalTag = apps.get_model("supply", "NutritionalTag")
    Ingredient = apps.get_model("supply", "Ingredient")
    Recipe = apps.get_model("recipe", "Recipe")

    for slug, defaults in BREAKFAST_TAGS.items():
        tag = Tag.objects.filter(slug=slug).first()
        if tag:
            Ingredient.objects.filter(tags=tag).exclude(
                nutritional_tags__name__in=[k for k in TAG_MAP.keys() if TAG_MAP[k] == slug]
            )
            tag.delete()


class Migration(migrations.Migration):

    dependencies = [
        ("supply", "0041_ingredient_tags"),
    ]

    operations = [
        migrations.RunPython(migrate_tags_forward, migrate_tags_reverse),
    ]
