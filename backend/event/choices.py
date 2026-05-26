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
    ATTENDANCE_CHECK_IN = "attendance_check_in", _("Eingecheckt")
    ATTENDANCE_CHECK_OUT = "attendance_check_out", _("Ausgecheckt")
    PARTICIPANTS_IMPORTED = "participants_imported", _("Teilnehmer importiert")
    WHATSAPP_SENT = "whatsapp_sent", _("WhatsApp gesendet")


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


class RegistrationDeletionReason(models.TextChoices):
    DUPLICATE = "duplicate", _("Duplikat")
    ERROR = "error", _("Fehler")
    CANCEL = "cancel", _("Stornierung")
    OTHER = "other", _("Sonstiges")


class EventColorChoices(models.TextChoices):
    SLATE = "slate", _("Schiefergrau")
    RED = "red", _("Rot")
    ORANGE = "orange", _("Orange")
    AMBER = "amber", _("Bernstein")
    YELLOW = "yellow", _("Gelb")
    LIME = "lime", _("Limette")
    GREEN = "green", _("Grün")
    EMERALD = "emerald", _("Smaragd")
    TEAL = "teal", _("Türkis")
    CYAN = "cyan", _("Cyan")
    BLUE = "blue", _("Blau")
    VIOLET = "violet", _("Violett")
    PURPLE = "purple", _("Lila")
    PINK = "pink", _("Pink")
    ROSE = "rose", _("Rosa")


class EventIconChoices(models.TextChoices):
    TENT = "tent", _("Zelt")
    FLAME = "flame", _("Feuer")
    COMPASS = "compass", _("Kompass")
    MAP = "map", _("Karte")
    MOUNTAIN = "mountain", _("Berg")
    TREE_PINE = "tree-pine", _("Baum")
    SUN = "sun", _("Sonne")
    MOON = "moon", _("Mond")
    STAR = "star", _("Stern")
    HEART = "heart", _("Herz")
    FLAG = "flag", _("Flagge")
    USERS = "users", _("Gruppe")
    MUSIC = "music", _("Musik")
    BOOK = "book", _("Buch")
    UTENSILS = "utensils", _("Besteck")
    BACKPACK = "backpack", _("Rucksack")
    FLASHLIGHT = "flashlight", _("Taschenlampe")
    BINOCULARS = "binoculars", _("Fernglas")
    ANCHOR = "anchor", _("Anker")
    SHIELD = "shield", _("Schild")
    AWARD = "award", _("Auszeichnung")
    CROWN = "crown", _("Krone")
    ZAP = "zap", _("Blitz")
    CLOUD = "cloud", _("Wolke")
    SNOWFLAKE = "snowflake", _("Schneeflocke")
    UMBRELLA = "umbrella", _("Regenschirm")
    LEAF = "leaf", _("Blatt")
    FISH = "fish", _("Fisch")
    BIRD = "bird", _("Vogel")
    MAP_PIN = "map-pin", _("Kartennadel")
    CALENDAR = "calendar", _("Kalender")
    HOME = "home", _("Haus")
    COFFEE = "coffee", _("Kaffee")
    PALETTE = "palette", _("Palette")
    SPARKLES = "sparkles", _("Funken")
    ROCKET = "rocket", _("Rakete")


class EventPhaseChoices(models.TextChoices):
    DRAFT = "draft", _("Entwurf")
    PRE_REGISTRATION = "pre_registration", _("Vor der Anmeldung")
    REGISTRATION = "registration", _("Anmeldung offen")
    PRE_EVENT = "pre_event", _("Vor dem Event")
    RUNNING = "running", _("Event läuft")
    COMPLETED = "completed", _("Abgeschlossen")


class BudgetCategoryChoices(models.TextChoices):
    MATERIAL = "material", _("Material")
    FOOD = "food", _("Verpflegung")
    TRANSPORT = "transport", _("Transport")
    VENUE = "venue", _("Unterkunft")
    OTHER = "other", _("Sonstiges")


class WhatsAppMessageStatusChoices(models.TextChoices):
    PENDING = "pending", _("Ausstehend")
    SENT = "sent", _("Gesendet")
    DELIVERED = "delivered", _("Zugestellt")
    FAILED = "failed", _("Fehlgeschlagen")
