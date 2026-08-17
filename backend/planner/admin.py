from django.contrib import admin

from .models import (
    Meal,
    MealItem,
    MealPlan,
    Planner,
    PlannerCollaborator,
    PlannerEntry,
)


class PlannerEntryInline(admin.TabularInline):
    model = PlannerEntry
    extra = 1
    raw_id_fields = ["session"]


class PlannerCollaboratorInline(admin.TabularInline):
    model = PlannerCollaborator
    extra = 0


@admin.register(Planner)
class PlannerAdmin(admin.ModelAdmin):
    list_display = ["title", "owner", "created_at"]
    inlines = [PlannerEntryInline, PlannerCollaboratorInline]
    list_per_page = 25


# ==========================================================================
# MealPlan Admin
# ==========================================================================


class MealItemInline(admin.TabularInline):
    model = MealItem
    extra = 0
    raw_id_fields = ["recipe"]


class MealInline(admin.TabularInline):
    model = Meal
    extra = 0
    show_change_link = True


@admin.register(MealPlan)
class MealPlanAdmin(admin.ModelAdmin):
    list_display = ["name", "created_by", "norm_portions", "event_name", "created_at"]
    list_filter = ["created_at"]
    search_fields = ["name"]
    filter_horizontal = ["nutritional_tags"]
    inlines = [MealInline]
    list_per_page = 25

    @admin.display(description="Event")
    def event_name(self, obj):
        relation = getattr(obj, "event_relation", None)
        return relation.event.name if relation else ""


@admin.register(Meal)
class MealAdmin(admin.ModelAdmin):
    list_display = ["meal_plan", "start_datetime", "meal_type", "day_part_factor"]
    list_filter = ["meal_type"]
    inlines = [MealItemInline]
    list_per_page = 25
