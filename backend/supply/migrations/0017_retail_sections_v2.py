"""Retail section catalog v2 (food-data-offensive).

Creates the finer supermarket aisle catalog and merges legacy groups into
their catalog targets. Ingredients from coarse legacy groups keep a default
target here; ``manage.py reclassify_retail_sections --apply`` refines them.

The catalog is frozen into this migration on purpose so later catalog edits
do not change what this migration does.
"""

from django.db import migrations

CATALOG = [
    ("Obst", 1, "Frisches Obst, Beeren, Zitrusfrüchte"),
    ("Gemüse", 2, "Frisches Gemüse, Kartoffeln, Zwiebeln, Pilze"),
    ("Salate & frische Kräuter", 3, "Blattsalate, Sprossen, frische Kräuter"),
    ("Brot & Backwaren", 4, "Brot, Brötchen, Toast, Wraps, Kuchen vom Bäcker"),
    ("Fleisch", 5, "Frisches Fleisch und Geflügel"),
    ("Wurst & Aufschnitt", 6, "Wurst, Schinken, Salami, Würstchen"),
    ("Fisch & Meeresfrüchte", 7, "Frischer, geräucherter und konservierter Fisch"),
    ("Milch & Pflanzendrinks", 8, "Milch, Sahne, Buttermilch, Hafer-/Sojadrinks"),
    ("Joghurt, Quark & Desserts", 9, "Joghurt, Quark, Skyr, Pudding, Kühldesserts"),
    ("Käse", 10, "Hart-, Schnitt-, Weich- und Frischkäse"),
    ("Eier", 11, "Hühnereier"),
    ("Butter & Margarine", 12, "Butter, Margarine, Schmalz"),
    ("Fleischersatz & Tofu", 13, "Tofu, Tempeh, Seitan, vegane Alternativen"),
    ("Feinkost & Kühltheke", 14, "Frische Pasta, Salate, Dips, Teige"),
    ("Nudeln", 15, "Trockene Teigwaren"),
    ("Reis & Getreide", 16, "Reis, Couscous, Bulgur, Grieß, Quinoa"),
    ("Hülsenfrüchte", 17, "Getrocknete Linsen, Bohnen, Kichererbsen"),
    ("Nüsse, Samen & Trockenobst", 18, "Nüsse, Kerne, Saaten, Trockenfrüchte"),
    ("Müsli & Cerealien", 19, "Müsli, Flocken, Cornflakes"),
    ("Mehl, Zucker & Backzutaten", 20, "Mehl, Zucker, Backpulver, Hefe"),
    ("Brotaufstriche", 21, "Konfitüre, Honig, Nuss-Nougat-Creme"),
    ("Konserven & Gläser", 22, "Dosen- und Glaskonserven"),
    ("Öle & Essig", 23, "Speiseöle, Essig, Bratfette"),
    ("Saucen & Würzsaucen", 24, "Ketchup, Senf, Mayonnaise, Pesto, Sojasauce"),
    ("Gewürze & Trockenkräuter", 25, "Salz, Pfeffer, Gewürze, getrocknete Kräuter"),
    ("Brühen, Suppen & Fertiggerichte", 26, "Brühe, Fix-Produkte, Instantgerichte"),
    ("Internationale Küche", 27, "Asia, Mexiko, Orient"),
    ("Süßwaren & Kekse", 28, "Schokolade, Fruchtgummi, Kekse, Riegel"),
    ("Knabberartikel", 29, "Chips, Flips, Salzstangen"),
    ("Kaffee, Tee & Kakao", 30, "Kaffee, Tee, Kakaopulver"),
    ("Säfte & Smoothies", 31, "Frucht- und Gemüsesäfte, Nektare, Smoothies"),
    ("Wasser & Erfrischungsgetränke", 32, "Wasser, Limonade, Sirup, Eistee"),
    ("Alkoholische Getränke", 33, "Bier, Wein, Spirituosen"),
    ("TK Obst & Gemüse", 34, "Tiefkühl-Obst, -Gemüse, -Kräuter, Pommes"),
    ("TK Fleisch & Fisch", 35, "Tiefkühl-Fleisch, -Fisch, -Meeresfrüchte"),
    ("TK Fertiggerichte & Pizza", 36, "Tiefkühl-Pizza, -Gerichte, -Snacks"),
    ("TK Eis & Desserts", 37, "Speiseeis, TK-Kuchen und -Desserts"),
    ("Sonstiges", 38, "Nicht zuordenbar"),
]

LEGACY_ALIASES = {
    "Getränke": "Wasser & Erfrischungsgetränke",
    "Alkoholfreie Getränke": "Wasser & Erfrischungsgetränke",
    "Obst & Gemüse": "Gemüse",
    "Fleisch & Wurst": "Fleisch",
    "Fleisch & Fisch": "Fleisch",
    "Fisch": "Fisch & Meeresfrüchte",
    "Milchprodukte & Käse": "Milch & Pflanzendrinks",
    "Milchprodukte": "Milch & Pflanzendrinks",
    "Gekühlt": "Feinkost & Kühltheke",
    "Nudeln & Reis & Getreide": "Reis & Getreide",
    "Öle & Soßen": "Saucen & Würzsaucen",
    "Gewürze & Kräuter": "Gewürze & Trockenkräuter",
    "Hülsenfrüchte & Nüsse": "Hülsenfrüchte",
    "Salzige Snacks": "Knabberartikel",
    "Süßwaren": "Süßwaren & Kekse",
    "Süßwaren & Snacks": "Süßwaren & Kekse",
    "Kaffee und Tee": "Kaffee, Tee & Kakao",
    "Tiefkühl": "TK Fertiggerichte & Pizza",
    "TK Fertiggerichte": "TK Fertiggerichte & Pizza",
    "Fleischersatz": "Fleischersatz & Tofu",
}


def forwards(apps, schema_editor):
    RetailSection = apps.get_model("supply", "RetailSection")
    Ingredient = apps.get_model("supply", "Ingredient")
    ShoppingListItem = apps.get_model("shopping", "ShoppingListItem")

    by_name = {}
    for name, rank, description in CATALOG:
        section = RetailSection.objects.filter(name=name).order_by("id").first()
        if section is None:
            section = RetailSection.objects.create(name=name, rank=rank, description=description)
        else:
            section.rank = rank
            section.description = description
            section.save(update_fields=["rank", "description"])
        by_name[name] = section

    fallback = by_name["Sonstiges"]
    for legacy in RetailSection.objects.exclude(id__in=[s.id for s in by_name.values()]):
        target = by_name.get(LEGACY_ALIASES.get(legacy.name, ""), fallback)
        Ingredient.objects.filter(retail_section=legacy).update(retail_section=target, retail_section_source="")
        ShoppingListItem.objects.filter(retail_section=legacy).update(retail_section=target)
        legacy.delete()


class Migration(migrations.Migration):
    dependencies = [
        ("supply", "0016_ingredient_data_review_fields"),
        ("shopping", "0003_food_integrity"),
    ]

    operations = [migrations.RunPython(forwards, migrations.RunPython.noop)]
