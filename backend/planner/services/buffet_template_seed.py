"""Default buffet templates (spec ``buffet-templates``).

Existing templates are never touched, so staff changes survive a re-run.
Default selections are resolved by the exact name of system entries.
"""

from __future__ import annotations

from dataclasses import dataclass, field

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
            RoleSeed("buffet-fresh", 150),
            RoleSeed("buffet-dip", 40),
            RoleSeed("buffet-cheese", 30),
            RoleSeed("buffet-salty-snack", 25),
            RoleSeed("buffet-drink", 250, unit="ml"),
            RoleSeed("buffet-nuts", 20, enabled=False),
            RoleSeed("buffet-bread", 40, enabled=False),
        ),
    ),
    TemplateSeed(
        slug="cheese-platter",
        name="Käseplatte",
        meal_types=("snack",),
        sort_order=41,
        roles=(
            RoleSeed("buffet-cheese", 80),
            RoleSeed("buffet-bread", 50),
            RoleSeed("buffet-fresh", 80),
            RoleSeed("buffet-nuts", 20),
            RoleSeed("buffet-dip", 20),
            RoleSeed("buffet-drink", 250, unit="ml"),
            RoleSeed("buffet-sweet", 15, enabled=False),
        ),
    ),
    TemplateSeed(
        slug="salty-snacks",
        name="Salzgebäck & Chips",
        meal_types=("snack",),
        sort_order=42,
        roles=(
            RoleSeed("buffet-salty-snack", 60),
            RoleSeed("buffet-dip", 40),
            RoleSeed("buffet-fresh", 80),
            RoleSeed("buffet-drink", 300, unit="ml"),
            RoleSeed("buffet-nuts", 25, enabled=False),
        ),
    ),
    TemplateSeed(
        slug="nachos",
        name="Nachos mit Soßen",
        meal_types=("snack",),
        sort_order=43,
        roles=(
            RoleSeed("buffet-salty-snack", 60),
            RoleSeed("buffet-cheese", 40),
            RoleSeed("buffet-dip", 60),
            RoleSeed("buffet-topping", 25),
            RoleSeed("buffet-drink", 300, unit="ml"),
            RoleSeed("buffet-fresh", 50, enabled=False),
        ),
    ),
    TemplateSeed(
        slug="sweet-buffet",
        name="Süßes Buffet",
        meal_types=("snack",),
        sort_order=44,
        roles=(
            RoleSeed("buffet-sweet-snack", 50),
            RoleSeed("buffet-fresh", 100),
            RoleSeed("buffet-drink", 250, unit="ml"),
            RoleSeed("buffet-nuts", 20, enabled=False),
            RoleSeed("buffet-cereal", 80, enabled=False),
        ),
    ),
    TemplateSeed(
        slug="fruit-nuts",
        name="Obst & Nüsse",
        meal_types=("snack",),
        sort_order=45,
        roles=(
            RoleSeed("buffet-fresh", 150),
            RoleSeed("buffet-nuts", 30),
            RoleSeed("buffet-cereal", 100),
            RoleSeed("buffet-drink", 250, unit="ml"),
            RoleSeed("buffet-sweet-snack", 20, enabled=False),
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
            RoleSeed("buffet-bread", 120),
            RoleSeed("buffet-savory", 70),
            RoleSeed("buffet-fresh", 100),
            RoleSeed("buffet-dip", 40),
            RoleSeed("buffet-cheese", 30),
            RoleSeed("buffet-drink", 300, unit="ml"),
            RoleSeed("buffet-salad", 80, enabled=False),
        ),
    ),
    TemplateSeed(
        slug="salad-bar",
        name="Salatbuffet",
        meal_types=("lunch",),
        sort_order=51,
        roles=(
            RoleSeed("buffet-salad", 150),
            RoleSeed("buffet-fresh", 100),
            RoleSeed("buffet-bread", 60),
            RoleSeed("buffet-cheese", 40),
            RoleSeed("buffet-dip", 30),
            RoleSeed("buffet-drink", 300, unit="ml"),
            RoleSeed("buffet-main", 80, enabled=False),
        ),
    ),
    TemplateSeed(
        slug="vesper",
        name="Brotzeit",
        meal_types=("lunch", "dinner"),
        sort_order=52,
        roles=(
            RoleSeed("buffet-bread", 130),
            RoleSeed("buffet-fat", 10),
            RoleSeed("buffet-savory", 60),
            RoleSeed("buffet-cheese", 40),
            RoleSeed("buffet-fresh", 100),
            RoleSeed("buffet-topping", 20),
            RoleSeed("buffet-drink", 250, unit="ml"),
            RoleSeed("buffet-sweet", 20, enabled=False),
        ),
    ),
    TemplateSeed(
        slug="pasta-bar",
        name="Pasta-Bar",
        meal_types=("lunch", "dinner"),
        sort_order=53,
        roles=(
            RoleSeed("buffet-carb", 120),
            RoleSeed("buffet-dish", 150),
            RoleSeed("buffet-topping", 15),
            RoleSeed("buffet-fresh", 80),
            RoleSeed("buffet-drink", 300, unit="ml"),
            RoleSeed("buffet-bread", 40, enabled=False),
        ),
    ),
    TemplateSeed(
        slug="baked-potato",
        name="Kartoffelbuffet",
        meal_types=("lunch", "dinner"),
        sort_order=54,
        roles=(
            RoleSeed("buffet-carb", 250),
            RoleSeed("buffet-dip", 60),
            RoleSeed("buffet-cheese", 30),
            RoleSeed("buffet-fresh", 100),
            RoleSeed("buffet-drink", 300, unit="ml"),
            RoleSeed("buffet-main", 80, enabled=False),
        ),
    ),
    TemplateSeed(
        slug="soup-bread",
        name="Suppe & Brot",
        meal_types=("lunch", "dinner"),
        sort_order=55,
        roles=(
            RoleSeed("buffet-soup", 350, unit="ml"),
            RoleSeed("buffet-bread", 70),
            RoleSeed("buffet-topping", 15),
            RoleSeed("buffet-drink", 250, unit="ml"),
            RoleSeed("buffet-cheese", 30, enabled=False),
        ),
    ),
    TemplateSeed(
        slug="rice-curry",
        name="Reis- & Curry-Bar",
        meal_types=("lunch", "dinner"),
        sort_order=56,
        roles=(
            RoleSeed("buffet-carb", 120),
            RoleSeed("buffet-dish", 200),
            RoleSeed("buffet-fresh", 80),
            RoleSeed("buffet-topping", 15),
            RoleSeed("buffet-drink", 300, unit="ml"),
        ),
    ),
    TemplateSeed(
        slug="burger-bar",
        name="Burger- & Hotdog-Bar",
        meal_types=("lunch", "dinner"),
        sort_order=57,
        roles=(
            RoleSeed("buffet-bread", 80),
            RoleSeed("buffet-main", 120),
            RoleSeed("buffet-fresh", 80),
            RoleSeed("buffet-dip", 30),
            RoleSeed("buffet-topping", 20),
            RoleSeed("buffet-cheese", 20),
            RoleSeed("buffet-drink", 300, unit="ml"),
            RoleSeed("buffet-carb", 150, enabled=False),
        ),
    ),
    TemplateSeed(
        slug="grill",
        name="Grillabend",
        meal_types=("dinner",),
        sort_order=58,
        roles=(
            RoleSeed("buffet-main", 200),
            RoleSeed("buffet-bread", 60),
            RoleSeed("buffet-salad", 120),
            RoleSeed("buffet-dip", 40),
            RoleSeed("buffet-fresh", 80),
            RoleSeed("buffet-drink", 400, unit="ml"),
            RoleSeed("buffet-carb", 150, enabled=False),
        ),
    ),
    TemplateSeed(
        slug="drinks-bar",
        name="Getränkebuffet",
        meal_types=("drinks", "snack"),
        sort_order=90,
        roles=(RoleSeed("buffet-drink", 300, unit="ml"),),
    ),
    TemplateSeed(
        slug="free",
        name="Freies Buffet",
        meal_types=("breakfast", "lunch", "dinner", "snack", "drinks"),
        sort_order=999,
        roles=(
            RoleSeed("buffet-bread", 60),
            RoleSeed("buffet-fat", 5, enabled=False),
            RoleSeed("buffet-savory", 40),
            RoleSeed("buffet-sweet", 15, enabled=False),
            RoleSeed("buffet-condiment", 10, enabled=False),
            RoleSeed("buffet-fresh", 80),
            RoleSeed("buffet-cereal", 50, enabled=False),
            RoleSeed("buffet-drink", 250, unit="ml"),
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
    missing: list[str] = field(default_factory=list)


def seed_buffet_templates(
    seeds: tuple[TemplateSeed, ...] = BUFFET_TEMPLATE_SEEDS,
    *,
    dry_run: bool = False,
) -> SeedReport:
    from content.models import Tag
    from planner.models import BuffetTemplate, BuffetTemplateRole
    from recipe.models import Recipe
    from supply.models import Ingredient

    report = SeedReport(dry_run=dry_run)
    roles = {tag.slug: tag for tag in Tag.objects.filter(slug__in=BUFFET_ROLE_SLUGS)}
    with transaction.atomic():
        for seed in seeds:
            if BuffetTemplate.objects.filter(slug=seed.slug).exists():
                report.existing.append(seed.name)
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
                for name in role_seed.ingredients:
                    ingredient = Ingredient.objects.filter(name=name, owner__isnull=True).order_by("id").first()
                    if ingredient is None:
                        report.missing.append(f"{seed.name}: Zutat „{name}“ nicht gefunden")
                    else:
                        template_role.default_ingredients.add(ingredient)
                for title in role_seed.recipes:
                    recipe = Recipe.objects.filter(title=title, owner__isnull=True).order_by("id").first()
                    if recipe is None:
                        report.missing.append(f"{seed.name}: Rezept „{title}“ nicht gefunden")
                    else:
                        template_role.default_recipes.add(recipe)
            report.created.append(seed.name)
        if dry_run:
            transaction.set_rollback(True)
    return report
