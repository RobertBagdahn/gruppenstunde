import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { PdfExportDialog } from '@/components/PdfExportDialog';
import { API_BASE_URL } from '@/lib/api';
import { Icon } from '@/components/ui/icon';

interface RecipeMobileActionBarProps {
  onOpenShoppingList: () => void;
  onOpenPortions: () => void;
  recipeSlug?: string;
  /** Show "Kochen starten" only when the recipe has steps to cook. */
  canCook?: boolean;
}

export default function RecipeMobileActionBar({
  onOpenShoppingList,
  onOpenPortions,
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
        toast.success('Link kopiert');
      } catch {
        toast.error('Der Link konnte nicht kopiert werden.');
      }
    }
    setMenuOpen(false);
  };

  return (
    <div
      data-testid="recipe-mobile-action-bar"
      className={cn(
        'fixed bottom-16 inset-x-0 h-16 pb-[env(safe-area-inset-bottom)] lg:hidden',
        'bg-background border-t z-40',
        'flex items-center gap-2 px-4',
        'transition-transform duration-200',
        isTextareaFocused && 'translate-y-full',
      )}
    >
      <button
        type="button"
        onClick={onOpenShoppingList}
        aria-label="Einkaufsliste erstellen"
        className="flex-1 flex items-center justify-center gap-2 h-10 text-body font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
      >
        <Icon name="shopping_cart" size={20} />
        Einkaufsliste
      </button>
      <button
        type="button"
        onClick={onOpenPortions}
        aria-label="Portionen skalieren"
        className="flex-1 flex items-center justify-center gap-2 h-10 text-body font-medium border rounded-lg hover:bg-muted transition-colors"
      >
        <Icon name="restaurant" size={20} />
        Portionen
      </button>

      {/* Overflow menu */}
      <div className="relative" ref={menuRef}>
        <button
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Weitere Aktionen"
          className="flex items-center justify-center w-10 h-10 rounded-lg border hover:bg-muted transition-colors"
        >
          <Icon name="more_vert" size={20} />
        </button>

        {menuOpen && (
          <div className="absolute bottom-12 right-0 w-48 bg-popover border rounded-lg shadow-lg py-1 z-50">
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
