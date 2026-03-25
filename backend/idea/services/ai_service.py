"""
Vertex AI service for AI features.
Uses Gemini 3.0 Flash via the google-genai SDK with structured JSON output.
Authenticates via Application Default Credentials (ADC) – no API keys.

Prompts and rules follow the conventions from inspi/activity.
"""

import logging
from typing import Any

from django.conf import settings
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-2.5-flash"


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
    scout_level_ids: list[int] = Field(description="List of scout level IDs: 1=Wölflinge (7-10 J.), 2=Jungpfadfinder (10-13 J.), 3=Pfadfinder (13-16 J.), 4=Rover (16+ J.)")
    materials: list[MaterialSuggestion] = Field(default_factory=list, description="List of materials needed for this activity")


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
        self._embedding_model = None

    def _get_client(self):
        if self._client is None:
            try:
                from google import genai

                project = getattr(settings, "GOOGLE_CLOUD_PROJECT", "")
                location = getattr(settings, "VERTEX_AI_LOCATION", "europe-west1")

                if project:
                    self._client = genai.Client(
                        vertexai=True, project=project, location=location,
                    )
                else:
                    logger.warning("GOOGLE_CLOUD_PROJECT not set – AI features disabled")
            except ImportError:
                logger.warning("google-genai not installed – AI features disabled")
        return self._client

    def _get_embedding_model(self):
        if self._embedding_model is None:
            try:
                from vertexai.language_models import TextEmbeddingModel

                self._embedding_model = TextEmbeddingModel.from_pretrained("text-embedding-004")
            except ImportError:
                logger.warning("Embedding model not available")
        return self._embedding_model

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
            "Der Output muss HTML Code sein. "
            "Der Text soll für Jugendliche sein und ansprechend formatiert "
            "z.B. mit <b>, <ul>, Absätzen. "
            "Die Schriftgröße soll nicht verändert werden, keine Farbe.\n\n"
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
                "suggested_tag_ids": [],
                "suggested_tag_names": [],
                "suggested_tags": [],
                "costs_rating": "free",
                "execution_time": "less_30",
                "preparation_time": "none",
                "difficulty": "easy",
                "suggested_scout_level_ids": [],
                "suggested_materials": [],
            }

        prompt = (
            "Du bekommst einen unformatierten Text über eine Pfadfinder-Gruppenstunde. "
            "Erstelle daraus eine strukturierte Idee in deutscher Sprache.\n\n"
            "Regeln:\n"
            "- title: Kurzer, ansprechender Titel (5–45 Zeichen), aussagekräftig für Jugendliche.\n"
            "- summary: Werbender Aussagesatz als Kurzbeschreibung (80–300 Zeichen, maximal 500 Zeichen).\n"
            "- summary_long: Ausführliche, interessante Zusammenfassung (200–1000 Zeichen), für Jugendliche.\n"
            "- description: Detaillierte Anleitung als HTML. "
            "Verwende <ul>, <b>, Absätze für gute Formatierung. "
            "Gliedere in Vorbereitung, Durchführung, Abschluss. "
            "Keine Schriftgrößen- oder Farbänderungen. "
            "Es dürfen weitere Beispiele oder Varianten hinzugefügt werden. (100–8000 Zeichen)\n"
            "- costs_rating: Eines von 'free', 'less_1', '1_2', 'more_2'\n"
            "- execution_time: Eines von 'less_30', '30_60', '60_90', 'more_90'\n"
            "- preparation_time: Eines von 'none', 'less_15', '15_30', '30_60', 'more_60'\n"
            "- difficulty: Eines von 'easy', 'medium', 'hard'\n"
            "- scout_level_ids: Liste der passenden Pfadfinder-Stufen als IDs. "
            "1=Wölflinge (7-10 Jahre), 2=Jungpfadfinder (10-13 Jahre), "
            "3=Pfadfinder (13-16 Jahre), 4=Rover (16+ Jahre). "
            "Wähle alle Stufen aus, für die die Aktivität geeignet ist.\n"
            "- materials: Liste der benötigten Materialien. Jedes Material hat: "
            "quantity (Menge als Text, z.B. '2', '1', '10'), "
            "material_name (Name, z.B. 'Seil', 'Papier', 'Stifte', 'Ball'), "
            "material_unit (Einheit: 'Stück', 'Meter', 'Liter', 'Kilogramm' oder 'Packung'). "
            "Wenn keine Materialien benötigt werden, gib eine leere Liste an.\n\n"
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
        }
        logger.info("AI refurbish final result: %s", result)
        return result

    # ------------------------------------------------------------------
    # embeddings
    # ------------------------------------------------------------------

    def create_embedding(self, text: str) -> list[float] | None:
        """Create a text embedding using Vertex AI embedding model."""
        model = self._get_embedding_model()
        if not model:
            return None

        try:
            embeddings = model.get_embeddings([text])
            if embeddings:
                return embeddings[0].values
        except Exception:
            logger.warning("Embedding creation failed", exc_info=True)
        return None
