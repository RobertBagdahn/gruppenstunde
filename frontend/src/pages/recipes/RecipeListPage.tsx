/**
 * RecipeListPage — Paginated recipe overview at /recipes.
 */
import { useState } from 'react';
import { EntityLinkContext } from '@/components/shared/EntityLinkContext';
import { EntityLink } from '@/components/shared/EntityLink';
import { useRecipes } from '@/api/recipes';
import Breadcrumb from '@/components/Breadcrumb';
import { useDocumentMeta } from '@/hooks/useDocumentMeta';

const NUTRI_COLORS: Record<string, string> = {
  A: 'bg-green-600 text-white',
  B: 'bg-lime-500 text-white',
  C: 'bg-yellow-400 text-yellow-900',
  D: 'bg-orange-500 text-white',
  E: 'bg-red-600 text-white',
};

export default function RecipeListPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useRecipes({ page, page_size: 20 });

  useDocumentMeta({ title: 'Rezepte – Inspi' });

  return (
    <EntityLinkContext.Provider value="list">
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Breadcrumb items={[{ label: 'Rezepte' }]} />
        <h1 className="text-2xl font-bold mt-4 mb-6">Rezepte</h1>

        {isLoading && !data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-56 bg-muted animate-pulse rounded-xl" />
            ))}
          </div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.items.map((recipe) => {
                const nutriLabel = recipe.cached_nutri_class
                  ? ['A', 'B', 'C', 'D', 'E'][recipe.cached_nutri_class - 1]
                  : null;

                return (
                  <EntityLink
                    key={recipe.id}
                    type="recipe"
                    slug={recipe.slug}
                    name={recipe.title}
                    className="group bg-card rounded-xl border overflow-hidden hover:-translate-y-1 transition-transform shadow-sm hover:shadow-md"
                  >
                    {recipe.image_url ? (
                      <img
                        src={recipe.image_url}
                        alt={recipe.title}
                        loading="lazy"
                        className="w-full h-40 object-cover"
                      />
                    ) : (
                      <div className="w-full h-40 bg-muted flex items-center justify-center">
                        <span className="material-symbols-outlined text-4xl text-muted-foreground">restaurant</span>
                      </div>
                    )}
                    <div className="p-4 space-y-2">
                      <h3 className="font-semibold text-sm line-clamp-2">{recipe.title}</h3>
                      <div className="flex items-center gap-2">
                        {nutriLabel && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${NUTRI_COLORS[nutriLabel]}`}>
                            {nutriLabel}
                          </span>
                        )}
                        {recipe.cached_price_total != null && (
                          <span className="text-xs text-muted-foreground">
                            {recipe.cached_price_total.toFixed(2)} €
                          </span>
                        )}
                      </div>
                    </div>
                  </EntityLink>
                );
              })}
            </div>

            {data.page < data.total_pages && (
              <div className="flex justify-center mt-8">
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  className="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
                >
                  Mehr laden
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </EntityLinkContext.Provider>
  );
}
