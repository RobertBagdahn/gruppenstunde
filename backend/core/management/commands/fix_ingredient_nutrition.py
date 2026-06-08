"""
Management command to fix missing nutritional data for imported ingredients.

Applies known nutritional values (per 100g) to legacy-imported ingredients
that have energy_kcal=0 or are missing fat/carb data. Then recalculates all
recipe caches.

Usage:
    uv run python manage.py fix_ingredient_nutrition          # fix + recalculate
    uv run python manage.py fix_ingredient_nutrition --dry-run  # preview only
"""

from django.core.management.base import BaseCommand

from supply.models import Ingredient

# Known nutritional values per 100g for common ingredients
# Source: BLS (Bundeslebensmittelschlüssel) / standard German food composition
NUTRITION_FIXES = {
    # Oils & Fats
    "Öl, Raps": {"energy_kcal": 884.0, "protein_g": 0.0, "fat_g": 100.0, "fat_sat_g": 7.0, "carbohydrate_g": 0.0, "sugar_g": 0.0, "fibre_g": 0.0, "salt_g": 0.0},
    "Olivenöl": {"energy_kcal": 884.0, "protein_g": 0.0, "fat_g": 100.0, "fat_sat_g": 14.0, "carbohydrate_g": 0.0, "sugar_g": 0.0, "fibre_g": 0.0, "salt_g": 0.0},
    "Rapsöl": {"energy_kcal": 884.0, "protein_g": 0.0, "fat_g": 100.0, "fat_sat_g": 7.0, "carbohydrate_g": 0.0, "sugar_g": 0.0, "fibre_g": 0.0, "salt_g": 0.0},
    "Sonnenblumenöl": {"energy_kcal": 884.0, "protein_g": 0.0, "fat_g": 100.0, "fat_sat_g": 11.0, "carbohydrate_g": 0.0, "sugar_g": 0.0, "fibre_g": 0.0, "salt_g": 0.0},
    "Kokosöl": {"energy_kcal": 884.0, "protein_g": 0.0, "fat_g": 100.0, "fat_sat_g": 86.0, "carbohydrate_g": 0.0, "sugar_g": 0.0, "fibre_g": 0.0, "salt_g": 0.0},
    "Butter": {"energy_kcal": 730.0, "protein_g": 0.7, "fat_g": 82.0, "fat_sat_g": 50.0, "carbohydrate_g": 0.6, "sugar_g": 0.6, "fibre_g": 0.0, "salt_g": 0.04},
    "Margarine": {"energy_kcal": 629.0, "protein_g": 0.2, "fat_g": 80.0, "fat_sat_g": 20.0, "carbohydrate_g": 0.4, "sugar_g": 0.4, "fibre_g": 0.0, "salt_g": 0.4},

    # Dairy
    "Milch": {"energy_kcal": 65.0, "protein_g": 3.4, "fat_g": 3.5, "fat_sat_g": 2.1, "carbohydrate_g": 4.8, "sugar_g": 4.8, "fibre_g": 0.0, "salt_g": 0.11},
    "Sahne": {"energy_kcal": 294.0, "protein_g": 2.4, "fat_g": 30.0, "fat_sat_g": 19.0, "carbohydrate_g": 3.4, "sugar_g": 3.4, "fibre_g": 0.0, "salt_g": 0.07},
    "Schmand": {"energy_kcal": 241.0, "protein_g": 3.0, "fat_g": 24.0, "fat_sat_g": 15.0, "carbohydrate_g": 3.5, "sugar_g": 3.5, "fibre_g": 0.0, "salt_g": 0.1},
    "Creme Fraiche": {"energy_kcal": 301.0, "protein_g": 2.5, "fat_g": 30.0, "fat_sat_g": 20.0, "carbohydrate_g": 2.5, "sugar_g": 2.5, "fibre_g": 0.0, "salt_g": 0.08},
    "Crème fraîche": {"energy_kcal": 301.0, "protein_g": 2.5, "fat_g": 30.0, "fat_sat_g": 20.0, "carbohydrate_g": 2.5, "sugar_g": 2.5, "fibre_g": 0.0, "salt_g": 0.08},
    "Joghurt": {"energy_kcal": 62.0, "protein_g": 4.0, "fat_g": 3.5, "fat_sat_g": 2.3, "carbohydrate_g": 4.7, "sugar_g": 4.7, "fibre_g": 0.0, "salt_g": 0.13},
    "Frischkäse": {"energy_kcal": 249.0, "protein_g": 6.0, "fat_g": 24.0, "fat_sat_g": 15.0, "carbohydrate_g": 3.0, "sugar_g": 3.0, "fibre_g": 0.0, "salt_g": 0.7},
    "Cheddar": {"energy_kcal": 406.0, "protein_g": 25.0, "fat_g": 33.0, "fat_sat_g": 21.0, "carbohydrate_g": 0.1, "sugar_g": 0.1, "fibre_g": 0.0, "salt_g": 1.8},
    "Mozzarella": {"energy_kcal": 251.0, "protein_g": 18.0, "fat_g": 20.0, "fat_sat_g": 14.0, "carbohydrate_g": 1.0, "sugar_g": 1.0, "fibre_g": 0.0, "salt_g": 0.5},
    "Parmesan": {"energy_kcal": 409.0, "protein_g": 36.0, "fat_g": 28.0, "fat_sat_g": 18.0, "carbohydrate_g": 0.0, "sugar_g": 0.0, "fibre_g": 0.0, "salt_g": 1.6},
    "Burrata": {"energy_kcal": 263.0, "protein_g": 15.0, "fat_g": 22.0, "fat_sat_g": 15.0, "carbohydrate_g": 1.0, "sugar_g": 1.0, "fibre_g": 0.0, "salt_g": 0.4},
    "Quark": {"energy_kcal": 72.0, "protein_g": 12.0, "fat_g": 0.3, "fat_sat_g": 0.2, "carbohydrate_g": 4.0, "sugar_g": 4.0, "fibre_g": 0.0, "salt_g": 0.1},

    # Eggs
    "Eier": {"energy_kcal": 142.0, "protein_g": 12.6, "fat_g": 10.6, "fat_sat_g": 3.3, "carbohydrate_g": 0.3, "sugar_g": 0.3, "fibre_g": 0.0, "salt_g": 0.37},
    "Ei": {"energy_kcal": 142.0, "protein_g": 12.6, "fat_g": 10.6, "fat_sat_g": 3.3, "carbohydrate_g": 0.3, "sugar_g": 0.3, "fibre_g": 0.0, "salt_g": 0.37},

    # Grains & Pasta
    "Mehl": {"energy_kcal": 344.0, "protein_g": 10.0, "fat_g": 1.0, "fat_sat_g": 0.2, "carbohydrate_g": 72.0, "sugar_g": 0.7, "fibre_g": 3.0, "salt_g": 0.01},
    "Dinkelmehl Type 630": {"energy_kcal": 344.0, "protein_g": 11.0, "fat_g": 1.5, "fat_sat_g": 0.2, "carbohydrate_g": 70.0, "sugar_g": 0.7, "fibre_g": 4.0, "salt_g": 0.01},
    "Nudeln": {"energy_kcal": 360.0, "protein_g": 12.5, "fat_g": 1.8, "fat_sat_g": 0.3, "carbohydrate_g": 70.0, "sugar_g": 3.2, "fibre_g": 3.0, "salt_g": 0.01},
    "Spaghetti": {"energy_kcal": 360.0, "protein_g": 12.5, "fat_g": 1.8, "fat_sat_g": 0.3, "carbohydrate_g": 70.0, "sugar_g": 3.2, "fibre_g": 3.0, "salt_g": 0.01},
    "Reis": {"energy_kcal": 360.0, "protein_g": 7.0, "fat_g": 0.6, "fat_sat_g": 0.2, "carbohydrate_g": 78.0, "sugar_g": 0.2, "fibre_g": 1.4, "salt_g": 0.01},
    "Basmatireis": {"energy_kcal": 360.0, "protein_g": 7.0, "fat_g": 0.6, "fat_sat_g": 0.2, "carbohydrate_g": 78.0, "sugar_g": 0.2, "fibre_g": 1.4, "salt_g": 0.01},
    "Couscous": {"energy_kcal": 362.0, "protein_g": 13.0, "fat_g": 1.5, "fat_sat_g": 0.3, "carbohydrate_g": 72.0, "sugar_g": 0.5, "fibre_g": 2.0, "salt_g": 0.01},
    "Haferflocken": {"energy_kcal": 368.0, "protein_g": 13.5, "fat_g": 7.0, "fat_sat_g": 1.3, "carbohydrate_g": 58.7, "sugar_g": 1.0, "fibre_g": 10.0, "salt_g": 0.01},
    "Brot": {"energy_kcal": 239.0, "protein_g": 8.0, "fat_g": 1.5, "fat_sat_g": 0.3, "carbohydrate_g": 46.0, "sugar_g": 3.0, "fibre_g": 4.0, "salt_g": 1.2},
    "Brötchen": {"energy_kcal": 270.0, "protein_g": 9.0, "fat_g": 2.0, "fat_sat_g": 0.4, "carbohydrate_g": 52.0, "sugar_g": 3.0, "fibre_g": 3.0, "salt_g": 1.2},
    "Baguette": {"energy_kcal": 270.0, "protein_g": 9.0, "fat_g": 1.5, "fat_sat_g": 0.3, "carbohydrate_g": 54.0, "sugar_g": 2.0, "fibre_g": 2.5, "salt_g": 1.3},
    "Baguette (aufback)": {"energy_kcal": 270.0, "protein_g": 9.0, "fat_g": 1.5, "fat_sat_g": 0.3, "carbohydrate_g": 54.0, "sugar_g": 2.0, "fibre_g": 2.5, "salt_g": 1.3},
    "Burger Buns": {"energy_kcal": 287.0, "protein_g": 8.0, "fat_g": 5.0, "fat_sat_g": 1.0, "carbohydrate_g": 50.0, "sugar_g": 5.0, "fibre_g": 2.0, "salt_g": 1.0},
    "Tortilla-Wraps": {"energy_kcal": 306.0, "protein_g": 8.0, "fat_g": 7.0, "fat_sat_g": 3.0, "carbohydrate_g": 50.0, "sugar_g": 3.0, "fibre_g": 2.5, "salt_g": 1.2},

    # Vegetables
    "Kartoffel": {"energy_kcal": 71.0, "protein_g": 2.0, "fat_g": 0.1, "fat_sat_g": 0.0, "carbohydrate_g": 15.0, "sugar_g": 0.8, "fibre_g": 2.1, "salt_g": 0.01},
    "Kartoffeln": {"energy_kcal": 71.0, "protein_g": 2.0, "fat_g": 0.1, "fat_sat_g": 0.0, "carbohydrate_g": 15.0, "sugar_g": 0.8, "fibre_g": 2.1, "salt_g": 0.01},
    "Babykartoffeln": {"energy_kcal": 71.0, "protein_g": 2.0, "fat_g": 0.1, "fat_sat_g": 0.0, "carbohydrate_g": 15.0, "sugar_g": 0.8, "fibre_g": 2.1, "salt_g": 0.01},
    "Zwiebel": {"energy_kcal": 39.0, "protein_g": 1.3, "fat_g": 0.3, "fat_sat_g": 0.0, "carbohydrate_g": 7.0, "sugar_g": 5.0, "fibre_g": 1.4, "salt_g": 0.01},
    "Zwiebeln": {"energy_kcal": 39.0, "protein_g": 1.3, "fat_g": 0.3, "fat_sat_g": 0.0, "carbohydrate_g": 7.0, "sugar_g": 5.0, "fibre_g": 1.4, "salt_g": 0.01},
    "Knoblauch": {"energy_kcal": 141.0, "protein_g": 6.4, "fat_g": 0.5, "fat_sat_g": 0.1, "carbohydrate_g": 28.0, "sugar_g": 1.0, "fibre_g": 2.1, "salt_g": 0.02},
    "Paprika": {"energy_kcal": 26.0, "protein_g": 1.0, "fat_g": 0.3, "fat_sat_g": 0.0, "carbohydrate_g": 4.2, "sugar_g": 4.2, "fibre_g": 1.7, "salt_g": 0.0},
    "Tomaten": {"energy_kcal": 18.0, "protein_g": 1.0, "fat_g": 0.2, "fat_sat_g": 0.0, "carbohydrate_g": 2.6, "sugar_g": 2.6, "fibre_g": 1.2, "salt_g": 0.01},
    "Cherrytomaten": {"energy_kcal": 18.0, "protein_g": 1.0, "fat_g": 0.2, "fat_sat_g": 0.0, "carbohydrate_g": 2.6, "sugar_g": 2.6, "fibre_g": 1.2, "salt_g": 0.01},
    "Cocktailtomaten": {"energy_kcal": 18.0, "protein_g": 1.0, "fat_g": 0.2, "fat_sat_g": 0.0, "carbohydrate_g": 2.6, "sugar_g": 2.6, "fibre_g": 1.2, "salt_g": 0.01},
    "Möhre": {"energy_kcal": 33.0, "protein_g": 0.9, "fat_g": 0.2, "fat_sat_g": 0.0, "carbohydrate_g": 6.7, "sugar_g": 4.7, "fibre_g": 3.6, "salt_g": 0.08},
    "Möhren": {"energy_kcal": 33.0, "protein_g": 0.9, "fat_g": 0.2, "fat_sat_g": 0.0, "carbohydrate_g": 6.7, "sugar_g": 4.7, "fibre_g": 3.6, "salt_g": 0.08},
    "Karotten": {"energy_kcal": 33.0, "protein_g": 0.9, "fat_g": 0.2, "fat_sat_g": 0.0, "carbohydrate_g": 6.7, "sugar_g": 4.7, "fibre_g": 3.6, "salt_g": 0.08},
    "Zucchini": {"energy_kcal": 16.0, "protein_g": 1.2, "fat_g": 0.3, "fat_sat_g": 0.1, "carbohydrate_g": 2.0, "sugar_g": 1.7, "fibre_g": 1.0, "salt_g": 0.01},
    "Aubergine": {"energy_kcal": 25.0, "protein_g": 1.0, "fat_g": 0.2, "fat_sat_g": 0.0, "carbohydrate_g": 3.5, "sugar_g": 2.4, "fibre_g": 3.0, "salt_g": 0.01},
    "Aubergine (mittelgroß)": {"energy_kcal": 25.0, "protein_g": 1.0, "fat_g": 0.2, "fat_sat_g": 0.0, "carbohydrate_g": 3.5, "sugar_g": 2.4, "fibre_g": 3.0, "salt_g": 0.01},
    "Auberginen": {"energy_kcal": 25.0, "protein_g": 1.0, "fat_g": 0.2, "fat_sat_g": 0.0, "carbohydrate_g": 3.5, "sugar_g": 2.4, "fibre_g": 3.0, "salt_g": 0.01},
    "Champignons": {"energy_kcal": 16.0, "protein_g": 3.1, "fat_g": 0.3, "fat_sat_g": 0.0, "carbohydrate_g": 0.5, "sugar_g": 0.2, "fibre_g": 1.2, "salt_g": 0.02},
    "Brokkoli": {"energy_kcal": 31.0, "protein_g": 3.0, "fat_g": 0.4, "fat_sat_g": 0.1, "carbohydrate_g": 2.7, "sugar_g": 1.7, "fibre_g": 3.0, "salt_g": 0.04},
    "Brokkoli (in Röschen)": {"energy_kcal": 31.0, "protein_g": 3.0, "fat_g": 0.4, "fat_sat_g": 0.1, "carbohydrate_g": 2.7, "sugar_g": 1.7, "fibre_g": 3.0, "salt_g": 0.04},
    "Blattspinat": {"energy_kcal": 16.0, "protein_g": 2.9, "fat_g": 0.4, "fat_sat_g": 0.1, "carbohydrate_g": 0.6, "sugar_g": 0.4, "fibre_g": 2.2, "salt_g": 0.1},
    "Babyspinat": {"energy_kcal": 16.0, "protein_g": 2.9, "fat_g": 0.4, "fat_sat_g": 0.1, "carbohydrate_g": 0.6, "sugar_g": 0.4, "fibre_g": 2.2, "salt_g": 0.1},
    "Baby Spinat": {"energy_kcal": 16.0, "protein_g": 2.9, "fat_g": 0.4, "fat_sat_g": 0.1, "carbohydrate_g": 0.6, "sugar_g": 0.4, "fibre_g": 2.2, "salt_g": 0.1},
    "Lauch": {"energy_kcal": 29.0, "protein_g": 2.2, "fat_g": 0.3, "fat_sat_g": 0.0, "carbohydrate_g": 3.7, "sugar_g": 2.3, "fibre_g": 2.3, "salt_g": 0.02},
    "Kürbis": {"energy_kcal": 26.0, "protein_g": 1.0, "fat_g": 0.1, "fat_sat_g": 0.0, "carbohydrate_g": 5.0, "sugar_g": 2.8, "fibre_g": 0.5, "salt_g": 0.01},
    "Süßkartoffel": {"energy_kcal": 86.0, "protein_g": 1.6, "fat_g": 0.1, "fat_sat_g": 0.0, "carbohydrate_g": 20.0, "sugar_g": 4.2, "fibre_g": 3.0, "salt_g": 0.04},
    "Sellerie": {"energy_kcal": 16.0, "protein_g": 0.7, "fat_g": 0.2, "fat_sat_g": 0.0, "carbohydrate_g": 1.8, "sugar_g": 1.3, "fibre_g": 1.8, "salt_g": 0.1},

    # Fruits
    "Apfel": {"energy_kcal": 52.0, "protein_g": 0.3, "fat_g": 0.2, "fat_sat_g": 0.0, "carbohydrate_g": 11.4, "sugar_g": 10.3, "fibre_g": 2.4, "salt_g": 0.0},
    "Äpfel": {"energy_kcal": 52.0, "protein_g": 0.3, "fat_g": 0.2, "fat_sat_g": 0.0, "carbohydrate_g": 11.4, "sugar_g": 10.3, "fibre_g": 2.4, "salt_g": 0.0},
    "Bananen": {"energy_kcal": 89.0, "protein_g": 1.1, "fat_g": 0.3, "fat_sat_g": 0.1, "carbohydrate_g": 20.0, "sugar_g": 17.0, "fibre_g": 2.6, "salt_g": 0.0},
    "Avocado": {"energy_kcal": 160.0, "protein_g": 2.0, "fat_g": 15.0, "fat_sat_g": 2.1, "carbohydrate_g": 2.0, "sugar_g": 0.7, "fibre_g": 6.7, "salt_g": 0.01},
    "Zitrone": {"energy_kcal": 29.0, "protein_g": 0.7, "fat_g": 0.3, "fat_sat_g": 0.0, "carbohydrate_g": 3.2, "sugar_g": 2.5, "fibre_g": 1.3, "salt_g": 0.0},

    # Legumes & Nuts
    "Linsen": {"energy_kcal": 330.0, "protein_g": 24.0, "fat_g": 1.5, "fat_sat_g": 0.2, "carbohydrate_g": 50.0, "sugar_g": 1.8, "fibre_g": 11.0, "salt_g": 0.02},
    "Berglinsen": {"energy_kcal": 330.0, "protein_g": 24.0, "fat_g": 1.5, "fat_sat_g": 0.2, "carbohydrate_g": 50.0, "sugar_g": 1.8, "fibre_g": 11.0, "salt_g": 0.02},
    "Kidneybohnen": {"energy_kcal": 103.0, "protein_g": 8.0, "fat_g": 0.5, "fat_sat_g": 0.1, "carbohydrate_g": 14.0, "sugar_g": 0.5, "fibre_g": 6.0, "salt_g": 0.6},
    "Bohne, Kidney": {"energy_kcal": 103.0, "protein_g": 8.0, "fat_g": 0.5, "fat_sat_g": 0.1, "carbohydrate_g": 14.0, "sugar_g": 0.5, "fibre_g": 6.0, "salt_g": 0.6},
    "Cashewkerne": {"energy_kcal": 574.0, "protein_g": 18.0, "fat_g": 44.0, "fat_sat_g": 8.0, "carbohydrate_g": 30.0, "sugar_g": 6.0, "fibre_g": 3.3, "salt_g": 0.02},
    "Cashewkernen": {"energy_kcal": 574.0, "protein_g": 18.0, "fat_g": 44.0, "fat_sat_g": 8.0, "carbohydrate_g": 30.0, "sugar_g": 6.0, "fibre_g": 3.3, "salt_g": 0.02},
    "Walnüsse": {"energy_kcal": 654.0, "protein_g": 15.0, "fat_g": 65.0, "fat_sat_g": 6.0, "carbohydrate_g": 7.0, "sugar_g": 2.6, "fibre_g": 6.7, "salt_g": 0.01},
    "Mandeln": {"energy_kcal": 598.0, "protein_g": 21.0, "fat_g": 54.0, "fat_sat_g": 4.0, "carbohydrate_g": 5.0, "sugar_g": 4.0, "fibre_g": 12.0, "salt_g": 0.01},
    "Erdnüsse": {"energy_kcal": 574.0, "protein_g": 26.0, "fat_g": 49.0, "fat_sat_g": 7.0, "carbohydrate_g": 8.0, "sugar_g": 4.0, "fibre_g": 8.0, "salt_g": 0.01},
    "Erdnussbutter": {"energy_kcal": 609.0, "protein_g": 25.0, "fat_g": 50.0, "fat_sat_g": 8.0, "carbohydrate_g": 12.0, "sugar_g": 6.0, "fibre_g": 6.0, "salt_g": 0.5},

    # Meat & Fish
    "Hähnchenbrust": {"energy_kcal": 110.0, "protein_g": 23.0, "fat_g": 1.2, "fat_sat_g": 0.3, "carbohydrate_g": 0.0, "sugar_g": 0.0, "fibre_g": 0.0, "salt_g": 0.13},
    "Hackfleisch": {"energy_kcal": 234.0, "protein_g": 17.0, "fat_g": 20.0, "fat_sat_g": 8.0, "carbohydrate_g": 0.0, "sugar_g": 0.0, "fibre_g": 0.0, "salt_g": 0.7},
    "Bacon": {"energy_kcal": 359.0, "protein_g": 15.0, "fat_g": 33.0, "fat_sat_g": 12.0, "carbohydrate_g": 0.5, "sugar_g": 0.5, "fibre_g": 0.0, "salt_g": 2.5},
    "Lachs": {"energy_kcal": 200.0, "protein_g": 20.0, "fat_g": 13.0, "fat_sat_g": 2.0, "carbohydrate_g": 0.0, "sugar_g": 0.0, "fibre_g": 0.0, "salt_g": 0.1},
    "Thunfisch": {"energy_kcal": 120.0, "protein_g": 25.0, "fat_g": 1.0, "fat_sat_g": 0.3, "carbohydrate_g": 0.0, "sugar_g": 0.0, "fibre_g": 0.0, "salt_g": 0.4},
    "Würstchen": {"energy_kcal": 263.0, "protein_g": 12.0, "fat_g": 25.0, "fat_sat_g": 10.0, "carbohydrate_g": 1.0, "sugar_g": 0.5, "fibre_g": 0.0, "salt_g": 1.8},

    # Sweeteners & Baking
    "Zucker": {"energy_kcal": 406.0, "protein_g": 0.0, "fat_g": 0.0, "fat_sat_g": 0.0, "carbohydrate_g": 100.0, "sugar_g": 100.0, "fibre_g": 0.0, "salt_g": 0.0},
    "brauner Zucker": {"energy_kcal": 390.0, "protein_g": 0.0, "fat_g": 0.0, "fat_sat_g": 0.0, "carbohydrate_g": 97.0, "sugar_g": 97.0, "fibre_g": 0.0, "salt_g": 0.03},
    "Honig": {"energy_kcal": 325.0, "protein_g": 0.4, "fat_g": 0.0, "fat_sat_g": 0.0, "carbohydrate_g": 82.0, "sugar_g": 82.0, "fibre_g": 0.0, "salt_g": 0.01},
    "Ahornsirup": {"energy_kcal": 263.0, "protein_g": 0.0, "fat_g": 0.0, "fat_sat_g": 0.0, "carbohydrate_g": 67.0, "sugar_g": 60.0, "fibre_g": 0.0, "salt_g": 0.01},
    "Backkakao": {"energy_kcal": 359.0, "protein_g": 20.0, "fat_g": 25.0, "fat_sat_g": 15.0, "carbohydrate_g": 11.0, "sugar_g": 2.0, "fibre_g": 33.0, "salt_g": 0.03},
    "Backpulver": {"energy_kcal": 67.0, "protein_g": 0.0, "fat_g": 0.0, "fat_sat_g": 0.0, "carbohydrate_g": 18.0, "sugar_g": 0.0, "fibre_g": 0.0, "salt_g": 28.0},
    "Vanillezucker": {"energy_kcal": 394.0, "protein_g": 0.0, "fat_g": 0.0, "fat_sat_g": 0.0, "carbohydrate_g": 98.0, "sugar_g": 98.0, "fibre_g": 0.0, "salt_g": 0.0},
    "Datteln": {"energy_kcal": 282.0, "protein_g": 2.0, "fat_g": 0.4, "fat_sat_g": 0.0, "carbohydrate_g": 65.0, "sugar_g": 63.0, "fibre_g": 8.0, "salt_g": 0.01},
    "Dattel (entkernt)": {"energy_kcal": 282.0, "protein_g": 2.0, "fat_g": 0.4, "fat_sat_g": 0.0, "carbohydrate_g": 65.0, "sugar_g": 63.0, "fibre_g": 8.0, "salt_g": 0.01},
    "Rosinen": {"energy_kcal": 299.0, "protein_g": 2.5, "fat_g": 0.5, "fat_sat_g": 0.2, "carbohydrate_g": 68.0, "sugar_g": 59.0, "fibre_g": 3.7, "salt_g": 0.05},

    # Condiments & Sauces
    "Tomatenmark": {"energy_kcal": 91.0, "protein_g": 5.0, "fat_g": 0.5, "fat_sat_g": 0.1, "carbohydrate_g": 15.0, "sugar_g": 12.0, "fibre_g": 4.0, "salt_g": 1.5},
    "Senf": {"energy_kcal": 98.0, "protein_g": 6.0, "fat_g": 5.0, "fat_sat_g": 0.3, "carbohydrate_g": 10.0, "sugar_g": 4.0, "fibre_g": 4.0, "salt_g": 4.5},
    "Dijon-Senf": {"energy_kcal": 98.0, "protein_g": 6.0, "fat_g": 5.0, "fat_sat_g": 0.3, "carbohydrate_g": 10.0, "sugar_g": 4.0, "fibre_g": 4.0, "salt_g": 4.5},
    "Ketchup": {"energy_kcal": 105.0, "protein_g": 1.5, "fat_g": 0.1, "fat_sat_g": 0.0, "carbohydrate_g": 24.0, "sugar_g": 22.0, "fibre_g": 0.8, "salt_g": 2.5},
    "Sojasauce": {"energy_kcal": 55.0, "protein_g": 8.0, "fat_g": 0.0, "fat_sat_g": 0.0, "carbohydrate_g": 5.0, "sugar_g": 1.0, "fibre_g": 0.0, "salt_g": 15.0},
    "Balsamicoessig": {"energy_kcal": 88.0, "protein_g": 0.5, "fat_g": 0.0, "fat_sat_g": 0.0, "carbohydrate_g": 17.0, "sugar_g": 15.0, "fibre_g": 0.0, "salt_g": 0.05},
    "Balsamicocreme": {"energy_kcal": 141.0, "protein_g": 0.5, "fat_g": 0.0, "fat_sat_g": 0.0, "carbohydrate_g": 33.0, "sugar_g": 30.0, "fibre_g": 0.0, "salt_g": 0.1},
    "Balsamico-Creme": {"energy_kcal": 141.0, "protein_g": 0.5, "fat_g": 0.0, "fat_sat_g": 0.0, "carbohydrate_g": 33.0, "sugar_g": 30.0, "fibre_g": 0.0, "salt_g": 0.1},
    "Apfelessig": {"energy_kcal": 21.0, "protein_g": 0.0, "fat_g": 0.0, "fat_sat_g": 0.0, "carbohydrate_g": 0.6, "sugar_g": 0.4, "fibre_g": 0.0, "salt_g": 0.02},
    "Apfelmark": {"energy_kcal": 45.0, "protein_g": 0.3, "fat_g": 0.1, "fat_sat_g": 0.0, "carbohydrate_g": 10.0, "sugar_g": 9.0, "fibre_g": 1.5, "salt_g": 0.0},

    # Spices & Herbs
    "Currypulver": {"energy_kcal": 311.0, "protein_g": 14.0, "fat_g": 14.0, "fat_sat_g": 2.0, "carbohydrate_g": 25.0, "sugar_g": 2.0, "fibre_g": 33.0, "salt_g": 0.05},
    "Curry": {"energy_kcal": 311.0, "protein_g": 14.0, "fat_g": 14.0, "fat_sat_g": 2.0, "carbohydrate_g": 25.0, "sugar_g": 2.0, "fibre_g": 33.0, "salt_g": 0.05},
    "Paprikapulver": {"energy_kcal": 287.0, "protein_g": 14.0, "fat_g": 13.0, "fat_sat_g": 2.0, "carbohydrate_g": 34.0, "sugar_g": 10.0, "fibre_g": 20.0, "salt_g": 0.08},
    "Chilipulver": {"energy_kcal": 311.0, "protein_g": 12.0, "fat_g": 17.0, "fat_sat_g": 3.0, "carbohydrate_g": 30.0, "sugar_g": 7.0, "fibre_g": 27.0, "salt_g": 0.08},
    "Chiliflocken": {"energy_kcal": 311.0, "protein_g": 12.0, "fat_g": 17.0, "fat_sat_g": 3.0, "carbohydrate_g": 30.0, "sugar_g": 7.0, "fibre_g": 27.0, "salt_g": 0.08},
    "Cayennepfeffer": {"energy_kcal": 311.0, "protein_g": 12.0, "fat_g": 17.0, "fat_sat_g": 3.0, "carbohydrate_g": 30.0, "sugar_g": 7.0, "fibre_g": 27.0, "salt_g": 0.08},
    "Kreuzkümmel": {"energy_kcal": 375.0, "protein_g": 18.0, "fat_g": 22.0, "fat_sat_g": 1.5, "carbohydrate_g": 33.0, "sugar_g": 2.3, "fibre_g": 10.5, "salt_g": 0.17},
    "Zimt": {"energy_kcal": 246.0, "protein_g": 4.0, "fat_g": 1.2, "fat_sat_g": 0.3, "carbohydrate_g": 56.0, "sugar_g": 2.2, "fibre_g": 53.0, "salt_g": 0.03},
    "Basilikum": {"energy_kcal": 24.0, "protein_g": 3.1, "fat_g": 0.6, "fat_sat_g": 0.0, "carbohydrate_g": 1.0, "sugar_g": 0.3, "fibre_g": 1.6, "salt_g": 0.01},
    "Basilikum, getrocknet": {"energy_kcal": 220.0, "protein_g": 23.0, "fat_g": 4.0, "fat_sat_g": 1.0, "carbohydrate_g": 27.0, "sugar_g": 2.0, "fibre_g": 18.0, "salt_g": 0.08},
    "Basilikum, trocken": {"energy_kcal": 220.0, "protein_g": 23.0, "fat_g": 4.0, "fat_sat_g": 1.0, "carbohydrate_g": 27.0, "sugar_g": 2.0, "fibre_g": 18.0, "salt_g": 0.08},
    "Dill": {"energy_kcal": 43.0, "protein_g": 3.5, "fat_g": 1.1, "fat_sat_g": 0.0, "carbohydrate_g": 4.9, "sugar_g": 0.0, "fibre_g": 2.1, "salt_g": 0.06},
    "Petersilie": {"energy_kcal": 36.0, "protein_g": 3.0, "fat_g": 0.8, "fat_sat_g": 0.0, "carbohydrate_g": 3.0, "sugar_g": 0.9, "fibre_g": 3.3, "salt_g": 0.06},
    "Oregano": {"energy_kcal": 253.0, "protein_g": 11.0, "fat_g": 4.3, "fat_sat_g": 1.6, "carbohydrate_g": 42.0, "sugar_g": 4.1, "fibre_g": 43.0, "salt_g": 0.05},
    "Thymian": {"energy_kcal": 98.0, "protein_g": 5.6, "fat_g": 1.7, "fat_sat_g": 0.5, "carbohydrate_g": 10.0, "sugar_g": 0.0, "fibre_g": 14.0, "salt_g": 0.01},
    "Rosmarin": {"energy_kcal": 127.0, "protein_g": 3.3, "fat_g": 5.9, "fat_sat_g": 3.0, "carbohydrate_g": 8.0, "sugar_g": 0.0, "fibre_g": 14.0, "salt_g": 0.05},
    "Muskatnuss": {"energy_kcal": 478.0, "protein_g": 6.0, "fat_g": 36.0, "fat_sat_g": 26.0, "carbohydrate_g": 29.0, "sugar_g": 3.0, "fibre_g": 21.0, "salt_g": 0.02},

    # Canned & Preserved
    "Baked Beans": {"energy_kcal": 84.0, "protein_g": 5.0, "fat_g": 0.5, "fat_sat_g": 0.1, "carbohydrate_g": 13.0, "sugar_g": 5.0, "fibre_g": 4.0, "salt_g": 1.0},
    "Kokosmilch": {"energy_kcal": 179.0, "protein_g": 1.6, "fat_g": 17.0, "fat_sat_g": 15.0, "carbohydrate_g": 2.7, "sugar_g": 2.0, "fibre_g": 0.0, "salt_g": 0.03},

    # Broth & Liquids
    "Brühe": {"energy_kcal": 3.0, "protein_g": 0.5, "fat_g": 0.1, "fat_sat_g": 0.0, "carbohydrate_g": 0.2, "sugar_g": 0.1, "fibre_g": 0.0, "salt_g": 0.8},
    "Brühpulver": {"energy_kcal": 148.0, "protein_g": 8.0, "fat_g": 4.0, "fat_sat_g": 2.0, "carbohydrate_g": 22.0, "sugar_g": 8.0, "fibre_g": 0.5, "salt_g": 48.0},
    "Gemüsebrühe": {"energy_kcal": 3.0, "protein_g": 0.5, "fat_g": 0.1, "fat_sat_g": 0.0, "carbohydrate_g": 0.2, "sugar_g": 0.1, "fibre_g": 0.0, "salt_g": 0.8},
}

# Fuzzy matches: if ingredient name contains key, apply the values
FUZZY_MATCHES = {
    "Spaghetti": {"energy_kcal": 360.0, "protein_g": 12.5, "fat_g": 1.8, "fat_sat_g": 0.3, "carbohydrate_g": 70.0, "sugar_g": 3.2, "fibre_g": 3.0, "salt_g": 0.01},
    "Nudel": {"energy_kcal": 360.0, "protein_g": 12.5, "fat_g": 1.8, "fat_sat_g": 0.3, "carbohydrate_g": 70.0, "sugar_g": 3.2, "fibre_g": 3.0, "salt_g": 0.01},
    "Penne": {"energy_kcal": 360.0, "protein_g": 12.5, "fat_g": 1.8, "fat_sat_g": 0.3, "carbohydrate_g": 70.0, "sugar_g": 3.2, "fibre_g": 3.0, "salt_g": 0.01},
}


class Command(BaseCommand):
    help = "Fix missing nutritional data for legacy-imported ingredients and recalculate recipe caches."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true", help="Preview fixes without saving")

    def handle(self, *args, **options):
        dry_run = options["dry_run"]

        fixed_count = 0
        skipped = []

        # Exact name matches
        for name, values in NUTRITION_FIXES.items():
            ingredients = Ingredient.objects.filter(name=name, energy_kcal=0)
            for ing in ingredients:
                if dry_run:
                    self.stdout.write(f"  [DRY RUN] Would fix: {ing.name} → {values['energy_kcal']} kJ")
                else:
                    for field, val in values.items():
                        setattr(ing, field, val)
                    ing.save()
                    self.stdout.write(f"  ✓ Fixed: {ing.name} → {values['energy_kcal']} kJ")
                fixed_count += 1

        # Fuzzy matches (only for remaining unfixed ingredients)
        from recipe.models import RecipeItem

        used_ids = RecipeItem.objects.values_list("portion__ingredient_id", flat=True).distinct()
        still_broken = Ingredient.objects.filter(id__in=used_ids, energy_kcal=0)

        for ing in still_broken:
            matched = False
            for pattern, values in FUZZY_MATCHES.items():
                if pattern.lower() in ing.name.lower():
                    if dry_run:
                        self.stdout.write(f"  [DRY RUN] Fuzzy fix: {ing.name} (matched '{pattern}') → {values['energy_kcal']} kJ")
                    else:
                        for field, val in values.items():
                            setattr(ing, field, val)
                        ing.save()
                        self.stdout.write(f"  ✓ Fuzzy fix: {ing.name} (matched '{pattern}') → {values['energy_kcal']} kJ")
                    fixed_count += 1
                    matched = True
                    break
            if not matched:
                skipped.append(ing.name)

        self.stdout.write(f"\n{'[DRY RUN] ' if dry_run else ''}Fixed {fixed_count} ingredients.")

        if skipped:
            self.stdout.write(f"  Still missing data ({len(skipped)} ingredients):")
            for name in skipped[:30]:
                self.stdout.write(f"    - {name}")
            if len(skipped) > 30:
                self.stdout.write(f"    ... and {len(skipped) - 30} more")

        # Recalculate all recipe caches
        if not dry_run and fixed_count > 0:
            self.stdout.write("\nRecalculating recipe caches...")
            from recipe.models import Recipe
            from recipe.services.recipe_checks import recalculate_recipe_cache

            recipes = Recipe.objects.all()
            recalc_count = 0
            for recipe in recipes:
                try:
                    recalculate_recipe_cache(recipe)
                    recalc_count += 1
                except Exception as e:
                    self.stdout.write(self.style.WARNING(f"  ! Failed: {recipe.title}: {e}"))

            self.stdout.write(self.style.SUCCESS(f"  Recalculated {recalc_count} recipe caches."))
