import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { notify } from '@/lib/notify';
import { cn } from '@/lib/utils';
import { PdfExportDialog } from '@/components/PdfExportDialog';
import { API_BASE_URL } from '@/lib/api';
import { Icon } from '@/components/ui/icon';

interface RecipeMobileActionBarProps {
  onOpenShoppingList: () => void;
  onOpenPortions: () => void;
  onAddToMealPlan?: () => void;
  recipeSlug?: string;
  /** Show "Kochen starten" only when the recipe has steps to cook. */
  canCook?: boolean;
}

export default function RecipeMobileActionBar({
  onOpenShoppingList,
  onOpenPortions,
  onAddToMealPlan,
  recipeSlug,
  canCook = true,
}: RecipeMobileActionBarProps) {
  const navigate = useNavigate();
  const [isTextareaFocused, setIsTextareaFocused] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleFocusIn = (e: FocusEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        setIsTextareaFocused(true);
      }
    };
    const handleFocusOut = (e: FocusEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        setIsTextareaFocused(false);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleStartCooking = () => {
    navigate(
      { search: `?mode=cooking&step=0` },
      { replace: true },
    );
  };

  const handleShare = async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url });
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
    setMenuOpen(false);
  };

  return (
    <div
      data-print-hide
      data-testid="recipe-mobile-action-bar"
      className={cn(
        'fixed inset-x-0 bottom-0 z-40 border-t border-line bg-background md:hidden',
        'px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-3',
        'transition-transform duration-200',
        isTextareaFocused && 'translate-y-full',
      )}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-2">
      {/* Overflow menu */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Weitere Aktionen"
          className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-foreground transition-colors hover:bg-primary-soft"
        >
          <Icon name="more_vert" size={20} />
        </button>

        {menuOpen && (
          <div className="absolute bottom-14 left-0 w-56 rounded-xl bg-popover py-1 shadow-raised z-50 animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-2 duration-200">
            <button
              type="button"
              onClick={() => { onOpenShoppingList(); setMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-body hover:bg-muted transition-colors"
            >
              <Icon name="shopping_cart" size={20} />
              Einkaufsliste erstellen
            </button>
            <button
              type="button"
              onClick={() => { onOpenPortions(); setMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-body hover:bg-muted transition-colors"
            >
              <Icon name="restaurant" size={20} />
              Portionen skalieren
            </button>
            {canCook && (
              <button
                type="button"
                onClick={() => { handleStartCooking(); setMenuOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-body hover:bg-muted transition-colors"
              >
                <Icon name="skillet" size={20} />
                Kochen starten
              </button>
            )}
            <button
              type="button"
              onClick={() => { setPdfDialogOpen(true); setMenuOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-body hover:bg-muted transition-colors"
            >
              <Icon name="print" size={20} />
              Als PDF öffnen
            </button>
            <button
              type="button"
              onClick={handleShare}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-body hover:bg-muted transition-colors"
            >
              <Icon name="share" size={20} />
              Teilen
            </button>
          </div>
        )}
      </div>
      {canCook && (
        <button
          type="button"
          onClick={handleStartCooking}
          className="press flex h-11 flex-1 items-center justify-center gap-2 rounded-lg bg-primary-soft px-3 text-body font-bold text-primary-dark transition-colors hover:bg-primary-soft-border"
        >
          <Icon name="skillet" size={20} aria-hidden="true" />
          Kochen starten
        </button>
      )}
      {onAddToMealPlan && (
        <button
          type="button"
          onClick={onAddToMealPlan}
          className="press flex h-11 flex-[1.4] items-center justify-center gap-2 rounded-lg bg-primary px-3 text-body font-bold text-primary-foreground transition-colors hover:bg-primary-dark"
        >
          <Icon name="calendar_month" size={20} aria-hidden="true" />
          Zum Essensplan
        </button>
      )}
      </div>
      {recipeSlug && (
        <PdfExportDialog
          open={pdfDialogOpen}
          onOpenChange={setPdfDialogOpen}
          baseUrl={`${API_BASE_URL}/api/recipes/by-slug/${recipeSlug}/export/pdf/`}
          optionType="recipe"
        />
      )}
    </div>
  );
}
