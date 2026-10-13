/**
 * RecipeMaterialsSection — read-only material block of the recipe detail page.
 *
 * Two groups below the ingredients: required devices and consumables. Per-portion
 * amounts scale with the selected servings, fixed amounts stay as they are.
 */
import { Link } from 'react-router-dom';
import { ClipboardList, Pencil } from 'lucide-react';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import type { RecipeMaterial } from '@/schemas/recipe';
import { formatMaterialAmount, scaledMaterialAmount } from '@/lib/materialAmount';

interface RecipeMaterialsSectionProps {
  recipeId: number;
  materials: RecipeMaterial[];
  /** Servings the amounts are scaled to. */
  servings: number;
  canEdit?: boolean;
  onEdit?: () => void;
}

function MaterialGroup({ title, items, servings }: { title: string; items: RecipeMaterial[]; servings: number }) {
  if (items.length === 0) return null;
  return (
    <div data-testid={`materials-group-${title}`}>
      <h3 className="text-body font-semibold text-muted-foreground mb-1">{title}</h3>
      <ul className="divide-y divide-border">
        {items.map((material) => {
          const amount = scaledMaterialAmount(material, servings);
          const label = formatMaterialAmount(amount, material.is_consumable);
          return (
            <li key={material.id} className="flex items-center justify-between gap-3 py-2.5">
              <Link
                to={`/material/${material.material_slug}`}
                className="text-body font-medium hover:underline underline-offset-2"
              >
                {material.material_name}
              </Link>
              {label && <span className="text-body text-muted-foreground tabular-nums">{label}</span>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default function RecipeMaterialsSection({
  recipeId,
  materials,
  servings,
  canEdit = false,
  onEdit,
}: RecipeMaterialsSectionProps) {
  if (materials.length === 0) return null;

  const devices = materials.filter((m) => !m.is_consumable);
  const consumables = materials.filter((m) => m.is_consumable);

  return (
    <section className="bg-card rounded-xl p-4 sm:p-6 shadow-card" data-testid="recipe-materials-section">
      <div className="flex items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
            <Icon name="inventory_2" size={20} />
          </span>
          <h2 className="text-section font-semibold leading-tight">Material</h2>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button asChild variant="outline" size="sm">
            <Link to={`/material-list?recipe=${recipeId}&servings=${servings}`} data-testid="materials-list-link">
              <ClipboardList className="w-4 h-4 mr-1.5" />
              Materialliste
            </Link>
          </Button>
          {canEdit && onEdit && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onEdit}
              title="Material bearbeiten"
              data-testid="materials-edit-trigger"
            >
              <Pencil className="w-4 h-4 mr-1.5" />
              Bearbeiten
            </Button>
          )}
        </div>
      </div>
      <div className="space-y-4">
        <MaterialGroup title="Benötigte Geräte" items={devices} servings={servings} />
        <MaterialGroup title="Verbrauchsmaterial" items={consumables} servings={servings} />
      </div>
    </section>
  );
}
