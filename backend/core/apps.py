from django.apps import AppConfig


class CoreConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "core"

    def ready(self):
        from django.contrib import admin
        from core.admin import InspiAdminSite

        # Replace the default admin site with our custom one
        # Transfer all registered models to the new site
        custom_site = InspiAdminSite()
        for model, model_admin in admin.site._registry.items():
            custom_site._registry[model] = model_admin
        admin.site = custom_site
        admin.sites.site = custom_site
