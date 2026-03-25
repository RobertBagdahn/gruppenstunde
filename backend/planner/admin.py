from django.contrib import admin

from .models import Planner, PlannerCollaborator, PlannerEntry


class PlannerEntryInline(admin.TabularInline):
    model = PlannerEntry
    extra = 1
    raw_id_fields = ["idea"]


class PlannerCollaboratorInline(admin.TabularInline):
    model = PlannerCollaborator
    extra = 0


@admin.register(Planner)
class PlannerAdmin(admin.ModelAdmin):
    list_display = ["title", "owner", "created_at"]
    inlines = [PlannerEntryInline, PlannerCollaboratorInline]
    list_per_page = 25
