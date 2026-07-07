"""
Content API — AI endpoints.
"""

import json
import logging

from django.http import HttpResponse
from ninja import Router
from ninja.errors import HttpError

from content.schemas.ai import (
    AiErrorOut,
    AiGenerateImageIn,
    AiGenerateImageOut,
    AiImproveTextIn,
    AiImproveTextOut,
    AiRefurbishIn,
    AiRefurbishOut,
    AiSuggestSuppliesIn,
    AiSuggestSuppliesOut,
    AiSuggestTagsIn,
    AiSuggestTagsOut,
)
from content.schemas.ai_interaction import AiVoteIn, AiVoteOut

logger = logging.getLogger(__name__)

router = Router(tags=["content"])


@router.post(
    "/ai/improve-text/",
    response={200: AiImproveTextOut, 429: AiErrorOut, 500: AiErrorOut},
    url_name="content_ai_improve_text",
)
def ai_improve_text(request, payload: AiImproveTextIn):
    """Improve text using AI: grammar, style, clarity."""
    from content.services.ai_service import AiRateLimitError, ContentAIService

    service = ContentAIService()
    try:
        result = service.improve_text(payload.text, payload.context, user=request.user)
    except AiRateLimitError as exc:
        logger.warning("AI improve-text rate limited: %s", exc)
        return HttpResponse(
            json.dumps({"detail": exc.detail, "error_code": exc.error_code}),
            status=429,
            content_type="application/json",
        )
    except HttpError:
        raise
    except Exception:
        logger.exception("AI improve-text unexpected error")
        return HttpResponse(
            json.dumps(
                {
                    "detail": "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.",
                    "error_code": "AI_INTERNAL_ERROR",
                }
            ),
            status=500,
            content_type="application/json",
        )
    return {"improved_text": result}


@router.post("/ai/suggest-tags/", response=AiSuggestTagsOut, url_name="content_ai_suggest_tags")
def ai_suggest_tags(request, payload: AiSuggestTagsIn):
    """Suggest tags for content based on title and description."""
    from content.services.ai_service import ContentAIService

    text = f"{payload.title}\n{payload.description}".strip()
    service = ContentAIService()
    return service.suggest_tags(text, user=request.user)


@router.post(
    "/ai/refurbish/",
    response={200: AiRefurbishOut, 500: AiErrorOut, 502: AiErrorOut, 503: AiErrorOut, 504: AiErrorOut},
    url_name="content_ai_refurbish",
)
def ai_refurbish(request, payload: AiRefurbishIn):
    """Convert raw unformatted text into a structured content item using AI."""
    from content.services.ai_service import (
        AiInvalidResponseError,
        AiTimeoutError,
        AiUnavailableError,
        ContentAIService,
    )

    logger.info(
        "Content AI refurbish called – content_type=%s, input length=%d", payload.content_type, len(payload.raw_text)
    )

    service = ContentAIService()
    try:
        result = service.refurbish(payload.raw_text, content_type=payload.content_type, user=request.user)
    except AiTimeoutError as exc:
        logger.warning("AI refurbish timeout: %s", exc)
        return HttpResponse(
            json.dumps({"detail": exc.detail, "error_code": exc.error_code}),
            status=504,
            content_type="application/json",
        )
    except AiUnavailableError as exc:
        logger.warning("AI refurbish unavailable: %s", exc)
        return HttpResponse(
            json.dumps({"detail": exc.detail, "error_code": exc.error_code}),
            status=503,
            content_type="application/json",
        )
    except AiInvalidResponseError as exc:
        logger.warning("AI refurbish invalid response: %s", exc)
        return HttpResponse(
            json.dumps({"detail": exc.detail, "error_code": exc.error_code}),
            status=502,
            content_type="application/json",
        )
    except HttpError:
        raise
    except Exception:
        logger.exception("AI refurbish unexpected error")
        return HttpResponse(
            json.dumps(
                {
                    "detail": "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.",
                    "error_code": "AI_INTERNAL_ERROR",
                }
            ),
            status=500,
            content_type="application/json",
        )

    # For recipes, also extract ingredient suggestions using existing supply service
    if payload.content_type == "recipe":
        try:
            from content.services.ai_supply_service import (
                match_ingredients_to_database,
                suggest_recipe_supplies,
            )

            raw = suggest_recipe_supplies(
                title=result.get("title", ""),
                description=result.get("description", ""),
                user=request.user,
            )
            result["suggested_ingredients"] = match_ingredients_to_database(raw.get("ingredients", []))
        except Exception:
            logger.warning("AI ingredient suggestion failed during refurbish, continuing without ingredients")
            result["suggested_ingredients"] = []
    else:
        result["suggested_ingredients"] = []

    return result


@router.post(
    "/ai/generate-image/",
    response={200: AiGenerateImageOut, 500: AiErrorOut, 502: AiErrorOut, 503: AiErrorOut, 504: AiErrorOut},
    url_name="content_ai_generate_image",
)
def ai_generate_image(request, payload: AiGenerateImageIn):
    """Generate title images using AI."""
    from content.services.ai_service import (
        AiInvalidResponseError,
        AiTimeoutError,
        AiUnavailableError,
        ContentAIService,
    )

    logger.info(
        "Content AI generate-image called – content_type=%s, prompt=%s", payload.content_type, payload.prompt[:200]
    )

    service = ContentAIService()
    try:
        image_urls = service.generate_images(
            prompt=payload.prompt,
            title=payload.title,
            summary=payload.summary,
            content_type=payload.content_type,
            ingredients=payload.ingredients,
            user=request.user,
        )
    except AiTimeoutError as exc:
        logger.warning("AI image generation timeout: %s", exc)
        return HttpResponse(
            json.dumps({"detail": exc.detail, "error_code": exc.error_code}),
            status=504,
            content_type="application/json",
        )
    except AiUnavailableError as exc:
        logger.warning("AI image generation unavailable: %s", exc)
        return HttpResponse(
            json.dumps({"detail": exc.detail, "error_code": exc.error_code}),
            status=503,
            content_type="application/json",
        )
    except AiInvalidResponseError as exc:
        logger.warning("AI image generation invalid response: %s", exc)
        return HttpResponse(
            json.dumps({"detail": exc.detail, "error_code": exc.error_code}),
            status=502,
            content_type="application/json",
        )
    except HttpError:
        raise
    except Exception:
        logger.exception("AI image generation unexpected error")
        return HttpResponse(
            json.dumps(
                {
                    "detail": "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.",
                    "error_code": "AI_INTERNAL_ERROR",
                }
            ),
            status=500,
            content_type="application/json",
        )

    return {"image_urls": image_urls}


@router.post(
    "/ai/suggest-supplies/",
    response={200: AiSuggestSuppliesOut, 500: AiErrorOut},
    url_name="content_ai_suggest_supplies",
)
def ai_suggest_supplies(request, payload: AiSuggestSuppliesIn):
    """Suggest materials and/or ingredients for content using AI."""
    from content.services.ai_supply_service import (
        match_ingredients_to_database,
        match_materials_to_database,
        suggest_materials,
        suggest_recipe_supplies,
    )

    logger.info("Content AI suggest-supplies called – content_type=%s", payload.content_type)

    try:
        if payload.content_type == "recipe":
            # Recipes get both ingredients and kitchen equipment
            raw = suggest_recipe_supplies(title=payload.title, description=payload.description, user=request.user)
            ingredients = match_ingredients_to_database(raw.get("ingredients", []))
            kitchen_equipment = match_materials_to_database(raw.get("kitchen_equipment", []))
            return {
                "materials": [],
                "ingredients": ingredients,
                "kitchen_equipment": kitchen_equipment,
            }
        else:
            # Sessions, games, etc. get material suggestions
            raw_materials = suggest_materials(
                title=payload.title,
                description=payload.description,
                content_type=payload.content_type,
                user=request.user,
            )
            materials = match_materials_to_database(raw_materials)
            return {
                "materials": materials,
                "ingredients": [],
                "kitchen_equipment": [],
            }
    except HttpError:
        raise
    except Exception:
        logger.exception("AI suggest-supplies error")
        return HttpResponse(
            json.dumps(
                {
                    "detail": "Fehler bei der KI-Materialvorschlag-Erstellung.",
                    "error_code": "AI_SUPPLY_ERROR",
                }
            ),
            status=500,
            content_type="application/json",
        )


# ---------------------------------------------------------------------------
# AI Interaction Vote
# ---------------------------------------------------------------------------


@router.patch(
    "/ai-interactions/{interaction_id}/vote/",
    response=AiVoteOut,
    url_name="content_ai_interaction_vote",
)
def ai_interaction_vote(request, interaction_id: str, payload: AiVoteIn):
    """Vote on an AI interaction (thumbs up/down)."""
    if not request.user.is_authenticated:
        raise HttpError(401, "Anmeldung erforderlich")

    from uuid import UUID

    try:
        uid = UUID(interaction_id)
    except ValueError:
        raise HttpError(404, "Interaktion nicht gefunden")

    from content.models import AiInteraction

    try:
        interaction = AiInteraction.objects.get(id=uid)
    except AiInteraction.DoesNotExist:
        raise HttpError(404, "Interaktion nicht gefunden")

    if interaction.user_id != request.user.id and not request.user.is_staff:
        raise HttpError(403, "Nicht berechtigt")

    if payload.vote not in ("up", "down"):
        raise HttpError(422, "Ungültiger Vote. Verwende 'up' oder 'down'.")

    from django.utils import timezone

    interaction.vote = payload.vote
    interaction.voted_at = timezone.now()
    interaction.save(update_fields=["vote", "voted_at"])

    return {"status": "ok"}
