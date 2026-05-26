from django.apps import AppConfig


class ProfilesConfig(AppConfig):
    default_auto_field = "django.db.models.BigAutoField"
    name = "profiles"
    verbose_name = "Profile & Gruppen"

    def ready(self) -> None:
        from content.services.privacy import ContentPrivacyCollector
        from event.services.privacy import EventPrivacyCollector, WhatsAppPrivacyCollector
        from packinglist.services.privacy import PackingListPrivacyCollector
        from planner.services.privacy import PlannerPrivacyCollector
        from profiles.services.privacy import PrivacyService, ProfilePrivacyCollector
        from shopping.services.privacy import ShoppingPrivacyCollector

        PrivacyService.register(ProfilePrivacyCollector())
        PrivacyService.register(EventPrivacyCollector())
        PrivacyService.register(WhatsAppPrivacyCollector())
        PrivacyService.register(ContentPrivacyCollector())
        PrivacyService.register(PlannerPrivacyCollector())
        PrivacyService.register(PackingListPrivacyCollector())
        PrivacyService.register(ShoppingPrivacyCollector())
