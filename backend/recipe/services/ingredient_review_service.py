"""Side-effect-free recipe ingredient review previews."""

from __future__ import annotations

import hashlib

from django.contrib.auth.models import AbstractBaseUser

from recipe.schemas.import_schemas import RecipeDraftOut
from recipe.schemas.ingredient_review import (
    IngredientMatchCandidateOut,
    IngredientReviewPreviewOut,
    IngredientReviewRowOut,
    RecipeImportSourceIn,
    ReviewPortionOut,
    ReviewSourceOut,
    ReviewTechnicalDetailsOut,
    TemporaryIngredientDraftOut,
)
from recipe.services.ingredient_matcher import IngredientMatcher
from recipe.services.url_import_service import (
    _call_gemini_for_metadata,
    _merge_ingredient_sources,
    _merge_steps,
)


def _source_label(source: RecipeImportSourceIn) -> str:
    if source.type == "url":
        return source.value
    return "Eingefügter Rezepttext"


def _source_reference(source: RecipeImportSourceIn) -> ReviewSourceOut:
    return ReviewSourceOut(type=source.type, label=_source_label(source), value=source.value)


def _row_key(index: int, source: RecipeImportSourceIn) -> str:
    digest = hashlib.sha256(source.value.encode("utf-8")).hexdigest()[:10]
    return f"ingredient-{index}-{digest}"


def _portion_for_ingredient(ingredient_id: int) -> ReviewPortionOut | None:
    from supply.models import Portion
    from supply.services.portion_resolution import resolve_trusted_weight

    portion = (
        Portion.objects.filter(ingredient_id=ingredient_id, rank=1, deleted_at__isnull=True)
        .select_related("measuring_unit")
        .first()
    )
    if portion is None:
        return None
    return ReviewPortionOut(
        id=portion.id,
        name=str(portion),
        quantity=portion.quantity,
        weight_g=resolve_trusted_weight(portion),
        measuring_unit_id=portion.measuring_unit_id,
        measuring_unit_name=portion.measuring_unit.name if portion.measuring_unit else None,
    )


def _suggested_portion_count(
    quantity: float | None,
    unit: str,
    ingredient_id: int,
    user: AbstractBaseUser,
    memo: dict[tuple[str, int], float],
) -> float | None:
    """Convert an imported quantity/unit into a portion count for an ingredient.

    Returns None when the quantity is missing, the unit is unknown, or no
    trusted portion exists — the review row then relies on the quantity dialog.
    """
    from supply.models import Ingredient

    if not quantity or quantity <= 0:
        return None

    from recipe.services.unit_gram_conversion import UnitGramConverter

    ingredient = Ingredient.objects.filter(id=ingredient_id, deleted_at__isnull=True).first()
    if ingredient is None:
        return None
    return UnitGramConverter.convert_to_portion_count(quantity, unit, ingredient, user=user, _memo=memo)


def _temporary_draft(
    name: str, user: AbstractBaseUser | None, quantity: float | None = None
) -> TemporaryIngredientDraftOut:
    from recipe.services.ingredient_enrichment import enrich_ingredient

    enriched = enrich_ingredient(name, user)
    if enriched is None:
        return TemporaryIngredientDraftOut(name=name, quantity=quantity)

    values = enriched.model_dump(exclude={"name", "aliases", "portion_name", "portion_weight_g"})
    portion = ReviewPortionOut(
        name=enriched.portion_name or "Stück",
        quantity=1,
        weight_g=enriched.portion_weight_g,
        measuring_unit_name=enriched.portion_name or "Stück",
        is_new=True,
    )
    return TemporaryIngredientDraftOut(
        name=enriched.name,
        values={**values, "aliases": enriched.aliases},
        portions=[portion],
        quantity=quantity,
    )


def _metadata_for_source(value: str, user: AbstractBaseUser):
    from recipe.services.exceptions import NoRecipeFoundError, SourceUnreachableError
    from recipe.services.import_service import import_from_url
    from recipe.services.url_import_service import _reconstruct_recipe_via_search

    is_reconstructed = False
    try:
        parsed = import_from_url(value)
    except SourceUnreachableError:
        # Same fallback as the URL import pipeline: many recipe sites block
        # automated fetches, so rebuild the data via search grounding before
        # giving up. The user is asked to verify reconstructed data.
        try:
            parsed = _reconstruct_recipe_via_search(value, user)
        except NoRecipeFoundError as exc:
            raise SourceUnreachableError("Seite blockiert und ueber die Websuche nicht rekonstruierbar.") from exc
        is_reconstructed = True
    result = _call_gemini_for_metadata(parsed=parsed, user=user)
    if isinstance(result, tuple):
        extraction, interaction_id = result
    else:
        extraction, interaction_id = result, None
    return parsed, extraction, interaction_id, is_reconstructed


def preview_recipe_ingredients(
    sources: list[RecipeImportSourceIn],
    user: AbstractBaseUser,
) -> IngredientReviewPreviewOut:
    """Analyze sources without creating recipes, ingredients, or portions."""
    from recipe.services.url_import_service import extract_smart_recipe_input

    rows: list[IngredientReviewRowOut] = []
    source_outputs = [_source_reference(source) for source in sources]
    interaction_ids: list[str] = []
    row_index = 0
    recipe_draft: RecipeDraftOut | None = None
    is_reconstructed = False

    for source in sources:
        if source.type == "url":
            parsed, extraction, interaction_id, source_reconstructed = _metadata_for_source(source.value, user)
            is_reconstructed = is_reconstructed or source_reconstructed
        else:
            _input_type, parsed, extraction = extract_smart_recipe_input(source.value, user)
            interaction_id = None

        if interaction_id:
            interaction_ids.append(str(interaction_id))

        if recipe_draft is None:
            recipe_draft = RecipeDraftOut(
                title=extraction.title or parsed.title,
                description=extraction.description or parsed.description,
                summary=extraction.summary,
                servings=parsed.servings or extraction.servings,
                preparation_time=parsed.prep_time_minutes or extraction.preparation_time,
                execution_time=parsed.cook_time_minutes or extraction.execution_time,
                recipe_type=extraction.recipe_type,
                difficulty=extraction.difficulty,
                execution_time_choice=extraction.execution_time_choice,
                preparation_time_choice=extraction.preparation_time_choice,
                scout_level_ids=extraction.scout_level_ids,
                tag_ids=extraction.tag_ids,
                steps=_merge_steps(parsed.steps, extraction.steps),
                source_url=source.value if source.type == "url" else "",
                image_url=getattr(parsed, "image_url", ""),
            )

        extracted = _merge_ingredient_sources(parsed.ingredients, extraction.ingredients)
        conversion_memo: dict[tuple[str, int], float] = {}
        for ingredient in extracted:
            match = IngredientMatcher.match(ingredient.original_name, user)
            selected_portion = _portion_for_ingredient(match.ingredient_id) if match.ingredient_id else None
            candidates = [
                IngredientMatchCandidateOut(
                    id=candidate.id, name=candidate.name, slug=candidate.slug, confidence=candidate.confidence
                )
                for candidate in match.candidates
            ]
            draft = None
            if match.ingredient_id is None:
                draft_quantity = ingredient.quantity if ingredient.quantity and ingredient.quantity > 0 else 1.0
                draft = _temporary_draft(ingredient.original_name.strip(), user, quantity=draft_quantity)

            # Quantity suggestion: convert the parsed quantity/unit against the
            # matched ingredient (or the top candidate for grey-zone rows).
            quantity = None
            suggested_quantity = None
            if match.ingredient_id and selected_portion:
                suggested_quantity = _suggested_portion_count(
                    ingredient.quantity, ingredient.unit, match.ingredient_id, user, conversion_memo
                )
                quantity = suggested_quantity
            elif match.candidates:
                best_candidate = match.candidates[0]
                if _portion_for_ingredient(best_candidate.id) is not None:
                    suggested_quantity = _suggested_portion_count(
                        ingredient.quantity, ingredient.unit, best_candidate.id, user, conversion_memo
                    )

            source_output = _source_reference(source)
            rows.append(
                IngredientReviewRowOut(
                    key=_row_key(row_index, source),
                    source_text=ingredient.original_name,
                    sources=[source_output],
                    selected_ingredient_id=match.ingredient_id,
                    selected_ingredient_name=match.name,
                    suggested_ingredient_id=match.ingredient_id,
                    suggested_ingredient_name=match.name or ingredient.original_name,
                    candidates=candidates,
                    selected_portion=selected_portion,
                    suggested_portion=selected_portion,
                    quantity=quantity,
                    suggested_quantity=suggested_quantity,
                    reason=match.reason,
                    technical_details=ReviewTechnicalDetailsOut(
                        method=match.matched_via,
                        confidence=match.confidence,
                        candidates=candidates,
                    ),
                    conflicts=[],
                    new_ingredient_draft=draft,
                    status="unresolved" if match.ingredient_id is None or selected_portion is None else "open",
                )
            )
            row_index += 1

    grouped: dict[str, IngredientReviewRowOut] = {}
    for row in rows:
        group_key = row.source_text.strip().lower()
        existing = grouped.get(group_key)
        if existing is None:
            grouped[group_key] = row
            continue
        if existing.quantity != row.quantity:
            existing.conflicts.append(
                f"Mengenabweichung: {existing.quantity or '—'} gegenüber {row.quantity or '—'} ({row.sources[0].label if row.sources else 'Quelle'})"
            )
            existing.status = "unresolved"
        existing.sources.extend(source for source in row.sources if source not in existing.sources)
        if existing.selected_ingredient_id != row.selected_ingredient_id:
            existing.conflicts.append("Die Quellen schlagen unterschiedliche Zutaten-Zuordnungen vor.")
            existing.status = "unresolved"

    return IngredientReviewPreviewOut(
        rows=list(grouped.values()),
        sources=source_outputs,
        ai_interaction_id=interaction_ids[0] if interaction_ids else None,
        recipe_draft=recipe_draft or RecipeDraftOut(title="Unbenanntes Rezept"),
        is_reconstructed=is_reconstructed,
    )
