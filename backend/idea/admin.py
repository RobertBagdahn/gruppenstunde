from django.contrib import admin

from .models import (
    Comment,
    Emotion,
    Idea,
    IdeaOfTheWeek,
    IdeaView,
    Ingredient,
    IngredientAlias,
    MaterialItem,
    MaterialName,
    MeasuringUnit,
    NutritionalTag,
    Portion,
    Price,
    RetailSection,
    ScoutLevel,
    Tag,
    TagSuggestion,
    UserPreferences,
)


class MaterialItemInline(admin.TabularInline):
    model = MaterialItem
    extra = 1


@admin.register(Idea)
class IdeaAdmin(admin.ModelAdmin):
    list_display = ["title", "slug", "idea_type", "status", "difficulty", "like_score", "view_count", "created_at"]
    list_filter = ["idea_type", "status", "difficulty", "costs_rating"]
    search_fields = ["title", "summary"]
    prepopulated_fields = {"slug": ("title",)}
    inlines = [MaterialItemInline]
    filter_horizontal = ["scout_levels", "tags", "authors"]
    list_per_page = 25


@admin.register(Tag)
class TagAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "parent", "sort_order", "is_approved"]
    list_filter = ["is_approved", "parent"]
    search_fields = ["name"]
    prepopulated_fields = {"slug": ("name",)}
    list_per_page = 25


@admin.register(TagSuggestion)
class TagSuggestionAdmin(admin.ModelAdmin):
    list_display = ["name", "parent", "suggested_by", "is_processed", "created_at"]
    list_filter = ["is_processed"]
    list_per_page = 25


@admin.register(ScoutLevel)
class ScoutLevelAdmin(admin.ModelAdmin):
    list_display = ["name", "sorting"]
    list_per_page = 25


@admin.register(Comment)
class CommentAdmin(admin.ModelAdmin):
    list_display = ["idea", "author_name", "user", "status", "created_at"]
    list_filter = ["status"]
    actions = ["approve_comments", "reject_comments"]

    @admin.action(description="Kommentare freigeben")
    def approve_comments(self, request, queryset):
        queryset.update(status="approved")

    @admin.action(description="Kommentare ablehnen")
    def reject_comments(self, request, queryset):
        queryset.update(status="rejected")

    list_per_page = 25


@admin.register(Emotion)
class EmotionAdmin(admin.ModelAdmin):
    list_display = ["idea", "emotion_type", "created_by", "created_at"]
    list_per_page = 25


@admin.register(IdeaOfTheWeek)
class IdeaOfTheWeekAdmin(admin.ModelAdmin):
    list_display = ["idea", "release_date"]
    list_per_page = 25


@admin.register(IdeaView)
class IdeaViewAdmin(admin.ModelAdmin):
    list_display = ["idea", "session_key", "created_at"]
    list_filter = ["created_at"]
    readonly_fields = ["idea", "session_key", "ip_hash", "user_agent", "created_at", "user"]
    list_per_page = 25


@admin.register(UserPreferences)
class UserPreferencesAdmin(admin.ModelAdmin):
    list_display = ["user", "preferred_scout_level", "preferred_difficulty"]
    list_per_page = 25


@admin.register(MaterialName)
class MaterialNameAdmin(admin.ModelAdmin):
    list_display = ["name", "default_unit"]
    list_per_page = 25


# ---------------------------------------------------------------------------
# Ingredient / Recipe models (from inspi/food)
# ---------------------------------------------------------------------------


@admin.register(MeasuringUnit)
class MeasuringUnitAdmin(admin.ModelAdmin):
    list_display = ["name", "quantity", "unit"]
    search_fields = ["name"]
    list_per_page = 25


@admin.register(NutritionalTag)
class NutritionalTagAdmin(admin.ModelAdmin):
    list_display = ["name", "name_opposite", "rank", "is_dangerous"]
    list_filter = ["is_dangerous"]
    search_fields = ["name", "name_opposite"]
    list_per_page = 25


class IngredientAliasInline(admin.TabularInline):
    model = IngredientAlias
    extra = 1


class PortionInline(admin.TabularInline):
    model = Portion
    extra = 1


class PriceInline(admin.TabularInline):
    model = Price
    extra = 1


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "physical_viscosity", "status", "nutri_class", "price_per_kg", "retail_section"]
    list_filter = ["status", "physical_viscosity", "retail_section", "nutri_class"]
    search_fields = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}
    filter_horizontal = ["nutritional_tags"]
    inlines = [IngredientAliasInline, PortionInline]
    list_per_page = 25
    fieldsets = (
        (None, {"fields": ("name", "slug", "description", "status", "retail_section")}),
        (
            "Physikalisch",
            {"fields": ("physical_density", "physical_viscosity", "durability_in_days", "max_storage_temperature")},
        ),
        (
            "Nährwerte pro 100g",
            {
                "fields": (
                    "energy_kj",
                    "protein_g",
                    "fat_g",
                    "fat_sat_g",
                    "carbohydrate_g",
                    "sugar_g",
                    "fibre_g",
                    "salt_g",
                    "sodium_mg",
                    "fructose_g",
                    "lactose_g",
                )
            },
        ),
        ("Scores", {"fields": ("child_score", "scout_score", "environmental_score", "nova_score", "fruit_factor")}),
        ("Berechnet", {"fields": ("nutri_score", "nutri_class", "price_per_kg"), "classes": ("collapse",)}),
        ("Referenzen", {"fields": ("fdc_id", "ean", "ingredient_ref"), "classes": ("collapse",)}),
        ("Tags", {"fields": ("nutritional_tags",)}),
    )


@admin.register(RetailSection)
class RetailSectionAdmin(admin.ModelAdmin):
    list_display = ["name", "rank"]
    search_fields = ["name"]
    list_per_page = 25


@admin.register(Price)
class PriceAdmin(admin.ModelAdmin):
    list_display = ["name", "price_eur", "quantity", "retailer", "quality", "portion"]
    search_fields = ["name", "retailer"]
    list_filter = ["retailer"]
    list_per_page = 25


@admin.register(Portion)
class PortionAdmin(admin.ModelAdmin):
    list_display = ["name", "ingredient", "quantity", "measuring_unit"]
    search_fields = ["name", "ingredient__name"]
    list_per_page = 25
