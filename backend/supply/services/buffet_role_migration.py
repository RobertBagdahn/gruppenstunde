"""Apply the approved buffet role mapping (``supply/data/buffet_role_mapping.py``).

Existing items never have their status or visibility changed. New ingredient
rows are created as verified only after their mapping is reviewed; new recipes
remain drafts for the normal content-approval flow. Existing rows are checked by
ID and expected name; merges require expected source and target names and use
the shared merge services. A dry run executes everything inside a transaction
and rolls it back, so its report matches the proposed apply.
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
    changes: Counter[str] = field(default_factory=Counter)
    lines: list[str] = field(default_factory=list)
    skipped: list[str] = field(default_factory=list)
    manual_review: list[str] = field(default_factory=list)
    deleted_old_tags: list[str] = field(default_factory=list)
    kept_old_tags: dict[str, list[str]] = field(default_factory=dict)

    @property
    def total_changes(self) -> int:
        return sum(self.changes.values())


def _model(kind: str) -> type[Any]:
    from recipe.models import Recipe
    from supply.models import Ingredient

    return Ingredient if kind == "ingredient" else Recipe


def _name(obj: Any) -> str:
    return obj.name if hasattr(obj, "name") and not hasattr(obj, "title") else obj.title


def _tags_by_slug() -> dict[str, Any]:
    from content.models import Tag

    return {tag.slug: tag for tag in Tag.objects.filter(slug__in=(*BUFFET_ROLE_SLUGS, *OLD_BREAKFAST_TAG_SLUGS))}


class _Migration:
    def __init__(self, report: BuffetMigrationReport) -> None:
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
            tag = self.tags.get(slug)
            if tag is None:
                self.skip(f"übersprungen: {label}: Rolle {slug} existiert nicht")
                continue
            obj.tags.remove(tag)
            self.log("tag_removed", f"{label}: Tag {slug} entfernt")

    def apply(self, entry: RoleMapping) -> None:
        label = f"{'Zutat' if entry.kind == 'ingredient' else 'Rezept'} {entry.id or 'neu'} „{entry.name}“"
        if entry.action == "create":
            self._create(entry, label)
            return
        if entry.id is None:
            self.skip(f"übersprungen: {label} benötigt eine ID")
            return
        model = _model(entry.kind)
        obj = model.all_objects.filter(id=entry.id).first()
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
            self._remove_tags(obj, entry.role_slugs or BUFFET_ROLE_SLUGS, label)
            return
        role_slugs = entry.role_slugs or ((entry.role,) if entry.role else ())
        if not role_slugs:
            self.skip(f"übersprungen: {label} hat keine zugewiesene Buffet-Rolle")
            return
        for role_slug in role_slugs:
            role = self.tags.get(role_slug)
            if role is None:
                self.skip(f"übersprungen: Rolle {role_slug} existiert nicht")
                continue
            if not obj.tags.filter(id=role.id).exists():
                obj.tags.add(role)
                self.log(entry.action, f"{label}: Rolle {role.slug} gesetzt")
        for alias in entry.aliases:
            self._add_alias(obj, alias, label)

    def _create(self, entry: RoleMapping, label: str) -> None:
        from django.utils.text import slugify

        from recipe.models import Recipe
        from supply.models import Ingredient, IngredientAlias

        data = entry.create_data or {}
        proposed_name = str(data.get("name") or data.get("title") or entry.name).strip()
        if proposed_name != entry.name:
            self.skip(f"übersprungen: {label}: vorgeschlagener Name „{proposed_name}“ weicht vom erwarteten Namen ab")
            return
        role_slugs = entry.role_slugs or tuple(data.get("role_slugs", ())) or ((entry.role,) if entry.role else ())
        if not role_slugs:
            self.skip(f"übersprungen: {label}: mindestens eine Buffet-Rolle fehlt")
            return
        roles = [self.tags.get(slug) for slug in role_slugs]
        if any(role is None for role in roles):
            self.skip(f"übersprungen: {label}: eine Buffet-Rolle existiert nicht")
            return

        if entry.kind == "ingredient":
            existing = Ingredient.objects.filter(name__iexact=entry.name).first()
            all_names = Ingredient.all_objects.filter(name__iexact=entry.name)
            slug = str(data.get("slug") or slugify(entry.name))
            alias_collision = IngredientAlias.objects.filter(name__iexact=entry.name).exists()
            slug_collision = Ingredient.all_objects.filter(slug=slug).exists()
        else:
            existing = Recipe.objects.filter(title__iexact=entry.name).first()
            all_names = Recipe.all_objects.filter(title__iexact=entry.name)
            slug = str(data.get("slug") or slugify(entry.name))
            alias_collision = False
            slug_collision = Recipe.all_objects.filter(slug=slug).exists()

        if existing is not None:
            existing_slugs = set(existing.tags.values_list("slug", flat=True))
            if set(role_slugs).issubset(existing_slugs):
                return
            self.skip(f"übersprungen: {label}: ein System-Item mit diesem Namen existiert bereits; als add prüfen")
            return
        if all_names.exists():
            self.skip(f"übersprungen: {label}: ein gelöschtes Item mit diesem Namen existiert; manuell prüfen")
            return
        if alias_collision:
            self.skip(f"übersprungen: {label}: der Name existiert bereits als Zutaten-Alias")
            return
        if slug_collision:
            self.skip(f"übersprungen: {label}: der Slug „{slug}“ existiert bereits")
            return

        if entry.kind == "ingredient":
            self._create_ingredient(entry, label, data, roles)
        else:
            self._create_recipe(entry, label, data, roles)

    def _create_ingredient(self, entry: RoleMapping, label: str, data: dict[str, Any], roles: list[Any]) -> None:
        from django.core.exceptions import ValidationError

        from supply.choices import (
            IngredientStatusChoices,
            PhysicalPropertiesSourceChoices,
            PhysicalViscosityChoices,
            PortionWeightSource,
            PortionWeightStatus,
            RetailSectionSourceChoices,
        )
        from supply.models import (
            Ingredient,
            IngredientAlias,
            MeasuringUnit,
            NutritionalTag,
            Package,
            Portion,
            RetailSection,
        )
        from supply.services.portion_resolution import resolve_trusted_weight
        from supply.services.unit_resolution import resolve_canonical_unit

        energy = data.get("energy_kcal")
        section_id = data.get("retail_section_id")
        section_name = data.get("retail_section")
        section = RetailSection.objects.filter(id=section_id).first() if section_id else None
        if section is None and section_name:
            section = RetailSection.objects.filter(name__iexact=str(section_name)).first()
        if energy is None or section is None:
            self.skip(f"übersprungen: {label}: kcal und eine vorhandene Retail-Section sind erforderlich")
            return

        from supply.services.buffet_data_quality import normalize_proposed_portions

        portion_rows, package_data = normalize_proposed_portions(data)
        if not portion_rows:
            self.skip(f"übersprungen: {label}: mindestens eine Rezeptportion ist erforderlich")
            return

        resolved_portions: list[tuple[dict[str, Any], MeasuringUnit]] = []
        for row in portion_rows:
            unit_name = str(row.get("measuring_unit_name") or row.get("unit") or "").strip()
            weight = row.get("weight_g")
            unit = resolve_canonical_unit(unit_name)
            if unit is None and weight is not None and float(weight) > 0:
                unit = MeasuringUnit.objects.filter(name__iexact="Gramm").first()
                row = {**row, "quantity": float(weight)}
            if unit is None or weight is None or float(weight) <= 0 or not str(row.get("name") or "").strip():
                self.skip(f"übersprungen: {label}: Portionsdaten mit bestätigtem Gewicht fehlen oder sind ungültig")
                return
            resolved_portions.append((row, unit))

        viscosity = data.get("physical_viscosity") or PhysicalViscosityChoices.SOLID
        if viscosity == "powder":
            viscosity = PhysicalViscosityChoices.SOLID
        if viscosity not in PhysicalViscosityChoices.values:
            viscosity = PhysicalViscosityChoices.SOLID
        allowed_fields = (
            "description",
            "energy_kcal",
            "protein_g",
            "fat_g",
            "fat_sat_g",
            "carbohydrate_g",
            "sugar_g",
            "fibre_g",
            "salt_g",
            "sodium_mg",
            "fructose_g",
            "lactose_g",
            "child_score",
            "scout_score",
            "environmental_score",
            "nova_score",
            "fruit_factor",
            "price_per_kg",
            "physical_density",
            "durability_in_days",
            "max_storage_temperature",
            "is_standalone_food",
        )
        fields = {field: data[field] for field in allowed_fields if field in data}
        fields.update(
            {
                "name": entry.name,
                "retail_section": section,
                "retail_section_source": RetailSectionSourceChoices.MANUAL,
                "physical_viscosity": viscosity,
                "viscosity_source": PhysicalPropertiesSourceChoices.MANUAL,
                "status": IngredientStatusChoices.VERIFIED,
                "owner": None,
                "visibility": "public",
            }
        )
        ingredient = Ingredient(**fields)
        try:
            ingredient.full_clean(exclude=["slug"])
        except ValidationError as exc:
            self.skip(f"übersprungen: {label}: {exc}")
            return
        ingredient.save()
        ingredient.tags.add(*roles)

        for alias in data.get("aliases", []):
            alias_name = str(alias).strip()
            if (
                alias_name
                and not IngredientAlias.objects.filter(ingredient=ingredient, name__iexact=alias_name).exists()
            ):
                IngredientAlias.objects.create(ingredient=ingredient, name=alias_name, is_generic=True)

        for tag_name in data.get("nutritional_tags", []):
            tag = NutritionalTag.objects.filter(name__iexact=str(tag_name).strip()).first()
            if tag is not None:
                ingredient.nutritional_tags.add(tag)

        used_ranks: set[int] = set()
        for index, (row, unit) in enumerate(resolved_portions, start=1):
            rank = int(row.get("rank") or index)
            while rank in used_ranks:
                rank += 1
            used_ranks.add(rank)
            portion = Portion.objects.create(
                ingredient=ingredient,
                name=str(row["name"]).strip(),
                measuring_unit=unit,
                quantity=float(row.get("quantity") or 1.0),
                weight_g=float(row["weight_g"]),
                weight_status=PortionWeightStatus.CONFIRMED,
                weight_source=PortionWeightSource.MANUAL,
                rank=rank,
            )
            if resolve_trusted_weight(portion) is None:
                raise ValueError(f"Bestätigtes Portionsgewicht fehlt: {ingredient.name} / {portion.name}")

        package_ranks: set[int] = set()
        for index, package_row in enumerate(package_data, start=1):
            package_name = str(package_row.get("name") or "").strip()
            package_weight = package_row.get("weight_g")
            if package_name and package_weight is not None and float(package_weight) > 0:
                rank = int(package_row.get("rank") or index)
                while rank in package_ranks:
                    rank += 1
                package_ranks.add(rank)
                Package.objects.create(
                    ingredient=ingredient,
                    name=package_name,
                    weight_g=float(package_weight),
                    rank=rank,
                )
        self.log("create", f"{label}: verified System-Zutat angelegt")

    def _create_recipe(self, entry: RoleMapping, label: str, data: dict[str, Any], roles: list[Any]) -> None:
        from content.choices import ContentStatus
        from recipe.models import Recipe, RecipeItem, RecipeStep
        from recipe.services.recipe_checks import recalculate_recipe_cache
        from supply.choices import RecipeTypeChoices
        from supply.models import Ingredient, IngredientAlias, Portion
        from supply.services.portion_resolution import resolve_trusted_weight
        from supply.services.unit_resolution import resolve_canonical_unit

        recipe_type = data.get("recipe_type")
        servings = int(data.get("portions") or 0)
        item_rows = data.get("items") or []
        if recipe_type not in RecipeTypeChoices.values or servings < 1 or not item_rows:
            self.skip(f"übersprungen: {label}: gültiger Rezepttyp, Portionen und Rezeptbestandteile sind erforderlich")
            return

        resolved_items: list[tuple[Any, Portion, float, dict[str, Any]]] = []
        for row in item_rows:
            ingredient = None
            ingredient_id = row.get("ingredient_id")
            expected_ingredient_name = str(
                row.get("ingredient_name") or row.get("expected_ingredient_name") or ""
            ).strip()
            if ingredient_id is not None:
                ingredient = Ingredient.objects.filter(id=ingredient_id, owner__isnull=True).first()
                if ingredient is not None and expected_ingredient_name and ingredient.name != expected_ingredient_name:
                    self.skip(f"übersprungen: {label}: Zutat-ID {ingredient_id} hat nicht den erwarteten Namen")
                    return
            elif expected_ingredient_name:
                ingredient = Ingredient.objects.filter(
                    name__iexact=expected_ingredient_name, owner__isnull=True
                ).first()
                if ingredient is None:
                    alias = (
                        IngredientAlias.objects.filter(
                            name__iexact=expected_ingredient_name, ingredient__owner__isnull=True
                        )
                        .select_related("ingredient")
                        .first()
                    )
                    ingredient = alias.ingredient if alias is not None else None
            if ingredient is None:
                self.skip(f"übersprungen: {label}: vorhandene System-Zutat „{expected_ingredient_name}“ fehlt")
                return

            portion_id = row.get("portion_id")
            portion = (
                Portion.objects.active().filter(id=portion_id, ingredient=ingredient).first() if portion_id else None
            )
            if portion is not None:
                expected_portion_name = str(row.get("expected_portion_name") or "").strip()
                if expected_portion_name and portion.name != expected_portion_name:
                    self.skip(f"übersprungen: {label}: Portionsname stimmt nicht für {ingredient.name}")
                    return
            else:
                unit_name = str(row.get("unit") or row.get("measuring_unit_name") or "").strip()
                unit = resolve_canonical_unit(unit_name)
                if unit is None:
                    self.skip(f"übersprungen: {label}: Maßeinheit „{unit_name}“ ist nicht vorhanden")
                    return
                portion = (
                    Portion.objects.active()
                    .filter(ingredient=ingredient, measuring_unit=unit, quantity=1)
                    .order_by("rank", "id")
                    .first()
                )
            if portion is None or resolve_trusted_weight(portion) is None:
                self.skip(f"übersprungen: {label}: bestätigte Portion fehlt für {ingredient.name}")
                return
            quantity = float(row.get("quantity") or 0)
            if quantity <= 0:
                self.skip(f"übersprungen: {label}: ungültige Zutatenmenge für {ingredient.name}")
                return
            resolved_items.append((ingredient, portion, quantity / servings, row))

        duration = data.get("duration_minutes")
        from recipe.services.recipe_ai_suggest_service import _duration_to_execution_time_choice

        execution_time = data.get("execution_time") or _duration_to_execution_time_choice(int(duration or 30))
        recipe = Recipe.objects.create(
            title=entry.name,
            description=str(data.get("description") or ""),
            summary=str(data.get("summary") or ""),
            difficulty=str(data.get("difficulty") or "easy"),
            execution_time=execution_time,
            portions=1,
            source_servings=servings,
            recipe_type=recipe_type,
            status=ContentStatus.DRAFT,
            owner=None,
        )
        recipe.tags.add(*roles)
        for index, (ingredient, portion, quantity, row) in enumerate(resolved_items):
            RecipeItem.objects.create(
                recipe=recipe,
                portion=portion,
                quantity=quantity,
                sort_order=int(row.get("sort_order") or index + 1),
                is_optional=bool(row.get("is_optional", False)),
                note=str(row.get("note") or ""),
            )
        for index, step in enumerate(data.get("steps") or []):
            instruction = str(step.get("instruction") if isinstance(step, dict) else step).strip()
            if instruction:
                RecipeStep.objects.create(recipe=recipe, sort_order=index, instruction=instruction)
        recalculate_recipe_cache(recipe)
        self.log("create", f"{label}: Rezeptentwurf angelegt (Staff-Freigabe erforderlich)")

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
        if not entry.target_name:
            self.skip(f"übersprungen: Ziel {entry.target_id} für {label} hat keinen erwarteten Namen")
            return
        if _name(target) != entry.target_name:
            self.skip(
                f"übersprungen: Ziel-ID {entry.target_id} erwartet ‚{entry.target_name}‘, gefunden ‚{_name(target)}‘"
            )
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
        from supply.services.buffet_data_quality import ingredient_catalog_quality_reasons

        reason_labels = {
            "missing_energy": "Nährwerte fehlen",
            "unverified": "Entwurf",
            "missing_retail_section": "Retail-Section fehlt",
        }
        for ingredient in Ingredient.objects.filter(tags__slug__in=BUFFET_ROLE_SLUGS).distinct().order_by("name"):
            reasons = [reason_labels[reason] for reason in ingredient_catalog_quality_reasons(ingredient)]
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
