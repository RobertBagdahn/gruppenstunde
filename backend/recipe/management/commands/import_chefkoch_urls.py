"""Import top Chefkoch recipes via URL import service.

Usage:
    uv run python manage.py import_chefkoch_urls
    uv run python manage.py import_chefkoch_urls --limit 10
    uv run python manage.py import_chefkoch_urls --dry-run
"""

import logging
import time

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction

from recipe.models.items import RecipeItem
from recipe.models.recipe import Recipe

logger = logging.getLogger(__name__)

User = get_user_model()

# Top 100 Chefkoch recipes (most popular / highest rated)
CHEFKOCH_URLS = [
    "https://www.chefkoch.de/rezepte/1010591206190843/Lothars-beste-Nuernberger-Elisenlebkuchen.html",
    "https://www.chefkoch.de/rezepte/1031841208350942/Kaiserschmarrn-Tiroler-Landgasthofrezept.html",
    "https://www.chefkoch.de/rezepte/1256021231072628/Nussecken.html",
    "https://www.chefkoch.de/rezepte/1474841252484744/Spareribs-zum-Grillen-oder-fuer-den-Backofen.html",
    "https://www.chefkoch.de/rezepte/1574651265014378/Serviettenknoedel.html",
    "https://www.chefkoch.de/rezepte/1900361309694639/Altbaerlis-Kaiserschmarrn.html",
    "https://www.chefkoch.de/rezepte/1998981323763212/Koenigsberger-Klopse.html",
    "https://www.chefkoch.de/rezepte/2114131340630587/Vegetarische-Spinat-Gemuese-Lasagne-mit-Tomatensosse.html",
    "https://www.chefkoch.de/rezepte/2133281343053838/Rinderrouladen-klassisch.html",
    "https://www.chefkoch.de/rezepte/2204031353338061/Apfelkuchen-mit-Streuseln.html",
    "https://www.chefkoch.de/rezepte/2636361414129018/Russischer-Zupfkuchen.html",
    "https://www.chefkoch.de/rezepte/2653511416758959/Pikanter-Dattel-Frischkaese-Dip.html",
    "https://www.chefkoch.de/rezepte/2766911428603391/Indisches-Butter-Chicken-aus-dem-Ofen.html",
    "https://www.chefkoch.de/rezepte/3017351454519857/KFC-Coleslaw.html",
    "https://www.chefkoch.de/rezepte/369841122576721/Kaesekuchen-mit-2-Schichten.html",
    "https://www.chefkoch.de/rezepte/378801124204434/Friedas-genialer-Hefezopf.html",
    "https://www.chefkoch.de/rezepte/541961151505565/Eierlikoer-nach-DDR-Tradition.html",
    "https://www.chefkoch.de/rezepte/914031196710118/Griessbrei-von-Grossmutter.html",
    "https://www.chefkoch.de/rezepte/923511197717113/Hirschgulasch.html",
    "https://www.chefkoch.de/rezepte/1001811205419556/Ruehrkuchen-nach-Omas-Art.html",
    "https://www.chefkoch.de/rezepte/1008111205922957/Party-Wraps-mit-Frischkaese-und-Putenbrust.html",
    "https://www.chefkoch.de/rezepte/1015461206734011/Italienischer-Nudelsalat-mit-Rucola-und-getrockneten-Tomaten.html",
    "https://www.chefkoch.de/rezepte/1045691209479240/Mexikanische-Burritos.html",
    "https://www.chefkoch.de/rezepte/1064631211795001/Knusprige-Ofenkartoffeln.html",
    "https://www.chefkoch.de/rezepte/1066811212153175/Schwedische-Sommersuppe.html",
    "https://www.chefkoch.de/rezepte/1082601214031394/Himbeertraum.html",
    "https://www.chefkoch.de/rezepte/1107291216818673/Schneller-Flammkuchen.html",
    "https://www.chefkoch.de/rezepte/1111591217169060/Spaetzle.html",
    "https://www.chefkoch.de/rezepte/1113191217348957/Schnelles-Himbeer-Dessert.html",
    "https://www.chefkoch.de/rezepte/1113761217428134/Brauhaus-Gulasch.html",
    "https://www.chefkoch.de/rezepte/1123111218622833/Lachs-aus-dem-Backofen.html",
    "https://www.chefkoch.de/rezepte/1140221220253617/Supersaftiger-Apfelkuchen.html",
    "https://www.chefkoch.de/rezepte/1143511220703880/Julies-feine-Gemueselasagne.html",
    "https://www.chefkoch.de/rezepte/1151011221381450/Der-beste-Pizzateig.html",
    "https://www.chefkoch.de/rezepte/1153081221555008/Der-perfekte-Milchreis-Grundrezept.html",
    "https://www.chefkoch.de/rezepte/115421048694976/Apfelmus.html",
    "https://www.chefkoch.de/rezepte/1159171222074763/Apple-Crumble.html",
    "https://www.chefkoch.de/rezepte/118601050415074/Schwedische-Zimtschnecken-Kanelbullar.html",
    "https://www.chefkoch.de/rezepte/1205621226313744/Amerikanische-Pancakes.html",
    "https://www.chefkoch.de/rezepte/1208161226570428/Der-perfekte-Pfannkuchen-gelingt-einfach-immer.html",
    "https://www.chefkoch.de/rezepte/1243811229272585/Schwaebischer-Zwiebelkuchen.html",
    "https://www.chefkoch.de/rezepte/1248831229862746/Flammkuchen-mit-Ziegenkaese-Rosmarin-und-Honig.html",
    "https://www.chefkoch.de/rezepte/1254481230799966/Rotweinkuchen-schoen-saftig.html",
    "https://www.chefkoch.de/rezepte/125471053777691/Alt-Wiener-Semmelknoedel.html",
    "https://www.chefkoch.de/rezepte/1336701238522125/Apfelkuchen-supersaftig.html",
    "https://www.chefkoch.de/rezepte/1342761239096947/Filettopf.html",
    "https://www.chefkoch.de/rezepte/1415521246449438/Berliner-Kartoffelsuppe.html",
    "https://www.chefkoch.de/rezepte/1449161249821238/Cream-Cheese-Muffins.html",
    "https://www.chefkoch.de/rezepte/1476371252847899/Schweizer-Wurstsalat.html",
    "https://www.chefkoch.de/rezepte/1499261255443923/Tiramisu-mit-Spekulatius-und-Himbeeren.html",
    "https://www.chefkoch.de/rezepte/1511921256558799/Erdbeerkuchen-mit-Schmand-Vanillecreme.html",
    "https://www.chefkoch.de/rezepte/1518811257110128/Antipasti.html",
    "https://www.chefkoch.de/rezepte/1545021260916991/Kuerbis-Pfanne-mit-Hackfleisch.html",
    "https://www.chefkoch.de/rezepte/1552181262592026/Currysauce-zu-Currywurst.html",
    "https://www.chefkoch.de/rezepte/1582931265789857/Baklava.html",
    "https://www.chefkoch.de/rezepte/1583241265803838/Schupfnudel-Hackfleisch-Auflauf-mit-Gemuese.html",
    "https://www.chefkoch.de/rezepte/1583701265817692/Krustenbraten.html",
    "https://www.chefkoch.de/rezepte/1594161266675503/Erbseneintopf-nach-Bundeswehrrezept.html",
    "https://www.chefkoch.de/rezepte/1595231266764332/Tortillas-aus-Weizenmehl.html",
    "https://www.chefkoch.de/rezepte/1631611270752104/Vegetarische-Frikadellen.html",
    "https://www.chefkoch.de/rezepte/1639971271583788/Ratatouille.html",
    "https://www.chefkoch.de/rezepte/1647731272435749/Gefuellte-Zucchini-mit-Hackfleisch-und-Kaese.html",
    "https://www.chefkoch.de/rezepte/1651831272990064/Pikante-Thai-Suppe-mit-Kokos-und-Huehnchen.html",
    "https://www.chefkoch.de/rezepte/1693561277708713/Rouladen.html",
    "https://www.chefkoch.de/rezepte/1718481280523737/Rote-Linsen-Kokos-Suppe.html",
    "https://www.chefkoch.de/rezepte/1747451284034681/Hamburger-Broetchen.html",
    "https://www.chefkoch.de/rezepte/1785351288608398/Fluffy-Buttermilk-Pancakes.html",
    "https://www.chefkoch.de/rezepte/1804511291817891/Ramen-Japanische-Nudelsuppe-mit-Huehnerbruehe-und-Schweinefilet.html",
    "https://www.chefkoch.de/rezepte/1844061298739441/Mozzarella-Haehnchen-in-Basilikum-Sahnesauce.html",
    "https://www.chefkoch.de/rezepte/1910611311448649/Currywurstsosse-wie-von-der-Pommesbude.html",
    "https://www.chefkoch.de/rezepte/1921631313416061/Schneller-Bananenkuchen.html",
    "https://www.chefkoch.de/rezepte/1948521317045172/Tafelspitz-mit-Meerrettichsosse.html",
    "https://www.chefkoch.de/rezepte/1953131317830499/Saftiger-Kuerbis-Gnocchi-Auflauf.html",
    "https://www.chefkoch.de/rezepte/2038461330206007/Blechkuchen-Gebrannte-Mandeln.html",
    "https://www.chefkoch.de/rezepte/2093341337948044/Rhabarber-Crumble.html",
    "https://www.chefkoch.de/rezepte/2096771338404215/Solero-Dessert.html",
    "https://www.chefkoch.de/rezepte/2103441339486118/Schwaebische-Linsen-mit-Spaetzle-und-Saitenwuerstchen.html",
    "https://www.chefkoch.de/rezepte/2109501340136606/Tagliatelle-al-Salmone.html",
    "https://www.chefkoch.de/rezepte/2138301343656711/Naanbrot.html",
    "https://www.chefkoch.de/rezepte/2183131350572745/Deftige-Gulaschsuppe.html",
    "https://www.chefkoch.de/rezepte/2277101363269708/Omis-Rinderbraten-mit-Rotweinsosse.html",
    "https://www.chefkoch.de/rezepte/2289701365087177/Grundrezept-fuer-knusprig-gebratenen-Tofu.html",
    "https://www.chefkoch.de/rezepte/2344541372996453/Amerikanischer-New-York-Cheesecake-so-wie-der-beruehmte-Lindy-s.html",
    "https://www.chefkoch.de/rezepte/2365241375652232/Shakshuka.html",
    "https://www.chefkoch.de/rezepte/2372411376331747/Schaschlik-mit-selbstgemachter-Schaschliksosse.html",
    "https://www.chefkoch.de/rezepte/2381701377519700/Gefuellte-Champignons.html",
    "https://www.chefkoch.de/rezepte/2424861382536161/Italienischer-Kartoffel-Gnocchi-Auflauf.html",
    "https://www.chefkoch.de/rezepte/246931098493642/Indisches-Naan-Brot.html",
    "https://www.chefkoch.de/rezepte/2520301395225657/Grundrezept-fuer-Overnight-Oats.html",
    "https://www.chefkoch.de/rezepte/2572871402987307/Orientalische-Hackfleischpfanne-mit-Joghurtdip.html",
    "https://www.chefkoch.de/rezepte/259781101566295/Kuerbissuppe-mit-Ingwer-und-Kokosmilch.html",
    "https://www.chefkoch.de/rezepte/2635661414046526/Apfelkuchen.html",
    "https://www.chefkoch.de/rezepte/2636371414130583/Schwarzwaelder-Kirschtorte.html",
    "https://www.chefkoch.de/rezepte/264171102553424/Tiramisu.html",
    "https://www.chefkoch.de/rezepte/2689271421664591/Low-Carb-Brot-mit-Sonnenblumenkernen.html",
    "https://www.chefkoch.de/rezepte/272251104287099/Tzatziki-wie-ich-es-aus-Kreta-mitgebracht-habe.html",
    "https://www.chefkoch.de/rezepte/2732141425564814/Griechischer-Kritharaki-Salat.html",
    "https://www.chefkoch.de/rezepte/2733891425739452/Bananenbrot-ohne-extra-Fett-und-Zucker.html",
    "https://www.chefkoch.de/rezepte/2737891426025016/Gyros-Nudelauflauf-in-Metaxasosse.html",
    "https://www.chefkoch.de/rezepte/2801401432239694/Quiche-mit-Spinat-Feta-Tomaten-und-Pinienkernen.html",
    "https://www.chefkoch.de/rezepte/3023041455110341/Rote-Linsen-Curry-mit-Suesskartoffeln.html",
    "https://www.chefkoch.de/rezepte/3116611464630134/Bulgur-Buddha-Bowl.html",
]


class Command(BaseCommand):
    help = "Import top Chefkoch recipes using the URL import service"

    def add_arguments(self, parser):
        parser.add_argument(
            "--limit",
            type=int,
            default=100,
            help="Number of recipes to import (default: 100)",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="Only parse, don't save to DB",
        )
        parser.add_argument(
            "--user",
            type=str,
            default=None,
            help="Username of the owner (default: first superuser)",
        )
        parser.add_argument(
            "--delay",
            type=float,
            default=2.0,
            help="Delay between requests in seconds (default: 2.0)",
        )

    def handle(self, *args, **options):
        from recipe.services.url_import_service import import_recipe_from_url

        limit = options["limit"]
        dry_run = options["dry_run"]
        delay = options["delay"]

        # Get user
        if options["user"]:
            user = User.objects.get(username=options["user"])
        else:
            user = User.objects.filter(is_superuser=True).first()
            if not user:
                self.stderr.write(self.style.ERROR("Kein Superuser gefunden. Bitte --user angeben."))
                return

        urls = CHEFKOCH_URLS[:limit]
        self.stdout.write(f"Importiere {len(urls)} Rezepte als User '{user.username}'...")

        success_count = 0
        error_count = 0

        for i, url in enumerate(urls, 1):
            self.stdout.write(f"\n[{i}/{len(urls)}] {url}")

            try:
                with transaction.atomic():
                    result = import_recipe_from_url(url, user)
                    self.stdout.write(self.style.SUCCESS(f"  → {result.title}"))

                    if not dry_run:
                        # Create recipe
                        recipe = Recipe(
                            title=result.title,
                            description="\n".join(result.steps) if result.steps else "",
                            summary=result.summary,
                            recipe_type=result.recipe_type,
                            portions=result.servings or 4,
                            execution_time=result.execution_time or 0,
                            preparation_time=result.preparation_time or 0,
                            difficulty=result.difficulty,
                            source_url=result.source_url,
                            created_by=user,
                            owner=user,
                            status="approved",
                        )
                        recipe.save()

                        # Set M2M
                        if result.scout_level_ids:
                            from content.models.tags import ScoutLevel

                            valid_ids = set(
                                ScoutLevel.objects.filter(id__in=result.scout_level_ids).values_list("id", flat=True)
                            )
                            recipe.scout_levels.set(valid_ids)
                        if result.tag_ids:
                            recipe.tags.set(result.tag_ids)

                        recipe.authors.add(user)

                        # Create recipe items (only if portion_id is available)
                        items_created = 0
                        for idx, item in enumerate(result.recipe_items):
                            if item.portion_id:
                                RecipeItem.objects.create(
                                    recipe=recipe,
                                    portion_id=item.portion_id,
                                    quantity=item.quantity,
                                    sort_order=idx,
                                    note=item.note or "",
                                )
                                items_created += 1

                        self.stdout.write(f"  ✓ Gespeichert (ID: {recipe.id}, {items_created} Zutaten)")

                success_count += 1

            except Exception as e:
                error_count += 1
                self.stderr.write(self.style.ERROR(f"  ✗ Fehler: {e}"))

            # Rate limiting
            if i < len(urls):
                time.sleep(delay)

        self.stdout.write(f"\n{'=' * 50}")
        self.stdout.write(self.style.SUCCESS(f"Erfolgreich: {success_count}"))
        if error_count:
            self.stderr.write(self.style.ERROR(f"Fehler: {error_count}"))
