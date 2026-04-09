"""TextChoices for game app."""

from django.db import models
from django.utils.translation import gettext_lazy as _


class GameType(models.TextChoices):
    FIELD_GAME = "field_game", _("Geländespiel")
    GROUP_GAME = "group_game", _("Gruppenspiel")
    ICEBREAKER = "icebreaker", _("Kennenlernspiel")
    COOPERATION = "cooperation", _("Kooperationsspiel")
    NIGHT_GAME = "night_game", _("Nachtspiel")
    BOARD_GAME = "board_game", _("Brettspiel")
    RUNNING_GAME = "running_game", _("Laufspiel")
    SKILL_GAME = "skill_game", _("Geschicklichkeitsspiel")


class PlayArea(models.TextChoices):
    INDOOR = "indoor", _("Drinnen")
    OUTDOOR = "outdoor", _("Draußen")
    FIELD = "field", _("Wiese / Feld")
    FOREST = "forest", _("Wald")
    GYM = "gym", _("Turnhalle")
    ANY = "any", _("Überall")
