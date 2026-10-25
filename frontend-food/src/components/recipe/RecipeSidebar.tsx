import { CookingPot, Printer, ShoppingCart, Share2, Copy } from 'lucide-react';
import { notify } from '@/lib/notify';
import { useNavigate } from 'react-router-dom';
import PortionScaler from './PortionScaler';
import RecipeMetaCard from './RecipeMetaCard';
import RecipeUsageInMealPlans from './RecipeUsageInMealPlans';
import type { RecipeDetail } from '@/schemas/recipe';
import { PdfExportDialog } from '@/components/PdfExportDialog';
import { useState } from 'react';
import { API_BASE_URL } from '@/lib/api';
import { formatEuro, formatWeight } from '@/lib/format';
import { cn } from '@/lib/utils';

interface RecipeSidebarProps {
  recipe: RecipeDetail;
  recipeId: number;
  portions: number;
  totalPriceEur?: number | null;
  /** Total weight of the displayed portions in grams. */
  totalWeightG?: number | null;
  onPortionsChange: (portions: number) => void;
  onOpenShoppingList: () => void;
  onClone: () => void;
  /**
   * Hide the portion scaler, e.g. while the inline ingredient editor is open —
   * it already has its own person-count scaler for editing quantities, so
   * showing both at once is confusing/duplicated.
   */
  hidePortionScaler?: boolean;
  /** Show "Kochen starten" only when the recipe has steps to cook. */
  canCook?: boolean;
}

const secondaryAction =
  'press flex flex-col items-center gap-1 rounded-xl bg-secondary px-2 py-2.5 text-caption font-semibold text-foreground transition-colors hover:bg-primary-soft hover:text-primary';

/** Desktop "Kochpult": portions, the main actions and the recipe's facts. */
export default function RecipeSidebar({
  recipe,
  recipeId,
  portions,
  totalPriceEur,
  totalWeightG,
  onPortionsChange,
  onOpenShoppingList,
  onClone,
  hidePortionScaler = false,
  canCook = true,
}: RecipeSidebarProps) {
  const navigate = useNavigate();
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const handleShare = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    if (!url) return;

    if (navigator.share) {
      try {
        await navigator.share({ title: recipe.title, url });
      } catch {
        // user cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(url);
        notify.success('Link kopiert');
      } catch {
        notify.error('Der Link konnte nicht kopiert werden');
      }
    }
  };

  const summary = [
    totalWeightG != null && totalWeightG > 0 ? formatWeight(totalWeightG) : null,
    totalPriceEur != null ? formatEuro(totalPriceEur) : null,
  ].filter(Boolean).join(' · ');

  return (
    <aside className="hidden lg:flex flex-col gap-4 sticky top-24 self-start">
      <div className="space-y-2">
        {canCook && (
          <button
            type="button"
            onClick={() => navigate({ search: `?mode=cooking&step=0` }, { replace: true })}
            className="press flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-emphasis font-bold text-primary-foreground shadow-soft transition-colors hover:bg-primary/90"
          >
            <CookingPot className="h-5 w-5" />
            Kochen starten
          </button>
        )}
        <button
          type="button"
          onClick={onOpenShoppingList}
          className={cn(
            'press flex h-12 w-full items-center justify-center gap-2 rounded-xl text-emphasis font-bold transition-colors',
            canCook
              ? 'bg-primary-soft text-primary-dark hover:bg-primary-soft-border/70'
              : 'bg-primary text-primary-foreground shadow-soft hover:bg-primary/90',
          )}
        >
          <ShoppingCart className="h-5 w-5" />
          Auf die Einkaufsliste
        </button>
      </div>

      <section aria-labelledby="recipe-desk-heading" className="space-y-4 rounded-xl bg-card p-5 shadow-card">
        <div className="flex items-baseline justify-between gap-3">
          <h2 id="recipe-desk-heading" className="font-display text-section font-extrabold">
            Portionen
          </h2>
          {summary && <span className="text-caption text-muted-foreground">{summary}</span>}
        </div>

        {!hidePortionScaler && (
          <PortionScaler value={portions} onChange={onPortionsChange} defaultValue={portions} />
        )}

        <div className="grid grid-cols-3 gap-2">
          <button type="button" onClick={() => setPdfDialogOpen(true)} title="Als PDF öffnen" className={secondaryAction}>
            <Printer className="h-5 w-5" />
            PDF
          </button>
          <button type="button" onClick={handleShare} className={secondaryAction}>
            <Share2 className="h-5 w-5" />
            Teilen
          </button>
          <button type="button" onClick={onClone} aria-label="Rezept clonen" className={secondaryAction}>
            <Copy className="h-5 w-5" />
            Clonen
          </button>
        </div>
      </section>

      <RecipeMetaCard recipe={recipe} />

      {(recipe.usage_in_meal_plans_count ?? 0) > 0 && (
        <RecipeUsageInMealPlans recipeId={recipeId} count={recipe.usage_in_meal_plans_count} />
      )}

      <PdfExportDialog
        open={pdfDialogOpen}
        onOpenChange={setPdfDialogOpen}
        baseUrl={`${API_BASE_URL}/api/recipes/by-slug/${recipe.slug}/export/pdf/`}
        optionType="recipe"
      />
    </aside>
  );
}
