from django.db import models
from django.utils.translation import gettext_lazy as _


class GenderChoices(models.TextChoices):
    MALE = "male", _("Männlich")
    FEMALE = "female", _("Weiblich")
    DIVERSE = "diverse", _("Divers")
    NO_ANSWER = "no_answer", _("Keine Angabe")
