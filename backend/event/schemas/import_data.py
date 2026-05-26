"""Pydantic schemas for participant import."""

from ninja import Schema


class ImportColumnMapping(Schema):
    source_column: str
    target_field: str


class ImportRowPreview(Schema):
    row_number: int
    data: dict[str, str]
    errors: list[str] = []
    is_valid: bool = True


class ImportPreviewOut(Schema):
    total_rows: int
    valid_rows: int
    invalid_rows: int
    columns: list[str]
    suggested_mappings: list[ImportColumnMapping] = []
    preview_rows: list[ImportRowPreview] = []


class ImportResultOut(Schema):
    total_processed: int
    success_count: int
    error_count: int
    errors: list[str] = []
