"""Change marker of a shopping list, shared by the detail response and the polling endpoint."""

from django.db.models import Count, Max, Q

from shopping.models import ShoppingList


def list_stamp(shopping_list: ShoppingList) -> str:
    """Differs whenever entries, checks, members or the list itself change (one aggregate query)."""
    agg = shopping_list.items.aggregate(
        count=Count("id"), checked=Count("id", filter=Q(is_checked=True)), latest=Max("updated_at")
    )
    latest = agg["latest"].isoformat() if agg["latest"] else ""
    members = shopping_list.collaborators.count() + shopping_list.guests.count()
    return f"{shopping_list.updated_at.isoformat()}|{agg['count']}|{agg['checked']}|{latest}|{members}"
