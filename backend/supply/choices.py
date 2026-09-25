"""TextChoices for supply app."""

from __future__ import annotations

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
    PIECE = "stk", _("Stück")


class IngredientStatusChoices(models.TextChoices):
    DRAFT = "draft", _("Entwurf")
    VERIFIED = "verified", _("Verifiziert")


class StorageTypeChoices(models.TextChoices):
    DRY = "dry", _("Trocken")
    REFRIGERATED = "refrigerated", _("Kühlschrank")
    FROZEN = "frozen", _("Gefroren")
    AMBIENT = "ambient", _("Raumtemperatur")


class PortionWeightStatus(models.TextChoices):
    UNKNOWN = "unknown", _("Unbekannt")
    AI_PROPOSED = "ai_proposed", _("KI-Vorschlag")
    CONFIRMED = "confirmed", _("Bestätigt")
    IMPORTED = "imported", _("Importiert")


class PortionWeightSource(models.TextChoices):
    SYSTEM = "system", _("System")
    MANUAL = "manual", _("Manuell")
    AI = "ai", _("KI")
    IMPORT = "import", _("Import")


class PortionRepairStatus(models.TextChoices):
    CANDIDATE = "candidate", _("Kandidat")
    PENDING_REVIEW = "pending_review", _("Prüffall")
    READY = "ready", _("Bereit")
    APPLIED = "applied", _("Angewendet")
    REJECTED = "rejected", _("Abgelehnt")
    SKIPPED = "skipped", _("Übersprungen")


class PortionRepairDetectionReason(models.TextChoices):
    PIECE_NAME_ONE_GRAM = "piece_name_one_gram", _("Stück-Name mit 1 g")
    PIECE_NAME_GRAM_UNIT = "piece_name_gram_unit", _("Stück-Name mit Gramm-Einheit")
    ONE_GRAM_PLACEHOLDER = "one_gram_placeholder", _("1-g-Platzhalter")
    MISSING_WEIGHT = "missing_weight", _("Fehlendes Gewicht")
    IMPLAUSIBLE_RANK1 = "implausible_rank1", _("Unplausibles rank-1-Gewicht")


# ---------------------------------------------------------------------------
# Recipe hint choices (migrated from idea/choices.py)
# ---------------------------------------------------------------------------


class RecipeTypeChoices(models.TextChoices):
    BREAKFAST = "breakfast", _("Frühstück")
    WARM_MEAL = "warm_meal", _("Warme Mahlzeit")
    COLD_MEAL = "cold_meal", _("Kalte Mahlzeit")
    DESSERT = "dessert", _("Nachtisch")
    RECIPE_PART = "recipe_part", _("Rezeptteil")
    DRINK = "drink", _("Getränk")
    SNACK = "snack", _("Snack")


class HintParameterChoices(models.TextChoices):
    ENERGY_KCAL = "energy_kcal", _("Energie (kcal)")
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
    WARNING: HintLevelChoices


HintLevelChoices.WARNING = HintLevelChoices.WARN


class RecipeObjectiveChoices(models.TextChoices):
    HEALTH = "health", _("Gesundheit")
    TASTE = "taste", _("Geschmack")
    COST = "cost", _("Kosten")
    FULFILLMENT = "fulfillment", _("Sättigung")
