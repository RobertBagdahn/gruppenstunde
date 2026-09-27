"""Create the buffet parent tag and the nine buffet role tags (idempotent by slug)."""

from django.db import migrations

BUFFET_PARENT = ("buffet", "Buffet", "layout-grid")

# (slug, German name, Lucide icon name)
BUFFET_ROLES = [
    ("buffet-bread", "Brot & Gebäck", "croissant"),
    ("buffet-fat", "Streichfett", "droplet"),
    ("buffet-savory", "Belag herzhaft", "ham"),
    ("buffet-sweet", "Belag süß", "candy"),
    ("buffet-condiment", "Soßen & Würze", "chef-hat"),
    ("buffet-fresh", "Gemüse & Obst", "apple"),
    ("buffet-cereal", "Müsli & Joghurt", "wheat"),
    ("buffet-drink", "Getränke", "coffee"),
    ("buffet-dish", "Gerichte", "utensils"),
]


def create_buffet_tags(apps, schema_editor):
    Tag = apps.get_model("content", "Tag")
    slug, name, icon = BUFFET_PARENT
    parent, _ = Tag.objects.get_or_create(
        slug=slug,
        defaults={"name": name, "icon": icon, "group": "buffet", "sort_order": 0},
    )
    for index, (slug, name, icon) in enumerate(BUFFET_ROLES, start=1):
        Tag.objects.update_or_create(
            slug=slug,
            defaults={"name": name, "icon": icon, "group": "buffet", "sort_order": index, "parent": parent},
        )


def remove_buffet_tags(apps, schema_editor):
    Tag = apps.get_model("content", "Tag")
    Tag.objects.filter(slug__in=[slug for slug, _, _ in BUFFET_ROLES]).delete()
    Tag.objects.filter(slug=BUFFET_PARENT[0]).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("content", "0014_aiinteraction_structured_retry"),
    ]

    operations = [
        migrations.RunPython(create_buffet_tags, remove_buffet_tags),
    ]
