from django.contrib import admin
from django.contrib.contenttypes.admin import GenericTabularInline

from content.admin import ContentApprovalMixin
from supply.models import ContentMaterialItem

from .models import Recipe, RecipeItem, RecipeStep, RecipeStepIngredient, Rule


class RecipeItemInline(admin.TabularInline):
    model = RecipeItem
    extra = 0


class RecipeStepIngredientInline(admin.TabularInline):
    model = RecipeStepIngredient
    extra = 0
    readonly_fields = ("created_at", "updated_at")


class RecipeStepInline(admin.TabularInline):
    model = RecipeStep
    extra = 0
    readonly_fields = ("created_at", "updated_at")


class ContentMaterialItemInline(GenericTabularInline):
    model = ContentMaterialItem
    extra = 0


@admin.register(Recipe)
class RecipeAdmin(ContentApprovalMixin, admin.ModelAdmin):
    list_display = ("title", "recipe_type", "status", "difficulty", "created_at")
    list_filter = ("status", "recipe_type", "difficulty")
    search_fields = ("title", "summary", "description")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [RecipeItemInline, RecipeStepInline, ContentMaterialItemInline]
    readonly_fields = ("view_count", "like_score", "created_at", "updated_at")
    actions = ContentApprovalMixin.approval_actions


@admin.register(RecipeStep)
class RecipeStepAdmin(admin.ModelAdmin):
    list_display = ("recipe", "sort_order", "section", "duration_minutes", "created_at")
    list_filter = ("recipe", "section", "created_at")
    search_fields = ("recipe__slug", "instruction", "section")
    readonly_fields = ("created_at", "updated_at", "recipe")
    inlines = [RecipeStepIngredientInline]
    fields = ("recipe", "sort_order", "instruction", "duration_minutes", "section", "created_at", "updated_at")
    ordering = ("recipe", "sort_order")


@admin.register(RecipeStepIngredient)
class RecipeStepIngredientAdmin(admin.ModelAdmin):
    list_display = ("step", "recipe_item", "quantity_modifier", "preparation", "sort_order")
    list_filter = ("step__recipe", "step", "created_at")
    search_fields = ("step__recipe__slug", "recipe_item__portion__ingredient__name")
    readonly_fields = ("created_at", "updated_at", "step", "recipe_item")
    fields = ("step", "recipe_item", "quantity_modifier", "preparation", "sort_order", "created_at", "updated_at")
    ordering = ("step", "sort_order")


@admin.register(Rule)
class RuleAdmin(admin.ModelAdmin):
    list_display = ("name", "parameter", "scope", "rule_type", "min_green", "max_green", "unit", "is_active")
    list_filter = ("scope", "rule_type", "parameter", "is_active")
    search_fields = ("name", "description", "tip_text", "improvement_text")
    list_editable = ("min_green", "max_green", "is_active")
    list_per_page = 50
    fieldsets = (
        (None, {"fields": ("name", "description", "is_active", "sort_order")}),
        ("Regel", {"fields": ("parameter", "scope", "rule_type", "unit", "hint_level")}),
        ("Schwellenwerte Minimum", {"fields": ("min_green", "min_yellow")}),
        ("Schwellenwerte Maximum", {"fields": ("max_green", "max_yellow")}),
        ("Texte", {"fields": ("tip_text", "improvement_text")}),
    )
