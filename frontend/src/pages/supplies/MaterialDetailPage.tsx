import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useState } from 'react';
import { useCurrentUser } from '@/api/auth';
import { useMaterialBySlug, useUpdateMaterial } from '@/api/supplies';
import { MATERIAL_CATEGORY_OPTIONS } from '@/schemas/supply';
import ErrorDisplay from '@/components/ErrorDisplay';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function categoryLabel(value: string): string {
  const opt = MATERIAL_CATEGORY_OPTIONS.find((o) => o.value === value);
  return opt ? opt.label : value;
}

const CATEGORY_ICONS: Record<string, string> = {
  tools: 'build',
  crafting: 'palette',
  kitchen: 'kitchen',
  outdoor: 'forest',
  stationery: 'edit_note',
  other: 'category',
};

// ---------------------------------------------------------------------------
// MaterialDetailPage
// ---------------------------------------------------------------------------
export default function MaterialDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const navigate = useNavigate();
  const { data: user } = useCurrentUser();
  const { data: material, isLoading, error, refetch } = useMaterialBySlug(slug || '');
  const updateMaterial = useUpdateMaterial(material?.id ?? 0);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editConsumable, setEditConsumable] = useState(false);

  const canEdit = !!user;

  // --- Loading ---
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="animate-pulse h-8 w-48 bg-muted rounded" />
        <div className="animate-pulse h-4 w-72 bg-muted rounded" />
        <div className="animate-pulse h-32 bg-muted rounded-lg" />
      </div>
    );
  }

  // --- Error ---
  if (error || !material) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <ErrorDisplay
          error={error}
          title="Material nicht gefunden"
          description="Das Material existiert nicht oder wurde entfernt."
          onBack={() => navigate('/materials')}
          backLabel="Zurueck zur Uebersicht"
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const icon = CATEGORY_ICONS[material.material_category] || 'category';

  const handleStartEdit = () => {
    setEditName(material.name);
    setEditDescription(material.description);
    setEditCategory(material.material_category);
    setEditConsumable(material.is_consumable);
    setEditing(true);
  };

  const handleSave = () => {
    updateMaterial.mutate(
      {
        name: editName,
        description: editDescription,
        material_category: editCategory,
        is_consumable: editConsumable,
      },
      {
        onSuccess: () => {
          toast.success('Material aktualisiert');
          setEditing(false);
        },
        onError: (err) => toast.error('Fehler', { description: err.message }),
      },
    );
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Back link */}
      <button
        onClick={() => navigate('/materials')}
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4 transition"
      >
        <span className="material-symbols-outlined text-lg">arrow_back</span>
        Alle Materialien
      </button>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-primary text-2xl">{icon}</span>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{material.name}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                {categoryLabel(material.material_category)}
              </span>
              {material.is_consumable && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  Verbrauchsmaterial
                </span>
              )}
            </div>
          </div>
        </div>

        {canEdit && !editing && (
          <button
            onClick={handleStartEdit}
            className="p-2 rounded-md hover:bg-muted transition text-muted-foreground shrink-0"
            title="Bearbeiten"
          >
            <span className="material-symbols-outlined text-lg">edit</span>
          </button>
        )}
      </div>

      {/* Edit Panel */}
      {editing && (
        <div className="border rounded-lg p-4 mb-6 bg-card space-y-3">
          <h3 className="text-sm font-semibold">Material bearbeiten</h3>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Name</label>
            <input
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              className="w-full px-3 py-2 rounded-md border text-sm bg-background"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Beschreibung</label>
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 rounded-md border text-sm bg-background resize-none"
            />
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="text-xs text-muted-foreground mb-1 block">Kategorie</label>
              <select
                value={editCategory}
                onChange={(e) => setEditCategory(e.target.value)}
                className="w-full px-3 py-2 rounded-md border text-sm bg-background"
              >
                {MATERIAL_CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={editConsumable}
                  onChange={(e) => setEditConsumable(e.target.checked)}
                  className="rounded"
                />
                Verbrauchsmaterial
              </label>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-2">
            <button
              onClick={handleSave}
              disabled={updateMaterial.isPending || !editName.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm disabled:opacity-50"
            >
              Speichern
            </button>
            <button
              onClick={() => setEditing(false)}
              className="px-4 py-2 border rounded-md text-sm hover:bg-muted"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Description */}
      {material.description && (
        <div className="border rounded-lg p-4 mb-6 bg-card">
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-lg">description</span>
            Beschreibung
          </h2>
          <p className="text-sm text-muted-foreground">{material.description}</p>
        </div>
      )}

      {/* Details */}
      <div className="border rounded-lg p-4 mb-6 bg-card">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-lg">info</span>
          Details
        </h2>
        <div>
          <div className="flex justify-between py-1.5 border-b border-border/30">
            <span className="text-sm text-muted-foreground">Kategorie</span>
            <span className="text-sm font-medium flex items-center gap-1">
              <span className="material-symbols-outlined text-sm">{icon}</span>
              {categoryLabel(material.material_category)}
            </span>
          </div>
          <div className="flex justify-between py-1.5 border-b border-border/30">
            <span className="text-sm text-muted-foreground">Typ</span>
            <span className="text-sm font-medium">
              {material.is_consumable ? 'Verbrauchsmaterial' : 'Werkzeug / Wiederverwendbar'}
            </span>
          </div>
          {material.image_url && (
            <div className="flex justify-between py-1.5 border-b border-border/30">
              <span className="text-sm text-muted-foreground">Bild</span>
              <img
                src={material.image_url}
                alt={material.name}
                className="w-16 aspect-square rounded-md object-cover"
              />
            </div>
          )}
          {material.purchase_links && (material.purchase_links as unknown[]).length > 0 && (
            <div className="pt-2">
              <span className="text-sm text-muted-foreground block mb-1">Kauflinks</span>
              <div className="flex flex-wrap gap-2">
                {(material.purchase_links as { url: string; label?: string }[]).map((link, i) => (
                  <a
                    key={i}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary underline hover:no-underline"
                  >
                    {link.label || link.url}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Wo wird das verwendet (placeholder — will be populated by ContentLink in Slice 6) */}
      <div className="border rounded-lg p-4 mb-6 bg-card">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-lg">link</span>
          Wo wird das verwendet?
        </h2>
        <p className="text-sm text-muted-foreground italic">
          Diese Funktion wird in einer zukuenftigen Version verfuegbar sein. Dann werden hier alle
          Gruppenstunden, Spiele und Rezepte angezeigt, die dieses Material verwenden.
        </p>
      </div>

      {/* Meta */}
      <div className="border-t pt-4 text-xs text-muted-foreground flex flex-wrap gap-4">
        <span>Erstellt: {new Date(material.created_at).toLocaleDateString('de-DE')}</span>
        <span>Slug: {material.slug}</span>
      </div>
    </div>
  );
}
