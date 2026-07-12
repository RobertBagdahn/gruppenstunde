import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTagDetail } from '@/api/admin';

export default function TagDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data, isLoading, error } = useTagDetail(id);

  if (isLoading) {
    return <div className="py-8 text-center text-muted-foreground">Laden...</div>;
  }

  if (error || !data) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        Tag nicht gefunden.
      </div>
    );
  }

  const { tag, recipes, ingredients } = data;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 space-y-6">
      <button
        onClick={() => navigate('/admin/tags')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Zurück zu Tags
      </button>

      <div className="bg-card rounded-xl border p-6 space-y-4">
        <h1 className="text-2xl font-bold font-display">{tag.name}</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Slug:</span>{' '}
            <span className="font-medium">{tag.slug}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Gruppe:</span>{' '}
            <span className="font-medium">{tag.group}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Icon:</span>{' '}
            <span className="font-medium">{tag.icon || '—'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Sortierung:</span>{' '}
            <span className="font-medium">{tag.sort_order}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Parent:</span>{' '}
            <span className="font-medium">{tag.parent_name || '—'}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Genehmigt:</span>{' '}
            <span className="font-medium">{tag.is_approved ? 'Ja' : 'Nein'}</span>
          </div>
        </div>

        {tag.description && (
          <div>
            <span className="text-muted-foreground text-sm">Beschreibung:</span>
            <p className="text-sm mt-1">{tag.description}</p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-card rounded-xl border p-5 space-y-3">
          <h2 className="font-display font-semibold text-lg">
            Rezepte ({recipes.length})
          </h2>
          {recipes.length > 0 ? (
            <div className="divide-y divide-border">
              {recipes.map((r) => (
                <a
                  key={r.id}
                  href={`/recipes/${r.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block py-2 text-sm text-primary hover:underline"
                >
                  {r.title}
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Keine Einträge gefunden</p>
          )}
        </div>

        <div className="bg-card rounded-xl border p-5 space-y-3">
          <h2 className="font-display font-semibold text-lg">
            Zutaten ({ingredients.length})
          </h2>
          {ingredients.length > 0 ? (
            <div className="divide-y divide-border">
              {ingredients.map((i) => (
                <a
                  key={i.id}
                  href={`/ingredients/${i.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block py-2 text-sm text-primary hover:underline"
                >
                  {i.name}
                </a>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Keine Einträge gefunden</p>
          )}
        </div>
      </div>
    </div>
  );
}
