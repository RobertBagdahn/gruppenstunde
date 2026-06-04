import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { ShoppingCart, RefreshCw, ChevronRight, Store } from 'lucide-react';
import { useShoppingList } from '@/api/mealPlans';
import { useCurrentUser } from '@/api/auth';
import { useCreateFromMealPlan } from '@/api/shoppingLists';
import ErrorDisplay from '@/components/ErrorDisplay';
import EmptyState from '@/components/shared/EmptyState';
import { toast } from 'sonner';

interface TransientShoppingItem {
  ingredient_name: string;
  ingredient_slug?: string;
  total_quantity_g: number;
  unit: string;
  retail_section: string;
  estimated_price_eur: number | null;
  display_quantity?: string;
  display_text?: string;
  natural_portions?: string;
  sources?: Array<{ recipe_id: number; recipe_name?: string; recipe_slug?: string; meal_label?: string; quantity_g?: number }>;
}

function ShoppingItemWithSources({ item }: { item: TransientShoppingItem }) {
  const [expanded, setExpanded] = useState(false);
  const hasSources = item.sources && item.sources.length > 0;

  return (
    <div>
      <div
        className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => hasSources && setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          {hasSources && (
            <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? 'rotate-90' : ''}`} />
          )}
          {item.ingredient_slug ? (
            <Link
              to={`/ingredients/${item.ingredient_slug}`}
              className="text-sm hover:text-primary transition-colors"
              onClick={(e) => e.stopPropagation()}
            >
              {item.ingredient_name}
            </Link>
          ) : (
            <span className="text-sm">{item.ingredient_name}</span>
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          <span>{item.display_quantity || item.display_text || `${Math.round(item.total_quantity_g)} ${item.unit}`}</span>
          {item.estimated_price_eur !== null ? (
            <span className="text-foreground font-medium">
              {item.estimated_price_eur.toFixed(2)} EUR
            </span>
          ) : (
            <span className="text-red-400 text-xs">kein Preis</span>
          )}
        </div>
      </div>
      {expanded && hasSources && (
        <div className="pl-10 pr-4 pb-2 space-y-1">
          {item.sources!.map((source, idx) => (
            <div key={idx} className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <span className="text-muted-foreground/60">&#8226;</span>
                {source.recipe_slug ? (
                  <Link
                    to={`/recipes/${source.recipe_slug}`}
                    className="hover:text-primary transition-colors"
                  >
                    {source.recipe_name}
                  </Link>
                ) : (
                  <span>{source.recipe_name}</span>
                )}
                {source.meal_label && (
                  <span className="text-muted-foreground/60">({source.meal_label})</span>
                )}
              </div>
              <span>{Math.round(source.quantity_g || 0)} g</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ShoppingView({ mealPlanId }: { mealPlanId: number }) {
  const navigate = useNavigate();
  const { data: currentUser } = useCurrentUser();
  const { data, error, isLoading, refetch } = useShoppingList(mealPlanId);
  const createFromMealPlan = useCreateFromMealPlan();

  if (error) return <ErrorDisplay error={error} variant="inline" onRetry={() => refetch()} />;
  if (isLoading) return <div className="h-48 bg-muted rounded-xl animate-pulse" />;
  if (!data || data.length === 0) {
    return (
      <EmptyState
        icon="shopping_cart"
        title="Noch keine Zutaten"
        description="Füge Rezepte zu den Mahlzeiten hinzu, um die Einkaufsliste zu sehen."
      />
    );
  }

  // Group by retail section
  const grouped: Record<string, typeof data> = {};
  for (const item of data) {
    const section = item.retail_section || 'Sonstiges';
    if (!grouped[section]) grouped[section] = [];
    grouped[section].push(item);
  }

  const totalPrice = data.reduce((sum, item) => sum + (item.estimated_price_eur || 0), 0);

  return (
    <div className="space-y-4">
      {/* Export to persistent shopping list */}
      {currentUser && (
        <button
          type="button"
          disabled={createFromMealPlan.isPending}
          onClick={() => {
            createFromMealPlan.mutate(mealPlanId, {
              onSuccess: (created) => {
                toast.success('Einkaufsliste erstellt');
                navigate(`/shopping-lists/${created.id}`);
              },
              onError: (err) =>
                toast.error('Fehler', { description: err.message }),
            });
          }}
          className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors w-full justify-center disabled:opacity-50 font-semibold"
        >
          {createFromMealPlan.isPending ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <ShoppingCart className="w-4.5 h-4.5" />
          )}
          {createFromMealPlan.isPending
            ? 'Erstelle Einkaufsliste...'
            : 'Einkaufsliste erstellen'}
        </button>
      )}

      {Object.entries(grouped).map(([section, items]) => (
        <div key={section} className="rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-2.5 bg-muted/50 border-b">
            <h3 className="font-semibold text-sm flex items-center gap-2">
              <Store className="w-4 h-4 text-muted-foreground" />
              {section}
            </h3>
          </div>
          <div className="divide-y">
            {items.map((item, idx) => (
              <ShoppingItemWithSources key={idx} item={item} />
            ))}
          </div>
        </div>
      ))}

      {/* Total */}
      {totalPrice > 0 && (
        <div className="rounded-xl border bg-card px-4 py-3 flex items-center justify-between">
          <span className="font-semibold">Geschätzter Gesamtpreis</span>
          <span className="font-bold text-lg">{totalPrice.toFixed(2)} EUR</span>
        </div>
      )}
    </div>
  );
}
