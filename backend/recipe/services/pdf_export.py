"""PDF export service for Recipe using WeasyPrint."""

from dataclasses import dataclass, field
from typing import cast

from django.template.loader import render_to_string
from weasyprint import HTML

from content.choices import DifficultyChoices, PreparationTimeChoices
from recipe.models import Recipe
from recipe.services.step_helpers import resolve_recipe_steps
from supply.choices import RecipeTypeChoices
from supply.utils import build_portion_display, format_weight

PREPARATION_TIME_MINUTES: dict[str, int] = {
    PreparationTimeChoices.NONE: 0,
    PreparationTimeChoices.LESS_15: 15,
    PreparationTimeChoices.BETWEEN_15_30: 30,
    PreparationTimeChoices.BETWEEN_30_60: 60,
    PreparationTimeChoices.MORE_60: 90,
}


def _format_decimal(value: float, digits: int = 1) -> str:
    """Format a decimal number with German locale."""
    try:
        from babel.numbers import format_decimal

        return format_decimal(value, format=f"#,##0.{'0' * digits}", locale="de_DE")
    except ImportError:
        return f"{value:.{digits}f}".replace(".", ",")


def _extract_plain_text(markdown_text: str) -> str:
    """Extract plain text from markdown, stripping markdown syntax."""
    if not markdown_text:
        return ""
    import re

    text = re.sub(r"<[^>]+>", "", markdown_text)
    text = re.sub(r"#{1,6}\s*", "", text)
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)
    text = re.sub(r"\*(.+?)\*", r"\1", text)
    text = re.sub(r"\[([^\]]+)\]\([^)]+\)", r"\1", text)
    text = re.sub(r"`([^`]+)`", r"\1", text)
    return text.strip()


def _get_allergens(recipe) -> list[str]:
    """Extract allergen names from recipe's nutritional tags."""
    allergens = set()
    for ri in recipe.recipe_items.select_related("portion__ingredient").all():
        if ri.portion and ri.portion.ingredient:
            for tag in ri.portion.ingredient.nutritional_tags.filter(is_dangerous=True):
                allergens.add(tag.name)
    return sorted(allergens)


def _parse_markdown_steps(markdown_text: str | None) -> list[str]:
    """Parse markdown text into steps (numbered or bullet list items)."""
    if not markdown_text:
        return []
    lines = markdown_text.strip().split("\n")
    steps = []
    for line in lines:
        line = line.strip()
        if not line:
            continue
        match = __import__("re").match(r"^\d+[.)]\s*(.+)$", line)
        if match:
            steps.append(match.group(1).strip())
        elif line.startswith("- ") or line.startswith("* "):
            steps.append(line[2:].strip())
        else:
            steps.append(line)
    return steps


def _get_recipe_materials(recipe: Recipe) -> list[dict[str, str]]:
    """Collect recipe material links (consumables/helpers, separate from equipment)."""
    from django.contrib.contenttypes.models import ContentType

    from supply.models import ContentMaterialItem

    ct = ContentType.objects.get_for_model(Recipe, for_concrete_model=False)
    return [
        {"name": item.material.name, "quantity": item.quantity}
        for item in ContentMaterialItem.objects.filter(content_type=ct, object_id=recipe.pk)
        .select_related("material")
        .order_by("sort_order")
    ]


def _format_step_ingredient(si: dict) -> str:
    """Format a resolved step ingredient as '500 g Mehl' plus note."""
    quantity = float(si["quantity"])
    if quantity == int(quantity):
        qty_str = str(int(quantity))
    else:
        qty_str = _format_decimal(quantity, 1)
    parts = [f"{qty_str} {si['unit']}".strip(), si["name"]]
    label = " ".join(part for part in parts if part)
    if si.get("note"):
        label += f", {si['note']}"
    return label


@dataclass
class RecipePdfExport:
    """Request-scoped view model for the recipe PDF template.

    All ingredient quantities, step placeholders and nutrition values are
    pre-scaled to the requested target serving count. The stored recipe
    (including its normalized portion) is never modified.
    """

    recipe: Recipe
    servings: int = 1
    page_format: str = "A4"
    image_path: str | None = None
    description_plain: str = ""
    ingredients: list[dict] = field(default_factory=list)
    materials: list[dict] = field(default_factory=list)
    steps: list[dict] = field(default_factory=list)
    nutrition: dict = field(default_factory=dict)
    allergens: list[str] = field(default_factory=list)
    recipe_type_label: str = ""
    difficulty_label: str = ""
    preparation_time_min: int | None = None

    @classmethod
    def build(cls, recipe: Recipe, servings: int = 1, page_format: str = "A4") -> "RecipePdfExport":
        """Build the export view model for a recipe without any persistence."""
        export = cls(recipe=recipe, servings=max(int(servings), 1), page_format=page_format)
        export._build_image()
        export._build_description()
        export._build_ingredients()
        export._build_materials()
        export._build_steps()
        export._build_nutrition()
        export._build_allergens()
        export._build_metadata()
        return export

    @property
    def scale(self) -> float:
        """Factor from stored (normalized) quantities to the target servings."""
        recipe_servings = max(self.recipe.portions or 1, 1)
        return self.servings / recipe_servings

    def _build_image(self) -> None:
        if self.recipe.image:
            self.image_path = self.recipe.image.path if hasattr(self.recipe.image, "path") else None

    def _build_description(self) -> None:
        self.description_plain = _extract_plain_text(self.recipe.description or "")

    def _build_ingredients(self) -> None:
        rows = []
        for ri in self.recipe.recipe_items.select_related("portion__ingredient", "portion__measuring_unit").order_by(
            "sort_order"
        ):
            note = ri.note or ""
            if ri.portion is None:
                # Direct gram item: quantity is stored in grams.
                rows.append({"display": format_weight(float(ri.quantity) * self.scale), "note": note})
                continue
            ingredient = ri.portion.ingredient
            if ingredient is None:
                continue
            display, _ = build_portion_display(float(ri.quantity) * self.scale, ri.portion, ingredient)
            rows.append({"display": display, "note": note})
        self.ingredients = rows

    def _build_materials(self) -> None:
        self.materials = _get_recipe_materials(self.recipe)

    def _build_steps(self) -> None:
        resolved = resolve_recipe_steps(self.recipe, scale=self.scale)
        if resolved is not None:
            steps = resolved
        else:
            steps_md = self.recipe.description or ""
            steps = [
                {
                    "number": idx,
                    "instruction": text,
                    "duration_minutes": None,
                    "section": "",
                    "step_ingredients": [],
                }
                for idx, text in enumerate(_parse_markdown_steps(steps_md), 1)
            ]
        for step in steps:
            step["ingredient_labels"] = [_format_step_ingredient(si) for si in step.get("step_ingredients", [])]
        self.steps = steps

    def _build_nutrition(self) -> None:
        servings = max(self.servings, 1)
        weight_g = self.recipe.cached_weight_g
        if weight_g:
            factor = (float(weight_g) / 100.0) / servings
        else:
            factor = 1.0 / servings

        def per_portion(per100: float | None, digits: int) -> str | None:
            if per100 is None:
                return None
            return _format_decimal(float(per100) * factor, digits)

        total_energy = self.recipe.cached_energy_total_kcal
        if total_energy is not None:
            energy_per_portion = float(total_energy) / servings
        else:
            energy_per_portion = float(self.recipe.cached_energy_kcal or 0) * factor

        self.nutrition = {
            "energy_kcal_per100": _format_decimal(self.recipe.cached_energy_kcal or 0, 0),
            "energy_kcal_per_portion": _format_decimal(energy_per_portion, 0),
            "protein_per100": _format_decimal(self.recipe.cached_protein_g or 0, 1),
            "protein_per_portion": per_portion(self.recipe.cached_protein_g, 1),
            "fat_per100": _format_decimal(self.recipe.cached_fat_g or 0, 1),
            "fat_per_portion": per_portion(self.recipe.cached_fat_g, 1),
            "carbs_per100": _format_decimal(self.recipe.cached_carbohydrate_g or 0, 1),
            "carbs_per_portion": per_portion(self.recipe.cached_carbohydrate_g, 1),
            "sugar_per100": (
                _format_decimal(self.recipe.cached_sugar_g or 0, 1) if self.recipe.cached_sugar_g is not None else None
            ),
            "sugar_per_portion": per_portion(self.recipe.cached_sugar_g, 1),
            "fibre_per100": (
                _format_decimal(self.recipe.cached_fibre_g or 0, 1) if self.recipe.cached_fibre_g is not None else None
            ),
            "fibre_per_portion": per_portion(self.recipe.cached_fibre_g, 1),
            "salt_per100": (
                _format_decimal(self.recipe.cached_salt_g or 0, 2) if self.recipe.cached_salt_g is not None else None
            ),
            "salt_per_portion": per_portion(self.recipe.cached_salt_g, 2),
        }

    def _build_allergens(self) -> None:
        self.allergens = _get_allergens(self.recipe)

    def _build_metadata(self) -> None:
        self.recipe_type_label = (
            dict(RecipeTypeChoices.choices).get(self.recipe.recipe_type, "") if self.recipe.recipe_type else ""
        )
        self.difficulty_label = (
            dict(DifficultyChoices.choices).get(self.recipe.difficulty, "") if self.recipe.difficulty else ""
        )
        minutes = PREPARATION_TIME_MINUTES.get(self.recipe.preparation_time or "", 0)
        self.preparation_time_min = minutes or None

    def render_html(self) -> str:
        """Render the PDF template with only this view model in the context."""
        context = {
            "title": self.recipe.title,
            "slug": self.recipe.slug,
            "servings": self.servings,
            "page_format": self.page_format,
            "image_path": self.image_path,
            "description": self.description_plain,
            "ingredients": self.ingredients,
            "materials": self.materials,
            "steps": self.steps,
            "nutrition": self.nutrition,
            "allergens": self.allergens,
            "recipe_type_label": self.recipe_type_label,
            "difficulty_label": self.difficulty_label,
            "preparation_time_min": self.preparation_time_min,
        }
        return render_to_string("recipe/recipe_pdf.html", context)

    def render_pdf(self) -> bytes:
        """Render the HTML to PDF bytes via WeasyPrint."""
        return cast(bytes, HTML(string=self.render_html()).write_pdf())


def generate_recipe_pdf(recipe: Recipe, page_format: str = "A4", servings: int = 1) -> bytes:
    """Generate a PDF for a recipe with ingredients, steps, nutrition and allergens.

    ``servings`` is the temporary target serving count for this export only;
    the stored recipe stays untouched.
    """
    export = RecipePdfExport.build(recipe, servings=servings, page_format=page_format)
    return export.render_pdf()
