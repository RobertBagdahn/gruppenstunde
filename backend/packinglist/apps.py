from django.apps import AppConfig
from django.utils.translation import gettext_lazy as _


class PackinglistConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "packinglist"
    verbose_name = _("Packlisten")
