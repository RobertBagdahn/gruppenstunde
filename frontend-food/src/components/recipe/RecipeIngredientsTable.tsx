/**
 * RecipeIngredientsTable — Displays recipe ingredients as a formatted table
 * with quantity, unit, portion, name, and ingredient status.
 * 
 * Shows whether each ingredient exists in the database (✓ or ⚠️).
 */

import { type RecipeItem } from '@/schemas/recipe';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { Check, AlertCircle } from 'lucide-react';

interface RecipeIngredientsTableProps {
  items: RecipeItem[];
  portions?: number | null;
}

const UNIT_SHORT: Record<string, string> = {
  'Esslöffel': 'EL',
  'Teelöffel': 'TL',
  'Kilogramm': 'kg',
  'Gramm': 'g',
  'Milliliter': 'ml',
  'Liter': 'l',
  'Prise': 'Pr.',
  'Tasse': 'Tasse',
  'Messerspitze': 'Msp.',
  'Schuss': 'Schuss',
};

export default function RecipeIngredientsTable({ items, portions: _portions = 1 }: RecipeIngredientsTableProps) {
  if (!items || items.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        Keine Zutaten hinzugefügt
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-3 font-semibold text-muted-foreground w-20">Menge</th>
            <th className="text-left py-2 px-3 font-semibold text-muted-foreground w-16">Einheit</th>
            <th className="text-left py-2 px-3 font-semibold text-muted-foreground flex-1">Zutat</th>
            <th className="text-center py-2 px-3 font-semibold text-muted-foreground w-24">Status</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const quantity = item.quantity ? Number(item.quantity).toLocaleString('de-DE', { 
              minimumFractionDigits: 0, 
              maximumFractionDigits: 2 
            }) : '—';
            const unitName = item.measuring_unit_name ?? 'Gramm';
            const unitShort = UNIT_SHORT[unitName] ?? unitName;
            const ingredientName = item.ingredient_name || item.note || 'Unbekannte Zutat';
            const ingredientExists = !!item.ingredient_id;
            const ingredientSlug = item.ingredient_slug;

            return (
              <tr key={item.id} className="border-b hover:bg-muted/50 transition-colors">
                {/* Quantity */}
                <td className="py-3 px-3 font-medium text-foreground text-right">
                  {quantity}
                </td>

                {/* Unit */}
                <td className="py-3 px-3 text-muted-foreground">
                  {unitShort}
                </td>

                {/* Ingredient Name */}
                <td className="py-3 px-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {ingredientExists && ingredientSlug ? (
                        <Link
                          to={`/ingredients/${ingredientSlug}`}
                          className="font-medium text-foreground hover:text-primary hover:underline transition-colors"
                          title={`${ingredientName} – Details anzeigen`}
                        >
                          {ingredientName}
                        </Link>
                      ) : (
                        <span className="font-medium text-foreground">
                          {ingredientName}
                        </span>
                      )}
                      {item.is_optional && (
                        <Badge variant="outline" className="text-xs">
                          optional
                        </Badge>
                      )}
                    </div>
                    {item.ingredient_retail_section_name && (
                      <p className="text-xs text-muted-foreground">
                        📍 {item.ingredient_retail_section_name}
                      </p>
                    )}
                  </div>
                </td>

                {/* Status */}
                <td className="py-3 px-3">
                  <div className="flex justify-center">
                    {ingredientExists ? (
                      <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded whitespace-nowrap">
                        <Check className="w-3 h-3" />
                        <span>vorhanden</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-xs text-orange-600 bg-orange-50 border border-orange-200 px-2 py-1 rounded whitespace-nowrap">
                        <AlertCircle className="w-3 h-3" />
                        <span>neu</span>
                      </div>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Summary */}
      <div className="mt-3 flex gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-green-600" />
          <span>{items.filter(i => i.ingredient_id).length} vorhanden</span>
        </div>
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-orange-600" />
          <span>{items.filter(i => !i.ingredient_id).length} neu</span>
        </div>
      </div>
    </div>
  );
}
