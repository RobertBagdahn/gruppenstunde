"""TextChoices for supply app."""

from django.db import models
from django.utils.translation import gettext_lazy as _


class MaterialCategory(models.TextChoices):
    TOOLS = "tools", _("Werkzeuge")
    CRAFTING = "crafting", _("Bastelmaterial")
    KITCHEN = "kitchen", _("Küchengeräte")
    OUTDOOR = "outdoor", _("Outdoor-Ausrüstung")
    STATIONERY = "stationery", _("Schreibwaren")
    OTHER = "other", _("Sonstiges")


class MaterialQuantityType(models.TextChoices):
    ONCE = "once", _("Einmalig")
    PER_PERSON = "per_person", _("Pro Person")


# ---------------------------------------------------------------------------
# Ingredient-related choices (migrated from idea/choices.py)
# ---------------------------------------------------------------------------


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


# ---------------------------------------------------------------------------
# Recipe hint choices (migrated from idea/choices.py)
# ---------------------------------------------------------------------------


class RecipeTypeChoices(models.TextChoices):
    BREAKFAST = "breakfast", _("Frühstück")
    WARM_MEAL = "warm_meal", _("Warme Mahlzeit")
    COLD_MEAL = "cold_meal", _("Kalte Mahlzeit")
    DESSERT = "dessert", _("Nachtisch")
    SIDE_DISH = "side_dish", _("Beilage")
    SNACK = "snack", _("Snack")
    DRINK = "drink", _("Getränk")


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
