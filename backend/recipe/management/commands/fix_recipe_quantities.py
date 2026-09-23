"""Fix hand-reviewed recipe quantities corrupted by legacy imports.

Three kinds of corruption are repaired, in this order:

1. Mislabelled gram portions: portions like "Mais / Dosen" or "Reife Banane /
   hauaidbih" weigh 1 g, so their quantity is really grams but renders as
   "50 Dosen". Items move onto the ingredient's "g" portion (mass preserved)
   and the mislabelled portion is soft-deleted.
2. Scaled quantities (`FIXES`): the import stored `amount / weight_g`
   ("½ Zwiebel" → 0.005 × "Stück (100 g)") or grams as portion counts
   ("50 × EL Sahne" → 750 g). Each fix was reviewed by hand; sauces/liquids on
   bulk portions ("100g", "200 ml", "Glas") are read as tablespoons.
3. Wrongly matched ingredients (`REPLACEMENTS`), e.g. "Amaretto-Eier" in an
   omelette instead of hen's eggs.
4. Items still pointing at soft-deleted portions are rebound onto the
   ingredient's active main portion, preserving grams.

Run `replace_untrusted_piece_portions --apply` first. Fixes only apply while
the current value still matches the expected old one, so the command is
idempotent. Dry-run by default; pass --apply to write changes.
"""

from __future__ import annotations

import math

from django.core.management.base import BaseCommand
from django.db import transaction

from recipe.models import Recipe, RecipeItem
from recipe.services.recipe_checks import recalculate_recipe_cache
from supply.models import Portion
from supply.services.portion_integrity import rebind_dead_portion_references, rebind_recipe_items_to_grams

# (ingredient name, portion name) of 1 g portions whose name suggests a unit.
MISLABELLED_GRAM_PORTIONS: list[tuple[str, str]] = [
    ("Backpulver (Natron-Basis)", "Pack"),
    ("Basilikum frisch", "Töpfe"),
    ("Chili", "kleine"),
    ("Erythrit", "Tasse"),
    ("Frischer Koriander", "Bund"),
    ("Gehackte Mandeln", "Tasse"),
    ("Gewürzgurke", "ganze (65g)"),
    ("Gewürzgurkenwasser", "Glasfüllung"),
    ("Glatte Petersilie", "Bd."),
    ("Granatapfelkerne", "Handvoll"),
    ("Kakaopulver ungezuckert", "Tassen"),
    ("Mais", "Dosen"),
    ("Metaxa", "Pinnchen"),
    ("Paprikamark", "gehäufter EL"),
    ("Paprikapulver (geräuchert)", "Streuer"),
    ("Petersilie frisch gehackt", "Bund"),
    ("Pizzatomaten", "Dosen (à 400g)"),
    ("Reife Banane", "hauaidbih"),
    ("Schokoraspeln", "Handvoll"),
    ("Stückige Tomaten", "Dose"),
    ("Vanilleeis", "Kugel"),
    ("Vanillepuddingpulver", "gehäufter EL"),
    ("Vanillinzucker", "Pck."),
    ("Zitronengras", "Stangen"),
    ("frisches Basilikum", "Streuer"),
    ("raffiniertes Sonnenblumenöl", "zum Anbraten"),
    ("rote Linsen getrocknet", "Tassen"),
]

# (recipe slug, old ingredient, old portion, new ingredient, new portion, new quantity)
REPLACEMENTS: list[tuple[str, str, str, str, str, float]] = [
    ("omelett", "Amaretto-Eier (Oster)", "180g", "Hühnerei", "1 Ei (60g)", 3),
    ("mozzarella-hahnchen-in-basilikum-sahnesauce", "Butterschmalz", "Stück", "Butterschmalz", "g", 10),
]

# (recipe slug, ingredient name, portion name, old quantity, new quantity)
FIXES: list[tuple[str, str, str, float, float]] = [
    ("1-apfel-1", "Vollkornbrot geschnitten", "g", 1.0, 50),
    ("baked-beans-bohnenpfanne-1", "Zwiebel", "1 Portion", 0.0042, 0.5),
    ("baked-beans-bohnenpfanne-1", "Knoblauchzehe", "Zehe", 0.1, 0.5),
    ("baked-beans-bohnenpfanne-1", "Mais (Dose)", "100g Mais (Dose)", 0.005, 0.5),
    ("baked-beans-bohnenpfanne-1", "Baguette (aufback)", "Stück", 0.002, 0.5),
    ("big-mac-tacos-1", "Protein-Wraps", "Stück", 0.0167, 1),
    ("big-mac-tacos-1", "mittelscharfer Senf", "100g Senf", 0.0033, 0.05),
    ("big-mac-tacos-1", "Mayo light", "EL", 0.0444, 0.67),
    ("big-mac-tacos-1", "Curry Ketchup light", "EL", 0.0444, 0.67),
    ("big-mac-tacos-1", "Gurkenwasser", "Glas", 0.0033, 0.05),
    ("big-mac-tacos-1", "Rote Zwiebel", "g", 0.17, 17),
    ("big-tasty-bacon-bowl-1", "Olivenöl nativ extra", "Stück", 0.1, 1),
    ("big-tasty-bacon-bowl-1", "Tomatenmark", "EL", 0.1, 1),
    ("bratapfel-teramisu-1", "Äpfel", "100g Äpfel", 0.0125, 1.25),
    ("bratapfel-teramisu-1", "Zucker (für Topping)", "EL", 0.0333, 0.5),
    ("bratapfel-teramisu-1", "Zucker (für Creme)", "EL", 0.0333, 0.5),
    ("bratapfel-teramisu-1", "Apfelsaft", "g", 1.01, 50),
    ("bratapfel-teramisu-1", "Spekulatius Kekse", "Stück", 0.0312, 0.25),
    ("bratapfel-teramisu-1", "Gebrannte Mandeln", "Handvoll", 0.0083, 0.25),
    ("brokkoli-pilz-pfanne-1", "Brokkoli (Röschen)", "Stück", 0.0125, 5),
    ("brokkoli-pilz-pfanne-1", "Zwiebel gehackt", "Stück", 0.0025, 0.25),
    ("brokkoli-pilz-pfanne-1", "Olivenöl nativ extra", "Stück", 0.075, 0.75),
    ("brokkoli-pilz-pfanne-1", "Knoblauchzehen geraspelt", "Zehe", 0.2, 1),
    ("caesar-diat-wrap-1", "Brötchen", "g", 0.5, 25),
    ("caesar-diat-wrap-1", "Olivenöl nativ extra", "Stück", 0.05, 0.5),
    ("caesar-diat-wrap-1", "mittelscharfer Senf", "100g Senf", 0.0025, 0.04),
    ("caesar-diat-wrap-1", "Zitronensaft", "200 ml", 0.0025, 0.0375),
    ("caesar-diat-wrap-1", "Knoblauchzehe gepresst", "Zehe", 0.1, 0.5),
    ("caesar-diat-wrap-1", "Eisbergsalat", "g", 4, 40),
    ("chicken-fajita-burger-1", "Gelbe Paprika", "Stück", 0.0017, 0.255),
    ("chicken-fajita-burger-1", "frische Avocado", "Avocardo-Fleisch, Stück", 0.0006, 0.24),
    ("chicken-fajita-burger-1", "Olivenöl nativ extra", "Stück", 0.025, 0.25),
    ("chicken-fajita-burger-1", "Knoblauchzehe gepresst", "Zehe", 0.05, 0.25),
    ("chicken-fajita-burger-1", "Burger Buns", "g", 1.0, 60),
    ("chicken-fajita-burger-1", "Salsa-Sauce", "EL", 0.0667, 1),
    ("chili-cheese-sauce-1", "Weizenmehl Type 405", "Tasse Mehl", 0.0067, 0.1),
    ("chili-cheese-sauce-1", "Jalapeño eingelegt", "Stück", 0.0444, 0.666),
    ("chili-cheese-sauce-1", "Jalapeño Wasser", "Glas", 0.0017, 0.025),
    ("couscous-salat-vegan-1", "Tomate frisch", "Dose", 0.0013, 0.15),
    ("crispy-rice-and-chicken-1", "Sesamöl", "EL", 0.1, 1),
    ("crispy-rice-and-chicken-1", "Sojasauce Fermentiert", "1 EL Sojasauce", 0.1, 1),
    ("crispy-rice-and-chicken-1", "Lauchzwiebel", "Stück", 0.0667, 1),
    ("crispy-rice-salat-1", "Lauchzwiebeln", "Stück", 0.0667, 1),
    ("crispy-rice-salat-1", "Knoblauchzehe", "Zehe", 0.1, 0.5),
    ("crispy-rice-salat-1", "Sesamöl", "EL", 0.1, 1),
    ("crispy-rice-salat-1", "Reisessig", "EL", 0.0333, 0.5),
    ("crispy-rice-salat-1", "Sojasauce Fermentiert", "1 EL Sojasauce", 0.05, 0.5),
    ("crispy-rice-salat-1", "Blütenhonig", "100g Honig", 0.005, 0.1),
    ("crispy-rice-salat-1", "Minigurken", "g", 3, 30),
    ("diat-big-king-1", "Zwiebel", "1 Portion", 0.0021, 0.25),
    ("diat-big-king-1", "Tomaten-Ketchup", "EL", 0.0667, 1),
    ("diat-big-king-1", "mittelscharfer Senf", "100g Senf", 0.01, 0.15),
    ("flammkuchen-wrap-elsasser-art-1", "High Protein Wrap", "Stück", 0.0167, 1),
    ("gefullte-auberginenkroketten-1", "Auberginen", "Stück", 0.0016, 0.4),
    ("gefullte-auberginenkroketten-1", "Tahin (Sesammus)", "EL", 0.0533, 0.8),
    ("gefullte-auberginenkroketten-1", "Zitronensaft", "200 ml", 0.002, 0.03),
    ("gefullte-auberginenkroketten-1", "Paniermehl", "1 Portion trocken (100g)", 0.002, 0.2),
    ("gefullte-auberginenkroketten-1", "Tahin", "EL", 0.0133, 0.2),
    ("gefullte-auberginenkroketten-1", "Balsamicocreme", "EL", 0.0133, 0.2),
    ("grundrezept-tofu-hack-1", "Speisestärke", "Speisestärke in EL", 0.0667, 1),
    ("grundrezept-tofu-hack-1", "Zwiebel gehackt", "Stück", 0.005, 0.5),
    ("grundrezept-tofu-hack-1", "Dunkle Sojasauce", "EL", 0.0333, 0.5),
    ("hollandische-kasenudeln-mit-gouda-3", "Gouda", "100g", 0.0011, 0.625),
    ("hollandische-kasenudeln-mit-gouda-3", "Schlagsahne 30 % Fett", "100g Sahne", 0.0021, 0.5),
    ("hollandische-kasenudeln-mit-gouda-3", "Deutsche Markenbutter", "Belag normal", 0.001, 0.75),
    ("hollandische-kasenudeln-mit-gouda-3", "Gemüsebrühe-Konzentrat, pulverförmig", "1 TL Brühpulver", 0.006, 1),
    ("hollandische-kasenudeln-mit-gouda-3", "Schnittlauch", "Bund", 0.03, 0.25),
    ("kaiserschmarrn-1", "Puderzucker (Erythrit)", "EL", 0.0667, 1),
    ("kaiserschmarrn-1", "Hühnereier Größe M", "1 Ei (Größe M)", 0.05, 3),
    ("kartoffelsalat-v1-1", "Gekochte Eier", "Stück", 0.0167, 1),
    ("kartoffelsalat-v1-1", "Essiggurken", "g", 0.26, 40),
    ("kartoffelsalat-v1-1", "Speisezwiebeln", "Stück", 0.0025, 0.25),
    ("kartoffelsalat-v1-1", "mittelscharfer Senf", "100g Senf", 0.0025, 0.04),
    ("kartoffelsalat-v1-1", "Gurkenwasser", "Glas", 0.0025, 0.0375),
    ("kartoffelsalat-v1-1", "frischer Knoblauch", "1 Knolle (50g)", 0.005, 0.05),
    ("kartoffelsalat-v2-1", "Speisezwiebeln", "Stück", 0.005, 0.5),
    ("kartoffelsalat-v2-1", "Eier gekocht", "Stück", 0.0083, 0.5),
    ("kartoffelsalat-v2-1", "mittelscharfer Senf", "100g Senf", 0.0025, 0.04),
    ("kichererbsen-curry-mit-walnuss-hack-und-granatapfel-1", "Datteln entkernt", "Stück", 0.0312, 0.25),
    ("kichererbsen-curry-mit-walnuss-hack-und-granatapfel-1", "Grüne Paprika entkernt", "Stück", 0.0017, 0.255),
    ("kichererbsen-curry-mit-walnuss-hack-und-granatapfel-1", "Dunkle Sojasauce", "EL", 0.0167, 0.25),
    ("kichererbsen-curry-mit-walnuss-hack-und-granatapfel-1", "Zwiebel", "1 Portion", 0.0021, 0.25),
    ("kichererbsen-curry-mit-walnuss-hack-und-granatapfel-1", "Sojasauce Fermentiert", "1 EL Sojasauce", 0.05, 0.5),
    ("kichererbsen-curry-mit-walnuss-hack-und-granatapfel-1", "Koriander frisch", "Bund", 0.0083, 0.25),
    ("kichererbsen-curry-mit-walnuss-hack-und-granatapfel-1", "Fladenbrot", "g", 0.25, 100),
    ("klassische-nudeln-mit-tomatensoe", "Knoblauchzehe", "Zehe", 0.1, 0.5),
    ("klassische-nudeln-mit-tomatensoe", "Geschälte Tomaten", "g", 3.52, 100),
    ("klassische-pfadfinder-nudeln", "Speisezwiebeln", "Stück", 0.0001, 0.5),
    ("klassische-pfadfinder-nudeln", "Passierte Tomaten", "100g", 0.022, 2.2),
    ("mediterraner-nudelsalat-vegan-1", "Walnussöl", "EL", 0.1, 1),
    ("parmesan-karotten-mit-lachs-1", "Olivenöl nativ extra", "Stück", 0.1, 1),
    ("parmesan-karotten-mit-lachs-1", "Zitronenhälfte", "Stück", 0.01, 0.5),
    ("pfannen-pizza-1", "Zwiebel", "1 Portion", 0.0042, 0.5),
    ("pfannen-pizza-1", "Gelbe Paprika", "Stück", 0.0033, 0.495),
    ("pfannen-pizza-1", "Knoblauchzehe", "Zehe", 0.1, 0.5),
    ("pizza-suppe-1", "Olivenöl nativ extra", "Stück", 0.025, 0.25),
    ("sattmacher-bowl-1", "Hühnerei (Größe M)", "Ei, mittelgroß", 0.0125, 1),
    ("sattmacher-bowl-1", "Tomate frisch", "Dose", 0.0025, 0.3),
    ("sattmacher-bowl-1", "Mayonnaise", "Mayonnaise in EL", 0.0667, 1),
    ("sattmacher-bowl-1", "Knoblauchzehe klein", "Zehe", 0.2, 1),
    ("sattmacher-bowl-1", "Zitronensaft", "200 ml", 0.005, 0.075),
    ("sattmacher-bowl-1", "Chilisauce", "EL", 0.0667, 1),
    ("spatzle-brokkoli-auflauf-1", "Zwiebel", "1 Portion", 0.0021, 0.25),
    ("sushi-bowl-1", "Frühlingszwiebel", "Stange", 0.008, 0.12),
    ("tofu-crunch-grundrezept-1", "Olivenöl nativ extra", "Stück", 0.1333, 1.33),
    ("tofu-crunch-grundrezept-1", "Speisestärke", "Speisestärke in EL", 0.0222, 0.33),
    ("tschai-einfachgunstig-1", "Haselnusskerne", "g", 0.55, 5),
    ("vegane-auberginen-hack-alternative-1", "Basmatireis", "Gramm", 0.25, 60),
    ("vegane-bolognese-1", "Speisestärke", "Speisestärke in EL", 0.0167, 0.25),
    ("vegane-bolognese-1", "Sojasauce Fermentiert", "1 EL Sojasauce", 0.05, 0.5),
    ("vegane-bolognese-1", "Sojasauce Fermentiert", "1 EL Sojasauce", 0.075, 0.75),
    ("vegane-bolognese-1", "Karotten geraspelt", "Stück", 0.0125, 1),
    ("vegane-bolognese-1", "Knoblauchzehen gehackt", "Zehe", 0.1, 0.5),
    ("vegane-bolognese-1", "Zwiebel gehackt", "Stück", 0.0025, 0.25),
    ("vegane-bolognese-1", "Ahornsirup Grad A", "Esslöffel", 0.0125, 0.25),
    ("vegane-bolognese-1", "Veganer Parmesan", "EL", 0.025, 0.25),
    ("vegane-bratensoe-1", "Veganer Streichfett Ersatz", "100g", 0.01, 0.15),
    ("vegane-bratensoe-1", "Schalotte groß", "Stück", 0.01, 0.25),
    ("vegane-bratensoe-1", "Knoblauchzehe", "Zehe", 0.1, 0.5),
    ("vegane-bratensoe-1", "Speisestärke", "Speisestärke in EL", 0.0667, 1),
    ("vegane-bratensoe-1", "Hagebuttenkonfitüre", "100g", 0.01, 0.15),
    ("vegane-bratensoe-1", "Tamari", "EL", 0.0333, 0.5),
    ("vegane-buffalo-chicken-wings-aus-blumenkohl-1", "Blumenkohl groß", "Stück", 0.0003, 0.3),
    ("vegane-burger-patties-1", "Sojasoße", "Sojasoße in EL", 0.0667, 1),
    ("vegane-burger-patties-1", "Tomatenmark", "EL", 0.1, 1),
    ("vegane-burger-patties-1", "Geschrotete Leinsamen", "EL", 0.05, 0.5),
    ("vegane-honig-knoblauch-chunks-chicken-tender-style-1", "Zitronensaft", "200 ml", 0.005, 0.075),
    ("vegane-honig-knoblauch-chunks-chicken-tender-style-1", "Veganer Streichfett Ersatz", "100g", 0.01, 0.15),
    ("vegane-honig-knoblauch-chunks-chicken-tender-style-1", "Sojasauce Fermentiert", "1 EL Sojasauce", 0.075, 0.75),
    ("vegane-one-pot-brat-spaghetti-mit-karamellisierten-zwiebeln-1", "Gemüsezwiebeln groß", "Stück", 0.0033, 0.66),
    ("vegane-one-pot-brat-spaghetti-mit-karamellisierten-zwiebeln-1", "Olivenöl nativ extra", "Stück", 0.0667, 0.667),
    ("vegane-one-pot-brat-spaghetti-mit-karamellisierten-zwiebeln-1", "Ahornsirup Grad A", "Esslöffel", 0.0167, 0.334),
    ("vegane-one-pot-brat-spaghetti-mit-karamellisierten-zwiebeln-1", "Zitronensaft", "200 ml", 0.0017, 0.0255),
    ("vegane-one-pot-brat-spaghetti-mit-karamellisierten-zwiebeln-1", "Veganer Parmesan", "EL", 0.0333, 0.333),
    ("veganes-gulasch-1", "Olivenöl nativ extra", "Stück", 0.075, 0.75),
    ("veganes-gulasch-1", "Sojasauce Fermentiert", "1 EL Sojasauce", 0.125, 1.25),
    ("veganes-gulasch-1", "Schalotten", "g", 1.01, 25),
    ("veganes-gulasch-1", "Knoblauchzehe gehackt", "Zehe", 0.05, 0.25),
    ("veganes-gulasch-1", "Tomatenmark", "EL", 0.025, 0.25),
    ("veganes-gulasch-1", "Speisestärke", "Speisestärke in EL", 0.0667, 1),
    ("veganes-gulasch-1", "Rotkohl", "g", 0.26, 100),
    ("veganes-mango-channa-madra-1", "Kokosfett", "EL", 0.0667, 1),
    ("veganes-mango-channa-madra-1", "Grüne Chili (Ringe)", "Stück", 0.0167, 0.25),
    ("veganes-mango-channa-madra-1", "Rosinen", "100g Rosinen", 0.0125, 0.12),
    ("veganes-mango-channa-madra-1", "Mango", "g", 0.26, 80),
    ("veganes-mango-channa-madra-1", "Fladenbrot", "g", 0.25, 100),
    # Grams/ml stored as portion counts.
    *[(f"hollandische-kasenudeln-mit-gouda-{n}", "Sahne", "Esslöffel", 200, 13.33) for n in (7, 8, 9, 10)],
    *[(f"hollandische-kasenudeln-mit-gouda-{n}", "Sahne", "Esslöffel", 50, 3.33) for n in (13, 14, 16, 17, 19, 20)],
    ("hollandische-kasenudeln-mit-gouda-15", "Milch", "Glas", 75, 0.375),
    ("hollandische-kasenudeln-mit-gouda-18", "Milch", "Glas", 75, 0.375),
    ("hollandische-kasenudeln-mit-gouda-16", "Milch", "Glas", 25, 0.125),
    ("hollandische-kasenudeln-mit-gouda-10", "Gemüsebrühe", "Tasse", 100, 0.4),
    ("hollandische-kasenudeln-mit-gouda-12", "Gemüsebrühe", "Tasse", 100, 0.4),
    *[(f"hollandische-kasenudeln-mit-gouda-{n}", "Gemüsebrühe", "Tasse", 25, 0.1) for n in (13, 15, 19, 20)],
    ("hollandische-kasenudeln-mit-gouda-4", "Deutsche Markenbutter", "Belag normal", 30, 3),
    ("hollandische-kasenudeln-mit-gouda-4", "Gemüsebrühe-Konzentrat, pulverförmig", "1 TL Brühpulver", 20, 4),
    ("hollandische-kasenudeln-mit-gouda-6", "Gemüsebrühe-Konzentrat, pulverförmig", "1 TL Brühpulver", 20, 4),
    *[
        (slug, "Gemüsebrühe-Konzentrat, pulverförmig", "1 TL Brühpulver", 12, 1)
        for slug in (
            "chilli-sin-carne",
            "chilli-sin-carne-1",
            "chilli-sin-carne-2",
            "chilli-sin-carne-4",
            "chilli-sin-carne-5",
            "chilli-sin-carne-sojaflocken",
            "chilli-sin-carne-sojaflocken-1",
        )
    ],
    *[
        (slug, "Gemüsebrühe-Konzentrat, pulverförmig", "1 TL Brühpulver", 20, 1)
        for slug in ("cous-cous-salat-1", "rigatoni-al-forno", "rigatoni-al-forno-1", "rigatoni-al-forno-2")
    ],
    (
        "gelbe-linsensuppe-mit-kartoffeln-und-spinat-1",
        "Gemüsebrühe-Konzentrat, pulverförmig",
        "1 TL Brühpulver",
        50,
        4.5,
    ),
    ("kartoffelsuppe-2", "Gemüsebrühe-Konzentrat, pulverförmig", "1 TL Brühpulver", 50, 1.5),
    ("linsensuppe", "Gemüsebrühe-Konzentrat, pulverförmig", "1 TL Brühpulver", 50, 1.5),
    ("pizza-suppe-1", "Gemüsebrühe-Konzentrat, pulverförmig", "1 TL Brühpulver", 12.5, 4),
    ("pizza-suppe-1", "Zwiebel", "1 Portion", 20, 2),
    ("jasmins-freitagabend-nudeln", "Agavendicksaft", "Agavendicksaft in EL", 50, 0.33),
    ("jasmins-freitagabend-nudeln-1", "Agavendicksaft", "Agavendicksaft in EL", 50, 0.33),
    ("vegane-buffalo-chicken-wings-aus-blumenkohl-1", "Rapsöl", "1 Portion", 375, 37.5),
    ("vegane-honig-knoblauch-chunks-chicken-tender-style-1", "Rapsöl", "1 Portion", 50, 5),
    ("lagerfeuer-pizza-mit-frischen-pilzen", "Leitungswasser", "1 Portion", 60, 7.5),
    # Unit amounts on former mislabelled gram portions (see step 1).
    ("kichererbsen-curry-mit-walnuss-hack-und-granatapfel-1", "Frischer Koriander", "g", 0.25, 7.5),
    ("vegane-bolognese-1", "Frischer Koriander", "g", 0.25, 7.5),
    ("kichererbsen-curry-mit-walnuss-hack-und-granatapfel-1", "Granatapfelkerne", "g", 0.25, 10),
    ("bratapfel-teramisu-1", "Vanillepuddingpulver", "g", 0.25, 3),
    ("gefullte-auberginenkroketten-1", "Petersilie frisch gehackt", "g", 0.2, 6),
    ("lava-cake-mit-vanilleeis-1", "Vanilleeis", "g", 1, 50),
    ("mediterraner-nudelsalat-vegan-1", "Paprikamark", "g", 1, 20),
    ("tomatensuppe-mit-reis-1", "Basilikum frisch", "g", 2, 40),
]

TOLERANCE = 1e-3


class Command(BaseCommand):
    help = "Fix hand-reviewed recipe quantities and ingredients corrupted by legacy imports."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true")

    def handle(self, *args, **options):
        apply = options["apply"]
        recipe_ids: set[int] = set()
        with transaction.atomic():
            recipe_ids |= self._rebind_mislabelled(apply)
            recipe_ids |= self._fix_quantities(apply)
            recipe_ids |= self._replace_ingredients(apply)
            dead = rebind_dead_portion_references()
            self.stdout.write(f"DEAD_REFS rebound={len(dead)}")
            recipe_ids |= {change["recipe_id"] for change in dead}
            if not apply:
                self.stdout.write("DRY_RUN no changes written")
                transaction.set_rollback(True)
                return
        for recipe in Recipe.objects.filter(id__in=recipe_ids):
            recalculate_recipe_cache(recipe)
        self.stdout.write(f"APPLIED recipes_recalculated={len(recipe_ids)}")

    def _rebind_mislabelled(self, apply: bool) -> set[int]:
        recipe_ids: set[int] = set()
        for ingredient, name in MISLABELLED_GRAM_PORTIONS:
            portions = Portion.objects.filter(
                ingredient__name=ingredient, name=name, weight_g=1.0, deleted_at__isnull=True
            ).select_related("ingredient")
            for portion in portions:
                items = list(RecipeItem.objects.filter(portion=portion).values_list("id", "recipe_id"))
                self.stdout.write(f"GRAMS    {ingredient} / {name}: {len(items)} item(s)")
                recipe_ids.update(recipe_id for _, recipe_id in items)
                # Dry runs roll back, so later steps can see the rebound items.
                rebind_recipe_items_to_grams(portion)
        return recipe_ids if apply else set()

    def _fix_quantities(self, apply: bool) -> set[int]:
        recipe_ids: set[int] = set()
        for slug, ingredient, portion, old, new in FIXES:
            items = RecipeItem.objects.filter(
                recipe__slug=slug,
                portion__ingredient__name=ingredient,
                portion__name=portion,
            ).select_related("portion")
            matched = False
            for item in items:
                if math.isclose(item.quantity, new, abs_tol=TOLERANCE):
                    matched = True
                    continue
                if not math.isclose(item.quantity, old, abs_tol=TOLERANCE):
                    continue
                matched = True
                weight = item.portion.weight_g or 0
                self.stdout.write(
                    f"FIX      {slug}: {ingredient} / {portion} {item.quantity:g} → {new:g} "
                    f"({item.quantity * weight:.2f} g → {new * weight:.2f} g)"
                )
                item.quantity = new
                item.save(update_fields=["quantity"])
                recipe_ids.add(item.recipe_id)
            if not matched:
                self.stdout.write(f"MISSING  {slug}: {ingredient} / {portion} (quantity {old:g})")
        self.stdout.write(f"SUMMARY recipes={len(recipe_ids)}")
        return recipe_ids

    def _replace_ingredients(self, apply: bool) -> set[int]:
        recipe_ids: set[int] = set()
        for slug, old_ingredient, old_portion, new_ingredient, new_portion, quantity in REPLACEMENTS:
            target = Portion.objects.filter(
                ingredient__name=new_ingredient, name=new_portion, deleted_at__isnull=True
            ).first()
            if target is None:
                self.stdout.write(f"MISSING  target {new_ingredient} / {new_portion}")
                continue
            items = RecipeItem.objects.filter(
                recipe__slug=slug, portion__ingredient__name=old_ingredient, portion__name=old_portion
            )
            for item in items:
                self.stdout.write(
                    f"REPLACE  {slug}: {old_ingredient} → {quantity:g} × {new_ingredient} / {new_portion}"
                )
                item.portion = target
                item.quantity = quantity
                item.save(update_fields=["portion", "quantity"])
                recipe_ids.add(item.recipe_id)
        return recipe_ids
