"""Candidate discovery and validation for the staff buffet data-quality queue."""

from __future__ import annotations

import hashlib
import json
import re
import unicodedata
from difflib import SequenceMatcher
from typing import Any, Literal

from django.db.models import Q
from django.utils import timezone

from supply.services.buffet_catalog import BUFFET_ROLE_SLUGS

CandidateKind = Literal["ingredient", "recipe"]
CandidateAction = Literal["add", "untag", "merge_into", "create"]

BUFFET_RETAIL_ROLE_MAP: dict[str, tuple[str, ...]] = {
    "Brot & Backwaren": ("buffet-bread",),
    "Wurst & Aufschnitt": ("buffet-savory", "buffet-main"),
    "Brotaufstriche": ("buffet-savory", "buffet-sweet"),
    "Butter & Margarine": ("buffet-fat",),
    "Obst": ("buffet-fresh",),
    "Gemüse": ("buffet-fresh",),
    "Salate & frische Kräuter": ("buffet-fresh", "buffet-salad"),
    "Käse": ("buffet-cheese",),
    "Milch & Pflanzendrinks": ("buffet-drink",),
    "Eier": ("buffet-main",),
    "Fleisch": ("buffet-main",),
    "Fisch & Meeresfrüchte": ("buffet-main",),
    "Fleischersatz & Tofu": ("buffet-main",),
    "Feinkost & Kühltheke": ("buffet-dip", "buffet-salad"),
    "Nudeln": ("buffet-carb",),
    "Reis & Getreide": ("buffet-carb",),
    "Hülsenfrüchte": ("buffet-carb", "buffet-main"),
    "Nüsse, Samen & Trockenobst": ("buffet-nuts",),
    "Müsli & Cerealien": ("buffet-cereal",),
    "Süßwaren & Kekse": ("buffet-sweet-snack",),
    "Knabberartikel": ("buffet-salty-snack",),
    "Kaffee, Tee & Kakao": ("buffet-drink",),
    "Säfte & Smoothies": ("buffet-drink",),
    "Wasser & Erfrischungsgetränke": ("buffet-drink",),
    "Alkoholische Getränke": (),
    "Saucen & Würzsaucen": ("buffet-condiment",),
    "Brühen, Suppen & Fertiggerichte": ("buffet-soup", "buffet-dish"),
}

# Initial near-duplicate worklist from the supplied Prod inventory. Every pair
# remains an unapproved candidate and is rechecked against the selected database.
DUPLICATE_SEEDS: tuple[tuple[str, int | None, str, int | None, str], ...] = (
    ("ingredient", 6626, "Cocktail Tomate", 6934, "Cocktailtomaten"),
    ("ingredient", 36, "Kirschtomaten", 6934, "Cocktailtomaten"),
    ("ingredient", 7058, "Cherrytomaten", 6934, "Cocktailtomaten"),
    ("ingredient", 6792, "Geröstet Erdnüsse", 686, "Erdnusskerne geröstet"),
    ("ingredient", 6664, "Gemüsegurke", 299, "Salatgurke"),
    ("ingredient", 42, "Möhre", 41, "Karotte"),
    ("ingredient", 6927, "Reife Banane", 298, "Bananen"),
    ("ingredient", 295, "Äpfel", 57, "frischer Apfel"),
    ("ingredient", None, "Käse (Gouda)", 105, "Gouda"),
    ("ingredient", 7346, "Saft (Apfel)", 6703, "Apfelsaft"),
    ("ingredient", 7345, "Saft (Orange)", 200, "Orangensaft"),
)

MISSING_CATALOG_ITEMS: tuple[dict[str, Any], ...] = (
    {"kind": "ingredient", "name": "Apfelschorle", "role_slugs": ["buffet-drink"], "recipe_type": None},
    {"kind": "ingredient", "name": "Mineralwasser still", "role_slugs": ["buffet-drink"], "recipe_type": None},
    {"kind": "ingredient", "name": "Mineralwasser sprudel", "role_slugs": ["buffet-drink"], "recipe_type": None},
    {"kind": "ingredient", "name": "Eistee", "role_slugs": ["buffet-drink"], "recipe_type": None},
    {"kind": "ingredient", "name": "Zitronenlimonade", "role_slugs": ["buffet-drink"], "recipe_type": None},
    {"kind": "ingredient", "name": "Cola", "role_slugs": ["buffet-drink"], "recipe_type": None},
    {"kind": "ingredient", "name": "Fanta oder Limonade", "role_slugs": ["buffet-drink"], "recipe_type": None},
    {"kind": "ingredient", "name": "Orangenschorle", "role_slugs": ["buffet-drink"], "recipe_type": None},
    {"kind": "ingredient", "name": "Kirschsaft-Schorle", "role_slugs": ["buffet-drink"], "recipe_type": None},
    {"kind": "ingredient", "name": "Milch-Mixgetränk", "role_slugs": ["buffet-drink"], "recipe_type": None},
    {"kind": "ingredient", "name": "Salzstangen", "role_slugs": ["buffet-salty-snack"], "recipe_type": None},
    {"kind": "ingredient", "name": "Cracker", "role_slugs": ["buffet-salty-snack"], "recipe_type": None},
    {"kind": "ingredient", "name": "Käsegebäck", "role_slugs": ["buffet-salty-snack"], "recipe_type": None},
    {"kind": "ingredient", "name": "Chips Paprika", "role_slugs": ["buffet-salty-snack"], "recipe_type": None},
    {"kind": "ingredient", "name": "Chips Salz", "role_slugs": ["buffet-salty-snack"], "recipe_type": None},
    {
        "kind": "ingredient",
        "name": "Tortilla-Chips Naturell",
        "role_slugs": ["buffet-salty-snack"],
        "recipe_type": None,
    },
    {"kind": "ingredient", "name": "Guacamole", "role_slugs": ["buffet-dip"], "recipe_type": None},
    {"kind": "ingredient", "name": "Tzatziki", "role_slugs": ["buffet-dip"], "recipe_type": None},
    {"kind": "ingredient", "name": "Sour Cream", "role_slugs": ["buffet-dip"], "recipe_type": None},
    {"kind": "ingredient", "name": "Kräuterquark", "role_slugs": ["buffet-dip"], "recipe_type": None},
    {"kind": "ingredient", "name": "Käsesoße", "role_slugs": ["buffet-dip"], "recipe_type": None},
    {"kind": "ingredient", "name": "Parmesan gerieben", "role_slugs": ["buffet-topping"], "recipe_type": None},
    {"kind": "ingredient", "name": "Backkartoffeln", "role_slugs": ["buffet-carb"], "recipe_type": None},
    {"kind": "recipe", "name": "Apfelschorle", "role_slugs": ["buffet-drink"], "recipe_type": "drink"},
    {"kind": "recipe", "name": "Zitronenwasser", "role_slugs": ["buffet-drink"], "recipe_type": "drink"},
    {"kind": "recipe", "name": "Früchtetee-Kanne", "role_slugs": ["buffet-drink"], "recipe_type": "drink"},
    {"kind": "recipe", "name": "Kakao-Kanne", "role_slugs": ["buffet-drink"], "recipe_type": "drink"},
    {"kind": "recipe", "name": "Snackplatte", "role_slugs": ["buffet-dish"], "recipe_type": "snack"},
    {"kind": "recipe", "name": "Käseplatte", "role_slugs": ["buffet-dish"], "recipe_type": "snack"},
    {"kind": "recipe", "name": "Rohkostplatte mit Dip", "role_slugs": ["buffet-dish"], "recipe_type": "snack"},
    {"kind": "recipe", "name": "Antipasti-Platte", "role_slugs": ["buffet-dish"], "recipe_type": "snack"},
    {"kind": "recipe", "name": "Nachos überbacken", "role_slugs": ["buffet-dish"], "recipe_type": "snack"},
)

PROTECTED_DUPLICATE_NAME_PAIRS = {
    frozenset({"salatgurke", "minigurken"}),
    frozenset({"mineralwasser", "trinkwasser aus der leitung"}),
}


def normalize_name(name: str) -> str:
    value = unicodedata.normalize("NFKC", name).casefold()
    value = value.replace("ä", "ae").replace("ö", "oe").replace("ü", "ue").replace("ß", "ss")
    return re.sub(r"[^a-z0-9]+", " ", value).strip()


def normalize_proposed_portions(data: dict[str, Any]) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Flatten AI/manual package groups into Portion and Package rows."""
    raw_portions = data.get("portions") or []
    packages = data.get("packages") or []
    if isinstance(raw_portions, dict):
        packages = packages or raw_portions.get("packungen") or []
        portion_rows = [
            row for key in ("rezeptportionen", "belag", "backmengen") for row in (raw_portions.get(key) or [])
        ]
    elif isinstance(raw_portions, list):
        portion_rows = [row for row in raw_portions if isinstance(row, dict) and row.get("portion_type") != "packung"]
        packages = packages or [
            row for row in raw_portions if isinstance(row, dict) and row.get("portion_type") == "packung"
        ]
    else:
        portion_rows = []
    packages = packages or []
    return [row for row in portion_rows if isinstance(row, dict)], [row for row in packages if isinstance(row, dict)]


def _model(kind: str) -> type[Any]:
    if kind == "ingredient":
        from supply.models import Ingredient

        return Ingredient
    from recipe.models import Recipe

    return Recipe


def _item_name(item: Any, kind: str) -> str:
    return item.name if kind == "ingredient" else item.title


def _role_slugs(item: Any) -> list[str]:
    role_order = {slug: index for index, slug in enumerate(BUFFET_ROLE_SLUGS)}
    return sorted(
        (tag.slug for tag in item.tags.all() if tag.group == "buffet"),
        key=lambda slug: role_order.get(slug, len(role_order)),
    )


def _candidate_row(
    *,
    candidate_key: str,
    action: CandidateAction,
    item_kind: CandidateKind,
    source_id: int | None,
    source_name: str,
    target_id: int | None = None,
    target_name: str | None = None,
    role_slugs: list[str] | None = None,
    retail_section: str | None = None,
    recipe_type: str | None = None,
    is_standalone_food: bool | None = None,
    similarity: float | None = None,
    candidate_status: str = "available",
    rationale: str = "",
) -> dict[str, Any]:
    return {
        "candidate_key": candidate_key,
        "action": action,
        "item_kind": item_kind,
        "source_id": source_id,
        "source_name": source_name,
        "target_id": target_id,
        "target_name": target_name,
        "role_slugs": role_slugs or [],
        "retail_section": retail_section,
        "recipe_type": recipe_type,
        "is_standalone_food": is_standalone_food,
        "similarity": similarity,
        "candidate_status": candidate_status,
        "rationale": rationale,
    }


def _materialize_duplicate_seed(seed: tuple[str, int | None, str, int | None, str]) -> dict[str, Any]:
    kind, source_id, source_expected, target_id, target_expected = seed
    Model = _model(kind)
    if source_id is not None:
        source = Model.objects.filter(id=source_id).first()
    else:
        source = (
            Model.objects.filter(name__iexact=source_expected).first()
            if kind == "ingredient"
            else Model.objects.filter(title__iexact=source_expected).first()
        )
    if target_id is not None:
        target = Model.objects.filter(id=target_id).first()
    else:
        target = (
            Model.objects.filter(name__iexact=target_expected).first()
            if kind == "ingredient"
            else Model.objects.filter(title__iexact=target_expected).first()
        )

    actual_source_name = _item_name(source, kind) if source is not None else source_expected
    actual_target_name = _item_name(target, kind) if target is not None else target_expected
    is_stale = (
        source is None
        or target is None
        or actual_source_name != source_expected
        or actual_target_name != target_expected
        or (kind == "ingredient" and (source.owner_id is not None or target.owner_id is not None))
        or (kind == "recipe" and (source.owner_id is not None or target.owner_id is not None))
    )
    section = source.retail_section.name if kind == "ingredient" and source and source.retail_section else None
    return _candidate_row(
        candidate_key=f"merge:{kind}:{source_id or normalize_name(source_expected)}:{target_id or normalize_name(target_expected)}",
        action="merge_into",
        item_kind=kind,  # type: ignore[arg-type]
        source_id=source.id if source is not None else source_id,
        source_name=source_expected,
        target_id=target.id if target is not None else target_id,
        target_name=target_expected,
        role_slugs=_role_slugs(source) if source is not None else [],
        retail_section=section,
        candidate_status="stale" if is_stale else "available",
        rationale=f"Prüfkandidat: {source_expected} → {target_expected}. Keine automatische Zusammenführung.",
    )


def _item_exists_by_name(kind: str, name: str) -> Any | None:
    if kind == "ingredient":
        from supply.models import Ingredient

        return (
            Ingredient.objects.filter(owner__isnull=True)
            .filter(Q(name__iexact=name) | Q(aliases__name__iexact=name))
            .distinct()
            .order_by("-usage_count", "id")
            .first()
        )
    from recipe.models import Recipe

    return Recipe.objects.filter(owner__isnull=True, title__iexact=name).order_by("id").first()


def _unfulfilled_create_candidates() -> list[dict[str, Any]]:
    candidates = []
    for suggestion in MISSING_CATALOG_ITEMS:
        kind = suggestion["kind"]
        name = suggestion["name"]
        existing = _item_exists_by_name(kind, name)
        candidate_status = "existing_match" if existing is not None else "available"
        candidate_action: CandidateAction = "add" if existing is not None else "create"
        candidates.append(
            _candidate_row(
                candidate_key=f"catalog:{kind}:{normalize_name(name)}",
                action=candidate_action,
                item_kind=kind,
                source_id=existing.id if existing is not None else None,
                source_name=_item_name(existing, kind) if existing is not None else name,
                role_slugs=list(suggestion["role_slugs"]),
                recipe_type=suggestion.get("recipe_type"),
                candidate_status=candidate_status,
                rationale="Vorschlag aus der Buffet-Bestandsaufnahme; vor Übernahme Namen und Bestandsdaten prüfen.",
            )
        )
    return candidates


def _role_assignment_candidates() -> list[dict[str, Any]]:
    from recipe.models import Recipe
    from supply.models import Ingredient
    from supply.services.buffet_catalog import is_alcoholic_item

    candidates: list[dict[str, Any]] = []
    ingredients = (
        Ingredient.objects.filter(owner__isnull=True)
        .select_related("retail_section")
        .prefetch_related("tags")
        .order_by("name", "id")
    )
    for ingredient in ingredients:
        current_roles = _role_slugs(ingredient)
        if is_alcoholic_item(ingredient, "ingredient"):
            if current_roles:
                candidates.append(
                    _candidate_row(
                        candidate_key=f"untag:ingredient:{ingredient.id}",
                        action="untag",
                        item_kind="ingredient",
                        source_id=ingredient.id,
                        source_name=ingredient.name,
                        role_slugs=current_roles,
                        retail_section=ingredient.retail_section.name if ingredient.retail_section else None,
                        is_standalone_food=ingredient.is_standalone_food,
                        rationale="Alkoholischer Katalogeintrag; Staff prüft die Entfernung der Buffet-Rollen.",
                    )
                )
            continue
        suggested_roles = BUFFET_RETAIL_ROLE_MAP.get(
            ingredient.retail_section.name if ingredient.retail_section else "", ()
        )
        for role_slug in suggested_roles:
            if role_slug in current_roles:
                continue
            candidates.append(
                _candidate_row(
                    candidate_key=f"add:ingredient:{ingredient.id}:{role_slug}",
                    action="add",
                    item_kind="ingredient",
                    source_id=ingredient.id,
                    source_name=ingredient.name,
                    role_slugs=[role_slug],
                    retail_section=ingredient.retail_section.name if ingredient.retail_section else None,
                    is_standalone_food=ingredient.is_standalone_food,
                    rationale="Kandidat aus der Retail-Section; Staff bestätigt die tatsächliche Buffet-Rolle.",
                )
            )

    recipes = (
        Recipe.objects.filter(
            owner__isnull=True,
            recipe_type__in=("breakfast", "warm_meal", "cold_meal", "dessert", "drink", "snack"),
        )
        .prefetch_related("tags")
        .order_by("title", "id")
    )
    for recipe in recipes:
        current_roles = _role_slugs(recipe)
        if is_alcoholic_item(recipe, "recipe"):
            if current_roles:
                candidates.append(
                    _candidate_row(
                        candidate_key=f"untag:recipe:{recipe.id}",
                        action="untag",
                        item_kind="recipe",
                        source_id=recipe.id,
                        source_name=recipe.title,
                        role_slugs=current_roles,
                        recipe_type=recipe.recipe_type,
                        rationale="Alkoholisches Rezept; Staff prüft die Entfernung der Buffet-Rollen.",
                    )
                )
            continue
        if current_roles:
            continue
        candidates.append(
            _candidate_row(
                candidate_key=f"add:recipe:{recipe.id}",
                action="add",
                item_kind="recipe",
                source_id=recipe.id,
                source_name=recipe.title,
                recipe_type=recipe.recipe_type,
                rationale="Nicht zugeordnetes Rezept; Staff wählt die passende Buffet-Rolle.",
            )
        )
    return candidates


def _dynamic_duplicate_candidates() -> list[dict[str, Any]]:
    """Use the existing normalized near-duplicate grouping as a review source."""
    from supply.services.ingredient_merge import near_duplicate_groups

    candidates = []
    for group in near_duplicate_groups():
        system_group = [ingredient for ingredient in group if ingredient.owner_id is None]
        if len(system_group) < 2:
            continue
        target = system_group[0]
        for source in system_group[1:]:
            names = frozenset({normalize_name(source.name), normalize_name(target.name)})
            if names in PROTECTED_DUPLICATE_NAME_PAIRS:
                continue
            candidates.append(
                _candidate_row(
                    candidate_key=f"merge:ingredient:{source.id}:{target.id}",
                    action="merge_into",
                    item_kind="ingredient",
                    source_id=source.id,
                    source_name=source.name,
                    target_id=target.id,
                    target_name=target.name,
                    role_slugs=_role_slugs(source),
                    retail_section=source.retail_section.name if source.retail_section else None,
                    similarity=0.8,
                    rationale="Ähnlicher normalisierter Name; Quell- und Zielrichtung müssen vor Freigabe geprüft werden.",
                )
            )
    return candidates


def _dynamic_recipe_duplicate_candidates() -> list[dict[str, Any]]:
    """Find review-only recipe title variants without truncating the worklist."""
    from recipe.models import Recipe

    recipes = list(
        Recipe.objects.filter(owner__isnull=True)
        .prefetch_related("tags")
        .only("id", "title", "owner_id", "status", "usage_count", "quality_score", "recipe_type")
        .order_by("id")
    )
    candidates: list[dict[str, Any]] = []
    for index, first in enumerate(recipes):
        first_name = normalize_name(first.title)
        first_tokens = set(first_name.split())
        for second in recipes[index + 1 :]:
            second_name = normalize_name(second.title)
            if first_name == second_name:
                similarity = 1.0
            else:
                token_union = first_tokens | set(second_name.split())
                token_overlap = len(first_tokens & set(second_name.split())) / max(len(token_union), 1)
                similarity = SequenceMatcher(None, first_name, second_name).ratio()
                if similarity < 0.84 and token_overlap < 0.7:
                    continue
            first_rank = (
                0 if first.status in {"approved", "verified"} else 1,
                -(first.usage_count or 0),
                -(first.quality_score or 0),
                first.id,
            )
            second_rank = (
                0 if second.status in {"approved", "verified"} else 1,
                -(second.usage_count or 0),
                -(second.quality_score or 0),
                second.id,
            )
            target, source = (first, second) if first_rank <= second_rank else (second, first)
            candidates.append(
                _candidate_row(
                    candidate_key=f"merge:recipe:{source.id}:{target.id}",
                    action="merge_into",
                    item_kind="recipe",
                    source_id=source.id,
                    source_name=source.title,
                    target_id=target.id,
                    target_name=target.title,
                    role_slugs=_role_slugs(source),
                    recipe_type=source.recipe_type,
                    similarity=round(similarity, 4),
                    rationale="Ähnliche normalisierte Rezepttitel; Quell- und Zielrichtung müssen vor Freigabe geprüft werden.",
                )
            )
    return candidates


def _candidate_rows() -> list[dict[str, Any]]:
    rows = [_materialize_duplicate_seed(seed) for seed in DUPLICATE_SEEDS]
    rows.extend(_dynamic_duplicate_candidates())
    rows.extend(_dynamic_recipe_duplicate_candidates())
    rows.extend(_role_assignment_candidates())
    rows.extend(_unfulfilled_create_candidates())
    unique: dict[str, dict[str, Any]] = {}
    for row in rows:
        unique[row["candidate_key"]] = row
    return list(unique.values())


def list_buffet_candidates(
    *,
    q: str = "",
    action: str | None = None,
    kind: str | None = None,
    role_slug: str | None = None,
    page: int = 1,
    page_size: int = 20,
) -> dict[str, Any]:
    rows = _candidate_rows()
    query = normalize_name(q) if q else ""
    if query:
        rows = [
            row
            for row in rows
            if query in normalize_name(row["source_name"]) or query in normalize_name(row.get("target_name") or "")
        ]
    if action:
        rows = [row for row in rows if row["action"] == action]
    if kind:
        rows = [row for row in rows if row["item_kind"] == kind]
    if role_slug:
        rows = [row for row in rows if role_slug in row["role_slugs"]]

    rows.sort(
        key=lambda row: (
            row["candidate_status"] != "available",
            row["action"],
            row["source_name"].casefold(),
            row["candidate_key"],
        )
    )
    page = max(1, page)
    page_size = max(1, min(page_size, 50))
    total = len(rows)
    total_pages = max(1, (total + page_size - 1) // page_size)
    start = (page - 1) * page_size
    return {
        "items": rows[start : start + page_size],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


def append_audit(proposal: Any, *, action: str, user: Any, details: dict[str, Any] | None = None) -> None:
    audit = list(proposal.audit_log or [])
    audit.append(
        {
            "action": action,
            "user_id": user.id if user and getattr(user, "is_authenticated", False) else None,
            "username": user.get_username() if user and getattr(user, "is_authenticated", False) else None,
            "timestamp": timezone.now().isoformat(),
            "details": details or {},
        }
    )
    proposal.audit_log = audit


def _source_target(proposal: Any) -> tuple[Any | None, Any | None, list[str], list[str]]:
    Model = _model(proposal.item_kind)
    blockers: list[str] = []
    warnings: list[str] = []
    source = None
    target = None
    if proposal.action != "create":
        source = Model.all_objects.filter(id=proposal.source_id).first() if proposal.source_id else None
        if source is None:
            blockers.append("Quell-Item wurde nicht gefunden.")
        elif getattr(source, "is_deleted", False):
            blockers.append("Quell-Item ist gelöscht.")
        elif _item_name(source, proposal.item_kind) != proposal.source_expected_name:
            blockers.append(
                f"Quellname stimmt nicht: erwartet „{proposal.source_expected_name}“, gefunden „{_item_name(source, proposal.item_kind)}“."
            )
    if proposal.action == "merge_into":
        target = Model.all_objects.filter(id=proposal.target_id).first() if proposal.target_id else None
        if target is None:
            blockers.append("Ziel-Item wurde nicht gefunden.")
        elif getattr(target, "is_deleted", False):
            blockers.append("Ziel-Item ist gelöscht.")
        elif _item_name(target, proposal.item_kind) != proposal.target_expected_name:
            blockers.append(
                f"Zielname stimmt nicht: erwartet „{proposal.target_expected_name}“, gefunden „{_item_name(target, proposal.item_kind)}“."
            )
        if source is not None and target is not None:
            if source.id == target.id:
                blockers.append("Quell- und Ziel-Item dürfen nicht identisch sein.")
            if source.owner_id is not None or target.owner_id is not None:
                blockers.append("Zusammenführungen sind nur für System-Einträge erlaubt.")
    from content.models import Tag

    role_slugs = proposal.role_slugs or []
    role_rows = set(Tag.objects.filter(group="buffet", slug__in=role_slugs).values_list("slug", flat=True))
    for slug in role_slugs:
        if slug not in BUFFET_ROLE_SLUGS:
            blockers.append(f"Unbekannte Buffet-Rolle: {slug}.")
        elif slug not in role_rows:
            blockers.append(f"Buffet-Rolle {slug} ist in der Datenbank nicht angelegt.")
    if proposal.action in {"add", "untag", "create"} and not proposal.role_slugs:
        blockers.append("Mindestens eine Buffet-Rolle auswählen.")
    if proposal.action in {"add", "untag"} and source is not None and source.owner_id is not None:
        blockers.append("Globale Buffet-Zuordnungen dürfen nur System-Einträge verändern.")
    if proposal.action == "add" and source is not None:
        present = set(source.tags.values_list("slug", flat=True))
        if all(slug in present for slug in proposal.role_slugs):
            warnings.append("Das Item trägt bereits alle ausgewählten Buffet-Rollen.")
    return source, target, blockers, warnings


def _review_snapshot(item: Any | None, kind: str) -> dict[str, Any] | None:
    """Capture mutable item data that could make a saved preview stale."""
    if item is None:
        return None

    from django.forms.models import model_to_dict

    snapshot: dict[str, Any] = {
        "fields": model_to_dict(item),
        "role_tags": sorted(item.tags.values_list("slug", flat=True)),
    }
    if kind == "ingredient":
        snapshot["aliases"] = list(item.aliases.order_by("id").values("id", "name", "rank", "is_generic"))
        snapshot["portions"] = list(
            item.portions.order_by("id").values(
                "id",
                "name",
                "measuring_unit_id",
                "quantity",
                "weight_g",
                "weight_status",
                "weight_source",
                "deleted_at",
                "superseded_by_id",
            )
        )
        snapshot["packages"] = list(item.packages.order_by("id").values("id", "name", "weight_g", "rank", "deleted_at"))
    else:
        snapshot["recipe_items"] = list(
            item.recipe_items.order_by("id").values("id", "portion_id", "quantity", "sort_order", "is_optional", "note")
        )
        snapshot["steps"] = list(
            item.steps.order_by("id").values("id", "sort_order", "instruction", "duration_minutes", "section")
        )
    return snapshot


def _validate_create_proposal(proposal: Any) -> tuple[list[str], list[str]]:
    from django.utils.text import slugify

    from recipe.models import Recipe
    from supply.choices import RecipeTypeChoices
    from supply.models import Ingredient, IngredientAlias, RetailSection

    blockers: list[str] = []
    warnings: list[str] = []
    data = proposal.proposed_data or {}
    name = str(data.get("name") or data.get("title") or "").strip()
    if not name:
        blockers.append("Name oder Titel fehlt.")
        return blockers, warnings

    if proposal.item_kind == "ingredient":
        collision = (
            Ingredient.all_objects.filter(name__iexact=name).exists()
            or IngredientAlias.objects.filter(name__iexact=name).exists()
        )
        if collision:
            blockers.append(f"Eine System-Zutat oder ein Alias mit dem Namen „{name}“ existiert bereits.")
        if data.get("energy_kcal") is None:
            blockers.append("Nährwertangabe kcal/100 g fehlt.")
        section_name = data.get("retail_section")
        section_id = data.get("retail_section_id")
        if not section_name and not section_id:
            blockers.append("Retail-Section fehlt.")
        elif (section_id and not RetailSection.objects.filter(id=section_id).exists()) or (
            section_name and not RetailSection.objects.filter(name__iexact=section_name).exists()
        ):
            blockers.append("Ausgewählte Retail-Section existiert nicht mehr.")
        proposed_slug = str(data.get("slug") or slugify(name))
        if Ingredient.all_objects.filter(slug=proposed_slug).exists():
            blockers.append(f"Eine aktive System-Zutat mit dem Slug „{proposed_slug}“ existiert bereits.")
        portions = data.get("portions")
        if isinstance(portions, dict):
            has_portions = any(bool(value) for value in portions.values())
        else:
            has_portions = bool(portions)
        if not has_portions:
            blockers.append("Mindestens eine sinnvolle Portion fehlt.")
    else:
        collision = Recipe.all_objects.filter(title__iexact=name).exists()
        if collision:
            blockers.append(f"Ein System-Rezept mit dem Titel „{name}“ existiert bereits.")
        proposed_slug = str(data.get("slug") or slugify(name))
        if Recipe.all_objects.filter(slug=proposed_slug).exists():
            blockers.append(f"Ein aktives System-Rezept mit dem Slug „{proposed_slug}“ existiert bereits.")
        if data.get("recipe_type") not in RecipeTypeChoices.values:
            blockers.append("Ein gültiger Rezepttyp fehlt.")
        servings = data.get("portions")
        if not isinstance(servings, int) or servings < 1:
            blockers.append("Portionsangabe fehlt oder ist ungültig.")
        item_rows = data.get("items")
        if not isinstance(item_rows, list) or not item_rows:
            blockers.append("Rezeptbestandteile fehlen.")
        else:
            from supply.models import Portion
            from supply.services.portion_resolution import resolve_trusted_weight
            from supply.services.unit_resolution import resolve_canonical_unit

            for index, row in enumerate(item_rows, start=1):
                if not isinstance(row, dict):
                    blockers.append(f"Rezeptbestandteil {index} ist ungültig.")
                    continue
                ingredient = None
                ingredient_id = row.get("ingredient_id")
                ingredient_name = str(row.get("ingredient_name") or row.get("expected_ingredient_name") or "").strip()
                if ingredient_id is not None:
                    ingredient = Ingredient.objects.filter(id=ingredient_id, owner__isnull=True).first()
                    if ingredient is not None and ingredient_name and ingredient.name != ingredient_name:
                        blockers.append(
                            f"Rezeptbestandteil {index}: Zutat-ID und erwarteter Name stimmen nicht überein."
                        )
                elif ingredient_name:
                    ingredient = Ingredient.objects.filter(name__iexact=ingredient_name, owner__isnull=True).first()
                    if ingredient is None:
                        alias = (
                            IngredientAlias.objects.filter(name__iexact=ingredient_name, ingredient__owner__isnull=True)
                            .select_related("ingredient")
                            .first()
                        )
                        ingredient = alias.ingredient if alias is not None else None
                if ingredient is None:
                    blockers.append(f"Rezeptbestandteil {index}: vorhandene System-Zutat „{ingredient_name}“ fehlt.")
                    continue

                portion = None
                portion_id = row.get("portion_id")
                if portion_id is not None:
                    portion = Portion.objects.active().filter(id=portion_id, ingredient=ingredient).first()
                    expected_portion_name = str(row.get("expected_portion_name") or "").strip()
                    if portion is not None and expected_portion_name and portion.name != expected_portion_name:
                        blockers.append(f"Rezeptbestandteil {index}: Portionsname stimmt nicht.")
                else:
                    unit_name = str(row.get("unit") or row.get("measuring_unit_name") or "").strip()
                    portion = Portion.objects.active().filter(ingredient=ingredient, name__iexact=unit_name).first()
                    if portion is None:
                        unit = resolve_canonical_unit(unit_name)
                        if unit is not None:
                            portion = (
                                Portion.objects.active()
                                .filter(ingredient=ingredient, measuring_unit=unit, quantity=1)
                                .order_by("rank", "id")
                                .first()
                            )
                if portion is None or resolve_trusted_weight(portion) is None:
                    blockers.append(f"Rezeptbestandteil {index}: bestätigte Portion fehlt für {ingredient.name}.")
                try:
                    quantity = float(row.get("quantity") or 0)
                except (TypeError, ValueError):
                    quantity = 0
                if quantity <= 0:
                    blockers.append(f"Rezeptbestandteil {index}: Menge muss größer als 0 sein.")
    return blockers, warnings


def ingredient_catalog_quality_reasons(ingredient: Any) -> list[str]:
    """Return actionable data-quality reasons for a buffet-tagged ingredient."""
    reasons: list[str] = []
    valid_zero_energy_names = {"mineralwasser", "trinkwasser aus der leitung"}
    if ingredient.energy_kcal is None or (
        ingredient.energy_kcal == 0 and ingredient.name.casefold() not in valid_zero_energy_names
    ):
        reasons.append("missing_energy")
    if ingredient.status != "verified":
        reasons.append("unverified")
    if ingredient.retail_section_id is None:
        reasons.append("missing_retail_section")
    return reasons


def buffet_data_quality_report(*, page: int = 1, page_size: int = 20) -> dict[str, Any]:
    """Paginated quality and legacy-tag report; never writes data."""
    from recipe.models import Recipe
    from supply.data.buffet_role_mapping import OLD_BREAKFAST_TAG_SLUGS
    from supply.models import Ingredient

    issues: dict[tuple[str, int], dict[str, Any]] = {}
    summary = {"missing_energy": 0, "unverified": 0, "missing_retail_section": 0, "legacy_tag_carriers": 0}

    for ingredient in (
        Ingredient.objects.filter(tags__slug__in=BUFFET_ROLE_SLUGS)
        .distinct()
        .select_related("retail_section")
        .prefetch_related("tags")
    ):
        reasons = ingredient_catalog_quality_reasons(ingredient)
        if not reasons:
            continue
        summary["missing_energy"] += int("missing_energy" in reasons)
        summary["unverified"] += int("unverified" in reasons)
        summary["missing_retail_section"] += int("missing_retail_section" in reasons)
        issues[("ingredient", ingredient.id)] = {
            "item_kind": "ingredient",
            "id": ingredient.id,
            "name": ingredient.name,
            "slug": ingredient.slug,
            "role_slugs": _role_slugs(ingredient),
            "legacy_breakfast_tag_slugs": [],
            "status": ingredient.status,
            "missing_fields": reasons,
            "retail_section": ingredient.retail_section.name if ingredient.retail_section else None,
            "is_standalone_food": ingredient.is_standalone_food,
        }

    for kind, model in (("ingredient", Ingredient), ("recipe", Recipe)):
        qs = model.objects.filter(tags__slug__in=OLD_BREAKFAST_TAG_SLUGS).distinct().prefetch_related("tags")
        for item in qs:
            key = (kind, item.id)
            row = issues.get(key)
            if row is None:
                row = {
                    "item_kind": kind,
                    "id": item.id,
                    "name": _item_name(item, kind),
                    "slug": item.slug,
                    "role_slugs": _role_slugs(item),
                    "legacy_breakfast_tag_slugs": [],
                    "status": item.status,
                    "missing_fields": [],
                    "retail_section": None,
                    "is_standalone_food": None,
                }
                issues[key] = row
            row["legacy_breakfast_tag_slugs"] = sorted(
                tag.slug for tag in item.tags.all() if tag.slug in OLD_BREAKFAST_TAG_SLUGS
            )
            if "old_breakfast_tags" not in row["missing_fields"]:
                row["missing_fields"].append("old_breakfast_tags")
            summary["legacy_tag_carriers"] += 1

    rows = sorted(issues.values(), key=lambda row: (row["item_kind"], row["name"].casefold(), row["id"]))
    total = len(rows)
    page = max(1, page)
    page_size = max(1, min(page_size, 50))
    total_pages = max(1, (total + page_size - 1) // page_size)
    start = (page - 1) * page_size
    return {
        "items": rows[start : start + page_size],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "summary": summary,
    }


def preview_buffet_proposal(proposal: Any) -> dict[str, Any]:
    """Validate one proposal without changing any source or target data."""
    source, target, blockers, warnings = _source_target(proposal)
    affected: dict[str, int] = {}
    if proposal.action == "create":
        create_blockers, create_warnings = _validate_create_proposal(proposal)
        blockers.extend(create_blockers)
        warnings.extend(create_warnings)
    elif proposal.action == "merge_into" and source is not None and target is not None:
        if proposal.item_kind == "ingredient":
            from supply.services.ingredient_merge import preview_ingredient_merge

            merge_preview = preview_ingredient_merge(source, target)
            affected = {
                "recipe_items": merge_preview["affected_recipe_items"],
                "meal_items": merge_preview["affected_meal_items"],
                "portions": merge_preview["affected_portions"],
                "unit_conversions": merge_preview["affected_unit_conversions"],
            }
            if target.energy_kcal in (None, 0) and source.energy_kcal not in (None, 0):
                warnings.append("Das Ziel kann Nährwerte von der Quelle übernehmen.")
        else:
            from recipe.services.recipe_merge import preview_recipe_merge

            merge_preview = preview_recipe_merge(source, target)
            affected = {"meal_items": merge_preview["affected_meal_count"]}
    elif proposal.action == "add" and source is not None:
        for role_slug in proposal.role_slugs or []:
            if not source.tags.filter(slug=role_slug, group="buffet").exists():
                continue
            warnings.append(f"{_item_name(source, proposal.item_kind)} trägt {role_slug} bereits.")
    elif proposal.action == "untag" and source is not None:
        present = set(source.tags.filter(slug__in=proposal.role_slugs or []).values_list("slug", flat=True))
        if not present:
            warnings.append("Keine der ausgewählten Buffet-Rollen ist aktuell gesetzt.")

    current_context = {
        "source_id": source.id if source is not None else proposal.source_id,
        "source_updated_at": (
            source.updated_at.isoformat() if source is not None and getattr(source, "updated_at", None) else None
        ),
        "target_id": target.id if target is not None else proposal.target_id,
        "target_updated_at": (
            target.updated_at.isoformat() if target is not None and getattr(target, "updated_at", None) else None
        ),
        "source_snapshot": _review_snapshot(source, proposal.item_kind),
        "target_snapshot": _review_snapshot(target, proposal.item_kind),
    }
    fingerprint_data = {
        "id": proposal.id,
        "action": proposal.action,
        "kind": proposal.item_kind,
        "source_id": proposal.source_id,
        "source_expected_name": proposal.source_expected_name,
        "target_id": proposal.target_id,
        "target_expected_name": proposal.target_expected_name,
        "role_slugs": proposal.role_slugs,
        "proposed_data": proposal.proposed_data,
        "current": current_context,
        "affected_references": affected,
        "blockers": blockers,
        "warnings": warnings,
    }
    fingerprint = hashlib.sha256(json.dumps(fingerprint_data, sort_keys=True, default=str).encode()).hexdigest()
    proposed_name = str((proposal.proposed_data or {}).get("name") or (proposal.proposed_data or {}).get("title") or "")
    plan = [
        {
            "action": proposal.action,
            "item_kind": proposal.item_kind,
            "source_id": current_context["source_id"],
            "source_name": (
                _item_name(source, proposal.item_kind)
                if source is not None
                else (proposed_name or proposal.source_expected_name)
            ),
            "target_id": current_context["target_id"],
            "target_name": (
                _item_name(target, proposal.item_kind) if target is not None else proposal.target_expected_name
            ),
            "role_slugs": proposal.role_slugs or [],
            "will_write": False,
        }
    ]
    return {
        "proposal_id": proposal.id,
        "fingerprint": fingerprint,
        "can_approve": not blockers,
        "blockers": blockers,
        "warnings": warnings,
        "plan": plan,
        "affected_references": affected,
        "previewed_at": timezone.now().isoformat(),
    }
