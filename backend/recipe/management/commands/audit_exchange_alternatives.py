"""Report malformed exchange groups without changing recipe data."""

from __future__ import annotations

from typing import Any

from django.core.management.base import BaseCommand

from recipe.models import RecipeItem, RecipeItemExchangeGroup


class Command(BaseCommand):
    help = "Audit recipe exchange groups for missing or inactive ingredient portions."

    def handle(self, *args: Any, **options: Any) -> None:
        issue_count = 0
        group_count = 0
        groups = RecipeItemExchangeGroup.objects.values_list("id", "recipe_id").iterator(chunk_size=200)

        for group_id, recipe_id in groups:
            group_count += 1
            members = list(
                RecipeItem.objects.filter(exchange_group_id=group_id).values(
                    "id",
                    "recipe_id",
                    "exchange_position",
                    "portion_id",
                    "portion__deleted_at",
                    "portion__superseded_by_id",
                    "portion__ingredient_id",
                )
            )
            issues: list[str] = []
            positions = [member["exchange_position"] for member in members]

            if not members:
                issues.append("empty group")
            if positions.count(0) != 1:
                issues.append("expected exactly one default member at position 0")
            valid_positions = [position for position in positions if position is not None]
            if len(valid_positions) != len(set(valid_positions)):
                issues.append("duplicate member positions")

            for member in members:
                if member["recipe_id"] != recipe_id:
                    issues.append(f"item {member['id']}: recipe does not match group")
                position = member["exchange_position"]
                if position is None or position < 0:
                    issues.append(f"item {member['id']}: invalid exchange position")
                if member["portion_id"] is None:
                    issues.append(f"item {member['id']}: missing portion")
                elif member["portion__deleted_at"] is not None or member["portion__superseded_by_id"] is not None:
                    issues.append(f"item {member['id']}: inactive or superseded portion")
                elif member["portion__ingredient_id"] is None:
                    issues.append(f"item {member['id']}: portion has no ingredient")

            if issues:
                issue_count += len(issues)
                self.stdout.write(self.style.WARNING(f"group_id={group_id} recipe_id={recipe_id}"))
                for issue in issues:
                    self.stdout.write(f"  {issue}")

        self.stdout.write(f"Audited {group_count} exchange groups; found {issue_count} issues. No data changed.")
