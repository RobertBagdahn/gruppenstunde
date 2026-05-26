"""Recipe folder CRUD API."""

from ninja import Router
from ninja.errors import HttpError
from pydantic import BaseModel

from recipe.models import RecipeFolder

folder_router = Router(tags=["recipe-folders"])


class RecipeFolderOut(BaseModel):
    id: int
    name: str
    parent_id: int | None = None
    sort_order: int
    recipe_count: int = 0

    class Config:
        from_attributes = True


class RecipeFolderCreateIn(BaseModel):
    name: str
    parent_id: int | None = None
    sort_order: int = 0


class RecipeFolderUpdateIn(BaseModel):
    name: str | None = None
    parent_id: int | None = None
    sort_order: int | None = None


def _require_auth(request):
    if not request.user.is_authenticated:
        raise HttpError(403, "Anmeldung erforderlich")


@folder_router.get("/", response=list[RecipeFolderOut])
def list_folders(request):
    """List all recipe folders for the current user."""
    _require_auth(request)
    folders = RecipeFolder.objects.filter(owner=request.user)
    return [
        RecipeFolderOut(
            id=f.id,
            name=f.name,
            parent_id=f.parent_id,
            sort_order=f.sort_order,
            recipe_count=f.recipes.count(),
        )
        for f in folders
    ]


@folder_router.post("/", response=RecipeFolderOut)
def create_folder(request, payload: RecipeFolderCreateIn):
    """Create a new recipe folder."""
    _require_auth(request)

    # Max 2 levels deep
    if payload.parent_id:
        parent = RecipeFolder.objects.filter(id=payload.parent_id, owner=request.user).first()
        if not parent:
            raise HttpError(404, "Überordner nicht gefunden")
        if parent.parent_id:
            raise HttpError(422, "Maximal 2 Ebenen erlaubt")

    folder = RecipeFolder.objects.create(
        name=payload.name,
        owner=request.user,
        parent_id=payload.parent_id,
        sort_order=payload.sort_order,
    )
    return RecipeFolderOut(
        id=folder.id,
        name=folder.name,
        parent_id=folder.parent_id,
        sort_order=folder.sort_order,
        recipe_count=0,
    )


@folder_router.patch("/{folder_id}/", response=RecipeFolderOut)
def update_folder(request, folder_id: int, payload: RecipeFolderUpdateIn):
    """Update a recipe folder."""
    _require_auth(request)
    folder = RecipeFolder.objects.filter(id=folder_id, owner=request.user).first()
    if not folder:
        raise HttpError(404, "Ordner nicht gefunden")

    if payload.name is not None:
        folder.name = payload.name
    if payload.sort_order is not None:
        folder.sort_order = payload.sort_order
    if payload.parent_id is not None:
        if payload.parent_id == folder.id:
            raise HttpError(422, "Ordner kann nicht sein eigener Unterordner sein")
        folder.parent_id = payload.parent_id

    folder.save()
    return RecipeFolderOut(
        id=folder.id,
        name=folder.name,
        parent_id=folder.parent_id,
        sort_order=folder.sort_order,
        recipe_count=folder.recipes.count(),
    )


@folder_router.delete("/{folder_id}/")
def delete_folder(request, folder_id: int):
    """Delete a recipe folder. Recipes in it become unfoldered."""
    _require_auth(request)
    deleted, _ = RecipeFolder.objects.filter(id=folder_id, owner=request.user).delete()
    if not deleted:
        raise HttpError(404, "Ordner nicht gefunden")
    return {"success": True}
