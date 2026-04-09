"""Retail section endpoints."""

from ninja import Router

from supply.models import RetailSection
from supply.schemas import RetailSectionOut

retail_section_router = Router(tags=["retail-sections"])


@retail_section_router.get("/", response=list[RetailSectionOut])
def list_retail_sections(request):
    """List all retail sections ordered by rank."""
    return RetailSection.objects.all()
