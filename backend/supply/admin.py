"""Django admin configuration for the supply app."""

from django.contrib import admin

from .models import (
    ContentMaterialItem,
    DgeReference,
    Ingredient,
    IngredientAlias,
    Material,
    MeasuringUnit,
    NutritionalTag,
    Package,
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
    list_display = ["material", "content_type", "object_id", "quantity", "sort_order"]
    list_filter = ["content_type"]
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

    def get_queryset(self, request):
        qs = super().get_queryset(request)
        return qs.select_related("measuring_unit")


class PackageInline(admin.TabularInline):
    model = Package
    extra = 1


@admin.register(Ingredient)
class IngredientAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "physical_viscosity", "status", "nutri_class", "price_per_kg", "retail_section"]
    list_filter = ["status", "physical_viscosity", "retail_section", "nutri_class"]
    search_fields = ["name", "slug"]
    prepopulated_fields = {"slug": ("name",)}
    filter_horizontal = ["nutritional_tags"]
    inlines = [IngredientAliasInline, PortionInline, PackageInline]
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
                    "energy_kcal",
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
        (
            "Vitamine",
            {
                "classes": ("collapse",),
                "fields": (
                    "vitamin_a_mg",
                    "vitamin_b1_mg",
                    "vitamin_b2_mg",
                    "vitamin_b6_mg",
                    "vitamin_b12_ug",
                    "vitamin_c_mg",
                    "vitamin_d_ug",
                    "vitamin_e_mg",
                    "vitamin_k_ug",
                    "niacin_mg",
                    "folate_ug",
                    "pantothenic_acid_mg",
                    "biotin_ug",
                ),
            },
        ),
        (
            "Mineralstoffe",
            {
                "classes": ("collapse",),
                "fields": (
                    "calcium_mg",
                    "iron_mg",
                    "magnesium_mg",
                    "zinc_mg",
                    "potassium_mg",
                    "phosphorus_mg",
                    "iodine_ug",
                    "selenium_ug",
                    "copper_mg",
                    "manganese_mg",
                    "chromium_ug",
                    "fluoride_mg",
                ),
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


@admin.register(Package)
class PackageAdmin(admin.ModelAdmin):
    list_display = ["name", "ingredient", "weight_g", "rank"]
    search_fields = ["name", "ingredient__name"]
    list_per_page = 25


# ---------------------------------------------------------------------------
# DGE Reference Values
# ---------------------------------------------------------------------------


@admin.register(DgeReference)
class DgeReferenceAdmin(admin.ModelAdmin):
    list_display = ["age_min", "age_max", "gender", "energy_kcal", "protein_g", "vitamin_c_mg"]
    list_filter = ["gender"]
    search_fields = ["gender"]
    list_per_page = 25
    fieldsets = (
        (None, {"fields": ("age_min", "age_max", "gender")}),
        (
            "Makronährstoffe (pro Tag)",
            {"fields": ("energy_kcal", "protein_g", "fat_g", "carbohydrate_g", "fibre_g")},
        ),
        (
            "Obergrenzen (pro Tag)",
            {"fields": ("sugar_g_max", "salt_g_max", "fat_sat_g_max", "sodium_mg_max")},
        ),
        (
            "Vitamine (pro Tag)",
            {
                "fields": ("vitamin_c_mg",),
            },
        ),
    )
