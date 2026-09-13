"""Pydantic schemas for Payment (Django Ninja)."""

from datetime import datetime
from decimal import Decimal
from typing import cast

from ninja import Schema


class PaymentOut(Schema):
    id: int
    participant_id: int
    participant_name: str = ""
    amount: Decimal
    method: str
    method_display: str = ""
    received_at: datetime
    location: str
    note: str
    created_by_id: int | None
    created_by_email: str = ""
    created_at: datetime

    @staticmethod
    def resolve_participant_name(obj) -> str:
        return cast(str, f"{obj.participant.first_name} {obj.participant.last_name}")

    @staticmethod
    def resolve_method_display(obj) -> str:
        return cast(str, obj.get_method_display())

    @staticmethod
    def resolve_created_by_email(obj) -> str:
        if obj.created_by:
            return cast(str, obj.created_by.email)
        return ""


class PaymentCreateIn(Schema):
    participant_id: int
    amount: Decimal
    method: str
    received_at: datetime
    location: str = ""
    note: str = ""
