"""TextChoices for the content app — shared across all content types."""

from django.db import models
from django.utils.translation import gettext_lazy as _


class ContentStatus(models.TextChoices):
    DRAFT = "draft", _("Entwurf")
    SUBMITTED = "submitted", _("Eingereicht")
    APPROVED = "approved", _("Genehmigt")
    REJECTED = "rejected", _("Abgelehnt")
    ARCHIVED = "archived", _("Archiviert")


class DifficultyChoices(models.TextChoices):
    EASY = "easy", _("Einfach")
    MEDIUM = "medium", _("Mittel")
    HARD = "hard", _("Schwer")


class ExecutionTimeChoices(models.TextChoices):
    LESS_30 = "less_30", _("< 30 Minuten")
    BETWEEN_30_60 = "30_60", _("30 – 60 Minuten")
    BETWEEN_60_90 = "60_90", _("60 – 90 Minuten")
    MORE_90 = "more_90", _("> 90 Minuten")


class PreparationTimeChoices(models.TextChoices):
    NONE = "none", _("Keine Vorbereitung")
    LESS_15 = "less_15", _("< 15 Minuten")
    BETWEEN_15_30 = "15_30", _("15 – 30 Minuten")
    BETWEEN_30_60 = "30_60", _("30 – 60 Minuten")
    MORE_60 = "more_60", _("> 60 Minuten")


class EmotionType(models.TextChoices):
    IN_LOVE = "in_love", _("Begeistert")
    HAPPY = "happy", _("Gut")
    DISAPPOINTED = "disappointed", _("Enttäuscht")
    COMPLEX = "complex", _("Zu komplex")


class CommentStatus(models.TextChoices):
    PENDING = "pending", _("Ausstehend")
    APPROVED = "approved", _("Freigegeben")
    REJECTED = "rejected", _("Abgelehnt")


class LinkType(models.TextChoices):
    MANUAL = "manual", _("Manuell verknüpft")
    EMBEDDING = "embedding", _("Embedding-basiert")
    AI_SUGGESTED = "ai_suggested", _("KI-Vorschlag")
    DUPLICATE_MERGED = "duplicate_merged", _("Duplikat zusammengeführt")


class ApprovalAction(models.TextChoices):
    SUBMITTED = "submitted", _("Eingereicht")
    APPROVED = "approved", _("Genehmigt")
    REJECTED = "rejected", _("Abgelehnt")


class EmbeddingFeedbackType(models.TextChoices):
    RELEVANT = "relevant", _("Relevant")
    NOT_RELEVANT = "not_relevant", _("Nicht relevant")
    WRONG_TYPE = "wrong_type", _("Falscher Typ")


class SortChoices(models.TextChoices):
    RANDOM = "random", _("Zufällig")
    NEWEST = "newest", _("Neueste")
    OLDEST = "oldest", _("Älteste")
    MOST_LIKED = "most_liked", _("Beliebteste")
    RELEVANT = "relevant", _("Relevanz")


class AiContextChoices(models.TextChoices):
    IMPROVE_TEXT = "improve_text", _("Text verbessern")
    SUGGEST_TAGS = "suggest_tags", _("Tags vorschlagen")
    REFURBISH = "refurbish", _("Inhalt aufbereiten")
    IMAGE_GENERATION = "image_generation", _("Bild generieren")
    SUGGEST_MATERIALS = "suggest_materials", _("Materialien vorschlagen")
    SUGGEST_RECIPE_SUPPLIES = "suggest_recipe_supplies", _("Rezeptmaterialien vorschlagen")
    INGREDIENT_AI_CREATE = "ingredient_ai_create", _("Zutat erstellen")
    INGREDIENT_AI_SUGGEST_ALL = "ingredient_ai_suggest_all", _("Zutatenfelder vorschlagen")
    INGREDIENT_SUGGEST_ALL = "ingredient_suggest_all", _("Zutatenfelder vorschlagen")
    INGREDIENT_AI_FILL_MISSING = "ingredient_ai_fill_missing", _("Zutatenfelder ergänzen")
    INGREDIENT_PRICE_SUGGESTION = "ingredient_price_suggestion", _("Zutatenpreis schätzen")
    INGREDIENT_URL_IMPORT = "ingredient_url_import", _("Zutat aus URL importieren")
    INGREDIENT_ASSIGNMENT_SUGGESTION = "ingredient_assignment_suggestion", _("Zutatenzuordnung vorschlagen")
    INGREDIENT_ENRICHMENT = "ingredient_enrichment", _("Zutat anreichern")
    INGREDIENT_PARSER = "ingredient_parser", _("Zutaten parsen")
    RECIPE_AI_CREATE = "recipe_ai_create", _("Rezept erstellen")
    RECIPE_SUGGEST_ALL = "recipe_suggest_all", _("Rezeptmetadaten vorschlagen")
    RECIPE_SUGGESTIONS = "recipe_suggestions", _("Rezeptvorschläge")
    AI_INGREDIENTS = "ai_ingredients", _("Rezeptzutaten vorschlagen")
    AI_QUANTITY_ESTIMATION = "ai_quantity_estimation", _("Mengen schätzen")
    RECIPE_STEP_GENERATION = "recipe_step_generation", _("Schritte generieren")
    RECIPE_STEP_IMPROVE = "recipe_step_improve", _("Schritt verbessern")
    RECIPE_MARKDOWN_CONVERSION = "recipe_markdown_conversion", _("Markdown konvertieren")
    RECIPE_SMART_INPUT = "recipe_smart_input", _("Smart Input")
    MEAL_PLAN_AI_SUGGEST = "meal_plan_ai_suggest", _("Essensplan vorschlagen")
    INTELLIGENT_SUGGESTIONS_RERANK = "intelligent_suggestions_rerank", _("Intelligente Vorschläge")
    PACKING_LIST_SUGGESTIONS = "packing_list_suggestions", _("Packlistenvorschläge")
    GENERATE_INVITATION = "generate_invitation", _("Einladung generieren")
    DOCUMENT_TEXT_GENERATION = "document_text_generation", _("Dokumententext generieren")
    URL_IMPORT_MATCHING = "url_import_matching", _("URL-Import Zuordnung")
    URL_IMPORT_METADATA = "url_import_metadata", _("URL-Import Metadaten")
    URL_IMPORT_GROUNDING_FALLBACK = "url_import_grounding_fallback", _("URL-Import Grounding")
    BATCH_GENERATE_DEFAULT_PORTIONS = "batch_generate_default_portions", _("Standardportionen generieren")
    CLASSIFY_INGREDIENTS = "classify_ingredients", _("Zutaten klassifizieren")
    CLEAN_INGREDIENT_DESCRIPTIONS_BATCH = "clean_ingredient_descriptions_batch", _("Beschreibungen bereinigen")
    EMBEDDING = "embedding", _("Embedding")
    ENRICH_RECIPE_METADATA = "enrich_recipe_metadata", _("Rezeptmetadaten anreichern")
    FIX_INGREDIENT_FILL = "fix_ingredient_fill", _("Zutat reparieren (Felder)")
    FIX_INGREDIENT_NAME = "fix_ingredient_name", _("Zutat reparieren (Name)")
    NORMALIZE_PORTIONS = "normalize_portions", _("Portionen normalisieren")
    RENAME_REWE_BATCH = "rename_rewe_batch", _("REWE umbenennen")
