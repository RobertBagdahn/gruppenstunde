# Manually created migration to rename DB column from "portions" to "norm_portions"
# The migration file 0001_initial.py was modified in-place after being applied,
# so Django's state already has "norm_portions" but the column is still "portions" in the DB.

from django.db import migrations


class Migration(migrations.Migration):
    dependencies = [
        ("planner", "0027_remove_mealplan_planner_mea_owner_i_f27fa3_idx_and_more"),
    ]

    operations = [
        migrations.RunSQL(
            sql='ALTER TABLE "planner_mealplan" RENAME COLUMN "portions" TO "norm_portions";',
            reverse_sql='ALTER TABLE "planner_mealplan" RENAME COLUMN "norm_portions" TO "portions";',
        ),
    ]
