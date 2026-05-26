"""Seed default Portions and price_per_kg for Rezeptkalkulator ingredients."""

from decimal import Decimal
from django.db import migrations
from django.utils.text import slugify


# (ingredient_name, default_unit_name, weight_g, price_per_kg_eur)
# weight_g = weight of 1 unit of the default measuring unit
# price_per_kg = from friend's Rezeptkalkulator DEFAULT_INGREDIENT_PRICES (converted to EUR/kg)
INGREDIENT_DATA = [
    # Gemüse
    ("Ingwer", "Gramm", 1, Decimal("4.90")),
    ("Spinat", "Gramm", 1, Decimal("19.90")),
    ("Frühlingszwiebeln", "Gramm", 1, Decimal("17.80")),
    ("Lauch", "Gramm", 1, Decimal("4.45")),
    ("Brokkoli", "Gramm", 1, Decimal("5.98")),
    ("Champignons", "Gramm", 1, Decimal("4.98")),
    ("Paprika (rot)", "Gramm", 1, Decimal("4.99")),
    ("Paprika (gelb)", "Gramm", 1, Decimal("4.99")),
    ("Paprika (grün)", "Gramm", 1, Decimal("4.99")),
    ("Zucchini", "Gramm", 1, Decimal("2.79")),
    ("Aubergine", "Gramm", 1, Decimal("4.30")),
    ("Blumenkohl", "Gramm", 1, Decimal("5.98")),
    ("Süßkartoffel", "Gramm", 1, Decimal("3.99")),
    ("Kohlrabi", "Gramm", 1, Decimal("3.30")),
    ("Fenchel", "Gramm", 1, Decimal("4.59")),
    ("Sellerie (Knolle)", "Gramm", 1, Decimal("1.69")),
    ("Rote Bete", "Gramm", 1, Decimal("3.58")),
    ("Kürbis (Hokkaido)", "Gramm", 1, Decimal("2.59")),
    ("Kürbis (Butternut)", "Gramm", 1, Decimal("2.50")),
    ("Chinakohl", "Gramm", 1, Decimal("2.99")),
    ("Pak Choi", "Gramm", 1, Decimal("5.97")),
    ("Wirsing", "Gramm", 1, Decimal("2.49")),
    ("Weißkohl", "Gramm", 1, Decimal("0.99")),
    ("Rotkohl", "Gramm", 1, Decimal("0.99")),
    ("Eisbergsalat", "Gramm", 1, Decimal("3.72")),
    ("Feldsalat", "Gramm", 1, Decimal("9.93")),
    ("Rucola", "Gramm", 1, Decimal("8.00")),
    ("Babyspinat", "Gramm", 1, Decimal("19.90")),
    ("Radieschen", "Gramm", 1, Decimal("19.80")),
    ("Gurken", "Gramm", 1, Decimal("1.98")),
    ("Kirschtomaten", "Gramm", 1, Decimal("5.56")),
    ("Knoblauch", "Gramm", 1, Decimal("8.45")),
    ("Zwiebel", "Gramm", 1, Decimal("1.19")),
    ("Zwiebel (rot)", "Gramm", 1, Decimal("3.58")),
    ("Schalotten", "Gramm", 1, Decimal("5.16")),
    ("Karotte", "Gramm", 1, Decimal("0.90")),
    ("Möhre", "Gramm", 1, Decimal("0.90")),
    ("Pastinake", "Gramm", 1, Decimal("4.95")),
    ("Schnittlauch", "Gramm", 1, Decimal("44.40")),
    ("Basilikum (frisch)", "Gramm", 1, Decimal("76.33")),
    ("Petersilie (frisch)", "Gramm", 1, Decimal("27.75")),
    ("Rosmarin (frisch)", "Gramm", 1, Decimal("74.00")),
    ("Thymian (frisch)", "Gramm", 1, Decimal("74.00")),
    ("Dill (frisch)", "Gramm", 1, Decimal("44.40")),
    ("Chili (frisch)", "Gramm", 1, Decimal("6.99")),
    ("Kartoffel (Festkochend)", "Gramm", 1, Decimal("1.00")),
    ("Kartoffel (Mehligkochend)", "Gramm", 1, Decimal("1.00")),
    ("Spargel (grün)", "Gramm", 1, Decimal("14.50")),
    ("Spargel (weiß)", "Gramm", 1, Decimal("12.90")),
    ("Zuckerschoten", "Gramm", 1, Decimal("8.40")),
    ("Maiskolben", "Gramm", 1, Decimal("4.98")),

    # Obst
    ("Apfel", "Gramm", 1, Decimal("2.99")),
    ("Banane", "Gramm", 1, Decimal("1.99")),
    ("Birne", "Gramm", 1, Decimal("1.89")),
    ("Orange", "Gramm", 1, Decimal("3.19")),
    ("Zitrone", "Gramm", 1, Decimal("3.98")),
    ("Limette", "Gramm", 1, Decimal("6.50")),
    ("Mango", "Gramm", 1, Decimal("6.30")),
    ("Ananas", "Gramm", 1, Decimal("1.69")),
    ("Avocado", "Gramm", 1, Decimal("6.45")),
    ("Erdbeeren", "Gramm", 1, Decimal("4.38")),
    ("Himbeeren", "Gramm", 1, Decimal("11.90")),
    ("Blaubeeren", "Gramm", 1, Decimal("14.63")),
    ("Brombeeren", "Gramm", 1, Decimal("26.32")),
    ("Kirschen", "Gramm", 1, Decimal("13.90")),
    ("Trauben", "Gramm", 1, Decimal("4.58")),
    ("Kiwi", "Gramm", 1, Decimal("4.88")),
    ("Nektarine", "Gramm", 1, Decimal("4.99")),
    ("Granatapfel", "Gramm", 1, Decimal("12.63")),
    ("Grapefruit", "Gramm", 1, Decimal("3.97")),
    ("Pflaumen", "Gramm", 1, Decimal("4.99")),

    # Fleisch & Fisch
    ("Hähnchenbrust", "Gramm", 1, Decimal("9.99")),
    ("Hähnchenschenkel", "Gramm", 1, Decimal("4.81")),
    ("Schweinefilet", "Gramm", 1, Decimal("8.80")),
    ("Schweinebauch", "Gramm", 1, Decimal("9.98")),
    ("Rinderhackfleisch", "Gramm", 1, Decimal("11.86")),
    ("Schweinehackfleisch", "Gramm", 1, Decimal("4.49")),
    ("Hackfleisch (gemischt)", "Gramm", 1, Decimal("7.99")),
    ("Lachsfilet (frisch)", "Gramm", 1, Decimal("14.97")),
    ("Räucherlachs", "Gramm", 1, Decimal("27.67")),
    ("Garnelen", "Gramm", 1, Decimal("13.96")),
    ("Thunfisch (Dose)", "Gramm", 1, Decimal("6.97")),
    ("Schinken", "Gramm", 1, Decimal("12.45")),
    ("Kochschinken", "Gramm", 1, Decimal("10.60")),
    ("Speck", "Gramm", 1, Decimal("21.46")),
    ("Chorizo", "Gramm", 1, Decimal("15.96")),
    ("Wiener Würstchen", "Gramm", 1, Decimal("15.95")),
    ("Bratwurst (frisch)", "Gramm", 1, Decimal("15.45")),

    # Kühlung / Milchprodukte
    ("Tomaten-Passata", "Milliliter", 1, Decimal("2.27")),
    ("Frischkäse", "Gramm", 1, Decimal("5.30")),
    ("Mozzarella", "Gramm", 1, Decimal("6.80")),
    ("Tomatenmark", "Gramm", 1, Decimal("4.75")),
    ("Parmesan", "Gramm", 1, Decimal("14.95")),
    ("Butter", "Gramm", 1, Decimal("10.76")),
    ("Sahne", "Milliliter", 1, Decimal("5.95")),
    ("Schmand", "Gramm", 1, Decimal("5.95")),
    ("Creme Fraiche", "Gramm", 1, Decimal("4.95")),
    ("Joghurt", "Gramm", 1, Decimal("1.79")),
    ("Griechischer Joghurt", "Gramm", 1, Decimal("2.19")),
    ("Skyr", "Gramm", 1, Decimal("3.48")),
    ("Quark (Magerquark)", "Gramm", 1, Decimal("1.98")),
    ("Mascarpone", "Gramm", 1, Decimal("7.19")),
    ("Ricotta", "Gramm", 1, Decimal("5.96")),
    ("Feta", "Gramm", 1, Decimal("12.45")),
    ("Gouda", "Gramm", 1, Decimal("8.42")),
    ("Cheddar", "Gramm", 1, Decimal("19.21")),
    ("Emmentaler", "Gramm", 1, Decimal("6.60")),
    ("Halloumi", "Gramm", 1, Decimal("12.40")),
    ("Hefe (frisch)", "Gramm", 1, Decimal("4.76")),
    ("Tofu", "Gramm", 1, Decimal("5.73")),
    ("Räuchertofu", "Gramm", 1, Decimal("6.36")),
    ("Hafermilch", "Milliliter", 1, Decimal("1.29")),
    ("Buttermilch", "Milliliter", 1, Decimal("2.38")),
    ("Bacon", "Gramm", 1, Decimal("19.90")),
    ("Salami", "Gramm", 1, Decimal("8.45")),

    # Brot & Backwaren
    ("Mehl", "Gramm", 1, Decimal("0.99")),
    ("Dinkelmehl", "Gramm", 1, Decimal("1.29")),
    ("Backpulver", "Gramm", 1, Decimal("6.00")),
    ("Hefe (trocken)", "Gramm", 1, Decimal("16.43")),
    ("Zucker", "Gramm", 1, Decimal("1.89")),
    ("Puderzucker", "Gramm", 1, Decimal("1.96")),
    ("Vanillezucker", "Gramm", 1, Decimal("93.44")),
    ("Speisestärke", "Gramm", 1, Decimal("1.95")),
    ("Backkakao", "Gramm", 1, Decimal("13.16")),
    ("Mandeln", "Gramm", 1, Decimal("12.45")),
    ("Walnüsse", "Gramm", 1, Decimal("19.93")),
    ("Haselnusskerne", "Gramm", 1, Decimal("17.45")),
    ("Pinienkerne", "Gramm", 1, Decimal("49.99")),
    ("Sonnenblumenkerne", "Gramm", 1, Decimal("5.98")),
    ("Kürbiskerne", "Gramm", 1, Decimal("13.48")),
    ("Sesam", "Gramm", 1, Decimal("5.38")),
    ("Leinsamen", "Gramm", 1, Decimal("6.45")),
    ("Chiasamen", "Gramm", 1, Decimal("15.96")),
    ("Kokosraspeln", "Gramm", 1, Decimal("9.95")),
    ("Rosinen", "Gramm", 1, Decimal("7.95")),
    ("Schokolade (Zartbitter)", "Gramm", 1, Decimal("17.50")),
    ("Schokolade (Vollmilch)", "Gramm", 1, Decimal("7.90")),
    ("Brot", "Scheibe", 25, Decimal("2.50")),
    ("Brötchen", "Gramm", 1, Decimal("7.50")),
    ("Wraps", "Gramm", 1, Decimal("3.23")),
    ("Naan", "Gramm", 1, Decimal("13.25")),
    ("Baguette", "Gramm", 1, Decimal("4.76")),
    ("Burger Buns", "Gramm", 1, Decimal("6.43")),
    ("Knäckebrot", "Gramm", 1, Decimal("5.00")),

    # Gewürze & Kräuter
    ("Salz", "Prise", 0.3, Decimal("1.58")),
    ("Pfeffer", "Prise", 0.3, Decimal("48.54")),
    ("Paprikapulver edelsüß", "Gramm", 1, Decimal("17.00")),
    ("Paprikapulver geräuchert", "Gramm", 1, Decimal("51.00")),
    ("Currypulver", "Teelöffel", 5, Decimal("51.03")),
    ("Kreuzkümmel", "Teelöffel", 5, Decimal("56.86")),
    ("Kurkuma (Pulver)", "Gramm", 1, Decimal("53.78")),
    ("Zimt", "Gramm", 1, Decimal("71.07")),
    ("Muskatnuss", "Prise", 0.3, Decimal("62.25")),
    ("Oregano", "Gramm", 1, Decimal("99.50")),
    ("Chilipulver", "Teelöffel", 5, Decimal("51.03")),
    ("Chiliflocken", "Prise", 0.3, Decimal("76.54")),
    ("Knoblauchpulver", "Teelöffel", 5, Decimal("38.27")),
    ("Zwiebelpulver", "Teelöffel", 5, Decimal("62.25")),
    ("Ingwerpulver", "Teelöffel", 5, Decimal("71.14")),
    ("Honig", "Esslöffel", 15, Decimal("13.96")),
    ("Petersilie", "Gramm", 1, Decimal("99.50")),
    ("Minze", "Gramm", 1, Decimal("44.40")),
    ("Lorbeerblatt", "Gramm", 1, Decimal("92.14")),
    ("Kardamom", "Teelöffel", 5, Decimal("79.60")),
    ("Kümmel", "Teelöffel", 5, Decimal("57.00")),

    # Konserven & Gläser
    ("Olivenöl", "Milliliter", 1, Decimal("9.27")),
    ("Rapsöl", "Milliliter", 1, Decimal("3.45")),
    ("Sonnenblumenöl", "Milliliter", 1, Decimal("2.90")),
    ("Passierte Tomaten", "Milliliter", 1, Decimal("1.30")),
    ("Tomaten (stückig, Dose)", "Gramm", 1, Decimal("2.46")),
    ("Kidneybohnen", "Gramm", 1, Decimal("3.49")),
    ("Kichererbsen (Dose)", "Gramm", 1, Decimal("5.64")),
    ("Mais (Dose)", "Gramm", 1, Decimal("3.12")),
    ("Kokosmilch (Dose)", "Gramm", 1, Decimal("3.50")),
    ("Sojasauce", "Esslöffel", 15, Decimal("13.98")),
    ("Senf", "Milliliter", 1, Decimal("3.45")),
    ("Ketchup", "Milliliter", 1, Decimal("2.58")),
    ("Balsamicoessig", "Milliliter", 1, Decimal("4.98")),
    ("Apfelessig", "Milliliter", 1, Decimal("2.65")),
    ("Ahornsirup", "Milliliter", 1, Decimal("19.96")),
    ("Erdnussbutter", "Gramm", 1, Decimal("7.96")),
    ("Tahini", "Gramm", 1, Decimal("12.97")),
    ("Sambal Oelek", "Gramm", 1, Decimal("12.20")),
    ("Haferflocken", "Gramm", 1, Decimal("1.90")),
    ("Reis", "Gramm", 1, Decimal("3.79")),
    ("Nudeln", "Gramm", 1, Decimal("1.38")),
    ("Couscous", "Gramm", 1, Decimal("2.58")),
    ("Linsen (rot)", "Gramm", 1, Decimal("3.30")),
    ("Eier", "Gramm", 1, Decimal("5.50")),
    ("H-Milch", "Milliliter", 1, Decimal("0.98")),
    ("Oliven", "Gramm", 1, Decimal("9.21")),
    ("Blätterteig", "Gramm", 1, Decimal("7.60")),
    ("Quinoa", "Gramm", 1, Decimal("4.58")),
    ("Bulgur", "Gramm", 1, Decimal("2.78")),
    ("Reisnudeln", "Gramm", 1, Decimal("11.96")),
    ("Glasnudeln", "Gramm", 1, Decimal("8.90")),
    ("Risottoreis", "Gramm", 1, Decimal("3.98")),

    # Getränke
    ("Wasser", "Milliliter", 1, Decimal("0.00")),
    ("Mineralwasser", "Milliliter", 1, Decimal("0.43")),
    ("Orangensaft", "Milliliter", 1, Decimal("2.55")),
    ("Zitronensaft", "Milliliter", 1, Decimal("6.76")),
    ("Limettensaft", "Milliliter", 1, Decimal("6.76")),
    ("Rotwein", "Milliliter", 1, Decimal("5.55")),
    ("Weißwein", "Milliliter", 1, Decimal("5.55")),
    ("Bier", "Milliliter", 1, Decimal("2.04")),

    # Öle & Soßen
    ("Worcestersauce", "Milliliter", 1, Decimal("15.64")),
    ("Kokosöl", "Esslöffel", 15, Decimal("11.96")),
    ("Essig", "Esslöffel", 15, Decimal("2.89")),
    ("Balsamico-Creme", "Milliliter", 1, Decimal("11.96")),

    # Tiefkühl
    ("Tiefkühlspinat", "Gramm", 1, Decimal("4.15")),
    ("Erbsen (Tiefkühl)", "Gramm", 1, Decimal("4.20")),
]


def seed_portions_and_prices(apps, schema_editor):
    Ingredient = apps.get_model("supply", "Ingredient")
    MeasuringUnit = apps.get_model("supply", "MeasuringUnit")
    Portion = apps.get_model("supply", "Portion")

    units_by_name = {u.name: u for u in MeasuringUnit.objects.all()}

    for name, unit_name, weight_g, price_per_kg in INGREDIENT_DATA:
        slug = slugify(name)
        try:
            ingredient = Ingredient.objects.get(slug=slug)
        except Ingredient.DoesNotExist:
            continue

        # Update price_per_kg
        ingredient.price_per_kg = price_per_kg
        ingredient.save(update_fields=["price_per_kg"])

        # Create default portion
        unit = units_by_name.get(unit_name)
        if unit:
            Portion.objects.get_or_create(
                ingredient=ingredient,
                measuring_unit=unit,
                is_default=True,
                defaults={
                    "name": unit_name,
                    "quantity": 1,
                    "weight_g": weight_g,
                    "rank": 1,
                    "priority": 10,
                },
            )


def reverse_seed(apps, schema_editor):
    Ingredient = apps.get_model("supply", "Ingredient")
    Portion = apps.get_model("supply", "Portion")

    for name, unit_name, weight_g, price_per_kg in INGREDIENT_DATA:
        slug = slugify(name)
        try:
            ingredient = Ingredient.objects.get(slug=slug)
        except Ingredient.DoesNotExist:
            continue
        ingredient.price_per_kg = None
        ingredient.save(update_fields=["price_per_kg"])
        Portion.objects.filter(ingredient=ingredient, is_default=True).delete()


class Migration(migrations.Migration):

    dependencies = [
        ("supply", "0008_seed_ingredients_from_rezeptkalkulator"),
    ]

    operations = [
        migrations.RunPython(seed_portions_and_prices, reverse_seed),
    ]
