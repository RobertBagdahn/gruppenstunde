from django.contrib import admin
from .models import Recipe, RecipeItem, RecipeHint, RecipeComment, RecipeEmotion


class RecipeItemInline(admin.TabularInline):
    model = RecipeItem
    extra = 0


@admin.register(Recipe)
class RecipeAdmin(admin.ModelAdmin):
    list_display = ("title", "recipe_type", "status", "difficulty", "created_at")
    list_filter = ("status", "recipe_type", "difficulty")
    search_fields = ("title", "summary", "description")
    prepopulated_fields = {"slug": ("title",)}
    inlines = [RecipeItemInline]


@admin.register(RecipeHint)
class RecipeHintAdmin(admin.ModelAdmin):
    list_display = ("name", "parameter", "hint_level", "recipe_type")
    list_filter = ("hint_level", "recipe_type", "recipe_objective")


@admin.register(RecipeComment)
class RecipeCommentAdmin(admin.ModelAdmin):
    list_display = ("recipe", "user", "status", "created_at")
    list_filter = ("status",)


@admin.register(RecipeEmotion)
class RecipeEmotionAdmin(admin.ModelAdmin):
    list_display = ("recipe", "emotion_type", "created_at")
