/**
 * REWE-Export — button + dialog to generate Bookmarklet for basket export.
 */
import { useState, useMemo } from 'react';
import { useReweExportToken } from '@/api/shoppingLists';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ShoppingCart, Copy, Check } from 'lucide-react';
import type { ShoppingListItem } from '@/schemas/shoppingList';

interface ReweExportButtonProps {
  listId: number;
  listName: string;
  items: ShoppingListItem[];
}

export default function ReweExportButton({ listId, listName, items }: ReweExportButtonProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [copied, setCopied] = useState(false);
  const createToken = useReweExportToken(listId);

  const apiBase = window.location.origin;

  const bookmarkletCode = useMemo(() => {
    if (!createToken.data) return '';
    const token = createToken.data.token;
    const exportUrl = `${apiBase}${createToken.data.export_url}`;
    const reportUrl = `${apiBase}/api/shopping-lists/rewe-export/${token}/report/`;

    return [
      '(function(){',
      `var e="${exportUrl}",r="${reportUrl}",a="${apiBase}";`,
      'window.__inspiReweExport={exportUrl:e,reportUrl:r};',
      'var t=document.createElement("script");',
      `t.src=a+"/static/rewe-basket-export.js";`,
      'document.head.appendChild(t);',
      '})();',
    ].join('');
  }, [createToken.data, apiBase]);

  const bookmarkletLink = useMemo(() => {
    if (!bookmarkletCode) return '';
    return 'javascript:' + encodeURIComponent(bookmarkletCode);
  }, [bookmarkletCode]);

  const handleGenerate = () => {
    createToken.mutate(undefined, {
      onSuccess: () => {
        setShowDialog(true);
      },
      onError: (err) => {
        toast.error('Fehler beim Erstellen des Export-Tokens', {
          description: err.message,
        });
      },
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(bookmarkletLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Konnte nicht in die Zwischenablage kopieren');
    }
  };

  const hasMatchedItems = items.some(
    (i) => i.ingredient_id && !i.is_checked,
  );

  return (
    <>
      <button
        type="button"
        onClick={handleGenerate}
        disabled={createToken.isPending}
        className={cn(
          'inline-flex items-center gap-1.5 text-sm text-primary font-bold hover:underline py-2',
          createToken.isPending && 'opacity-50 cursor-wait',
        )}
      >
        <ShoppingCart className="w-4 h-4 stroke-[3px]" />
        {createToken.isPending
          ? 'Token wird erstellt...'
          : 'REWE-Export'}
      </button>

      {showDialog && createToken.data && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-card border border-border rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto">
            <h2 className="text-lg font-display font-bold text-foreground mb-4">
              REWE-Warenkorb-Export
            </h2>

            {/* Bookmarklet link */}
            <div className="mb-4">
              <p className="text-sm font-semibold text-foreground mb-2">
                1. Bookmarklet speichern
              </p>
              <p className="text-xs text-muted-foreground mb-2">
                Ziehe diesen Link in deine Lesezeichenleiste oder klicke mit
                der rechten Maustaste &rarr; &bdquo;Lesezeichen hinzuf&uuml;gen&ldquo;:
              </p>
              <a
                href={bookmarkletLink}
                className="block w-full text-center px-4 py-2.5 bg-primary text-primary-foreground font-bold text-sm rounded-xl hover:bg-primary/90 transition-all shadow-soft mb-2"
                onClick={(e) => {
                  e.preventDefault();
                  toast.info('Ziehe diesen Link in deine Lesezeichenleiste');
                }}
              >
                REWE-Export: {listName}
              </a>
              <button
                type="button"
                onClick={handleCopy}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 border border-border rounded-xl text-xs font-semibold hover:bg-muted transition-all"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    Kopiert!
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Bookmarklet-Code kopieren
                  </>
                )}
              </button>
            </div>

            {/* Instructions */}
            <div className="mb-4 p-3 bg-muted/50 rounded-xl border border-border/60">
              <p className="text-xs font-bold text-foreground mb-1">
                2. So funktioniert&apos;s:
              </p>
              <ol className="text-xs text-muted-foreground space-y-0.5 list-decimal list-inside">
                <li>&Ouml;ffne <strong>shop.rewe.de</strong> in einem neuen Tab</li>
                <li>Melde dich bei REWE an</li>
                <li>Klicke das gespeicherte Bookmarklet in der Lesezeichenleiste</li>
                <li>Die Artikel werden automatisch in deinen Warenkorb &uuml;bertragen</li>
              </ol>
              <p className="text-xs text-muted-foreground mt-2">
                Der Token l&auml;uft in 5 Minuten ab &mdash; starte den Export
                am besten direkt nach dem Erstellen.
              </p>
            </div>

            {/* Item status overview */}
            <div className="mb-4">
              <p className="text-sm font-semibold text-foreground mb-2">
                Artikel-Status
              </p>
              <div className="space-y-1 text-xs">
                {items.map((item) => {
                  let status: { label: string; className: string } = {
                    label: 'Offen',
                    className: 'text-yellow-600',
                  };
                  if (item.is_checked) {
                    status = {
                      label: 'Abgehakt',
                      className: 'text-muted-foreground',
                    };
                  } else if (!item.ingredient_id) {
                    status = {
                      label: 'Nicht gematcht',
                      className: 'text-red-600',
                    };
                  }
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-0.5"
                    >
                      <span className="text-muted-foreground truncate mr-2">
                        {item.name}
                      </span>
                      <span className={cn('font-semibold shrink-0', status.className)}>
                        {status.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              {!hasMatchedItems && (
                <p className="text-xs text-muted-foreground mt-2 italic">
                  Keine Artikel mit REWE-Verkn&uuml;pfung gefunden.
                </p>
              )}
            </div>

            {/* Token expiry info */}
            <p className="text-xs text-muted-foreground mb-4">
              Token g&uuml;ltig bis:{' '}
              {new Date(createToken.data.expires_at).toLocaleTimeString('de-DE')}
            </p>

            <button
              type="button"
              onClick={() => setShowDialog(false)}
              className="w-full px-4 py-2.5 border border-border rounded-xl text-sm font-semibold hover:bg-muted transition-all"
            >
              Schlie&szlig;en
            </button>
          </div>
        </div>
      )}
    </>
  );
}
