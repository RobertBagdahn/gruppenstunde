from django.db import models
from django.utils.translation import gettext_lazy as _


class EmotionType(models.TextChoices):
    IN_LOVE = "in_love", _("Begeistert")
    HAPPY = "happy", _("Gut")
    DISAPPOINTED = "disappointed", _("Enttäuscht")
    COMPLEX = "complex", _("Zu komplex")


class ExecutionTimeChoices(models.TextChoices):
    LESS_30 = "less_30", _("< 30 Minuten")
    BETWEEN_30_60 = "30_60", _("30 – 60 Minuten")
    BETWEEN_60_90 = "60_90", _("60 – 90 Minuten")
    MORE_90 = "more_90", _("> 90 Minuten")


class DifficultyChoices(models.TextChoices):
    EASY = "easy", _("Einfach")
    MEDIUM = "medium", _("Mittel")
    HARD = "hard", _("Schwer")


class CostsRatingChoices(models.TextChoices):
    FREE = "free", _("0 €")
    LESS_1 = "less_1", _("< 1 €")
    BETWEEN_1_2 = "1_2", _("1 – 2 €")
    MORE_2 = "more_2", _("> 2 €")


class PreparationTimeChoices(models.TextChoices):
    NONE = "none", _("Keine Vorbereitung")
    LESS_15 = "less_15", _("< 15 Minuten")
    BETWEEN_15_30 = "15_30", _("15 – 30 Minuten")
    BETWEEN_30_60 = "30_60", _("30 – 60 Minuten")
    MORE_60 = "more_60", _("> 60 Minuten")


class StatusChoices(models.TextChoices):
    DRAFT = "draft", _("Entwurf")
    PUBLISHED = "published", _("Veröffentlicht")
    ARCHIVED = "archived", _("Archiviert")
    REVIEW = "review", _("In Prüfung")


class CommentStatus(models.TextChoices):
    PENDING = "pending", _("Ausstehend")
    APPROVED = "approved", _("Freigegeben")
    REJECTED = "rejected", _("Abgelehnt")


class SortChoices(models.TextChoices):
    RANDOM = "random", _("Zufällig")
    NEWEST = "newest", _("Neueste")
    OLDEST = "oldest", _("Älteste")
    MOST_LIKED = "most_liked", _("Beliebteste")
    RELEVANT = "relevant", _("Relevanz")


class MaterialQuantityType(models.TextChoices):
    ONCE = "once", _("Einmalig")
    PER_PERSON = "per_person", _("Pro Person")


class IdeaTypeChoices(models.TextChoices):
    IDEA = "idea", _("Idee")
    KNOWLEDGE = "knowledge", _("Wissensbeitrag")


# ---------------------------------------------------------------------------
# Recipe / Ingredient choices (merged from inspi/food)
# ---------------------------------------------------------------------------


class RecipeTypeChoices(models.TextChoices):
    BREAKFAST = "breakfast", _("Frühstück")
    WARM_MEAL = "warm_meal", _("Warme Mahlzeit")
    COLD_MEAL = "cold_meal", _("Kalte Mahlzeit")
    DESSERT = "dessert", _("Nachtisch")
    SIDE_DISH = "side_dish", _("Beilage")
    SNACK = "snack", _("Snack")
    DRINK = "drink", _("Getränk")


class PhysicalViscosityChoices(models.TextChoices):
    SOLID = "solid", _("Essen")
    BEVERAGE = "beverage", _("Getränk")


class MeasuringUnitType(models.TextChoices):
    VOLUME = "ml", _("Milliliter")
    MASS = "g", _("Gramm")


class IngredientStatusChoices(models.TextChoices):
    DRAFT = "draft", _("Entwurf")
    VERIFIED = "verified", _("Verifiziert")
    USER_CONTENT = "user_content", _("Benutzer erstellt")


class HintParameterChoices(models.TextChoices):
    ENERGY_KJ = "energy_kj", _("Energie (kJ)")
    SUGAR_G = "sugar_g", _("Zucker (g)")
    SODIUM_MG = "sodium_mg", _("Natrium (mg)")
    FIBRE_G = "fibre_g", _("Ballaststoffe (g)")
    FAT_G = "fat_g", _("Fett (g)")
    FAT_SAT_G = "fat_sat_g", _("Gesättigte Fettsäuren (g)")
    PROTEIN_G = "protein_g", _("Eiweiß (g)")
    CARBOHYDRATE_G = "carbohydrate_g", _("Kohlenhydrate (g)")
    SALT_G = "salt_g", _("Salz (g)")
    FRUCTOSE_G = "fructose_g", _("Fructose (g)")
    LACTOSE_G = "lactose_g", _("Laktose (g)")
    FRUIT_FACTOR = "fruit_factor", _("Obst-/Gemüse-Anteil")


class HintMinMaxChoices(models.TextChoices):
    MIN = "min", _("Mindestens")
    MAX = "max", _("Höchstens")
    RANGE = "range", _("Bereich")


class HintLevelChoices(models.TextChoices):
    INFO = "info", _("Information")
    WARNING = "warning", _("Warnung")
    ERROR = "error", _("Fehler")


class RecipeObjectiveChoices(models.TextChoices):
    HEALTH = "health", _("Gesundheit")
    TASTE = "taste", _("Geschmack")
    COST = "cost", _("Kosten")
    FULFILLMENT = "fulfillment", _("Sättigung")
