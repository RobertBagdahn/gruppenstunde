import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useCurrentUser } from '@/api/auth';
import { useIngredients, useRetailSections, useDeleteIngredient } from '@/api/ingredients';
import { NUTRI_SCORE_COLORS } from '@/schemas/ingredient';
import ErrorDisplay from '@/components/ErrorDisplay';
import Pagination from '@/components/shared/Pagination';
import ConfirmDialog from '@/components/ConfirmDialog';
import ListPageHero from '@/components/shared/ListPageHero';

export default function IngredientListPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: user } = useCurrentUser();

  // URL-driven state
  const [name, setName] = useState(searchParams.get('name') || '');
  const [retailSection, setRetailSection] = useState<number | undefined>(
    searchParams.get('retail_section') ? Number(searchParams.get('retail_section')) : undefined,
  );
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);

  // Sync URL params
  useEffect(() => {
    const params = new URLSearchParams();
    if (name) params.set('name', name);
    if (retailSection) params.set('retail_section', String(retailSection));
    if (status) params.set('status', status);
    if (page > 1) params.set('page', String(page));
    setSearchParams(params, { replace: true });
  }, [name, retailSection, status, page, setSearchParams]);

  const { data, isLoading, error, refetch } = useIngredients({
    page,
    page_size: 20,
    name: name || undefined,
    retail_section: retailSection,
    status: status || undefined,
  });

  const { data: retailSections } = useRetailSections();
  const deleteIngredient = useDeleteIngredient();
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);

  // Debounced search
  const [searchInput, setSearchInput] = useState(name);
  useEffect(() => {
    const timer = setTimeout(() => {
      setName(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleDelete = (slug: string) => {
    setDeleteTarget(slug);
  };

  const formatPrice = (price: number | null) => {
    if (price === null) return '\u2014';
    return `${price.toFixed(2).replace('.', ',')} EUR/kg`;
  };

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 text-center">
        <span className="material-symbols-outlined text-5xl text-muted-foreground mb-4 block">
          egg_alt
        </span>
        <h1 className="text-2xl font-bold mb-2">Zutatendatenbank</h1>
        <p className="text-muted-foreground mb-4">
          Melde dich an, um die Zutatendatenbank zu verwalten.
        </p>
        <button
          onClick={() => navigate('/login')}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
        >
          Anmelden
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <ListPageHero
        title="Zutatendatenbank"
        description="Verwalte alle Zutaten mit Naehrwerten, Preisen und Nutri-Score."
        icon="egg_alt"
        gradientClasses="bg-gradient-to-br from-amber-500 to-orange-600"
      />

      {/* Actions */}
      <div className="flex justify-end mb-6">
        <button
          onClick={() => navigate('/ingredients/new')}
          className="flex items-center gap-1 px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:opacity-90 transition"
        >
          <span className="material-symbols-outlined text-lg">add</span>
          Neue Zutat
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search */}
        <div className="relative flex-1">
          <span className="material-symbols-outlined text-lg text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2">
            search
          </span>
          <input
            type="text"
            placeholder="Zutat suchen..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-10 pr-3 py-2 rounded-md border text-sm bg-background"
          />
        </div>

        {/* Retail Section Filter */}
        <select
          value={retailSection ?? ''}
          onChange={(e) => {
            setRetailSection(e.target.value ? Number(e.target.value) : undefined);
            setPage(1);
          }}
          className="px-3 py-2 rounded-md border text-sm bg-background min-w-[160px]"
        >
          <option value="">Alle Abteilungen</option>
          {retailSections?.map((rs) => (
            <option key={rs.id} value={rs.id}>
              {rs.name}
            </option>
          ))}
        </select>

        {/* Status Filter */}
        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPage(1);
          }}
          className="px-3 py-2 rounded-md border text-sm bg-background min-w-[130px]"
        >
          <option value="">Alle Status</option>
           <option value="published">Veröffentlicht</option>
          <option value="draft">Entwurf</option>
          <option value="archived">Archiviert</option>
        </select>
      </div>

      {/* Error */}
      {error && (
        <ErrorDisplay error={error} onRetry={() => refetch()} />
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="animate-pulse h-16 bg-muted rounded-lg" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && data && data.items.length === 0 && (
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-5xl text-muted-foreground mb-4 block">
            egg_alt
          </span>
          <h2 className="text-lg font-semibold mb-2">Keine Zutaten gefunden</h2>
          <p className="text-muted-foreground text-sm mb-4">
            {name || retailSection || status
              ? 'Versuche andere Filterkriterien.'
               : 'Erstelle deine erste Zutat für die Datenbank.'}
          </p>
          {!name && !retailSection && !status && (
            <button
              onClick={() => navigate('/ingredients/new')}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Erste Zutat erstellen
            </button>
          )}
        </div>
      )}

      {/* Ingredient List */}
      {data && data.items.length > 0 && (
        <>
          <div className="space-y-2">
            {data.items.map((ingredient) => {
              const nutriColors = ingredient.nutri_class
                ? NUTRI_SCORE_COLORS[ingredient.nutri_class]
                : null;

              return (
                <div
                  key={ingredient.id}
                  className="border rounded-lg p-4 bg-card hover:shadow-md transition cursor-pointer"
                  onClick={() => navigate(`/ingredients/${ingredient.slug}`)}
                >
                  <div className="flex items-center gap-4">
                    {/* Main info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-base truncate">{ingredient.name}</h3>
                        {ingredient.status === 'draft' && (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">
                            Entwurf
                          </span>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {ingredient.retail_section_name && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">store</span>
                            {ingredient.retail_section_name}
                          </span>
                        )}
                        {ingredient.energy_kj !== null && (
                          <span>{ingredient.energy_kj} kJ/100g</span>
                        )}
                        {ingredient.protein_g !== null && (
                          <span>{ingredient.protein_g}g Protein</span>
                        )}
                        {ingredient.price_per_kg !== null && (
                          <span className="flex items-center gap-1">
                            <span className="material-symbols-outlined text-sm">payments</span>
                            {formatPrice(ingredient.price_per_kg)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Nutri-Score Badge */}
                    {nutriColors && (
                      <span
                        className={`${nutriColors.bg} ${nutriColors.text} text-xs font-bold px-2 py-1 rounded-md shrink-0`}
                      >
                        {nutriColors.label}
                      </span>
                    )}

                    {/* Delete button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(ingredient.slug);
                      }}
                      className="text-destructive/60 hover:text-destructive rounded p-1 shrink-0"
                       title="Löschen"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          <Pagination
            currentPage={data.page}
            totalPages={data.total_pages}
            onPageChange={setPage}
          />
        </>
      )}

      <ConfirmDialog
        open={deleteTarget !== null}
        onConfirm={() => {
          if (deleteTarget === null) return;
          deleteIngredient.mutate(deleteTarget, {
            onSuccess: () => {
              toast.success('Zutat gelöscht');
              setDeleteTarget(null);
            },
            onError: (err) => {
              toast.error('Fehler beim Löschen', { description: err.message });
              setDeleteTarget(null);
            },
          });
        }}
        onCancel={() => setDeleteTarget(null)}
        title="Zutat löschen?"
        description="Die Zutat und alle zugehörigen Portionen und Preise werden unwiderruflich gelöscht."
        confirmLabel="Löschen"
        loading={deleteIngredient.isPending}
      />
    </div>
  );
}
