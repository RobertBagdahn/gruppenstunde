"""DGE reference values API endpoint — reads from the DgeReference model."""

from ninja import Router

from supply.models import DgeReference
from supply.schemas.reference import DgeReferenceOut

dge_reference_router = Router(tags=["dge-references"])


@dge_reference_router.get("/", response=list[DgeReferenceOut])
def list_dge_references(request):
    """Return all DGE reference value entries."""
    return list(DgeReference.objects.all())
