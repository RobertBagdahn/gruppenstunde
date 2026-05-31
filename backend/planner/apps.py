from django.apps import AppConfig


class PlannerConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "planner"
    verbose_name = "Quartalsplaner"

    def ready(self):
        import planner.signals  # noqa: F401
