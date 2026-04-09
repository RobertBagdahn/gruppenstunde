"""Export schemas for event participant export configuration."""

from pydantic import BaseModel


class ExportColumnOut(BaseModel):
    """A single available export column."""

    id: str
    label: str
    type: str  # "standard", "computed", "custom_field"


class ExportFilterIn(BaseModel):
    """Optional filters for the export."""

    is_paid: bool | None = None
    booking_option_id: int | None = None
    label_id: int | None = None


class ExportConfigIn(BaseModel):
    """Export configuration: format, columns, filters."""

    format: str  # "excel", "csv", "pdf"
    columns: list[str]  # column IDs or ["all"]
    filters: ExportFilterIn | None = None
