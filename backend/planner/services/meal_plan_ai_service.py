"""AI service for meal plan suggestion generation using Vertex AI Gemini."""

import datetime as dt
import logging
from typing import Any

from django.contrib.auth.models import AbstractBaseUser
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from google.genai import types as genai_types
from pydantic import BaseModel, Field, ValidationError

from content.choices import ContentStatus
from core.services.gemini import GeminiInvalidResponseError, GeminiUnavailableError, gemini_call
from planner.models import Meal, MealItem
from planner.schemas.ai_generation import AiApplyOut, SkippedItem
from recipe.models import Recipe

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.1-flash-lite"
AI_TIMEOUT_SECONDS = 60

REQUIRED_MEAL_TYPES = ["breakfast", "lunch", "dinner"]


class GeminiSuggestedMeal(BaseModel):
    meal_type: str = Field(description="One of: breakfast, lunch, dinner, snack")
    candidate_id: int | None = Field(
        default=None,
        description="ID of candidate from provided list (breakfast ID for breakfast, recipe ID for others)",
    )
    recipe_id: int | None = Field(
        default=None,
        description="Recipe ID if specifying a direct recipe",
    )
    title: str = Field(default="", description="Title of the dish for display purposes")
    recipe_title: str | None = Field(default=None, description="Optional title alias")

    def get_id(self) -> int | None:
        return self.candidate_id if self.candidate_id is not None else self.recipe_id

    def get_title(self) -> str:
        return self.title or self.recipe_title or ""


class GeminiSuggestedDay(BaseModel):
    date: str = Field(description="Date in YYYY-MM-DD format")
    meals: list[GeminiSuggestedMeal] = Field(
        description="List of meals for this day (at least breakfast, lunch, dinner)"
    )


class GeminiMealPlanSuggestion(BaseModel):
    days: list[GeminiSuggestedDay]


class MealPlanAiService:
    def _get_breakfast_candidates(self, user: AbstractBaseUser | None = None) -> list[dict[str, Any]]:
        """
        Extract curated breakfast options from existing meals with items,
        reference meals, and approved breakfast recipes.
        Restricted to public templates, verified plans, or user's own plans for privacy.
        """
        candidates: list[dict[str, Any]] = []
        seen_signatures: set[tuple[str, ...]] = set()

        # 1. Existing meals with items (privacy: only templates, verified plans, or user's own plans)
        access_filter = Q(meal_plan__is_template=True) | Q(meal_plan__owner__isnull=True)
        if user and user.is_authenticated:
            access_filter |= Q(meal_plan__created_by=user)

        meals_qs = (
            Meal.objects.filter(meal_type="breakfast", items__isnull=False)
            .filter(access_filter)
            .distinct()
            .order_by("-id")
        )
        for meal in meals_qs:
            items = list(meal.items.select_related("recipe", "ingredient", "measuring_unit"))
            if not items:
                continue
            item_titles = []
            items_data: list[dict[str, Any]] = []
            has_breakfast_component = False
            for it in items:
                if it.recipe:
                    title = it.recipe.title
                    if it.recipe.recipe_type in ["breakfast", "drink", "dessert"]:
                        has_breakfast_component = True
                elif it.ingredient:
                    title = it.ingredient.name
                    has_breakfast_component = True
                else:
                    title = it.display_name or "Zutat"

                item_titles.append(title)
                items_data.append(
                    {
                        "recipe_id": it.recipe_id,
                        "ingredient_id": it.ingredient_id,
                        "title": title,
                        "quantity": float(it.quantity) if it.quantity is not None else None,
                        "unit": it.measuring_unit.name if it.measuring_unit else None,
                    }
                )

            if not has_breakfast_component:
                continue

            sig = tuple(sorted(item_titles))
            if sig in seen_signatures:
                continue
            seen_signatures.add(sig)

            if len(items) == 1 and items[0].recipe:
                title = items[0].recipe.title
            else:
                title = f"Frühstücksbuffet ({', '.join(item_titles[:3])})"

            candidates.append(
                {
                    "id": len(candidates) + 1,
                    "source_meal_id": meal.id,
                    "recipe_id": items[0].recipe_id if len(items) == 1 else None,
                    "title": title,
                    "summary": ", ".join(item_titles),
                    "items": items_data,
                }
            )
            if len(candidates) >= 12:
                break

        # 2. Approved standalone breakfast recipes
        recipes = Recipe.objects.filter(
            recipe_type="breakfast",
            status=ContentStatus.APPROVED,
        ).order_by("-usage_count", "-like_score")
        for rec in recipes:
            sig = (rec.title,)
            if sig in seen_signatures:
                continue
            seen_signatures.add(sig)
            candidates.append(
                {
                    "id": len(candidates) + 1,
                    "source_meal_id": None,
                    "recipe_id": rec.id,
                    "title": rec.title,
                    "summary": rec.title,
                    "items": [
                        {
                            "recipe_id": rec.id,
                            "ingredient_id": None,
                            "title": rec.title,
                            "quantity": None,
                            "unit": None,
                        }
                    ],
                }
            )
            if len(candidates) >= 20:
                break

        # 3. Guaranteed fallbacks if DB has no data
        if not candidates:
            fallbacks = [
                ("Klassische Pfadfinder-Brotzeit", ["Bauernbrot", "Butter", "Gouda", "Marmelade", "Gurke"]),
                ("Müsli & Obst-Frühstück", ["Haferflocken", "Milch", "Naturjoghurt", "Äpfel", "Bananen"]),
                ("Warmes Porridge-Frühstück", ["Haferflocken", "Milch", "Honig", "Zimt", "Beeren"]),
                ("Rührei & frisches Brot", ["Eier", "Butter", "Graubrot", "Schnittlauch"]),
            ]
            for idx, (title, comps) in enumerate(fallbacks, 1):
                candidates.append(
                    {
                        "id": idx,
                        "source_meal_id": None,
                        "recipe_id": None,
                        "title": title,
                        "summary": ", ".join(comps),
                        "items": [
                            {"recipe_id": None, "ingredient_id": None, "title": c, "quantity": 100.0, "unit": "g"}
                            for c in comps
                        ],
                    }
                )

        return candidates

    def _get_recipe_candidates(
        self,
        *,
        prompt: str,
        nutritional_tag_ids: list[int] | None = None,
        budget_per_person_per_day: float | None = None,
    ) -> dict[str, list[dict[str, Any]]]:
        """
        Fetch approved recipes split into warm_meal, cold_meal, and snack,
        scored and sorted by child-friendliness and popularity.
        """
        qs = Recipe.objects.filter(status=ContentStatus.APPROVED)

        # Dietary tags filter
        if nutritional_tag_ids:
            qs = qs.filter(nutritional_tags__id__in=nutritional_tag_ids).distinct()

        prompt_lower = prompt.lower()
        is_child_focused = any(kw in prompt_lower for kw in ["kind", "wölfl", "jupfi", "jungpfadfinder", "jugend"])

        kid_friendly_keywords = [
            "nudel",
            "pasta",
            "spaghetti",
            "pizza",
            "pfannkuchen",
            "curry",
            "kartoffel",
            "burger",
            "lasagne",
            "milchreis",
            "gulasch",
            "spätzle",
            "schupfnudel",
            "supp",
            "wrap",
        ]

        def score_recipe(rec: Recipe) -> float:
            score = float(rec.usage_count or 0) * 1.5 + float(rec.like_score or 0)
            if is_child_focused:
                title_lower = rec.title.lower()
                if any(kw in title_lower for kw in kid_friendly_keywords):
                    score += 25.0
                levels = [sl.name.lower() for sl in rec.scout_levels.all()]
                if any("wölfl" in l or "jung" in l for l in levels):
                    score += 20.0
            return score

        all_recipes = list(qs.prefetch_related("scout_levels", "tags"))

        warm_meals: list[tuple[float, dict[str, Any]]] = []
        cold_meals: list[tuple[float, dict[str, Any]]] = []
        snacks: list[tuple[float, dict[str, Any]]] = []

        for r in all_recipes:
            sc = score_recipe(r)
            entry = {
                "id": r.id,
                "title": r.title,
                "type": r.recipe_type,
                "score": sc,
            }
            if r.recipe_type == "warm_meal":
                warm_meals.append((sc, entry))
            elif r.recipe_type == "cold_meal":
                cold_meals.append((sc, entry))
            elif r.recipe_type in ["snack", "dessert"]:
                snacks.append((sc, entry))

        warm_meals.sort(key=lambda x: x[0], reverse=True)
        cold_meals.sort(key=lambda x: x[0], reverse=True)
        snacks.sort(key=lambda x: x[0], reverse=True)

        return {
            "warm_meals": [item[1] for item in warm_meals[:40]],
            "cold_meals": [item[1] for item in cold_meals[:25]],
            "snacks": [item[1] for item in snacks[:20]],
        }

    def _ensure_complete_plan(
        self,
        days_data: list[dict[str, Any]],
        start_date_str: str,
        num_days: int,
        breakfast_candidates: list[dict[str, Any]],
        recipe_candidates_map: dict[int, dict[str, Any]],
    ) -> list[dict[str, Any]]:
        """
        Guarantee 100% complete days with all required meal slots (breakfast, lunch, dinner).
        Replaces missing, empty, or invalid slots with appropriate rotating candidates
        and prevents consecutive-day duplicates.
        """
        try:
            start_date = dt.date.fromisoformat(start_date_str)
        except (ValueError, TypeError):
            start_date = timezone.now().date()

        breakfast_by_id = {b["id"]: b for b in breakfast_candidates}
        breakfast_by_recipe = {b["recipe_id"]: b for b in breakfast_candidates if b.get("recipe_id")}

        # Separate main candidates
        warm_candidates = [r for r in recipe_candidates_map.values() if r.get("type") == "warm_meal"]
        cold_candidates = [r for r in recipe_candidates_map.values() if r.get("type") == "cold_meal"]
        main_candidates = warm_candidates + cold_candidates

        # Map provided days by date string
        incoming_by_date = {}
        for d in days_data:
            d_date = d.get("date")
            if d_date:
                incoming_by_date[str(d_date)] = d.get("meals", [])

        completed_days: list[dict[str, Any]] = []
        last_lunch_id: int | None = None
        last_dinner_id: int | None = None
        main_cursor = 0

        for day_idx in range(num_days):
            current_date = start_date + dt.timedelta(days=day_idx)
            date_str = current_date.isoformat()
            incoming_meals = incoming_by_date.get(date_str, [])

            # Categorize incoming meals by meal_type
            incoming_by_type: dict[str, dict[str, Any]] = {}
            for m in incoming_meals:
                m_type = m.get("meal_type")
                if m_type and m_type not in incoming_by_type:
                    incoming_by_type[m_type] = m

            day_meals: list[dict[str, Any]] = []

            # 1. Breakfast slot
            bf_meal = incoming_by_type.get("breakfast")
            bf_cand = None
            if bf_meal:
                cand_id = bf_meal.get("candidate_id") or bf_meal.get("recipe_id")
                if cand_id in breakfast_by_id:
                    bf_cand = breakfast_by_id[cand_id]
                elif cand_id in breakfast_by_recipe:
                    bf_cand = breakfast_by_recipe[cand_id]

            if not bf_cand:
                # Auto-fill fallback from breakfast candidates pool
                bf_cand = breakfast_candidates[day_idx % len(breakfast_candidates)]

            day_meals.append(
                {
                    "meal_type": "breakfast",
                    "recipe_id": bf_cand.get("recipe_id"),
                    "recipe_title": bf_cand["title"],
                    "source_meal_id": bf_cand.get("source_meal_id"),
                    "items": bf_cand.get("items", []),
                }
            )

            # Helper to pick unique main dish
            def pick_main_dish(exclude_ids: set[int | None]) -> dict[str, Any]:
                nonlocal main_cursor
                if not main_candidates:
                    return {"id": 1, "title": "Gemüse-Eintopf mit Kartoffeln", "type": "warm_meal"}
                for _ in range(len(main_candidates)):
                    cand = main_candidates[main_cursor % len(main_candidates)]
                    main_cursor += 1
                    if cand["id"] not in exclude_ids:
                        return cand
                # If all excluded, take current
                cand = main_candidates[main_cursor % len(main_candidates)]
                main_cursor += 1
                return cand

            # 2. Lunch slot
            lunch_meal = incoming_by_type.get("lunch")
            lunch_cand = None
            if lunch_meal:
                cand_id = lunch_meal.get("candidate_id") or lunch_meal.get("recipe_id")
                if cand_id in recipe_candidates_map:
                    rc = recipe_candidates_map[cand_id]
                    if rc.get("type") in ["warm_meal", "cold_meal"] and cand_id != last_lunch_id:
                        lunch_cand = rc

            if not lunch_cand:
                lunch_cand = pick_main_dish({last_lunch_id})

            last_lunch_id = lunch_cand["id"]
            day_meals.append(
                {
                    "meal_type": "lunch",
                    "recipe_id": lunch_cand["id"],
                    "recipe_title": lunch_cand["title"],
                    "source_meal_id": None,
                    "items": [
                        {
                            "recipe_id": lunch_cand["id"],
                            "ingredient_id": None,
                            "title": lunch_cand["title"],
                            "quantity": None,
                            "unit": None,
                        }
                    ],
                }
            )

            # 3. Dinner slot
            dinner_meal = incoming_by_type.get("dinner")
            dinner_cand = None
            if dinner_meal:
                cand_id = dinner_meal.get("candidate_id") or dinner_meal.get("recipe_id")
                if cand_id in recipe_candidates_map:
                    rc = recipe_candidates_map[cand_id]
                    if (
                        rc.get("type") in ["warm_meal", "cold_meal"]
                        and cand_id != last_dinner_id
                        and cand_id != last_lunch_id
                    ):
                        dinner_cand = rc

            if not dinner_cand:
                dinner_cand = pick_main_dish({last_lunch_id, last_dinner_id})

            last_dinner_id = dinner_cand["id"]
            day_meals.append(
                {
                    "meal_type": "dinner",
                    "recipe_id": dinner_cand["id"],
                    "recipe_title": dinner_cand["title"],
                    "source_meal_id": None,
                    "items": [
                        {
                            "recipe_id": dinner_cand["id"],
                            "ingredient_id": None,
                            "title": dinner_cand["title"],
                            "quantity": None,
                            "unit": None,
                        }
                    ],
                }
            )

            # 4. Optional snack slot
            snack_meal = incoming_by_type.get("snack")
            if snack_meal:
                cand_id = snack_meal.get("candidate_id") or snack_meal.get("recipe_id")
                if cand_id in recipe_candidates_map:
                    rc = recipe_candidates_map[cand_id]
                    if rc.get("type") in ["snack", "dessert"]:
                        day_meals.append(
                            {
                                "meal_type": "snack",
                                "recipe_id": rc["id"],
                                "recipe_title": rc["title"],
                                "source_meal_id": None,
                                "items": [
                                    {
                                        "recipe_id": rc["id"],
                                        "ingredient_id": None,
                                        "title": rc["title"],
                                        "quantity": None,
                                        "unit": None,
                                    }
                                ],
                            }
                        )

            completed_days.append(
                {
                    "date": date_str,
                    "meals": day_meals,
                }
            )

        return completed_days

    def generate_suggestions(
        self,
        *,
        prompt: str,
        num_persons: int,
        num_days: int,
        start_date: str,
        nutritional_tag_ids: list[int] | None = None,
        budget_per_person_per_day: float | None = None,
        user: AbstractBaseUser | None = None,
    ) -> dict:
        """
        Generate meal plan suggestions via Gemini using candidate injection.
        Guarantees 100% complete days with plausible breakfasts and main dishes.
        """
        from supply.models import NutritionalTag

        constraints_parts = []
        if nutritional_tag_ids:
            tags = NutritionalTag.objects.filter(id__in=nutritional_tag_ids)
            tag_names = [t.name_opposite or t.name for t in tags]
            if tag_names:
                constraints_parts.append(
                    f"Ernährungseinschränkungen: {', '.join(tag_names)}. " "Schlage nur konforme Gerichte vor."
                )
        if budget_per_person_per_day is not None:
            constraints_parts.append(
                f"Budget: maximal {budget_per_person_per_day:.2f} EUR pro Person und Tag. "
                "Wähle preiswerte, wirtschaftliche Gerichte."
            )

        constraints_text = (
            "\n".join(constraints_parts) if constraints_parts else "Keine speziellen Diät- oder Budgetvorgaben."
        )

        breakfast_candidates = self._get_breakfast_candidates(user=user)
        recipe_candidates_dict = self._get_recipe_candidates(
            prompt=prompt,
            nutritional_tag_ids=nutritional_tag_ids,
            budget_per_person_per_day=budget_per_person_per_day,
        )

        all_recipes_map: dict[int, dict[str, Any]] = {}
        for r in (
            recipe_candidates_dict["warm_meals"]
            + recipe_candidates_dict["cold_meals"]
            + recipe_candidates_dict["snacks"]
        ):
            all_recipes_map[r["id"]] = r

        # Format candidates for prompt
        breakfast_lines = [f"- ID {b['id']}: {b['title']} (Bestandteile: {b['summary']})" for b in breakfast_candidates]
        warm_lines = [f"- ID {r['id']}: {r['title']}" for r in recipe_candidates_dict["warm_meals"]]
        cold_lines = [f"- ID {r['id']}: {r['title']}" for r in recipe_candidates_dict["cold_meals"]]
        snack_lines = [f"- ID {r['id']}: {r['title']}" for r in recipe_candidates_dict["snacks"]]

        breakfast_str = "\n".join(breakfast_lines) if breakfast_lines else "- Keine Frühstücks-Optionen"
        warm_str = "\n".join(warm_lines) if warm_lines else "- Keine warmen Gerichte"
        cold_str = "\n".join(cold_lines) if cold_lines else "- Keine kalten Gerichte"
        snack_str = "\n".join(snack_lines) if snack_lines else "- Keine Snacks"

        system_prompt = (
            "Du bist ein erfahrener Menüplan-Assistent für deutsche Pfadfinder-Lager und Jugendfreizeiten.\n"
            f"Erstelle einen vollständigen, ausgewogenen und schmackhaften Menüplan für {num_days} Tage ab {start_date}.\n\n"
            f"Beschreibung der Gruppe/Wünsche: {prompt}\n"
            f"Teilnehmeranzahl: {num_persons}\n"
            f"{constraints_text}\n\n"
            f"=== VERFÜGBARE FRÜHSTÜCKS-OPTIONEN (wähle für 'breakfast') ===\n{breakfast_str}\n\n"
            f"=== VERFÜGBARE WARME GERICHTE (wähle für 'lunch' oder 'dinner') ===\n{warm_str}\n\n"
            f"=== VERFÜGBARE KALTE GERICHTE (wähle für 'lunch' oder 'dinner') ===\n{cold_str}\n\n"
            f"=== VERFÜGBARE SNACKS (optional für 'snack') ===\n{snack_str}\n\n"
            "REGELN:\n"
            "1. Jeder Tag MUSS mindestens 'breakfast', 'lunch' und 'dinner' enthalten (optional 'snack').\n"
            "2. Wähle für 'breakfast' als candidate_id eine ID aus den FRÜHSTÜCKS-OPTIONEN.\n"
            "3. Wähle für 'lunch' und 'dinner' als candidate_id eine ID aus den WARMEN oder KALTEN GERICHTEN.\n"
            "4. Wähle für 'snack' als candidate_id eine ID aus den SNACKS.\n"
            "5. Wiederhole nicht dasselbe Mittag- oder Abendessen an aufeinanderfolgenden Tagen.\n"
            "6. WÄHLE NUR AUS DEN OBIGEN LISTEN. Erfinde niemals neue IDs!\n"
            "7. Verwende das Datumsformat YYYY-MM-DD ab dem Startdatum.\n"
        )

        response, _interaction_id = gemini_call(
            user=user,
            model=GEMINI_MODEL,
            contents=system_prompt,
            config=genai_types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=GeminiMealPlanSuggestion,
                http_options=genai_types.HttpOptions(timeout=AI_TIMEOUT_SECONDS * 1000),
            ),
            context="meal_plan_ai_suggest",
        )

        if response is None:
            raise GeminiUnavailableError("KI nicht erreichbar. Bitte versuche es später erneut.")

        try:
            result = GeminiMealPlanSuggestion.model_validate_json(response.text)
            raw_days = [day.model_dump() for day in result.days]
        except (ValidationError, Exception) as e:
            logger.error("AI meal plan response validation failed: %s", e)
            raise GeminiInvalidResponseError("KI-Antwort konnte nicht verarbeitet werden.")

        # Ensure 100% complete plan with auto-fill fallback
        complete_days = self._ensure_complete_plan(
            days_data=raw_days,
            start_date_str=start_date,
            num_days=num_days,
            breakfast_candidates=breakfast_candidates,
            recipe_candidates_map=all_recipes_map,
        )

        return {"days": complete_days}

    def apply_suggestions(
        self,
        meal_plan,
        suggestions_data: dict,
    ) -> AiApplyOut:
        """Apply AI suggestions to a meal plan.

        Creates MealItems for each suggested meal:
        - For breakfasts with multi-items (ingredients or recipes): copies all items.
        - For single recipes: creates MealItem with factor=1.0.
        """
        with transaction.atomic():
            skipped_items: list[SkippedItem] = []
            applied_count = 0

            days = suggestions_data.get("days", [])
            for day_idx, day_data in enumerate(days):
                day_date = day_data["date"]
                if isinstance(day_date, str):
                    day_date = dt.datetime.strptime(day_date, "%Y-%m-%d").date()

                is_first = day_idx == 0
                is_last = day_idx == len(days) - 1
                meal_plan.create_meals_for_date_timeaware(day_date, is_first=is_first, is_last=is_last)

                for meal_data in day_data.get("meals", []):
                    meal_type = meal_data.get("meal_type")
                    recipe_id = meal_data.get("recipe_id")
                    items_payload = meal_data.get("items") or []

                    from planner.models import MealTypeChoices

                    if meal_type not in MealTypeChoices.values:
                        skipped_items.append(
                            SkippedItem(
                                day=day_date,
                                meal_type=meal_type or "unknown",
                                recipe_id=recipe_id,
                                reason=f"Mahlzeit-Typ '{meal_type}' ist an diesem Tag nicht verfügbar",
                            )
                        )
                        continue

                    meal = Meal.objects.filter(
                        meal_plan=meal_plan,
                        start_datetime__date=day_date,
                        meal_type=meal_type,
                    ).first()

                    if not meal:
                        mt_start, mt_end = meal_plan._meal_times_for_type(meal_type)
                        start_dt = timezone.make_aware(dt.datetime.combine(day_date, mt_start))
                        end_dt = timezone.make_aware(dt.datetime.combine(day_date, mt_end))
                        factor = (meal_plan.day_part_factors or {}).get(meal_type, 0.25)
                        meal, _ = Meal.objects.get_or_create(
                            meal_plan=meal_plan,
                            start_datetime__date=day_date,
                            meal_type=meal_type,
                            defaults={
                                "start_datetime": start_dt,
                                "end_datetime": end_dt,
                                "day_part_factor": factor,
                            },
                        )

                    # Multi-item breakfast or meal
                    if items_payload:
                        created_any = False
                        seen_ingredients = set()
                        for it in items_payload:
                            r_id = it.get("recipe_id")
                            i_id = it.get("ingredient_id")
                            if r_id:
                                recipe = Recipe.objects.filter(id=r_id).first()
                                if recipe:
                                    if meal_plan.created_by:
                                        from content.services.food_access import visible_recipe_queryset

                                        if not visible_recipe_queryset(meal_plan.created_by).filter(id=r_id).exists():
                                            continue
                                    MealItem.objects.create(
                                        meal=meal,
                                        recipe_id=r_id,
                                        factor=1.0,
                                    )
                                    created_any = True
                            elif i_id:
                                from supply.models import Ingredient, MeasuringUnit

                                if i_id in seen_ingredients:
                                    continue
                                ing = Ingredient.objects.filter(id=i_id).first()
                                if not ing:
                                    continue
                                if meal_plan.created_by:
                                    from content.services.food_access import visible_ingredient_queryset

                                    if not visible_ingredient_queryset(meal_plan.created_by).filter(id=i_id).exists():
                                        continue
                                seen_ingredients.add(i_id)

                                # Resolve unit
                                unit_str = it.get("unit")
                                measuring_unit = None
                                if unit_str:
                                    measuring_unit = MeasuringUnit.objects.filter(name__iexact=unit_str).first()
                                if not measuring_unit:
                                    p1 = (
                                        ing.portions.filter(rank=1, deleted_at__isnull=True)
                                        .select_related("measuring_unit")
                                        .first()
                                    )
                                    if p1 and p1.measuring_unit:
                                        measuring_unit = p1.measuring_unit
                                if not measuring_unit:
                                    measuring_unit = MeasuringUnit.objects.filter(name__in=["g", "Gramm"]).first()

                                MealItem.objects.create(
                                    meal=meal,
                                    ingredient_id=i_id,
                                    quantity=it.get("quantity") or 100.0,
                                    measuring_unit=measuring_unit,
                                    factor=1.0,
                                )
                                created_any = True

                        if created_any:
                            applied_count += 1
                        else:
                            skipped_items.append(
                                SkippedItem(
                                    day=day_date,
                                    meal_type=meal_type,
                                    recipe_id=recipe_id,
                                    reason="Keine gültigen Items im Vorschlag",
                                )
                            )
                    elif recipe_id:
                        recipe = Recipe.objects.filter(id=recipe_id).first()
                        if not recipe:
                            skipped_items.append(
                                SkippedItem(
                                    day=day_date,
                                    meal_type=meal_type,
                                    recipe_id=recipe_id,
                                    reason="Rezept nicht gefunden",
                                )
                            )
                            continue

                        # Check permission if meal plan has a creator
                        if meal_plan.created_by:
                            from content.services.food_access import visible_recipe_queryset

                            if not visible_recipe_queryset(meal_plan.created_by).filter(id=recipe_id).exists():
                                skipped_items.append(
                                    SkippedItem(
                                        day=day_date,
                                        meal_type=meal_type,
                                        recipe_id=recipe_id,
                                        reason="Keine Berechtigung für dieses Rezept",
                                    )
                                )
                                continue

                        MealItem.objects.create(
                            meal=meal,
                            recipe_id=recipe_id,
                            factor=1.0,
                        )
                        applied_count += 1
                    else:
                        skipped_items.append(
                            SkippedItem(
                                day=day_date,
                                meal_type=meal_type,
                                recipe_id=None,
                                reason="Weder Rezept noch Items vorhanden",
                            )
                        )

            return AiApplyOut(
                applied=applied_count,
                skipped=len(skipped_items),
                skipped_items=skipped_items,
            )
