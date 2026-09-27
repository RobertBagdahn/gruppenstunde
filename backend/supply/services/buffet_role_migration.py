"""Apply the approved buffet role mapping (``supply/data/buffet_role_mapping.py``).

The migration never changes status or visibility. Entries are checked by ID
and expected name; merges only happen between system entries (``owner=None``)
and use the shared merge services. A dry run executes everything inside a
transaction and rolls it back, so its report equals the real run.
"""

from __future__ import annotations

from collections import Counter
from collections.abc import Iterable
from dataclasses import dataclass, field
from typing import Any

from django.db import transaction

from supply.data.buffet_role_mapping import BUFFET_ROLE_MAPPING, OLD_BREAKFAST_TAG_SLUGS, RoleMapping
from supply.services.buffet_catalog import BUFFET_ROLE_SLUGS


@dataclass
class BuffetMigrationReport:
    dry_run: bool
    changes: Counter = field(default_factory=Counter)
    lines: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)
    manual_review: list[str] = field(default_factory=list)
    deleted_old_tags: list[str] = field(default_factory=list)
    kept_old_tags: dict[str, list[str]] = field(default_factory=dict)

    @property
    def total_changes(self) -> int:
        return sum(self.changes.values())


def _model(kind: str) -> Any:
    from recipe.models import Recipe
    from supply.models import Ingredient

    return Ingredient if kind == "ingredient" else Recipe


def _name(obj: Any) -> str:
    return obj.name if hasattr(obj, "name") and not hasattr(obj, "title") else obj.title


def _tags_by_slug() -> dict[str, Any]:
    from content.models import Tag

    return {tag.slug: tag for tag in Tag.objects.filter(slug__in=(*BUFFET_ROLE_SLUGS, *OLD_BREAKFAST_TAG_SLUGS))}


class _Migration:
    def __init__(self, report: BuffetMigrationReport):
        self.report = report
        self.tags = _tags_by_slug()

    def log(self, action: str, message: str) -> None:
        self.report.changes[action] += 1
        self.report.lines.append(message)

    def skip(self, message: str) -> None:
        self.report.skipped.append(message)

    def _remove_tags(self, obj: Any, slugs: Iterable[str], label: str) -> None:
        present = set(obj.tags.filter(slug__in=list(slugs)).values_list("slug", flat=True))
        for slug in sorted(present):
            obj.tags.remove(self.tags[slug])
            self.log("tag_removed", f"{label}: Tag {slug} entfernt")

    def apply(self, entry: RoleMapping) -> None:
        model = _model(entry.kind)
        obj = model.all_objects.filter(id=entry.id).first()
        label = f"{'Zutat' if entry.kind == 'ingredient' else 'Rezept'} {entry.id} „{entry.name}“"
        if obj is None:
            self.skip(f"übersprungen: {label} nicht gefunden")
            return
        found = _name(obj)
        if found != entry.name:
            self.skip(f"übersprungen: ID {entry.id} erwartet ‚{entry.name}‘, gefunden ‚{found}‘")
            return
        if entry.action == "merge_into":
            self._merge(entry, obj, label)
            return
        if obj.is_deleted:
            self.skip(f"übersprungen: {label} ist gelöscht")
            return
        self._remove_tags(obj, OLD_BREAKFAST_TAG_SLUGS, label)
        if entry.action == "untag":
            self._remove_tags(obj, BUFFET_ROLE_SLUGS, label)
            return
        role = self.tags.get(entry.role or "")
        if role is None:
            self.skip(f"übersprungen: Rolle {entry.role} existiert nicht")
            return
        if not obj.tags.filter(id=role.id).exists():
            obj.tags.add(role)
            self.log(entry.action, f"{label}: Rolle {role.slug} gesetzt")
        for alias in entry.aliases:
            self._add_alias(obj, alias, label)

    def _add_alias(self, ingredient: Any, alias: str, label: str) -> None:
        from supply.models import IngredientAlias

        if IngredientAlias.objects.filter(ingredient=ingredient, name__iexact=alias).exists():
            return
        IngredientAlias.objects.create(ingredient=ingredient, name=alias, is_generic=True)
        self.log("alias", f"{label}: Alias „{alias}“ ergänzt")

    def _merge(self, entry: RoleMapping, source: Any, label: str) -> None:
        from content.choices import LinkType
        from content.models import ContentLink

        model = _model(entry.kind)
        target = model.all_objects.filter(id=entry.target_id).first()
        if target is None or target.is_deleted:
            self.skip(f"übersprungen: Ziel {entry.target_id} für {label} fehlt")
            return
        if source.is_deleted:
            already = ContentLink.objects.filter(
                source_object_id=source.id,
                target_object_id=target.id,
                link_type=LinkType.DUPLICATE_MERGED,
            ).exists()
            if not already:
                self.skip(f"übersprungen: {label} ist gelöscht, aber nicht in {entry.target_id} zusammengeführt")
            return
        if source.owner_id is not None or target.owner_id is not None:
            self.skip(f"übersprungen: {label} → {entry.target_id}: nur System-Einträge werden zusammengeführt")
            return
        if entry.kind == "ingredient":
            from supply.services.ingredient_merge import merge_ingredient

            merge_ingredient(source, target)
        else:
            from recipe.services.recipe_merge import merge_recipe

            merge_recipe(source, target)
        self.log("merge_into", f"{label} → {entry.target_id} „{_name(target)}“ zusammengeführt")

    def remove_old_tags(self) -> None:
        from recipe.models import Recipe
        from supply.models import Ingredient

        for slug in OLD_BREAKFAST_TAG_SLUGS:
            tag = self.tags.get(slug)
            if tag is None:
                continue
            carriers = [f"Zutat {i.id} „{i.name}“" for i in Ingredient.objects.filter(tags=tag).order_by("id")]
            carriers += [f"Rezept {r.id} „{r.title}“" for r in Recipe.objects.filter(tags=tag).order_by("id")]
            if carriers:
                self.report.kept_old_tags[slug] = carriers
                continue
            tag.delete()
            self.report.deleted_old_tags.append(slug)
            self.log("old_tag_deleted", f"Tag {slug} gelöscht")

    def collect_manual_review(self) -> None:
        from supply.models import Ingredient

        for ingredient in Ingredient.objects.filter(tags__slug__in=BUFFET_ROLE_SLUGS).distinct().order_by("name"):
            reasons = []
            if not ingredient.energy_kcal:
                reasons.append("Nährwerte fehlen")
            if ingredient.status != "verified":
                reasons.append("Entwurf")
            if reasons:
                self.report.manual_review.append(f"{ingredient.name}: {', '.join(reasons)} – manuell prüfen")


def migrate_buffet_roles(
    *, dry_run: bool, mapping: Iterable[RoleMapping] = BUFFET_ROLE_MAPPING
) -> BuffetMigrationReport:
    report = BuffetMigrationReport(dry_run=dry_run)
    with transaction.atomic():
        migration = _Migration(report)
        entries = list(mapping)
        # Merges first: targets inherit the sources' tags, which the second pass cleans up.
        for entry in [e for e in entries if e.action == "merge_into"] + [
            e for e in entries if e.action != "merge_into"
        ]:
            migration.apply(entry)
        migration.remove_old_tags()
        migration.collect_manual_review()
        if dry_run:
            transaction.set_rollback(True)
    return report
