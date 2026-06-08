from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("recipe", "0029_convert_snack_to_simple_meal"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.RemoveField(
                    model_name="recipe",
                    name="cached_energy_kj",
                ),
                migrations.RemoveField(
                    model_name="recipe",
                    name="cached_energy_total_kj",
                ),
                migrations.AddField(
                    model_name="recipe",
                    name="cached_energy_kcal",
                    field=models.FloatField(blank=True, null=True, verbose_name="Energie (kcal, cached)"),
                ),
                migrations.AddField(
                    model_name="recipe",
                    name="cached_energy_total_kcal",
                    field=models.FloatField(blank=True, null=True, verbose_name="Gesamtenergie (kcal, cached)"),
                ),
            ],
            database_operations=[
                migrations.RunSQL(
                    sql=(
                        "ALTER TABLE recipe_recipe DISABLE TRIGGER ALL;"
                        "ALTER TABLE recipe_recipe ADD COLUMN cached_energy_kcal double precision;"
                        "UPDATE recipe_recipe SET cached_energy_kcal = ROUND(cached_energy_kj / 4.184);"
                        "ALTER TABLE recipe_recipe DROP COLUMN cached_energy_kj;"
                        "ALTER TABLE recipe_recipe ENABLE TRIGGER ALL;"
                    ),
                    reverse_sql=(
                        "ALTER TABLE recipe_recipe DISABLE TRIGGER ALL;"
                        "ALTER TABLE recipe_recipe ADD COLUMN cached_energy_kj double precision;"
                        "UPDATE recipe_recipe SET cached_energy_kj = ROUND(cached_energy_kcal * 4.184);"
                        "ALTER TABLE recipe_recipe DROP COLUMN cached_energy_kcal;"
                        "ALTER TABLE recipe_recipe ENABLE TRIGGER ALL;"
                    ),
                ),
                migrations.RunSQL(
                    sql=(
                        "ALTER TABLE recipe_recipe DISABLE TRIGGER ALL;"
                        "ALTER TABLE recipe_recipe ADD COLUMN cached_energy_total_kcal double precision;"
                        "UPDATE recipe_recipe SET cached_energy_total_kcal = ROUND(cached_energy_total_kj / 4.184);"
                        "ALTER TABLE recipe_recipe DROP COLUMN cached_energy_total_kj;"
                        "ALTER TABLE recipe_recipe ENABLE TRIGGER ALL;"
                    ),
                    reverse_sql=(
                        "ALTER TABLE recipe_recipe DISABLE TRIGGER ALL;"
                        "ALTER TABLE recipe_recipe ADD COLUMN cached_energy_total_kj double precision;"
                        "UPDATE recipe_recipe SET cached_energy_total_kj = ROUND(cached_energy_total_kcal * 4.184);"
                        "ALTER TABLE recipe_recipe DROP COLUMN cached_energy_total_kcal;"
                        "ALTER TABLE recipe_recipe ENABLE TRIGGER ALL;"
                    ),
                ),
                migrations.RunSQL(
                    sql="UPDATE recipe_rule SET parameter = 'energy_kcal' WHERE parameter = 'energy_kj';",
                    reverse_sql="UPDATE recipe_rule SET parameter = 'energy_kj' WHERE parameter = 'energy_kcal';",
                ),
            ],
        ),
        migrations.AlterField(
            model_name="rule",
            name="parameter",
            field=models.CharField(
                help_text="z.B. 'energy_kcal', 'sugar_g', 'protein_g'", max_length=50, verbose_name="Parameter"
            ),
        ),
        migrations.AlterField(
            model_name="rule",
            name="unit",
            field=models.CharField(
                blank=True, default="", help_text="z.B. 'g', 'kcal', 'mg'", max_length=20, verbose_name="Einheit"
            ),
        ),
    ]
