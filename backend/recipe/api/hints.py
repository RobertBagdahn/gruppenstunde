"""Staff-only CRUD API for RecipeHint rules."""

from ninja import Router, Schema
from ninja.errors import HttpError

from recipe.models import RecipeHint
from recipe.schemas.nutrition import RecipeHintOut

router = Router(tags=["recipe-hints"])


class RecipeHintCreateIn(Schema):
    name: str
    description: str = ""
    improvement_text: str = ""
    hint: str
    parameter: str
    value: float
    min_max: str
    hint_level: str
    recipe_type: str
    recipe_objective: str


class RecipeHintUpdateIn(Schema):
    name: str | None = None
    description: str | None = None
    improvement_text: str | None = None
    hint: str | None = None
    parameter: str | None = None
    value: float | None = None
    min_max: str | None = None
    hint_level: str | None = None
    recipe_type: str | None = None
    recipe_objective: str | None = None


class PaginatedRecipeHints(Schema):
    items: list[RecipeHintOut]
    total: int
    page: int
    page_size: int
    total_pages: int


def _require_staff(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        raise HttpError(403, "Nur Admins")


@router.get("/", response=PaginatedRecipeHints)
def list_recipe_hints(request, page: int = 1, page_size: int = 20, parameter: str = "", hint_level: str = "", recipe_type: str = "", recipe_objective: str = ""):
    _require_staff(request)
    qs = RecipeHint.objects.all()
    if parameter:
        qs = qs.filter(parameter=parameter)
    if hint_level:
        qs = qs.filter(hint_level=hint_level)
    if recipe_type:
        qs = qs.filter(recipe_type=recipe_type)
    if recipe_objective:
        qs = qs.filter(recipe_objective=recipe_objective)

    total = qs.count()
    total_pages = (total + page_size - 1) // page_size
    offset = (page - 1) * page_size
    items = list(qs[offset : offset + page_size])
    return PaginatedRecipeHints(
        items=[RecipeHintOut.from_orm(h) for h in items],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=total_pages,
    )


@router.get("/{hint_id}/", response=RecipeHintOut)
def get_recipe_hint(request, hint_id: int):
    _require_staff(request)
    try:
        return RecipeHint.objects.get(id=hint_id)
    except RecipeHint.DoesNotExist:
        raise HttpError(404, "Nicht gefunden")


@router.post("/", response={201: RecipeHintOut})
def create_recipe_hint(request, payload: RecipeHintCreateIn):
    _require_staff(request)
    hint = RecipeHint.objects.create(**payload.dict())
    return 201, hint


@router.patch("/{hint_id}/", response=RecipeHintOut)
def update_recipe_hint(request, hint_id: int, payload: RecipeHintUpdateIn):
    _require_staff(request)
    try:
        hint = RecipeHint.objects.get(id=hint_id)
    except RecipeHint.DoesNotExist:
        raise HttpError(404, "Nicht gefunden")

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(hint, field, value)
    hint.save()
    return hint


@router.delete("/{hint_id}/", response={204: None})
def delete_recipe_hint(request, hint_id: int):
    _require_staff(request)
    try:
        hint = RecipeHint.objects.get(id=hint_id)
    except RecipeHint.DoesNotExist:
        raise HttpError(404, "Nicht gefunden")
    hint.delete()
    return 204, None
