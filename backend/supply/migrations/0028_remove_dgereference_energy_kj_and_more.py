from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("supply", "0027_alter_ingredient_standalone_type"),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.RemoveField(
                    model_name="dgereference",
                    name="energy_kj",
                ),
                migrations.RemoveField(
                    model_name="ingredient",
                    name="energy_kj",
                ),
                migrations.AddField(
                    model_name="dgereference",
                    name="energy_kcal",
                    field=models.FloatField(blank=True, null=True, verbose_name="Energie (kcal)"),
                ),
                migrations.AddField(
                    model_name="ingredient",
                    name="energy_kcal",
                    field=models.FloatField(blank=True, default=0, null=True, verbose_name="Energie (kcal)"),
                ),
            ],
            database_operations=[
                migrations.RunSQL(
                    sql="""
                        ALTER TABLE supply_ingredient ADD COLUMN energy_kcal double precision;
                        UPDATE supply_ingredient SET energy_kcal = ROUND(energy_kj / 4.184);
                        ALTER TABLE supply_ingredient DROP COLUMN energy_kj;
                    """,
                    reverse_sql="""
                        ALTER TABLE supply_ingredient ADD COLUMN energy_kj double precision;
                        UPDATE supply_ingredient SET energy_kj = ROUND(energy_kcal * 4.184);
                        ALTER TABLE supply_ingredient DROP COLUMN energy_kcal;
                    """,
                ),
                migrations.RunSQL(
                    sql="""
                        ALTER TABLE supply_dgereference ADD COLUMN energy_kcal double precision;
                        UPDATE supply_dgereference SET energy_kcal = ROUND(energy_kj / 4.184);
                        ALTER TABLE supply_dgereference DROP COLUMN energy_kj;
                    """,
                    reverse_sql="""
                        ALTER TABLE supply_dgereference ADD COLUMN energy_kj double precision;
                        UPDATE supply_dgereference SET energy_kj = ROUND(energy_kcal * 4.184);
                        ALTER TABLE supply_dgereference DROP COLUMN energy_kcal;
                    """,
                ),
            ],
        ),
    ]
