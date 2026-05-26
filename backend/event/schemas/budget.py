"""Pydantic schemas for BudgetItem model."""

from datetime import datetime
from decimal import Decimal

from ninja import Schema


class BudgetItemOut(Schema):
    id: int
    event_id: int
    description: str
    amount: Decimal
    category: str
    is_expense: bool
    created_by_id: int | None = None
    created_at: datetime


class BudgetItemCreateIn(Schema):
    description: str
    amount: Decimal
    category: str = "other"
    is_expense: bool = True


class BudgetItemUpdateIn(Schema):
    description: str | None = None
    amount: Decimal | None = None
    category: str | None = None
    is_expense: bool | None = None


class BudgetSummaryOut(Schema):
    total_income: Decimal = Decimal("0.00")
    expected_income: Decimal = Decimal("0.00")
    total_expenses: Decimal = Decimal("0.00")
    balance: Decimal = Decimal("0.00")
    items: list[BudgetItemOut] = []
