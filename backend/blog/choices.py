"""TextChoices for blog app."""

from django.db import models
from django.utils.translation import gettext_lazy as _


class BlogType(models.TextChoices):
    TUTORIAL = "tutorial", _("Anleitung")
    GUIDE = "guide", _("Ratgeber")
    EXPERIENCE = "experience", _("Erfahrungsbericht")
    BACKGROUND = "background", _("Hintergrund")
    METHODOLOGY = "methodology", _("Methodik")
    LEGAL = "legal", _("Recht & Regeln")
