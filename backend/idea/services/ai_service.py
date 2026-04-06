"""
AI service for AI features.
Uses Gemini via the google-genai SDK with structured JSON output.
Authenticates via Application Default Credentials (ADC) – no API keys.

Prompts and rules follow the conventions from inspi/activity.
"""

import logging
from typing import Any

from django.conf import settings
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-2.5-flash"
GEMINI_IMAGE_MODEL = "gemini-3.1-flash-image-preview"


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
    idea_type: str = Field(default="idea", description="One of: idea, knowledge")
    scout_level_ids: list[int] = Field(description="List of scout level IDs: 1=Wölflinge (7-10 J.), 2=Jungpfadfinder (10-13 J.), 3=Pfadfinder (13-16 J.), 4=Rover (16+ J.)")
    materials: list[MaterialSuggestion] = Field(default_factory=list, description="List of materials needed for this activity")
    image_prompt: str = Field(default="", max_length=500, description="English prompt for generating a title image that illustrates the activity")
    location: str = Field(default="", description="Best location for this activity, e.g. 'Drinnen', 'Draußen', 'Wald', 'Wiese', 'Gruppenraum'")
    season: str = Field(default="", description="Best season/time, e.g. 'Frühling', 'Sommer', 'Herbst', 'Winter', 'Ganzjährig'")


class TagSuggestionOutput(BaseModel):
    tag_ids: list[int] = Field(default_factory=list)


class ImproveTextOutput(BaseModel):
    text: str = Field(min_length=1, max_length=10000)


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------


class AIService:
    """Service for AI-powered features using Vertex AI Gemini 3.0."""

    def __init__(self):
        self._client = None
        self._image_client = None

    def _get_client(self):
        if self._client is None:
            try:
                from google import genai

                project = getattr(settings, "GOOGLE_CLOUD_PROJECT", "")
                location = getattr(settings, "VERTEX_AI_LOCATION", "europe-west3")

                if project:
                    self._client = genai.Client(
                        vertexai=True, project=project, location=location,
                    )
                else:
                    logger.warning("GOOGLE_CLOUD_PROJECT not set – AI features disabled")
            except ImportError:
                logger.warning("google-genai not installed – AI features disabled")
        return self._client

    def _get_image_client(self):
        """Return a client using 'global' location for image generation models."""
        if self._image_client is None:
            try:
                from google import genai

                project = getattr(settings, "GOOGLE_CLOUD_PROJECT", "")

                if project:
                    self._image_client = genai.Client(
                        vertexai=True, project=project, location="global",
                    )
                else:
                    logger.warning("GOOGLE_CLOUD_PROJECT not set – AI features disabled")
            except ImportError:
                logger.warning("google-genai not installed – AI features disabled")
        return self._image_client

    # ------------------------------------------------------------------
    # improve_text
    # ------------------------------------------------------------------

    def improve_text(self, text: str, context: str = "") -> str:
        """Improve text: grammar, style, clarity."""
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
            ),
        )
        result = ImproveTextOutput.model_validate_json(response.text)
        logger.info("AI improve_text result: %s", result.text[:200])
        return result.text

    # ------------------------------------------------------------------
    # suggest_tags
    # ------------------------------------------------------------------

    def suggest_tags(self, text: str) -> dict[str, Any]:
        """Analyze text and suggest matching tags from the database."""
        from idea.models import Tag

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
    # refurbish  (main feature – structured output via Pydantic schema)
    # ------------------------------------------------------------------

    def refurbish(self, raw_text: str) -> dict[str, Any]:
        """Convert raw unformatted text into a structured idea.

        Uses Gemini 3.0 with structured JSON output (Pydantic schema)
        following the prompt rules from inspi/activity.
        """
        client = self._get_client()
        if not client:
            logger.warning("AI client not available – returning fallback")
            return {
                "title": "",
                "summary": raw_text[:200],
                "summary_long": raw_text[:500],
                "description": raw_text,
                "idea_type": "idea",
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
            }

        prompt = (
            "Du bekommst einen unformatierten Text über eine Pfadfinder-Gruppenstunde. "
            "Erstelle daraus eine strukturierte Idee in deutscher Sprache.\n\n"
            "Regeln:\n"
            "- title: Kurzer, ansprechender Titel (5–45 Zeichen), aussagekräftig für Jugendliche.\n"
            "- summary: Werbender Aussagesatz als Kurzbeschreibung (80–300 Zeichen, maximal 500 Zeichen).\n"
            "- summary_long: Ausführliche, interessante Zusammenfassung (200–1000 Zeichen), für Jugendliche.\n"
            "- description: Detaillierte Anleitung als Markdown (kein HTML). "
            "Verwende **fett**, Listen mit -, Überschriften mit ##, Absätze durch Leerzeilen. "
            "Gliedere in Vorbereitung, Durchführung, Abschluss. "
            "Es dürfen weitere Beispiele oder Varianten hinzugefügt werden. (100–8000 Zeichen)\n"
            "- costs_rating: Eines von 'free', 'less_1', '1_2', 'more_2'\n"
            "- execution_time: Eines von 'less_30', '30_60', '60_90', 'more_90'\n"
            "- preparation_time: Eines von 'none', 'less_15', '15_30', '30_60', 'more_60'\n"
            "- difficulty: Eines von 'easy', 'medium', 'hard'\n"
            "- idea_type: 'idea' für Aktivitäten/Spiele oder 'knowledge' für Wissensbeiträge/Methoden.\n"
            "- scout_level_ids: Liste der passenden Pfadfinder-Stufen als IDs. "
            "1=Wölflinge (7-10 Jahre), 2=Jungpfadfinder (10-13 Jahre), "
            "3=Pfadfinder (13-16 Jahre), 4=Rover (16+ Jahre). "
            "Wähle alle Stufen aus, für die die Aktivität geeignet ist.\n"
            "- materials: Liste der benötigten Materialien. Jedes Material hat: "
            "quantity (Menge als Text, z.B. '2', '1', '10'), "
            "material_name (Name, z.B. 'Seil', 'Papier', 'Stifte', 'Ball'), "
            "material_unit (Einheit: 'Stück', 'Meter', 'Liter', 'Kilogramm' oder 'Packung'). "
            "Wenn keine Materialien benötigt werden, gib eine leere Liste an.\n"
            "- location: Bester Ort für diese Aktivität (z.B. 'Drinnen', 'Draußen', 'Wald', 'Wiese', 'Gruppenraum', 'Lagerplatz'). "
            "Leer lassen wenn unklar.\n"
            "- season: Beste Jahreszeit/Zeitraum (z.B. 'Frühling', 'Sommer', 'Herbst', 'Winter', 'Ganzjährig'). "
            "Leer lassen wenn unklar.\n"
            "- image_prompt: Erstelle einen ENGLISCHEN Prompt für ein Titelbild. "
            "Das Bild soll die Aktivität auf einen Blick verständlich machen. "
            "Stil: Bunte Cartoon-Illustration/Zeichnung, keine Fotos, KEINE Menschen. "
            "Zeige nur Objekte, Gegenstände, Natur oder abstrakte Darstellungen. "
            "Max 200 Zeichen.\n\n"
            "Der gesamte Text soll für Jugendliche / Pfadfinder geschrieben sein.\n\n"
            f"Unformatierter Text:\n{raw_text}"
        )

        logger.info("AI refurbish prompt (first 300 chars): %s", prompt[:300])

        from google.genai import types

        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=prompt,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=RefurbishOutput,
            ),
        )

        raw_response = response.text
        logger.info("AI refurbish raw response: %s", raw_response)

        structured = RefurbishOutput.model_validate_json(raw_response)
        logger.info(
            "AI refurbish parsed – title=%r, summary=%r, costs=%s, time=%s, diff=%s",
            structured.title,
            structured.summary[:80],
            structured.costs_rating,
            structured.execution_time,
            structured.difficulty,
        )

        # Also suggest tags
        tags = self.suggest_tags(raw_text)

        # Build full tag objects with parent_name for frontend categorization
        from idea.models import Tag as TagModel
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

        # Truncate title/summary – LLMs sometimes overshoot
        title = structured.title[:45].rstrip()
        summary = structured.summary[:500].rstrip()

        result = {
            "title": title,
            "summary": summary,
            "summary_long": structured.summary_long,
            "description": structured.description,
            "idea_type": structured.idea_type if structured.idea_type in ("idea", "knowledge") else "idea",
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
        }

        # Generate title image if we have a prompt
        if structured.image_prompt:
            image_urls = self.generate_images(
                prompt=structured.image_prompt,
                title=structured.title,
                summary=structured.summary,
                description=structured.description,
            )
            if image_urls:
                result["image_url"] = image_urls[0]
                result["image_urls"] = image_urls
        logger.info("AI refurbish final result: %s", result)
        return result

    # ------------------------------------------------------------------
    # generate_images (Gemini native image generation)
    # ------------------------------------------------------------------

    def generate_images(
        self,
        prompt: str,
        title: str = "",
        summary: str = "",
        description: str = "",
        num_images: int = 4,
    ) -> list[str]:
        """Generate title images using Gemini native image generation.

        Sends Inspi reference images + full idea content as context so
        the model understands what to illustrate and the desired style.

        Returns a list of saved image URLs (up to num_images).
        """
        import uuid
        from pathlib import Path

        from django.core.files.base import ContentFile
        from PIL import Image

        client = self._get_image_client()
        if not client:
            return []

        # Build context from idea content
        context_parts = []
        if title:
            context_parts.append(f"Titel: {title}")
        if summary:
            context_parts.append(f"Zusammenfassung: {summary}")
        if description:
            context_parts.append(f"Beschreibung: {description[:500]}")
        context_text = "\n".join(context_parts)

        system_prompt = (
            "You are an image generator for 'Inspi', a German scouting activity platform. "
            "Inspi helps scout leaders find and share ideas for group sessions. "
            "Generate colorful cartoon illustrations with a hand-drawn look, clean outlines, "
            "and bright cheerful colors on a white background. "
            "NEVER include humans or people in the image. "
            "Show only objects, nature, animals, tools, and abstract elements. "
            "The style should be fun, child-friendly, and suitable for scouting activities. "
            "The images should be like Cliparts. "
            "Use the attached reference images as style guidance."
        )

        full_prompt = (
            f"{system_prompt}\n\n"
            f"Activity context:\n{context_text}\n\n"
            f"Image description: {prompt}\n\n"
            "Generate a single illustration for this scouting activity."
        )

        # Load Inspi reference images for style consistency
        ref_images: list[Image.Image] = []
        frontend_images = Path(settings.BASE_DIR).parent / "frontend" / "public" / "images"
        for ref_name in ("inspi_flying.png", "inspi_creativ.png"):
            ref_path = frontend_images / ref_name
            if ref_path.exists():
                ref_images.append(Image.open(ref_path))

        # Build contents list: [prompt_text, ref_image1, ref_image2, ...]
        contents: list = [full_prompt] + ref_images

        saved_urls: list[str] = []
        last_error: Exception | None = None

        try:
            from google.genai import types

            for i in range(num_images):
                try:
                    response = client.models.generate_content(
                        model=GEMINI_IMAGE_MODEL,
                        contents=contents,
                        config=types.GenerateContentConfig(
                            response_modalities=["IMAGE"],
                        ),
                    )

                    for part in response.parts:
                        if part.inline_data and part.inline_data.mime_type.startswith("image/"):
                            image_data = part.inline_data.data
                            ext = part.inline_data.mime_type.split("/")[-1]
                            filename = f"ideas/ai_{uuid.uuid4().hex[:12]}.{ext}"
                            from django.core.files.storage import default_storage

                            saved_path = default_storage.save(filename, ContentFile(image_data))
                            image_url = default_storage.url(saved_path)
                            saved_urls.append(image_url)
                            logger.info("AI generated image %d/%d saved: %s", i + 1, num_images, image_url)
                            break
                except Exception as exc:
                    last_error = exc
                    logger.warning("Image generation %d/%d failed", i + 1, num_images, exc_info=True)

        except Exception as exc:
            last_error = exc
            logger.warning("Image generation setup failed", exc_info=True)

        if not saved_urls and last_error:
            raise last_error

        return saved_urls

    # For backwards compatibility
    def generate_image(self, prompt: str) -> str | None:
        """Generate a single title image. Delegates to generate_images."""
        urls = self.generate_images(prompt=prompt)
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
