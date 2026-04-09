"""Pydantic schemas for CustomField and CustomFieldValue (Django Ninja)."""

from datetime import datetime

from ninja import Schema


class CustomFieldOut(Schema):
    id: int
    event_id: int
    label: str
    field_type: str
    field_type_display: str = ""
    options: list[str] | None = None
    is_required: bool
    sort_order: int
    created_at: datetime

    @staticmethod
    def resolve_field_type_display(obj) -> str:
        return obj.get_field_type_display()


class CustomFieldCreateIn(Schema):
    label: str
    field_type: str
    options: list[str] | None = None
    is_required: bool = False
    sort_order: int = 0


class CustomFieldUpdateIn(Schema):
    label: str | None = None
    field_type: str | None = None
    options: list[str] | None = None
    is_required: bool | None = None
    sort_order: int | None = None


class CustomFieldValueOut(Schema):
    custom_field_id: int
    custom_field_label: str = ""
    value: str

    @staticmethod
    def resolve_custom_field_label(obj) -> str:
        return obj.custom_field.label


class CustomFieldValuesIn(Schema):
    """Set multiple custom field values at once for a participant."""

    values: list["CustomFieldValueSetIn"]


class CustomFieldValueSetIn(Schema):
    custom_field_id: int
    value: str
