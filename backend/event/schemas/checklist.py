"""Pydantic schemas for event publish readiness checklist."""

from ninja import Schema


class ChecklistItemOut(Schema):
    key: str
    label: str
    is_met: bool
    link: str = ""


class ChecklistOut(Schema):
    items: list[ChecklistItemOut]
    all_met: bool = False

    @staticmethod
    def resolve_all_met(obj) -> bool:
        return all(item["is_met"] for item in obj["items"])
