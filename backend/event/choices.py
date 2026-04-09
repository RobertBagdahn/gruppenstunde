from django.db import models
from django.utils.translation import gettext_lazy as _


class GenderChoices(models.TextChoices):
    MALE = "male", _("Männlich")
    FEMALE = "female", _("Weiblich")
    DIVERSE = "diverse", _("Divers")
    NO_ANSWER = "no_answer", _("Keine Angabe")


class TimelineActionChoices(models.TextChoices):
    REGISTERED = "registered", _("Angemeldet")
    UNREGISTERED = "unregistered", _("Abgemeldet")
    PAYMENT_RECEIVED = "payment_received", _("Zahlung erhalten")
    PAYMENT_REMOVED = "payment_removed", _("Zahlung entfernt")
    BOOKING_CHANGED = "booking_changed", _("Buchungsoption geändert")
    LABEL_ADDED = "label_added", _("Label hinzugefügt")
    LABEL_REMOVED = "label_removed", _("Label entfernt")
    CUSTOM_FIELD_UPDATED = "custom_field_updated", _("Benutzerdefiniertes Feld aktualisiert")
    MAIL_SENT = "mail_sent", _("E-Mail gesendet")
    PARTICIPANT_UPDATED = "participant_updated", _("Teilnehmer aktualisiert")


class PaymentMethodChoices(models.TextChoices):
    BAR = "bar", _("Bar")
    PAYPAL = "paypal", _("PayPal")
    UEBERWEISUNG = "ueberweisung", _("Überweisung")
    SONSTIGE = "sonstige", _("Sonstige")


class CustomFieldTypeChoices(models.TextChoices):
    TEXT = "text", _("Text")
    SELECT = "select", _("Auswahl")
    CHECKBOX = "checkbox", _("Checkbox")
    DATE = "date", _("Datum")
    NUMBER = "number", _("Zahl")


class ParticipantVisibilityChoices(models.TextChoices):
    NONE = "none", _("Nicht sichtbar")
    TOTAL_ONLY = "total_only", _("Nur Gesamtzahl")
    PER_OPTION = "per_option", _("Zahlen pro Buchungsoption")
    WITH_NAMES = "with_names", _("Zahlen und Vornamen")
