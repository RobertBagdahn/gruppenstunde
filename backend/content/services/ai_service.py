"""
Content AI service — AI-powered features for all content types.

Migrated from idea/services/ai_service.py.
Uses Gemini via the google-genai SDK with structured JSON output.
Authenticates via Application Default Credentials (ADC).

Features:
- improve_text: Grammar/style improvement for any text field
- suggest_tags: Tag suggestion from the tag database
- refurbish: Free text to structured content (content_type aware)
- generate_images: AI image generation for all content types
- create_embedding: Text embedding via text-embedding-004
"""

import io
import logging
import time
import uuid
from typing import Any

from django.conf import settings
from pydantic import BaseModel, Field, ValidationError

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Timeout constants
# ---------------------------------------------------------------------------

AI_REFURBISH_TIMEOUT_SECONDS = 30
AI_IMAGE_TIMEOUT_SECONDS = 240

# ---------------------------------------------------------------------------
# Custom AI exceptions
# ---------------------------------------------------------------------------


class AiTimeoutError(Exception):
    """Gemini call exceeded timeout."""

    detail = "Die KI-Verarbeitung hat zu lange gedauert. Bitte versuche es erneut."
    error_code = "AI_TIMEOUT"


class AiUnavailableError(Exception):
    """Gemini API is not reachable."""

    detail = "Der KI-Dienst ist derzeit nicht verfügbar. Bitte versuche es später erneut."
    error_code = "AI_UNAVAILABLE"


class AiInvalidResponseError(Exception):
    """Gemini response could not be validated."""

    detail = "Die KI hat eine ungültige Antwort geliefert. Bitte versuche es erneut."
    error_code = "AI_INVALID_RESPONSE"


GEMINI_MODEL = "gemini-3.1-flash-lite-preview"
GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image-preview"

# ---------------------------------------------------------------------------
# Content type labels and prompts
# ---------------------------------------------------------------------------

CONTENT_TYPE_PROMPTS: dict[str, dict[str, str]] = {
    "session": {
        "label": "Gruppenstunden-Idee",
        "context": "eine Pfadfinder-Gruppenstunde",
        "description_hint": (
            "Gliedere in Vorbereitung, Durchführung, Abschluss. "
            "Es dürfen weitere Beispiele oder Varianten hinzugefügt werden."
        ),
    },
    "blog": {
        "label": "Blog-Beitrag",
        "context": "einen Wissensbeitrag / Blog-Artikel für Pfadfinder-Gruppenführer",
        "description_hint": (
            "Gliedere in sinnvolle Abschnitte mit Zwischenüberschriften. Erkläre ausführlich, gib praktische Tipps."
        ),
    },
    "game": {
        "label": "Spiel",
        "context": "ein Spiel für Pfadfinder-Gruppen",
        "description_hint": (
            "Erkläre die Spielregeln klar und verständlich. Gliedere in Vorbereitung, Spielablauf, Varianten."
        ),
    },
    "recipe": {
        "label": "Rezept",
        "context": "ein Rezept für Pfadfinder-Gruppen / Lager",
        "description_hint": (
            "Gliedere in Zutaten-Übersicht und Zubereitungsschritte. "
            "Gib Tipps für Kochen am Lagerfeuer oder mit einfachen Mitteln."
        ),
    },
}


# ---------------------------------------------------------------------------
# Pydantic output schemas for structured Gemini responses
# ---------------------------------------------------------------------------


class MaterialSuggestion(BaseModel):
    quantity: str = Field(description="Amount, e.g. '2', '1', '10'")
    material_name: str = Field(description="Name of the material, e.g. 'Seil', 'Papier', 'Stifte'")
    material_unit: str = Field(description="Unit, e.g. 'Stück', 'Meter', 'Liter', 'Kilogramm', 'Packung'")


class RefurbishOutput(BaseModel):
    title: str = Field(min_length=5, max_length=120)
    summary: str = Field(min_length=80, max_length=500)
    summary_long: str = Field(min_length=200, max_length=2000)
    description: str = Field(min_length=100, max_length=8000)
    costs_rating: str = Field(description="One of: free, less_1, 1_2, more_2")
    execution_time: str = Field(description="One of: less_30, 30_60, 60_90, more_90")
    preparation_time: str = Field(description="One of: none, less_15, 15_30, 30_60, more_60")
    difficulty: str = Field(description="One of: easy, medium, hard")
    scout_level_ids: list[int] = Field(
        description="List of scout level IDs: 1=Wölflinge (7-10), 2=Jungpfadfinder (10-13), 3=Pfadfinder (13-16), 4=Rover (16+)"
    )
    materials: list[MaterialSuggestion] = Field(default_factory=list, description="List of materials needed")
    image_prompt: str = Field(
        default="",
        max_length=500,
        description="English prompt for generating a title image",
    )
    location: str = Field(
        default="",
        description="Best location, e.g. 'Drinnen', 'Draussen', 'Wald'",
    )
    season: str = Field(
        default="",
        description="Best season, e.g. 'Frühling', 'Sommer', 'Ganzjährig'",
    )


class TagSuggestionOutput(BaseModel):
    tag_ids: list[int] = Field(default_factory=list)


class ImproveTextOutput(BaseModel):
    text: str = Field(min_length=1, max_length=10000)


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


class ContentAIService:
    """
    AI service for content-aware features using Vertex AI Gemini.

    Supports all content types (session, blog, game, recipe).
    Uses content.models.Tag (not idea.models.Tag).
    """

    def __init__(self):
        self._client = None
        self._image_client = None

    def _get_client(self):
        if self._client is None:
            try:
                from google import genai

                project = getattr(settings, "GOOGLE_CLOUD_PROJECT", "")
                location = getattr(settings, "VERTEX_AI_LOCATION", "global")

                if project:
                    self._client = genai.Client(
                        vertexai=True,
                        project=project,
                        location=location,
                    )
                else:
                    logger.warning("GOOGLE_CLOUD_PROJECT not set - AI features disabled")
            except ImportError:
                logger.warning("google-genai not installed - AI features disabled")
        return self._client

    def _get_image_client(self):
        """Return a client using 'global' location for image generation models."""
        if self._image_client is None:
            try:
                from google import genai

                project = getattr(settings, "GOOGLE_CLOUD_PROJECT", "")

                if project:
                    self._image_client = genai.Client(
                        vertexai=True,
                        project=project,
                        location="global",
                    )
                else:
                    logger.warning("GOOGLE_CLOUD_PROJECT not set - AI features disabled")
            except ImportError:
                logger.warning("google-genai not installed - AI features disabled")
        return self._image_client

    # ------------------------------------------------------------------
    # improve_text
    # ------------------------------------------------------------------

    def improve_text(self, text: str, context: str = "") -> str:
        """Improve text: grammar, style, clarity. Content-type agnostic."""
        client = self._get_client()
        if not client:
            return text

        prompt = (
            "Verbessere und verschönere den folgenden Text, in deutscher Sprache. "
            "Der Output muss Markdown sein (kein HTML). "
            "Der Text soll für Jugendliche sein und ansprechend formatiert "
            "z.B. mit **fett**, Listen mit -, Überschriften mit ##, Absätze durch Leerzeilen. "
            "Verwende kein HTML.\n\n"
            f"Kontext: {context}\n\n"
            f"Text:\n{text}\n\n"
        )

        from google.genai import types

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=ImproveTextOutput,
                http_options=types.HttpOptions(timeout=AI_REFURBISH_TIMEOUT_SECONDS * 1000),
            ),
        )
        result = ImproveTextOutput.model_validate_json(response.text)
        logger.info("AI improve_text result: %s", result.text[:200])
        return result.text

    # ------------------------------------------------------------------
    # suggest_tags
    # ------------------------------------------------------------------

    def suggest_tags(self, text: str) -> dict[str, Any]:
        """Analyze text and suggest matching tags from the content.Tag database."""
        from content.models import Tag

        client = self._get_client()
        if not client:
            return {"tag_ids": [], "tag_names": []}

        available_tags = list(Tag.objects.filter(is_approved=True).values("id", "name"))
        tag_list = ", ".join(f"{t['name']} (ID:{t['id']})" for t in available_tags)

        prompt = (
            "Analysiere den folgenden Text für eine Pfadfinder-Gruppenstunde und "
            "wähle die passendsten Tags aus der folgenden Liste aus.\n\n"
            f"Verfügbare Tags: {tag_list}\n\n"
            f"Text:\n{text}\n\n"
            "Antworte NUR mit den passenden Tag-IDs."
        )

        from google.genai import types

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=TagSuggestionOutput,
                http_options=types.HttpOptions(timeout=AI_REFURBISH_TIMEOUT_SECONDS * 1000),
            ),
        )
        result = TagSuggestionOutput.model_validate_json(response.text)
        logger.info("AI suggest_tags raw response: %s", response.text)

        valid_tags = Tag.objects.filter(id__in=result.tag_ids, is_approved=True)
        return {
            "tag_ids": [t.id for t in valid_tags],
            "tag_names": [t.name for t in valid_tags],
        }

    # ------------------------------------------------------------------
    # refurbish (content-type aware)
    # ------------------------------------------------------------------

    def refurbish(self, raw_text: str, content_type: str = "session") -> dict[str, Any]:
        """
        Convert raw unstructured text into a structured content item.

        Accepts content_type parameter to customize the prompt:
        - "session" (default): Gruppenstunden-Idee
        - "blog": Blog-Beitrag
        - "game": Spiel
        - "recipe": Rezept
        """
        start_time = time.monotonic()

        client = self._get_client()
        if not client:
            logger.warning("AI client not available - returning fallback")
            return self._refurbish_fallback(raw_text, content_type)

        ct_config = CONTENT_TYPE_PROMPTS.get(content_type, CONTENT_TYPE_PROMPTS["session"])

        prompt = (
            f"Du bekommst einen unformatierten Text über {ct_config['context']}. "
            f"Erstelle daraus eine strukturierte {ct_config['label']} in deutscher Sprache.\n\n"
            "Regeln:\n"
            "- title: Kurzer, ansprechender Titel (5-45 Zeichen).\n"
            "- summary: Werbender Aussagesatz als Kurzbeschreibung (80-300 Zeichen, maximal 500 Zeichen).\n"
            "- summary_long: Ausführliche Zusammenfassung (200-1000 Zeichen).\n"
            f"- description: Detaillierte Anleitung als Markdown (kein HTML). "
            f"{ct_config['description_hint']} (100-8000 Zeichen)\n"
            "- costs_rating: Eines von 'free', 'less_1', '1_2', 'more_2'\n"
            "- execution_time: Eines von 'less_30', '30_60', '60_90', 'more_90'\n"
            "- preparation_time: Eines von 'none', 'less_15', '15_30', '30_60', 'more_60'\n"
            "- difficulty: Eines von 'easy', 'medium', 'hard'\n"
            "- scout_level_ids: Liste der passenden Pfadfinder-Stufen als IDs. "
            "1=Wölflinge (7-10), 2=Jungpfadfinder (10-13), "
            "3=Pfadfinder (13-16), 4=Rover (16+).\n"
            "- materials: Liste der benötigten Materialien. Jedes Material hat: "
            "quantity, material_name, material_unit. "
            "Leere Liste wenn keine Materialien benötigt werden.\n"
            "- location: Bester Ort (z.B. 'Drinnen', 'Draussen', 'Wald'). Leer wenn unklar.\n"
            "- season: Beste Jahreszeit. Leer wenn unklar.\n"
            "- image_prompt: ENGLISCHER Prompt für ein Titelbild. "
            "Stil: Bunte Cartoon-Illustration, keine Fotos, KEINE Menschen. Max 200 Zeichen.\n\n"
            f"Unformatierter Text:\n{raw_text}"
        )

        logger.info("AI refurbish prompt (first 300 chars): %s", prompt[:300])

        from google.genai import types

        try:
            response = client.models.generate_content(
                model=GEMINI_MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(
                    response_mime_type="application/json",
                    response_schema=RefurbishOutput,
                    http_options=types.HttpOptions(timeout=AI_REFURBISH_TIMEOUT_SECONDS * 1000),
                ),
            )
        except Exception as exc:
            self._handle_gemini_exception(exc, "refurbish")

        raw_response = response.text
        logger.info("AI refurbish raw response: %s", raw_response)

        try:
            structured = RefurbishOutput.model_validate_json(raw_response)
        except ValidationError as exc:
            logger.warning("AI refurbish validation failed: %s", exc)
            raise AiInvalidResponseError(str(exc)) from exc

        # Also suggest tags
        try:
            tags = self.suggest_tags(raw_text)
        except (AiTimeoutError, AiUnavailableError, AiInvalidResponseError):
            logger.warning("Tag suggestion failed during refurbish, continuing without tags")
            tags = {"tag_ids": [], "tag_names": []}

        # Build full tag objects with parent_name for frontend categorization
        from content.models import Tag as TagModel

        suggested_tags = []
        if tags["tag_ids"]:
            tag_objs = TagModel.objects.filter(id__in=tags["tag_ids"]).select_related("parent")
            suggested_tags = [
                {
                    "id": t.id,
                    "name": t.name,
                    "slug": t.slug,
                    "icon": t.icon,
                    "sort_order": t.sort_order,
                    "parent_id": t.parent_id,
                    "parent_name": t.parent.name if t.parent else None,
                }
                for t in tag_objs
            ]

        # Validate scout level IDs (only allow 1-4)
        valid_scout_ids = [sid for sid in structured.scout_level_ids if sid in (1, 2, 3, 4)]

        # Truncate title/summary
        title = structured.title[:45].rstrip()
        summary = structured.summary[:500].rstrip()

        processing_time = time.monotonic() - start_time

        return {
            "title": title,
            "summary": summary,
            "summary_long": structured.summary_long,
            "description": structured.description,
            "content_type": content_type,
            "suggested_tag_ids": tags["tag_ids"],
            "suggested_tag_names": tags["tag_names"],
            "suggested_tags": suggested_tags,
            "costs_rating": structured.costs_rating,
            "execution_time": structured.execution_time,
            "preparation_time": structured.preparation_time,
            "difficulty": structured.difficulty,
            "suggested_scout_level_ids": valid_scout_ids,
            "suggested_materials": [
                {
                    "quantity": m.quantity,
                    "material_name": m.material_name,
                    "material_unit": m.material_unit,
                }
                for m in structured.materials
            ],
            "location": structured.location,
            "season": structured.season,
            "image_prompt": structured.image_prompt,
            "processing_time_seconds": round(processing_time, 2),
        }

    def _refurbish_fallback(self, raw_text: str, content_type: str) -> dict[str, Any]:
        """Fallback when AI client is not available."""
        return {
            "title": "",
            "summary": raw_text[:200],
            "summary_long": raw_text[:500],
            "description": raw_text,
            "content_type": content_type,
            "suggested_tag_ids": [],
            "suggested_tag_names": [],
            "suggested_tags": [],
            "costs_rating": "free",
            "execution_time": "less_30",
            "preparation_time": "none",
            "difficulty": "easy",
            "suggested_scout_level_ids": [],
            "suggested_materials": [],
            "location": "",
            "season": "",
            "image_prompt": "",
            "processing_time_seconds": 0,
        }

    # ------------------------------------------------------------------
    # Exception helper
    # ------------------------------------------------------------------

    @staticmethod
    def _handle_gemini_exception(exc: Exception, context: str = "") -> None:
        """Map Gemini SDK exceptions to custom AI exceptions. Always raises."""
        from google.api_core.exceptions import DeadlineExceeded, GoogleAPIError, ServiceUnavailable
        from google.genai.errors import APIError, ServerError

        if isinstance(exc, ServerError):
            if exc.code in (504, 408):
                logger.warning("AI %s timeout (genai %d): %s", context, exc.code, exc)
                raise AiTimeoutError(str(exc)) from exc
            logger.warning("AI %s server error (genai %d): %s", context, exc.code, exc)
            raise AiUnavailableError(str(exc)) from exc
        if isinstance(exc, APIError):
            logger.warning("AI %s API error (genai %d): %s", context, getattr(exc, "code", 0), exc)
            raise AiUnavailableError(str(exc)) from exc
        if isinstance(exc, DeadlineExceeded):
            logger.warning("AI %s timeout: %s", context, exc)
            raise AiTimeoutError(str(exc)) from exc
        if isinstance(exc, ServiceUnavailable):
            logger.warning("AI %s unavailable: %s", context, exc)
            raise AiUnavailableError(str(exc)) from exc
        if isinstance(exc, GoogleAPIError):
            logger.warning("AI %s API error: %s", context, exc)
            raise AiUnavailableError(str(exc)) from exc
        logger.exception("AI %s unexpected error", context)
        raise

    # ------------------------------------------------------------------
    # generate_images (Gemini native image generation)
    # ------------------------------------------------------------------

    def generate_images(
        self,
        prompt: str,
        title: str = "",
        summary: str = "",
        content_type: str = "session",
    ) -> list[str]:
        """
        Generate a title image using Gemini native image generation.

        Supports all content types. Returns a list with one saved image URL.
        """
        from django.core.files.base import ContentFile
        from PIL import Image

        client = self._get_image_client()
        if not client:
            return []

        ct_config = CONTENT_TYPE_PROMPTS.get(content_type, CONTENT_TYPE_PROMPTS["session"])

        context_parts = []
        if title:
            context_parts.append(f"Title: {title}")
        if summary:
            context_parts.append(f"Summary: {summary[:200]}")
        context_text = "; ".join(context_parts)

        full_prompt = (
            f"Colorful cartoon clipart illustration, hand-drawn style, clean outlines, "
            f"bright cheerful colors, white background. NO humans or people. No Text in the image. "
            f"No photos, only drawings. The image should clearly illustrate the {ct_config['label']} at a glance. "
            f"Only objects, nature, animals, tools. Child-friendly scouting activity style.\n"
            f"Content: {context_text}\n"
            f"Image: {prompt}"
        )

        from google.genai import types
        from google.genai.errors import APIError, ServerError

        max_retries = 3

        for attempt in range(1, max_retries + 1):
            try:
                response = client.models.generate_content(
                    model=GEMINI_IMAGE_MODEL,
                    contents=[full_prompt],
                    config=types.GenerateContentConfig(
                        response_modalities=["IMAGE"],
                        image_config=types.ImageConfig(
                            aspect_ratio="1:1",
                            image_size="512",
                        ),
                        http_options=types.HttpOptions(timeout=AI_IMAGE_TIMEOUT_SECONDS * 1000),
                    ),
                )
                break
            except (APIError, ServerError) as exc:
                code = getattr(exc, "code", 0)
                if code in (499, 503, 504) and attempt < max_retries:
                    wait = 2**attempt
                    logger.warning(
                        "AI image generation attempt %d/%d failed (code %d), retrying in %ds...",
                        attempt,
                        max_retries,
                        code,
                        wait,
                    )
                    time.sleep(wait)
                    continue
                self._handle_gemini_exception(exc, "image generation")
                return []
            except Exception as exc:
                self._handle_gemini_exception(exc, "image generation")
                return []

        # Upload subfolder based on content type
        upload_folder = f"content/{content_type}"

        try:
            for part in response.parts:
                if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                    image_data = part.inline_data.data

                    img = Image.open(io.BytesIO(image_data))
                    if img.mode == "RGBA":
                        bg = Image.new("RGB", img.size, (255, 255, 255))
                        bg.paste(img, mask=img.split()[3])
                        img = bg
                    buf = io.BytesIO()
                    img.save(buf, format="WEBP", quality=80)
                    webp_data = buf.getvalue()

                    filename = f"{upload_folder}/ai_{uuid.uuid4().hex[:12]}.webp"
                    from django.core.files.storage import default_storage

                    saved_path = default_storage.save(filename, ContentFile(webp_data))
                    image_url = default_storage.url(saved_path)
                    logger.info("AI generated image saved: %s", image_url)
                    return [image_url]
        except Exception as exc:
            self._handle_gemini_exception(exc, "image generation")

        return []

    def generate_image(self, prompt: str, content_type: str = "session") -> str | None:
        """Generate a single title image. Delegates to generate_images."""
        urls = self.generate_images(prompt=prompt, content_type=content_type)
        return urls[0] if urls else None

    # ------------------------------------------------------------------
    # embeddings
    # ------------------------------------------------------------------

    def create_embedding(self, text: str) -> list[float] | None:
        """Create a text embedding using google-genai SDK."""
        client = self._get_client()
        if not client:
            return None

        try:
            response = client.models.embed_content(
                model="text-embedding-004",
                contents=text,
            )
            if response.embeddings:
                return response.embeddings[0].values
        except Exception:
            logger.warning("Embedding creation failed", exc_info=True)
        return None


# Module-level singleton for convenience
ai_service = ContentAIService()
