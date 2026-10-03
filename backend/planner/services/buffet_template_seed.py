"""Default buffet templates (spec ``buffet-templates``).

Existing templates are untouched by default; an explicit option may fill empty defaults only.
Default selections are resolved by the exact name of system entries.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

from django.db import transaction

from supply.services.buffet_catalog import BUFFET_ROLE_SLUGS


@dataclass(frozen=True)
class RoleSeed:
    role: str
    amount: float
    enabled: bool = True
    unit: str = "g"
    ingredients: tuple[str, ...] = ()
    recipes: tuple[str, ...] = ()


@dataclass(frozen=True)
class TemplateSeed:
    slug: str
    name: str
    meal_types: tuple[str, ...]
    sort_order: int
    roles: tuple[RoleSeed, ...]
    description: str = ""


BUFFET_TEMPLATE_SEEDS: tuple[TemplateSeed, ...] = (
    TemplateSeed(
        slug="breakfast",
        name="Frühstück",
        meal_types=("breakfast",),
        sort_order=10,
        description="Klassisches Frühstücksbuffet mit Brot, Belag, Obst und Heißgetränken.",
        roles=(
            RoleSeed("buffet-bread", 120, ingredients=("Bauernbrot", "Brötchen")),
            RoleSeed("buffet-fat", 10, ingredients=("Deutsche Markenbutter",)),
            RoleSeed("buffet-savory", 40, ingredients=("Gouda", "Schinken (gekocht)")),
            RoleSeed("buffet-sweet", 30, ingredients=("Marmelade",)),
            RoleSeed("buffet-fresh", 80, ingredients=("Salatgurke", "frischer Apfel")),
            RoleSeed("buffet-drink", 250, unit="ml", recipes=("Kaffee", "Tee")),
            RoleSeed("buffet-cereal", 60, enabled=False),
            RoleSeed("buffet-dish", 150, enabled=False),
        ),
    ),
    TemplateSeed(
        slug="baguettes",
        name="Belegte Baguettes",
        meal_types=("lunch", "dinner"),
        sort_order=20,
        description="Belegte Baguettes, z. B. als Mittagessen unterwegs.",
        roles=(
            RoleSeed("buffet-bread", 150, ingredients=("Baguette",)),
            RoleSeed("buffet-fat", 10, ingredients=("Deutsche Markenbutter",)),
            RoleSeed(
                "buffet-savory",
                70,
                ingredients=("Gouda", "Schinken (gekocht)", "Mozzarella aus Kuhmilch"),
            ),
            RoleSeed("buffet-condiment", 15, ingredients=("mittelscharfer Senf",)),
            RoleSeed("buffet-fresh", 100, ingredients=("Salatgurke", "Tomaten", "Eisbergsalat")),
            RoleSeed("buffet-drink", 300, unit="ml", ingredients=("Saft (Apfel)",)),
            RoleSeed("buffet-sweet", 20, enabled=False),
        ),
    ),
    TemplateSeed(
        slug="supper",
        name="Abendbrot",
        meal_types=("dinner",),
        sort_order=30,
        description="Abendbrot mit Brot, herzhaftem Belag und Gemüse.",
        roles=(
            RoleSeed("buffet-bread", 130, ingredients=("Bauernbrot", "Vollkornbrot geschnitten")),
            RoleSeed("buffet-fat", 10, ingredients=("Deutsche Markenbutter",)),
            RoleSeed(
                "buffet-savory",
                60,
                ingredients=("Gouda", "Salami italienische Art", "Frischkäse Doppelrahmstufe"),
            ),
            RoleSeed("buffet-fresh", 100, ingredients=("Salatgurke", "Tomaten", "Gemüsepaprika rot")),
            RoleSeed("buffet-drink", 250, unit="ml", recipes=("Tee",)),
            RoleSeed("buffet-condiment", 10, enabled=False),
            RoleSeed("buffet-sweet", 20, enabled=False),
            RoleSeed("buffet-dish", 150, enabled=False),
        ),
    ),
    TemplateSeed(
        slug="snack-platter",
        name="Snackplatte",
        meal_types=("snack",),
        sort_order=40,
        roles=(
            RoleSeed("buffet-fresh", 150, ingredients=("Salatgurke", "frischer Apfel")),
            RoleSeed("buffet-dip", 40, ingredients=("Hummus",)),
            RoleSeed("buffet-cheese", 30, ingredients=("Gouda",)),
            RoleSeed("buffet-salty-snack", 25, ingredients=("Brotchips Tomate-Olive",)),
            RoleSeed("buffet-drink", 250, unit="ml", ingredients=("Saft (Apfel)",)),
            RoleSeed("buffet-nuts", 20, enabled=False, ingredients=("Cashewkerne",)),
            RoleSeed("buffet-bread", 40, enabled=False, ingredients=("Baguette",)),
        ),
    ),
    TemplateSeed(
        slug="cheese-platter",
        name="Käseplatte",
        meal_types=("snack",),
        sort_order=41,
        roles=(
            RoleSeed("buffet-cheese", 80, ingredients=("Gouda", "Feta")),
            RoleSeed("buffet-bread", 50, ingredients=("Baguette",)),
            RoleSeed("buffet-fresh", 80, ingredients=("frischer Apfel",)),
            RoleSeed("buffet-nuts", 20, ingredients=("Cashewkerne",)),
            RoleSeed("buffet-dip", 20, ingredients=("Hummus",)),
            RoleSeed("buffet-drink", 250, unit="ml", ingredients=("Saft (Apfel)",)),
            RoleSeed("buffet-sweet", 15, enabled=False),
        ),
    ),
    TemplateSeed(
        slug="salty-snacks",
        name="Salzgebäck & Chips",
        meal_types=("snack",),
        sort_order=42,
        roles=(
            RoleSeed("buffet-salty-snack", 60, ingredients=("Maistortilla-Chips", "Brotchips Tomate-Olive")),
            RoleSeed("buffet-dip", 40, ingredients=("Hummus",)),
            RoleSeed("buffet-fresh", 80, ingredients=("Salatgurke",)),
            RoleSeed("buffet-drink", 300, unit="ml", ingredients=("Saft (Multivitamin)",)),
            RoleSeed("buffet-nuts", 25, enabled=False, ingredients=("Cashewkerne",)),
        ),
    ),
    TemplateSeed(
        slug="nachos",
        name="Nachos mit Soßen",
        meal_types=("snack",),
        sort_order=43,
        roles=(
            RoleSeed("buffet-salty-snack", 60, ingredients=("Maistortilla-Chips",)),
            RoleSeed("buffet-cheese", 40, ingredients=("Gouda",)),
            RoleSeed("buffet-dip", 60, ingredients=("Salsa-Sauce",)),
            RoleSeed("buffet-topping", 25, ingredients=("Jalapeños", "Mais (Dose)")),
            RoleSeed("buffet-drink", 300, unit="ml", ingredients=("Saft (Orange)",)),
            RoleSeed("buffet-fresh", 50, enabled=False, ingredients=("Tomate",)),
        ),
    ),
    TemplateSeed(
        slug="sweet-buffet",
        name="Süßes Buffet",
        meal_types=("snack",),
        sort_order=44,
        roles=(
            RoleSeed("buffet-sweet-snack", 50, ingredients=("Butterkekse", "Hafercookie Vegan")),
            RoleSeed("buffet-fresh", 100, ingredients=("frischer Apfel",)),
            RoleSeed("buffet-drink", 250, unit="ml", ingredients=("Saft (Multivitamin)",)),
            RoleSeed("buffet-nuts", 20, enabled=False, ingredients=("Cashewkerne",)),
            RoleSeed("buffet-cereal", 80, enabled=False, ingredients=("Müsli (Basis)",)),
        ),
    ),
    TemplateSeed(
        slug="fruit-nuts",
        name="Obst & Nüsse",
        meal_types=("snack",),
        sort_order=45,
        roles=(
            RoleSeed("buffet-fresh", 150, ingredients=("frischer Apfel", "Salatgurke")),
            RoleSeed("buffet-nuts", 30, ingredients=("Cashewkerne",)),
            RoleSeed("buffet-cereal", 100, ingredients=("Müsli (Basis)",)),
            RoleSeed("buffet-drink", 250, unit="ml", ingredients=("Saft (Apfel)",)),
            RoleSeed("buffet-sweet-snack", 20, enabled=False, ingredients=("Butterkekse",)),
        ),
    ),
    TemplateSeed(
        slug="campfire-snack",
        name="Lagerfeuer-Snack",
        meal_types=("snack",),
        sort_order=46,
        roles=(
            RoleSeed("buffet-dish", 120),
            RoleSeed("buffet-sweet-snack", 30),
            RoleSeed("buffet-fresh", 80),
            RoleSeed("buffet-drink", 300, unit="ml"),
        ),
    ),
    TemplateSeed(
        slug="wrap-bar",
        name="Wrap-Bar",
        meal_types=("lunch", "dinner"),
        sort_order=50,
        roles=(
            RoleSeed("buffet-bread", 120, ingredients=("Tortilla-Wraps",)),
            RoleSeed("buffet-savory", 70, ingredients=("Gouda", "Salami italienische Art")),
            RoleSeed("buffet-fresh", 100, ingredients=("Salatgurke", "Tomate")),
            RoleSeed("buffet-dip", 40, ingredients=("Hummus",)),
            RoleSeed("buffet-cheese", 30, ingredients=("Feta",)),
            RoleSeed("buffet-drink", 300, unit="ml", ingredients=("Saft (Apfel)",)),
            RoleSeed("buffet-salad", 80, enabled=False, recipes=("Peters Weltbester Nudelsalat",)),
        ),
    ),
    TemplateSeed(
        slug="salad-bar",
        name="Salatbuffet",
        meal_types=("lunch",),
        sort_order=51,
        roles=(
            RoleSeed("buffet-salad", 150, recipes=("Peters Weltbester Nudelsalat", "Mediterraner Nudelsalat, vegan")),
            RoleSeed("buffet-fresh", 100, ingredients=("Salatgurke", "Tomate")),
            RoleSeed("buffet-bread", 60, ingredients=("Baguette",)),
            RoleSeed("buffet-cheese", 40, ingredients=("Feta",)),
            RoleSeed("buffet-dip", 30, ingredients=("Hummus",)),
            RoleSeed("buffet-drink", 300, unit="ml", ingredients=("Saft (Apfel)",)),
            RoleSeed("buffet-main", 80, enabled=False),
        ),
    ),
    TemplateSeed(
        slug="vesper",
        name="Brotzeit",
        meal_types=("lunch", "dinner"),
        sort_order=52,
        roles=(
            RoleSeed("buffet-bread", 130, ingredients=("Bauernbrot", "Vollkornbrot geschnitten")),
            RoleSeed("buffet-fat", 10, ingredients=("Deutsche Markenbutter",)),
            RoleSeed("buffet-savory", 60, ingredients=("Gouda", "Salami italienische Art")),
            RoleSeed("buffet-cheese", 40, ingredients=("Gouda",)),
            RoleSeed("buffet-fresh", 100, ingredients=("Salatgurke", "Tomate")),
            RoleSeed("buffet-topping", 20, ingredients=("Gewürzgurke",)),
            RoleSeed("buffet-drink", 250, unit="ml", ingredients=("Saft (Apfel)",)),
            RoleSeed("buffet-sweet", 20, enabled=False),
        ),
    ),
    TemplateSeed(
        slug="pasta-bar",
        name="Pasta-Bar",
        meal_types=("lunch", "dinner"),
        sort_order=53,
        roles=(
            RoleSeed("buffet-carb", 120, ingredients=("Spaghetti",)),
            RoleSeed("buffet-dish", 150, recipes=("Nudeln mit Tomatensoße",)),
            RoleSeed("buffet-topping", 15, ingredients=("Parmigiano Reggiano",)),
            RoleSeed("buffet-fresh", 80, ingredients=("Tomate",)),
            RoleSeed("buffet-drink", 300, unit="ml", ingredients=("Saft (Apfel)",)),
            RoleSeed("buffet-bread", 40, enabled=False, ingredients=("Baguette",)),
        ),
    ),
    TemplateSeed(
        slug="baked-potato",
        name="Kartoffelbuffet",
        meal_types=("lunch", "dinner"),
        sort_order=54,
        roles=(
            RoleSeed("buffet-carb", 250, ingredients=("festkochende Kartoffeln",)),
            RoleSeed("buffet-dip", 60, ingredients=("Hummus",)),
            RoleSeed("buffet-cheese", 30, ingredients=("Gouda",)),
            RoleSeed("buffet-fresh", 100, ingredients=("Salatgurke",)),
            RoleSeed("buffet-drink", 300, unit="ml", ingredients=("Saft (Apfel)",)),
            RoleSeed("buffet-main", 80, enabled=False, ingredients=("Bratwurst (frisch)",)),
        ),
    ),
    TemplateSeed(
        slug="soup-bread",
        name="Suppe & Brot",
        meal_types=("lunch", "dinner"),
        sort_order=55,
        roles=(
            RoleSeed("buffet-soup", 350, unit="ml", recipes=("Linsensuppe",)),
            RoleSeed("buffet-bread", 70, ingredients=("Bauernbrot",)),
            RoleSeed("buffet-topping", 15, ingredients=("Mais (Dose)",)),
            RoleSeed("buffet-drink", 250, unit="ml", ingredients=("Saft (Apfel)",)),
            RoleSeed("buffet-cheese", 30, enabled=False, ingredients=("Gouda",)),
        ),
    ),
    TemplateSeed(
        slug="rice-curry",
        name="Reis- & Curry-Bar",
        meal_types=("lunch", "dinner"),
        sort_order=56,
        roles=(
            RoleSeed("buffet-carb", 120, ingredients=("Basmatireis",)),
            RoleSeed(
                "buffet-dish",
                200,
                recipes=(
                    "Deftiges Kartoffel-Limetten Curry mit Knusper-Kichererbsen",
                    "Kichererbsen Curry mit Walnuss-Hack und Granatapfel",
                ),
            ),
            RoleSeed("buffet-fresh", 80, ingredients=("Tomate",)),
            RoleSeed("buffet-topping", 15, ingredients=("Jalapeños",)),
            RoleSeed("buffet-drink", 300, unit="ml", ingredients=("Saft (Apfel)",)),
        ),
    ),
    TemplateSeed(
        slug="burger-bar",
        name="Burger- & Hotdog-Bar",
        meal_types=("lunch", "dinner"),
        sort_order=57,
        roles=(
            RoleSeed("buffet-bread", 80, ingredients=("Burger Buns",)),
            RoleSeed("buffet-main", 120, recipes=("Vegane Burger-Patties",)),
            RoleSeed("buffet-fresh", 80, ingredients=("Tomate",)),
            RoleSeed("buffet-dip", 30, ingredients=("Hummus",)),
            RoleSeed("buffet-topping", 20, ingredients=("Gewürzgurke",)),
            RoleSeed("buffet-cheese", 20, ingredients=("Gouda",)),
            RoleSeed("buffet-drink", 300, unit="ml", ingredients=("Saft (Apfel)",)),
            RoleSeed("buffet-carb", 150, enabled=False, ingredients=("festkochende Kartoffeln",)),
        ),
    ),
    TemplateSeed(
        slug="grill",
        name="Grillabend",
        meal_types=("dinner",),
        sort_order=58,
        roles=(
            RoleSeed("buffet-main", 200, ingredients=("Bratwurst (frisch)",)),
            RoleSeed("buffet-bread", 60, ingredients=("Bauernbrot",)),
            RoleSeed("buffet-salad", 120, recipes=("Peters Weltbester Nudelsalat",)),
            RoleSeed("buffet-dip", 40, ingredients=("Hummus",)),
            RoleSeed("buffet-fresh", 80, ingredients=("Salatgurke", "Gemüsepaprika rot")),
            RoleSeed("buffet-drink", 400, unit="ml", ingredients=("Saft (Apfel)",)),
            RoleSeed("buffet-carb", 150, enabled=False, ingredients=("festkochende Kartoffeln",)),
        ),
    ),
    TemplateSeed(
        slug="house-trip-juices",
        name="Hausfahrt mit Säften",
        meal_types=("drinks",),
        sort_order=88,
        roles=(
            RoleSeed(
                "buffet-drink",
                300,
                unit="ml",
                ingredients=("Saft (Apfel)", "Saft (Multivitamin)", "Saft (Orange)"),
            ),
        ),
    ),
    TemplateSeed(
        slug="camp-lemon-tea",
        name="Lager mit Zitronentee",
        meal_types=("drinks",),
        sort_order=89,
        roles=(RoleSeed("buffet-drink", 300, unit="ml", recipes=("Ingwertee mit Zitronen",)),),
    ),
    TemplateSeed(
        slug="drinks-bar",
        name="Getränkebuffet",
        meal_types=("drinks", "snack"),
        sort_order=90,
        roles=(RoleSeed("buffet-drink", 300, unit="ml", ingredients=("Saft (Apfel)", "Saft (Orange)")),),
    ),
    TemplateSeed(
        slug="free",
        name="Freies Buffet",
        meal_types=("breakfast", "lunch", "dinner", "snack", "drinks"),
        sort_order=999,
        roles=(
            RoleSeed("buffet-bread", 60, ingredients=("Baguette",)),
            RoleSeed("buffet-fat", 5, enabled=False),
            RoleSeed("buffet-savory", 40, ingredients=("Gouda", "Salami italienische Art")),
            RoleSeed("buffet-sweet", 15, enabled=False),
            RoleSeed("buffet-condiment", 10, enabled=False),
            RoleSeed("buffet-fresh", 80, ingredients=("Salatgurke", "frischer Apfel")),
            RoleSeed("buffet-cereal", 50, enabled=False),
            RoleSeed("buffet-drink", 250, unit="ml", ingredients=("Saft (Apfel)",)),
            RoleSeed("buffet-dish", 100, enabled=False),
            RoleSeed("buffet-cheese", 30, enabled=False),
            RoleSeed("buffet-salty-snack", 30, enabled=False),
            RoleSeed("buffet-sweet-snack", 20, enabled=False),
            RoleSeed("buffet-nuts", 15, enabled=False),
            RoleSeed("buffet-dip", 30, enabled=False),
            RoleSeed("buffet-salad", 80, enabled=False),
            RoleSeed("buffet-carb", 100, enabled=False),
            RoleSeed("buffet-main", 120, enabled=False),
            RoleSeed("buffet-soup", 250, enabled=False, unit="ml"),
            RoleSeed("buffet-topping", 15, enabled=False),
        ),
    ),
)


@dataclass
class SeedReport:
    dry_run: bool = False
    created: list[str] = field(default_factory=list)
    existing: list[str] = field(default_factory=list)
    defaults_added: list[str] = field(default_factory=list)
    missing: list[str] = field(default_factory=list)


def _add_default_items(
    *,
    template_name: str,
    role_seed: RoleSeed,
    template_role: Any,
    ingredient_model: Any,
    recipe_model: Any,
    report: SeedReport,
) -> None:
    ingredients = [
        ingredient_model.objects.filter(name=name, owner__isnull=True).order_by("id").first()
        for name in role_seed.ingredients
    ]
    recipes = [
        recipe_model.objects.filter(title=title, owner__isnull=True).order_by("id").first()
        for title in role_seed.recipes
    ]
    missing_items = [
        f"{template_name}: Zutat „{name}“ nicht gefunden"
        for name, ingredient in zip(role_seed.ingredients, ingredients, strict=True)
        if ingredient is None
    ]
    missing_items.extend(
        f"{template_name}: Rezept „{title}“ nicht gefunden"
        for title, recipe in zip(role_seed.recipes, recipes, strict=True)
        if recipe is None
    )
    if missing_items:
        report.missing.extend(missing_items)
        return

    for name, ingredient in zip(role_seed.ingredients, ingredients, strict=True):
        if ingredient is not None:
            template_role.default_ingredients.add(ingredient)
            report.defaults_added.append(f"{template_name} / {role_seed.role}: {name}")
    for title, recipe in zip(role_seed.recipes, recipes, strict=True):
        if recipe is not None:
            template_role.default_recipes.add(recipe)
            report.defaults_added.append(f"{template_name} / {role_seed.role}: {title}")


def seed_buffet_templates(
    seeds: tuple[TemplateSeed, ...] = BUFFET_TEMPLATE_SEEDS,
    *,
    dry_run: bool = False,
    fill_missing_defaults: bool = False,
) -> SeedReport:
    from content.models import Tag
    from planner.models import BuffetTemplate, BuffetTemplateRole
    from recipe.models import Recipe
    from supply.models import Ingredient

    report = SeedReport(dry_run=dry_run)
    roles = {tag.slug: tag for tag in Tag.objects.filter(slug__in=BUFFET_ROLE_SLUGS)}
    with transaction.atomic():
        for seed in seeds:
            existing_template = (
                BuffetTemplate.objects.filter(slug=seed.slug)
                .prefetch_related("roles__role", "roles__default_ingredients", "roles__default_recipes")
                .first()
            )
            if existing_template is not None:
                report.existing.append(seed.name)
                if fill_missing_defaults:
                    role_configs = {role.role.slug: role for role in existing_template.roles.all()}
                    for role_seed in seed.roles:
                        template_role = role_configs.get(role_seed.role)
                        if template_role is None:
                            report.missing.append(f"{seed.name}: vorhandene Vorlage ohne Rolle {role_seed.role}")
                            continue
                        if template_role.default_ingredients.exists() or template_role.default_recipes.exists():
                            continue
                        _add_default_items(
                            template_name=seed.name,
                            role_seed=role_seed,
                            template_role=template_role,
                            ingredient_model=Ingredient,
                            recipe_model=Recipe,
                            report=report,
                        )
                continue
            template = BuffetTemplate.objects.create(
                slug=seed.slug,
                name=seed.name,
                description=seed.description,
                meal_types=list(seed.meal_types),
                sort_order=seed.sort_order,
            )
            for role_seed in seed.roles:
                tag = roles.get(role_seed.role)
                if tag is None:
                    report.missing.append(f"{seed.name}: Rolle {role_seed.role} fehlt")
                    continue
                template_role = BuffetTemplateRole.objects.create(
                    template=template,
                    role=tag,
                    amount_per_person=role_seed.amount,
                    unit=role_seed.unit,
                    enabled_by_default=role_seed.enabled,
                    sort_order=BUFFET_ROLE_SLUGS.index(role_seed.role),
                )
                _add_default_items(
                    template_name=seed.name,
                    role_seed=role_seed,
                    template_role=template_role,
                    ingredient_model=Ingredient,
                    recipe_model=Recipe,
                    report=report,
                )
            report.created.append(seed.name)
        if dry_run:
            transaction.set_rollback(True)
    return report
