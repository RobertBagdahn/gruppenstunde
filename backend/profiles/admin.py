from django.contrib import admin

from .models import GroupJoinRequest, GroupMembership, UserGroup, UserPreference, UserProfile


class GroupMembershipInline(admin.TabularInline):
    model = GroupMembership
    extra = 0
    raw_id_fields = ["user"]


@admin.register(UserProfile)
class UserProfileAdmin(admin.ModelAdmin):
    list_display = ["user", "scout_name", "first_name", "last_name", "gender", "created_at"]
    search_fields = ["user__email", "scout_name", "first_name", "last_name"]
    list_filter = ["gender"]
    raw_id_fields = ["user"]
    filter_horizontal = ["nutritional_tags"]
    list_per_page = 25


@admin.register(UserPreference)
class UserPreferenceAdmin(admin.ModelAdmin):
    list_display = ["user", "preferred_scout_level", "preferred_difficulty"]
    raw_id_fields = ["user"]
    list_per_page = 25


@admin.register(UserGroup)
class UserGroupAdmin(admin.ModelAdmin):
    list_display = ["name", "slug", "is_visible", "free_to_join", "is_deleted", "created_at"]
    list_filter = ["is_visible", "free_to_join", "is_deleted"]
    search_fields = ["name", "description"]
    prepopulated_fields = {"slug": ("name",)}
    inlines = [GroupMembershipInline]
    list_per_page = 25


@admin.register(GroupMembership)
class GroupMembershipAdmin(admin.ModelAdmin):
    list_display = ["user", "group", "role", "is_active", "date_joined"]
    list_filter = ["role", "is_active"]
    raw_id_fields = ["user", "group"]
    list_per_page = 25


@admin.register(GroupJoinRequest)
class GroupJoinRequestAdmin(admin.ModelAdmin):
    list_display = ["user", "group", "approved", "date_requested", "date_checked"]
    list_filter = ["approved"]
    raw_id_fields = ["user", "group", "checked_by"]
    list_per_page = 25
