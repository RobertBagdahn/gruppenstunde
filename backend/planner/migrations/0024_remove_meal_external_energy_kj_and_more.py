from django.db import migrations, models


def _convert_reverse_sql(old_col, new_col, table):
    return f"""
        ALTER TABLE {table} ADD COLUMN {old_col} double precision;
        UPDATE {table} SET {old_col} = ROUND({new_col} * 4.184);
        ALTER TABLE {table} DROP COLUMN {new_col};
    """


class Migration(migrations.Migration):
    dependencies = [
        ("planner", "0023_alter_mealplan_allergen_tags"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.RemoveField(
                    model_name="meal",
                    name="external_energy_kj",
                ),
                migrations.AddField(
                    model_name="meal",
                    name="external_energy_kcal",
                    field=models.FloatField(
                        blank=True,
                        help_text="Manuell eingegebener Energiewert für externe Mahlzeiten",
                        null=True,
                        verbose_name="Externe Energie (kcal)",
                    ),
                ),
            ],
            database_operations=[
                migrations.RunSQL(
                    sql="""
                        ALTER TABLE planner_meal ADD COLUMN external_energy_kcal double precision;
                        UPDATE planner_meal SET external_energy_kcal = ROUND(external_energy_kj / 4.184);
                        ALTER TABLE planner_meal DROP COLUMN external_energy_kj;
                    """,
                    reverse_sql=_convert_reverse_sql("external_energy_kj", "external_energy_kcal", "planner_meal"),
                ),
            ],
        ),
    ]
