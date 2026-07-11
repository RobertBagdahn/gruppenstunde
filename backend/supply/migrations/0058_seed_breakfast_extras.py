# Generated migration to seed system breakfast extras

from django.db import migrations


def create_breakfast_extra_tag_and_extras(apps, schema_editor):
    """Create breakfast-extra tag and seed system extras."""
    Tag = apps.get_model("content", "Tag")
    Ingredient = apps.get_model("supply", "Ingredient")
    
    # Create breakfast-extra tag (if not exists)
    breakfast_extra_tag, created = Tag.objects.get_or_create(
        slug="breakfast-extra",
        defaults={
            "name": "Frühstück-Extra",
            "group": "breakfast_wizard",
            "sort_order": 50,
            "is_approved": True,
        },
    )
    
    # Define system extras (von, status, name, description)
    extras_data = [
        {
            "name": "Marmelade",
            "description": "Konfitüre/Marmelade (standard)",
            "energy_kcal": 280,
        },
        {
            "name": "Honig",
            "description": "Honig zum Strich (standard)",
            "energy_kcal": 288,
        },
        {
            "name": "Nutella",
            "description": "Haselnuss-Schokoladencreme",
            "energy_kcal": 540,
        },
        {
            "name": "Zucker",
            "description": "Haushaltszucker",
            "energy_kcal": 387,
        },
        {
            "name": "Nussmus",
            "description": "Erdnuss- oder Mandelbutter",
            "energy_kcal": 588,
        },
        {
            "name": "Käse",
            "description": "Hartkäse/Schnittkäse",
            "energy_kcal": 402,
        },
        {
            "name": "Wurst",
            "description": "Aufschnitt/Wurst",
            "energy_kcal": 260,
        },
        {
            "name": "Ei",
            "description": "Gekochtes Ei",
            "energy_kcal": 155,
        },
    ]
    
    # Create Ingredient for each extra (only if not exists)
    for extra_data in extras_data:
        ingredient, created = Ingredient.objects.get_or_create(
            slug=extra_data["name"].lower().replace(" ", "-"),
            defaults={
                "name": extra_data["name"],
                "description": extra_data["description"],
                "energy_kcal": extra_data.get("energy_kcal", 0),
                "status": "approved",  # System extras are approved
                "owner": None,  # System item (not user-owned)
                "visibility": "private",  # Irrelevant for system items, but set for consistency
                "is_standalone_food": True,
            },
        )
        
        # Add breakfast-extra tag
        if created:
            ingredient.tags.add(breakfast_extra_tag)
        # If already existed, also ensure tag is present
        elif not ingredient.tags.filter(id=breakfast_extra_tag.id).exists():
            ingredient.tags.add(breakfast_extra_tag)


def reverse_breakfast_extra_tag(apps, schema_editor):
    """Reverse: remove breakfast extra tag and optionally delete extras."""
    Tag = apps.get_model("content", "Tag")
    # Just delete the tag; existing Ingredients remain
    Tag.objects.filter(slug="breakfast-extra").delete()


class Migration(migrations.Migration):

    dependencies = [
        ("supply", "0057_add_ingredient_indexes"),
        ("content", "0001_initial"),  # Need Tag model
    ]

    operations = [
        migrations.RunPython(
            create_breakfast_extra_tag_and_extras,
            reverse_breakfast_extra_tag,
        ),
    ]
