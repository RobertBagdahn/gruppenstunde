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
    SIMPLE_MEAL = "simple_meal", _("Einfache Mahlzeit")


class HintParameterChoices(models.TextChoices):
    ENERGY_KJ = "energy_kj", _("Energie (kcal)")
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
    # Extended parameters
    WEIGHT_G = "weight_g", _("Gewicht (g)")
    NUTRI_CLASS = "nutri_class", _("Nutri-Score Klasse")
    # Vitamins
    VITAMIN_C_MG = "vitamin_c_mg", _("Vitamin C (mg)")
    VITAMIN_A_MG = "vitamin_a_mg", _("Vitamin A (mg)")
    VITAMIN_D_UG = "vitamin_d_ug", _("Vitamin D (µg)")
    VITAMIN_B12_UG = "vitamin_b12_ug", _("Vitamin B12 (µg)")
    # Minerals
    CALCIUM_MG = "calcium_mg", _("Calcium (mg)")
    IRON_MG = "iron_mg", _("Eisen (mg)")
    MAGNESIUM_MG = "magnesium_mg", _("Magnesium (mg)")
    POTASSIUM_MG = "potassium_mg", _("Kalium (mg)")
    ZINC_MG = "zinc_mg", _("Zink (mg)")
    FOLATE_UG = "folate_ug", _("Folsäure (µg)")


class HintMinMaxChoices(models.TextChoices):
    MIN = "min", _("Mindestens")
    MAX = "max", _("Höchstens")


class HintLevelChoices(models.TextChoices):
    INFO = "info", _("Information")
    WARN = "warn", _("Warnung")
    ERROR = "error", _("Fehler")


HintLevelChoices.WARNING = HintLevelChoices.WARN


class RecipeObjectiveChoices(models.TextChoices):
    HEALTH = "health", _("Gesundheit")
    TASTE = "taste", _("Geschmack")
    COST = "cost", _("Kosten")
    FULFILLMENT = "fulfillment", _("Sättigung")
