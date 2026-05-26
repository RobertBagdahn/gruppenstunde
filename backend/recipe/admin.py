from django.contrib import admin
from django.contrib.contenttypes.admin import GenericTabularInline

from content.admin import ContentApprovalMixin
from content.models import ContentComment, ContentEmotion
from supply.models import ContentMaterialItem

from .models import HealthRule, Recipe, RecipeItem, RecipeHint


class RecipeItemInline(admin.TabularInline):
    model = RecipeItem
    extra = 0


class ContentMaterialItemInline(GenericTabularInline):
    model = ContentMaterialItem
    extra = 0


@admin.register(Recipe)
class RecipeAdmin(ContentApprovalMixin, admin.ModelAdmin):
    list_display = ("title", "recipe_type", "status", "difficulty", "created_at")
    list_filter = ("status", "recipe_type", "difficulty")
    search_fields = ("title", "summary", "description")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [RecipeItemInline, ContentMaterialItemInline]
    readonly_fields = ("view_count", "like_score", "created_at", "updated_at")
    actions = ContentApprovalMixin.approval_actions


@admin.register(RecipeHint)
class RecipeHintAdmin(admin.ModelAdmin):
    list_display = ("name", "parameter", "min_max", "hint_level", "recipe_type", "recipe_objective")
    list_filter = ("hint_level", "parameter", "min_max", "recipe_type", "recipe_objective")
    search_fields = ("name", "description", "improvement_text")
    list_editable = ("hint_level",)
    list_per_page = 50


@admin.register(HealthRule)
class HealthRuleAdmin(admin.ModelAdmin):
    list_display = ("name", "parameter", "scope", "threshold_green", "threshold_yellow", "unit", "is_active")
    list_filter = ("scope", "parameter", "is_active")
    search_fields = ("name", "description", "tip_text")
    list_editable = ("threshold_green", "threshold_yellow", "is_active")
    list_per_page = 50
    fieldsets = (
        (None, {"fields": ("name", "description", "is_active", "sort_order")}),
        ("Regel", {"fields": ("parameter", "scope", "unit")}),
        ("Schwellenwerte", {"fields": ("threshold_green", "threshold_yellow")}),
        ("Anzeige", {"fields": ("tip_text",)}),
    )
