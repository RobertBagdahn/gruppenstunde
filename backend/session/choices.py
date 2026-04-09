"""TextChoices for session app (GroupSession)."""

from django.db import models
from django.utils.translation import gettext_lazy as _


class SessionType(models.TextChoices):
    SCOUT_SKILLS = "scout_skills", _("Pfadfindertechnik")
    NAVIGATION = "navigation", _("Navigation & Orientierung")
    NATURE_STUDY = "nature_study", _("Naturkunde")
    CRAFTS = "crafts", _("Basteln & Werken")
    ACTIVE_GAMES = "active_games", _("Bewegungsspiele")
    OUTDOOR_COOKING = "outdoor_cooking", _("Kochen & Backen")
    FIRST_AID = "first_aid", _("Erste Hilfe")
    COMMUNITY = "community", _("Gemeinschaft & Soziales")
    CAMPFIRE_CULTURE = "campfire_culture", _("Lagerfeuer & Singerunde")
    EXPLORATION = "exploration", _("Erkundung & Abenteuer")


class LocationType(models.TextChoices):
    INDOOR = "indoor", _("Drinnen")
    OUTDOOR = "outdoor", _("Draußen")
    BOTH = "both", _("Drinnen & Draußen")
