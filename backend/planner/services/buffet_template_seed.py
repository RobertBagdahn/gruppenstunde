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
)


@dataclass
class SeedReport:
    created: list[str] = field(default_factory=list)
    existing: list[str] = field(default_factory=list)
    missing: list[str] = field(default_factory=list)


def seed_buffet_templates(seeds: tuple[TemplateSeed, ...] = BUFFET_TEMPLATE_SEEDS) -> SeedReport:
    from content.models import Tag
    from planner.models import BuffetTemplate, BuffetTemplateRole
    from recipe.models import Recipe
    from supply.models import Ingredient

    report = SeedReport()
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
    return report
