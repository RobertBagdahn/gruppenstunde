"""Side-effect-free recipe ingredient review previews."""

from __future__ import annotations

import hashlib
from typing import TYPE_CHECKING

from django.contrib.auth.models import AbstractBaseUser

from recipe.data.ingredient_line_vocabulary import canonical_unit
from recipe.schemas.import_schemas import RecipeDraftOut
from recipe.schemas.ingredient_review import (
    IngredientDraftOut,
    IngredientMatchCandidateOut,
    IngredientReviewPreviewOut,
    IngredientReviewRowOut,
    RecipeImportSourceIn,
    ReviewPortionOut,
    ReviewSourceOut,
    ReviewTechnicalDetailsOut,
    TemporaryIngredientDraftOut,
)
from recipe.services.import_service import ImportedIngredient
from recipe.services.ingredient_line import ParsedLine, parse_line, split_compound, to_taste_default
from recipe.services.ingredient_matcher import IngredientMatcher, MatchResult
from recipe.services.ingredient_rerank import rerank_open_rows
from recipe.services.url_import_service import (
    GeminiIngredientMatch,
    _call_gemini_for_metadata,
    _merge_ingredient_sources,
    _merge_steps,
)

if TYPE_CHECKING:
    from recipe.services.unit_gram_conversion import PortionCount
    from supply.models import Portion

MISSING_QUANTITY_REASON = "Menge fehlt – bitte Menge und Portion festlegen."


def _source_label(source: RecipeImportSourceIn) -> str:
    if source.type == "url":
        return source.value
    return "Eingefügter Rezepttext"


def _source_reference(source: RecipeImportSourceIn) -> ReviewSourceOut:
    return ReviewSourceOut(type=source.type, label=_source_label(source), value=source.value)


def _row_key(index: int, source: RecipeImportSourceIn) -> str:
    digest = hashlib.sha256(source.value.encode("utf-8")).hexdigest()[:10]
    return f"ingredient-{index}-{digest}"


def _review_portion(portion: Portion) -> ReviewPortionOut:
    from supply.services.portion_resolution import resolve_trusted_weight

    return ReviewPortionOut(
        id=portion.id,
        name=portion.name,
        quantity=portion.quantity,
        weight_g=resolve_trusted_weight(portion),
        measuring_unit_id=portion.measuring_unit_id,
        measuring_unit_name=portion.measuring_unit.name if portion.measuring_unit else None,
    )


def ingredient_slug_for(ingredient_id: int | None) -> str:
    """Slug of an ingredient; the review UI loads portions by slug, so rows must carry it."""
    if ingredient_id is None:
        return ""
    from supply.models import Ingredient

    return Ingredient.objects.filter(pk=ingredient_id).values_list("slug", flat=True).first() or ""


def _portion_for_ingredient(ingredient_id: int) -> ReviewPortionOut | None:
    from supply.models import Portion

    # Many catalog ingredients have no rank-1 portion; the lowest rank stands in.
    portion = (
        Portion.objects.active()
        .filter(ingredient_id=ingredient_id)
        .select_related("measuring_unit")
        .order_by("rank", "id")
        .first()
    )
    if portion is None:
        return None
    return _review_portion(portion)


def _suggested_portion_count(
    quantity: float | None,
    unit: str,
    ingredient_id: int,
    user: AbstractBaseUser,
    memo: dict[tuple[str, int], float],
    size: str | None = None,
    hint: str = "",
) -> PortionCount | None:
    """Convert an imported quantity/unit into a count of one of the ingredient's portions.

    The returned portion is the one the count refers to (e.g. "Esslöffel" for
    "2 EL", even when "Flasche" is rank 1). Returns None when the quantity is
    missing, the unit is unknown, or no trusted portion exists — the review row
    then relies on the quantity dialog.
    """
    from supply.models import Ingredient

    if not quantity or quantity <= 0:
        return None

    from recipe.services.unit_gram_conversion import UnitGramConverter

    ingredient = Ingredient.objects.filter(id=ingredient_id, deleted_at__isnull=True).first()
    if ingredient is None:
        return None
    # Container-unit estimates are a per-ingredient AI call outside the anonymous allowlist.
    is_authenticated = user is not None and user.is_authenticated
    return UnitGramConverter.convert_to_portion(
        quantity, unit, ingredient, user=user, _memo=memo, allow_ai_estimate=is_authenticated, size=size, hint=hint
    )


def _temporary_draft(
    name: str, user: AbstractBaseUser | None, quantity: float | None = None
) -> TemporaryIngredientDraftOut:
    from recipe.services.ingredient_enrichment import enrich_ingredient

    # Anonymous previews get a name-only draft; enrichment is a per-ingredient AI
    # call outside the anonymous allowlist and runs when the logged-in user saves.
    enriched = enrich_ingredient(name, user) if user is not None and user.is_authenticated else None
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


def _parsed_line(source_ingredient: ImportedIngredient | None, ingredient: GeminiIngredientMatch) -> ParsedLine:
    """Structured line for a merged ingredient.

    Page parsers deliver a parse; pasted text and grounding results only deliver the
    model's name, quantity and unit. Their name is parsed as well ("Frischer Ingwer:
    ca. 60–80 g"); an amount found in it wins over the model's numbers.
    """
    if source_ingredient is not None and source_ingredient.parsed is not None:
        return source_ingredient.parsed
    line = parse_line(ingredient.original_name)
    if not line.has_amount and ingredient.quantity and ingredient.quantity > 0:
        line = line.model_copy(
            update={
                "quantity": ingredient.quantity,
                "unit": canonical_unit(ingredient.unit),
                "quantity_kind": "exact",
            }
        )
    return line


def _is_known_ingredient(name: str, user: AbstractBaseUser | None, memo: dict[str, bool]) -> bool:
    """True when ``name`` is the exact name or alias of a matchable ingredient."""
    key = name.strip().lower()
    if key not in memo:
        result = IngredientMatcher.match(name, user)
        memo[key] = result.ingredient_id is not None and result.confidence >= 0.95
    return memo[key]


def _row_amount(part: ParsedLine) -> tuple[float | None, str, bool, str]:
    """Quantity, unit, estimated flag and extra note for a row.

    A stated unit weight ("1 Dose (425 g)", "Lammkeule (ca. 2 kg)") turns the amount into
    grams. Lines without an amount get the "nach Belieben" default or stay open.
    """
    if part.has_amount:
        if part.unit_weight_g and part.unit not in ("g", "kg", "ml", "l"):
            return round((part.quantity or 0) * part.unit_weight_g, 2), "g", False, ""
        return part.quantity, part.unit, False, ""
    default = to_taste_default(part)
    if default is None:
        return None, "", False, ""
    quantity, unit, note = default
    return quantity, unit, True, note


def _review_row(
    *,
    match: MatchResult,
    part: ParsedLine,
    ingredient: GeminiIngredientMatch,
    is_split: bool,
    key: str,
    source: RecipeImportSourceIn,
    user: AbstractBaseUser,
    conversion_memo: dict[tuple[str, int], float],
) -> IngredientReviewRowOut:
    amount, unit, is_estimated, amount_note = _row_amount(part)
    selected_portion = _portion_for_ingredient(match.ingredient_id) if match.ingredient_id else None
    candidates = [
        IngredientMatchCandidateOut(
            id=candidate.id, name=candidate.name, slug=candidate.slug, confidence=candidate.confidence
        )
        for candidate in match.candidates
    ]
    draft = None
    # A new ingredient is only pre-filled when nothing existing comes close: with candidates
    # the user is offered those first and can still choose "Neue Zutat anlegen" explicitly.
    if match.ingredient_id is None and not match.candidates:
        draft_quantity = amount if amount and amount > 0 else 1.0
        draft = _temporary_draft(part.name or ingredient.original_name.strip(), user, quantity=draft_quantity)

    # Quantity suggestion: convert the parsed quantity/unit against the
    # matched ingredient (or the top candidate for grey-zone rows).
    quantity = None
    suggested_quantity = None
    if match.ingredient_id and selected_portion:
        suggestion = _suggested_portion_count(
            amount, unit, match.ingredient_id, user, conversion_memo, size=part.size, hint=part.query
        )
        if suggestion is not None:
            # The count belongs to the portion it was matched against, not always rank 1.
            selected_portion = _review_portion(suggestion.portion)
            suggested_quantity = suggestion.count
        quantity = suggested_quantity
    elif match.candidates:
        best_candidate = match.candidates[0]
        if _portion_for_ingredient(best_candidate.id) is not None:
            suggestion = _suggested_portion_count(
                amount, unit, best_candidate.id, user, conversion_memo, size=part.size, hint=part.query
            )
            suggested_quantity = suggestion.count if suggestion is not None else None

    # A matched row without a quantity cannot be confirmed as-is: mark it
    # open with an actionable reason instead of a silent "—".
    quantity_missing = match.ingredient_id is not None and selected_portion is not None and quantity is None
    reason = MISSING_QUANTITY_REASON if quantity_missing else match.reason
    is_unresolved = match.ingredient_id is None or selected_portion is None or quantity_missing
    note = ", ".join(value for value in (match.note or part.note, amount_note) if value)

    return IngredientReviewRowOut(
        key=key,
        source_text=part.source_line or ingredient.original_name,
        sources=[_source_reference(source)],
        selected_ingredient_id=match.ingredient_id,
        selected_ingredient_slug=ingredient_slug_for(match.ingredient_id),
        selected_ingredient_name=match.name,
        suggested_ingredient_id=match.ingredient_id,
        suggested_ingredient_name=match.name or part.name or ingredient.original_name,
        candidates=candidates,
        selected_portion=selected_portion,
        suggested_portion=selected_portion,
        quantity=quantity,
        suggested_quantity=suggested_quantity,
        quantity_estimated=is_estimated and quantity is not None,
        source_line=part.source_line if is_split else "",
        match_query=(part.query or ingredient.original_name)[:255],
        reason=reason,
        note=note,
        technical_details=ReviewTechnicalDetailsOut(
            method=match.matched_via,
            confidence=match.confidence,
            candidates=candidates,
        ),
        conflicts=[],
        new_ingredient_draft=draft,
        status="unresolved" if is_unresolved else "open",
    )


def preview_recipe_ingredients(
    sources: list[RecipeImportSourceIn],
    user: AbstractBaseUser,
) -> IngredientReviewPreviewOut:
    """Analyze sources without creating recipes, ingredients, or portions."""
    from recipe.services.url_import_service import extract_smart_recipe_input

    rows: list[IngredientReviewRowOut] = []
    group_keys: dict[str, str] = {}
    known_memo: dict[str, bool] = {}
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
        planned: list[tuple[ParsedLine, GeminiIngredientMatch, bool, MatchResult]] = []
        for index, ingredient in enumerate(extracted):
            source_ingredient = parsed.ingredients[index] if index < len(parsed.ingredients) else None
            line = _parsed_line(source_ingredient, ingredient)
            parts = split_compound(line, lambda name: _is_known_ingredient(name, user, known_memo))
            for part in parts:
                match = IngredientMatcher.match(part.query or ingredient.original_name, user, parsed=part)
                planned.append((part, ingredient, len(parts) > 1, match))
        # One AI call for all rows the matcher left open (logged-in users only).
        rerank_open_rows([(part.source_line, match) for part, _ingredient, _split, match in planned], user)
        for part, ingredient, is_split, match in planned:
            rows.append(
                _review_row(
                    match=match,
                    part=part,
                    ingredient=ingredient,
                    is_split=is_split,
                    key=_row_key(row_index, source),
                    source=source,
                    user=user,
                    conversion_memo=conversion_memo,
                )
            )
            group_keys[rows[-1].key] = part.query.strip().lower()
            row_index += 1

    # Merge the same ingredient text only across *different* sources, at most
    # once per source. Two "Mehl" lines of one recipe (dough and crumble) stay
    # separate rows with their own quantities.
    grouped: list[IngredientReviewRowOut] = []
    for row in rows:
        group_key = group_keys.get(row.key, row.source_text.strip().lower())
        row_source_values = {source.value for source in row.sources}
        existing = next(
            (
                candidate
                for candidate in grouped
                if group_keys.get(candidate.key, candidate.source_text.strip().lower()) == group_key
                and not row_source_values & {source.value for source in candidate.sources}
            ),
            None,
        )
        if existing is None:
            grouped.append(row)
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
        rows=grouped,
        sources=source_outputs,
        ai_interaction_id=interaction_ids[0] if interaction_ids else None,
        recipe_draft=recipe_draft or RecipeDraftOut(title="Unbenanntes Rezept"),
        is_reconstructed=is_reconstructed,
    )


# Duplicate hint threshold for "Vorhandene Zutat verwenden?".
DUPLICATE_MIN_CONFIDENCE = 0.7


def _draft_name(parsed: ParsedLine) -> str:
    """'Frischer Ingwer: ca. 60–80 g' → 'Ingwer'; 'Balsamico weiß' → 'Balsamico (weiß)'.

    Soft specifiers ("frisch") are no part of an ingredient name; ones that select a
    variety stay in brackets, as in the rest of the catalog.
    """
    from recipe.services.matching_index import SOFT_SPECIFIERS

    name = parsed.name.strip() or parsed.source_line.strip()
    name = name[:1].upper() + name[1:]
    varieties = [spec for spec in parsed.specifiers if spec not in SOFT_SPECIFIERS]
    return f"{name} ({', '.join(varieties)})" if varieties else name


def _amount_in_draft_portions(quantity: float | None, unit: str, draft: TemporaryIngredientDraftOut) -> float:
    """Express the source amount in the draft's first portion (fallback: 1)."""
    from recipe.data.standard_unit_weights import UNIT_WEIGHTS_G, lookup_by_keyword
    from recipe.services.unit_gram_conversion import MASS_GRAMS_PER_UNIT, STANDARD_MEASURE_KEYS, VOLUME_ML_PER_UNIT
    from supply.data.standard_measures import STANDARD_MEASURES

    if not quantity:
        return 1.0
    portion = draft.portions[0] if draft.portions else None
    unit_key = canonical_unit(unit)
    grams: float | None = None
    if unit_key in MASS_GRAMS_PER_UNIT:
        grams = quantity * MASS_GRAMS_PER_UNIT[unit_key]
    elif unit_key in VOLUME_ML_PER_UNIT:
        density = float(draft.values.get("physical_density") or 1.0)
        grams = quantity * VOLUME_ML_PER_UNIT[unit_key] * density
    elif unit_key in STANDARD_MEASURE_KEYS:
        measure = next(m for m in STANDARD_MEASURES if m.key == STANDARD_MEASURE_KEYS[unit_key])
        grams = quantity * (
            measure.grams or (measure.volume_ml or 0) * float(draft.values.get("physical_density") or 1.0)
        )
    elif unit_key in UNIT_WEIGHTS_G:
        per_unit = lookup_by_keyword(UNIT_WEIGHTS_G[unit_key], draft.name)
        grams = quantity * per_unit if per_unit else None
    if grams is None or portion is None or not portion.weight_g:
        return round(quantity, 2)
    return max(round(grams / portion.weight_g, 2), 0.01)


def new_ingredient_draft(
    source_text: str, quantity: float | None, unit: str, user: AbstractBaseUser
) -> IngredientDraftOut:
    """Build the "Zutat anlegen" draft for one review row without persisting anything."""
    line = parse_line(source_text)
    amount = quantity if quantity else (line.quantity if line.has_amount else None)
    amount_unit = unit or line.unit
    name = _draft_name(line)

    draft = _temporary_draft(name, user, quantity=1.0)
    is_enriched = bool(draft.portions)
    if not is_enriched:
        draft.portions = [
            ReviewPortionOut(name="g", quantity=1, weight_g=1.0, measuring_unit_name="Gramm", is_new=True)
        ]
    draft.quantity = _amount_in_draft_portions(amount, amount_unit, draft)

    match = IngredientMatcher.match(draft.name, user)
    duplicates = [
        IngredientMatchCandidateOut(
            id=candidate.id, name=candidate.name, slug=candidate.slug, confidence=candidate.confidence
        )
        for candidate in match.candidates
        if candidate.id == match.ingredient_id or candidate.confidence >= DUPLICATE_MIN_CONFIDENCE
    ]
    return IngredientDraftOut(draft=draft, duplicates=duplicates[:5], is_enriched=is_enriched)
