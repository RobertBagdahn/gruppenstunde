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


class CostsRatingChoices(models.TextChoices):
    FREE = "free", _("0 €")
    LESS_1 = "less_1", _("< 1 €")
    BETWEEN_1_2 = "1_2", _("1 – 2 €")
    MORE_2 = "more_2", _("> 2 €")


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
