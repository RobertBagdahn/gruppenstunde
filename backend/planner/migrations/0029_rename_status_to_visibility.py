# Manually created migration to rename DB column from "status" to "visibility"
# The model field was renamed in-place without a corresponding migration,
# so Django's state already has "visibility" but the column is still "status" in the DB.

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ("planner", "0028_rename_portions_to_norm_portions"),
    ]

    operations = [
        migrations.RunSQL(
            sql='ALTER TABLE "planner_mealplan" RENAME COLUMN "status" TO "visibility";',
            reverse_sql='ALTER TABLE "planner_mealplan" RENAME COLUMN "visibility" TO "status";',
        ),
    ]
