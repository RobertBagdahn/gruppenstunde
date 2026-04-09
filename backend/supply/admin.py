"""Django admin configuration for the supply app."""

from django.contrib import admin

from .models import (
    ContentMaterialItem,
    Ingredient,
    IngredientAlias,
    Material,
    MeasuringUnit,
    NutritionalTag,
    Portion,
    RetailSection,
)


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "material_category", "is_consumable", "created_at"]
    list_filter = ["material_category", "is_consumable"]
    search_fields = ["name", "description"]
    prepopulated_fields = {"slug": ("name",)}
    ordering = ["name"]


@admin.register(ContentMaterialItem)
class ContentMaterialItemAdmin(admin.ModelAdmin):
    list_display = ["material", "content_type", "object_id", "quantity", "quantity_type", "sort_order"]
    list_filter = ["content_type", "quantity_type"]
    ordering = ["sort_order"]


# ---------------------------------------------------------------------------
# Measuring Units
# ---------------------------------------------------------------------------


@admin.register(MeasuringUnit)
class MeasuringUnitAdmin(admin.ModelAdmin):
    list_display = ["name", "quantity", "unit"]
    search_fields = ["name"]
    list_per_page = 25


# ---------------------------------------------------------------------------
# Nutritional Tags
# ---------------------------------------------------------------------------


@admin.register(NutritionalTag)
class NutritionalTagAdmin(admin.ModelAdmin):
    list_display = ["name", "name_opposite", "rank", "is_dangerous"]
    list_filter = ["is_dangerous"]
    search_fields = ["name", "name_opposite"]
    list_per_page = 25


# ---------------------------------------------------------------------------
# Retail Sections
# ---------------------------------------------------------------------------


@admin.register(RetailSection)
class RetailSectionAdmin(admin.ModelAdmin):
    list_display = ["name", "rank"]
    search_fields = ["name"]
    list_per_page = 25


# ---------------------------------------------------------------------------
# Ingredient + Inlines
# ---------------------------------------------------------------------------


class IngredientAliasInline(admin.TabularInline):
    model = IngredientAlias
    extra = 1


class PortionInline(admin.TabularInline):
    model = Portion
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


@admin.register(Portion)
class PortionAdmin(admin.ModelAdmin):
    list_display = ["name", "ingredient", "quantity", "measuring_unit"]
    search_fields = ["name", "ingredient__name"]
    list_per_page = 25
