import { useParams, Link } from 'react-router-dom';
import { useMaterialBySlug } from '@/api/materials';

export default function MaterialPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: material, isLoading, error } = useMaterialBySlug(slug ?? '');

  if (isLoading) {
    return (
      <div className="container py-8 max-w-3xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/2" />
          <div className="h-4 bg-muted rounded w-full" />
          <div className="h-4 bg-muted rounded w-3/4" />
        </div>
      </div>
    );
  }

  if (error || !material) {
    return (
      <div className="container py-8">
        <p className="text-destructive">Material nicht gefunden.</p>
      </div>
    );
  }

  return (
    <div className="container py-8 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <span className="material-symbols-outlined text-4xl text-primary">inventory_2</span>
        <h1 className="text-3xl font-extrabold tracking-tight">{material.name}</h1>
      </div>

      {material.default_unit && (
        <p className="text-sm text-muted-foreground mb-4">
          Standard-Einheit: <span className="font-medium">{material.default_unit}</span>
        </p>
      )}

      {/* Description */}
      {material.description && (
        <div className="bg-card rounded-xl border p-5 mb-6">
          <p className="text-base">{material.description}</p>
        </div>
      )}

      {/* Ideas using this material */}
      <section>
        <h2 className="flex items-center gap-2 text-xl font-semibold mb-4">
          <span className="material-symbols-outlined text-primary">lightbulb</span>
          Ideen mit diesem Material
          <span className="text-sm font-normal text-muted-foreground">({material.ideas.length})</span>
        </h2>

        {material.ideas.length > 0 ? (
          <div className="space-y-3">
            {material.ideas.map((idea) => (
              <Link
                key={idea.id}
                to={`/idea/${idea.slug}`}
                className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:border-primary hover:shadow-glow transition-all"
              >
                {idea.image_url ? (
                  <img
                    src={idea.image_url}
                    alt={idea.title}
                    className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
                    <span className="material-symbols-outlined text-muted-foreground">image</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="font-semibold truncate">{idea.title}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{idea.summary}</p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Noch keine Ideen mit diesem Material.
          </p>
        )}
      </section>
    </div>
  );
}
