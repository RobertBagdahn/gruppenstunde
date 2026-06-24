from django.contrib import admin
from django.contrib.contenttypes.admin import GenericTabularInline

from content.admin import ContentApprovalMixin
from supply.models import ContentMaterialItem

from .models import Recipe, RecipeItem, Rule


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
