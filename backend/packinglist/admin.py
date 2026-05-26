from django.contrib import admin

from .models import PackingCategory, PackingItem, PackingList, PackingListShare, PackingListShareCheck


class PackingCategoryInline(admin.TabularInline):
    model = PackingCategory
    extra = 1


class PackingItemInline(admin.TabularInline):
    model = PackingItem
    extra = 1


class PackingListShareInline(admin.TabularInline):
    model = PackingListShare
    extra = 0
    readonly_fields = ["token", "created_at"]


@admin.register(PackingList)
class PackingListAdmin(admin.ModelAdmin):
    list_display = ["title", "owner", "group", "is_template", "visibility", "category_count", "created_at"]
    list_filter = ["group", "is_template", "visibility"]
    search_fields = ["title", "description", "owner__email"]
    raw_id_fields = ["owner", "group"]
    inlines = [PackingCategoryInline, PackingListShareInline]
    list_per_page = 25

    @admin.display(description="Kategorien")
    def category_count(self, obj):
        return obj.categories.count()


@admin.register(PackingCategory)
class PackingCategoryAdmin(admin.ModelAdmin):
    list_display = ["name", "packing_list", "sort_order", "item_count"]
    list_filter = ["packing_list"]
    search_fields = ["name"]
    inlines = [PackingItemInline]
    list_per_page = 25

    @admin.display(description="Gegenstände")
    def item_count(self, obj):
        return obj.items.count()


@admin.register(PackingItem)
class PackingItemAdmin(admin.ModelAdmin):
    list_display = ["name", "quantity", "is_checked", "is_do_not_bring", "category", "sort_order"]
    list_filter = ["is_checked", "is_do_not_bring"]
    search_fields = ["name"]
    list_per_page = 25


@admin.register(PackingListShare)
class PackingListShareAdmin(admin.ModelAdmin):
    list_display = ["packing_list", "label", "token", "is_active", "created_at"]
    list_filter = ["is_active"]
    search_fields = ["label", "packing_list__title"]
    readonly_fields = ["token"]
    list_per_page = 25


@admin.register(PackingListShareCheck)
class PackingListShareCheckAdmin(admin.ModelAdmin):
    list_display = ["share", "item", "is_checked"]
    list_filter = ["is_checked"]
    raw_id_fields = ["share", "item"]
    list_per_page = 25
