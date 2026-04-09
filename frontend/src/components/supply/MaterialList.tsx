/**
 * MaterialList — Displays materials assigned to a content item.
 */
import type { ContentMaterialItem } from '@/schemas/supply';
import { MATERIAL_CATEGORY_OPTIONS } from '@/schemas/supply';

interface MaterialListProps {
  materials: ContentMaterialItem[];
  className?: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  tools: 'construction',
  crafting: 'palette',
  kitchen: 'restaurant',
  outdoor: 'forest',
  stationery: 'edit',
  other: 'category',
};

export default function MaterialList({ materials, className = '' }: MaterialListProps) {
  if (materials.length === 0) return null;

  return (
    <div className={className}>
      <h3 className="text-lg font-bold mb-3 flex items-center gap-2">
        <span className="material-symbols-outlined text-primary">handyman</span>
        Material
      </h3>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-2.5 font-bold text-muted-foreground">Material</th>
              <th className="text-left px-4 py-2.5 font-bold text-muted-foreground">Menge</th>
            </tr>
          </thead>
          <tbody>
            {materials.map((item) => {
              const categoryLabel =
                MATERIAL_CATEGORY_OPTIONS.find((c) => c.value === item.material_category)?.label ??
                item.material_category;
              const categoryIcon = CATEGORY_ICONS[item.material_category] ?? 'category';

              return (
                <tr key={item.id} className="border-b border-border/50 last:border-0">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[18px] text-muted-foreground">
                        {categoryIcon}
                      </span>
                      <div>
                        <span className="font-semibold text-foreground">{item.material_name}</span>
                        <span className="block text-xs text-muted-foreground">{categoryLabel}</span>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {item.quantity || '-'}
                    {item.quantity_type === 'per_person' && (
                      <span className="text-xs ml-1 text-primary font-semibold">/ Person</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
