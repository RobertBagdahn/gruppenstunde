from django.db import migrations


class Migration(migrations.Migration):

    atomic = False

    dependencies = [
        ("content", "0009_google_ml_integration_extension"),
    ]

    operations = [
        migrations.RunSQL(
            sql=[
                "DROP INDEX IF EXISTS supply_ingredient_embedding_ivfflat;",
                "DROP INDEX IF EXISTS recipe_recipe_embedding_ivfflat;",
                "DROP INDEX IF EXISTS blog_blog_embedding_ivfflat;",
                "DROP INDEX IF EXISTS session_groupsession_embedding_ivfflat;",
                "DROP INDEX IF EXISTS game_game_embedding_ivfflat;",
                (
                    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ingredient_embedding_hnsw "
                    "ON supply_ingredient "
                    "USING hnsw (embedding vector_cosine_ops) "
                    "WITH (m = 16, ef_construction = 64);"
                ),
                (
                    "CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recipe_embedding_hnsw "
                    "ON recipe_recipe "
                    "USING hnsw (embedding vector_cosine_ops) "
                    "WITH (m = 16, ef_construction = 64);"
                ),
            ],
            reverse_sql=[
                "DROP INDEX IF EXISTS idx_ingredient_embedding_hnsw;",
                "DROP INDEX IF EXISTS idx_recipe_embedding_hnsw;",
                (
                    "CREATE INDEX IF NOT EXISTS supply_ingredient_embedding_ivfflat "
                    "ON supply_ingredient "
                    "USING ivfflat (embedding vector_cosine_ops) "
                    "WITH (lists = 82);"
                ),
                (
                    "CREATE INDEX IF NOT EXISTS recipe_recipe_embedding_ivfflat "
                    "ON recipe_recipe "
                    "USING ivfflat (embedding vector_cosine_ops) "
                    "WITH (lists = 11);"
                ),
                (
                    "CREATE INDEX IF NOT EXISTS blog_blog_embedding_ivfflat "
                    "ON blog_blog "
                    "USING ivfflat (embedding vector_cosine_ops) "
                    "WITH (lists = 1);"
                ),
                (
                    "CREATE INDEX IF NOT EXISTS session_groupsession_embedding_ivfflat "
                    "ON session_groupsession "
                    "USING ivfflat (embedding vector_cosine_ops) "
                    "WITH (lists = 1);"
                ),
                (
                    "CREATE INDEX IF NOT EXISTS game_game_embedding_ivfflat "
                    "ON game_game "
                    "USING ivfflat (embedding vector_cosine_ops) "
                    "WITH (lists = 1);"
                ),
            ],
        ),
    ]
