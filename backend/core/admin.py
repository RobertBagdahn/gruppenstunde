from django.contrib.admin import AdminSite


class InspiAdminSite(AdminSite):
    site_header = "Inspi Administration"
    site_title = "Inspi Admin"
    index_title = "Verwaltung"

    # Define how idea models are split into sub-groups
    IDEA_GROUPS = {
        "Ideen – Inhalte": {
            "models": ["Idea", "Comment"],
            "app_label": "idea_inhalte",
        },
        "Ideen – Kategorien": {
            "models": ["Tag", "TagSuggestion", "ScoutLevel"],
            "app_label": "idea_kategorien",
        },
        "Ideen – Material": {
            "models": ["MeasuringUnit", "MaterialName"],
            "app_label": "idea_material",
        },
        "Ideen – Statistiken": {
            "models": ["Emotion", "IdeaView"],
            "app_label": "idea_statistiken",
        },
        "Ideen – Einzeldaten": {
            "models": ["IdeaOfTheWeek", "UserPreferences"],
            "app_label": "idea_einzeldaten",
        },
    }

    def get_app_list(self, request, app_label=None):
        app_list = super().get_app_list(request, app_label=app_label)

        new_app_list = []
        for app in app_list:
            if app["app_label"] != "idea":
                new_app_list.append(app)
                continue

            # Split idea app into sub-groups
            model_lookup = {m["object_name"]: m for m in app["models"]}

            for group_name, group_conf in self.IDEA_GROUPS.items():
                group_models = [
                    model_lookup[name]
                    for name in group_conf["models"]
                    if name in model_lookup
                ]
                if group_models:
                    new_app_list.append(
                        {
                            "name": group_name,
                            "app_label": group_conf["app_label"],
                            "app_url": app["app_url"],
                            "has_module_perms": app["has_module_perms"],
                            "models": group_models,
                        }
                    )

        return new_app_list
