from django.contrib.admin import AdminSite


class InspiAdminSite(AdminSite):
    site_header = "Inspi Administration"
    site_title = "Inspi Admin"
    index_title = "Verwaltung"
