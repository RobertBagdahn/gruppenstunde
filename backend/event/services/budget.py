"""Budget service — compute income/expenses summary."""

from decimal import Decimal

from event.models import BudgetItem, Event, Participant


class BudgetService:
    """Computes budget summaries for events."""

    @classmethod
    def compute_summary(cls, event: Event) -> dict:
        """Compute budget summary including registration income."""
        items = list(BudgetItem.objects.filter(event=event))

        total_expenses = sum(item.amount for item in items if item.is_expense)
        total_budget_income = sum(item.amount for item in items if not item.is_expense)

        # Expected income from registrations
        expected_income = cls._compute_expected_income(event)

        total_income = total_budget_income + expected_income
        balance = total_income - total_expenses

        return {
            "total_income": total_income,
            "expected_income": expected_income,
            "total_expenses": total_expenses,
            "balance": balance,
            "items": items,
        }

    @classmethod
    def _compute_expected_income(cls, event: Event) -> Decimal:
        """Compute expected income from participant booking options."""
        participants = Participant.objects.filter(
            registration__event=event,
        ).select_related("booking_option")

        total = Decimal("0.00")
        for participant in participants:
            if participant.booking_option and participant.booking_option.price:
                total += participant.booking_option.price

        return total
