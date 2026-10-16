/**
 * ShareLinkManager — owner/admin card for the invitation link: anyone with the link can look at the
 * list, add entries and tick them off without an account. Shows who joined and allows revoking.
 */
import { useState } from 'react';
import { Copy, Link2, Share2, UserRound, X } from 'lucide-react';
import { useDisableSharing, useEnableSharing, useRemoveGuest } from '@/api/shoppingLists';
import ConfirmDialog from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
import type { ShoppingListGuest } from '@/schemas/shoppingList';
import { notify } from '@/lib/notify';
import { formatWhen } from '@/lib/shoppingItemDisplay';

interface ShareLinkManagerProps {
  listId: number;
  listName: string;
  shareToken: string | null;
  guests: ShoppingListGuest[];
}

export function shareUrl(token: string): string {
  return `${window.location.origin}/shopping-lists/join/${token}`;
}

export default function ShareLinkManager({ listId, listName, shareToken, guests }: ShareLinkManagerProps) {
  const enable = useEnableSharing(listId);
  const disable = useDisableSharing(listId);
  const removeGuest = useRemoveGuest(listId);
  const [confirm, setConfirm] = useState<'regenerate' | 'disable' | null>(null);

  const url = shareToken ? shareUrl(shareToken) : '';
  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      notify.success('Link kopiert');
    } catch {
      notify.error('Link konnte nicht kopiert werden');
    }
  };

  const nativeShare = async () => {
    try {
      await navigator.share({ title: listName, text: `Hilf mit bei der Einkaufsliste „${listName}“:`, url });
    } catch {
      // Dismissing the share sheet is not an error.
    }
  };

  return (
    <section className="mb-6 rounded-xl bg-card p-5 shadow-card" data-testid="shopping-share-section">
      <ConfirmDialog
        open={confirm !== null}
        onCancel={() => setConfirm(null)}
        onConfirm={() => {
          const done = () => setConfirm(null);
          const fail = (err: unknown) => {
            setConfirm(null);
            notify.error('Teilen konnte nicht geändert werden', { error: err });
          };
          if (confirm === 'regenerate') enable.mutate('regenerate', { onSuccess: done, onError: fail });
          else disable.mutate(undefined, { onSuccess: done, onError: fail });
        }}
        title={confirm === 'regenerate' ? 'Neuen Link erzeugen?' : 'Teilen beenden?'}
        description={
          confirm === 'regenerate'
            ? 'Der alte Link funktioniert danach nicht mehr und alle Gäste verlieren den Zugang. Ihre Einträge bleiben erhalten.'
            : 'Niemand kann die Liste mehr über den Link öffnen. Die Einträge der Gäste bleiben erhalten, ihr Name wird entfernt.'
        }
        confirmLabel={confirm === 'regenerate' ? 'Neuen Link erzeugen' : 'Teilen beenden'}
        loading={enable.isPending || disable.isPending}
      />

      <h2 className="mb-3 flex items-center gap-2 text-caption font-bold uppercase tracking-wider text-muted-foreground">
        <Link2 className="h-4 w-4 shrink-0 text-primary" />
        Gemeinsam einkaufen
      </h2>

      {!shareToken ? (
        <>
          <p className="mb-4 text-body text-muted-foreground">
            Teile die Liste per Link, zum Beispiel in WhatsApp. Alle mit dem Link können ohne Konto mitmachen: Einträge
            ergänzen und abhaken. Du siehst, wer was wann gemacht hat.
          </p>
          <Button
            onClick={() =>
              enable.mutate('enable', { onError: (err) => notify.error('Link konnte nicht erstellt werden', { error: err }) })
            }
            disabled={enable.isPending}
            data-testid="shopping-share-enable"
          >
            <Share2 className="h-4 w-4" />
            Einladungslink erstellen
          </Button>
        </>
      ) : (
        <>
          <p className="mb-3 text-body text-muted-foreground">
            Wer den Link hat, kann die Liste sehen, Einträge ergänzen und abhaken. Gib ihn nur an Leute weiter, die
            mitmachen sollen.
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={url}
              aria-label="Einladungslink"
              data-testid="shopping-share-url"
              onFocus={(e) => e.currentTarget.select()}
              className="h-11 min-w-0 flex-1 rounded-lg border border-input bg-background px-3 text-body"
            />
            <div className="flex gap-2">
              <Button onClick={copy} variant="secondary" data-testid="shopping-share-copy">
                <Copy className="h-4 w-4" />
                Kopieren
              </Button>
              {canNativeShare && (
                <Button onClick={nativeShare}>
                  <Share2 className="h-4 w-4" />
                  Teilen
                </Button>
              )}
            </div>
          </div>

          <div className="mt-5">
            <h3 className="mb-2 text-body font-semibold text-foreground">Dabei über den Link ({guests.length})</h3>
            {guests.length === 0 ? (
              <p className="text-body text-muted-foreground">Noch niemand beigetreten.</p>
            ) : (
              <ul className="divide-y divide-border/40">
                {guests.map((guest) => (
                  <li key={guest.id} className="flex items-center gap-3 py-2" data-testid={`shopping-guest-${guest.id}`}>
                    <UserRound className="h-4 w-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0 flex-1 truncate text-body font-semibold">{guest.name}</span>
                    <span className="text-caption text-muted-foreground">seit {formatWhen(guest.created_at)}</span>
                    <button
                      type="button"
                      aria-label={`${guest.name} entfernen`}
                      title="Gast entfernen"
                      disabled={removeGuest.isPending}
                      onClick={() =>
                        removeGuest.mutate(guest.id, {
                          onSuccess: () => notify.success(`${guest.name} entfernt`),
                          onError: (err) => notify.error('Gast konnte nicht entfernt werden', { error: err }),
                        })
                      }
                      className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-border/40 pt-4">
            <Button variant="outline" size="sm" onClick={() => setConfirm('regenerate')}>
              Neuen Link erzeugen
            </Button>
            <Button variant="outline" size="sm" onClick={() => setConfirm('disable')} data-testid="shopping-share-disable">
              Teilen beenden
            </Button>
          </div>
        </>
      )}
    </section>
  );
}
