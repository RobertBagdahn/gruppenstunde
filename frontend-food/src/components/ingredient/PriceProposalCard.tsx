/**
 * PriceProposalCard
 *
 * Zeigt den Preisstatus einer Zutat samt Herkunft (manuell / KI-bestätigt /
 * fehlend) und bietet den KI-Preisvorschlags-Workflow an:
 * - Vorschlag erstellen (nur bei fehlendem Preis)
 * - Vorschlag bestätigen (überschreibt bestehenden positiven Preis nur mit
 *   expliziter Zustimmung) oder ablehnen
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  useAcceptPriceProposal,
  useCreatePriceProposal,
  useRejectPriceProposal,
  useUpdateIngredient,
} from '@/api/supplies';
import type { IngredientPriceProposal } from '@/schemas/supply';
import { toast } from 'sonner';
import { Check, Loader2, Pencil, Sparkles, X } from 'lucide-react';
import { formatNumber } from '@/lib/format';

interface PriceProposalCardProps {
  ingredient: {
    slug: string;
    price_per_kg: number | null;
    price_source: 'manual' | 'ai_accepted' | 'missing' | null;
    pending_price_proposal: IngredientPriceProposal | null;
    can_edit: boolean;
  };
}

const SOURCE_LABELS: Record<string, string> = {
  manual: 'Manuell gepflegt',
  ai_accepted: 'Aus KI-Vorschlag bestätigt',
  missing: 'Kein Preis',
};

function formatPrice(price: number | null | undefined): string {
  if (price == null) return '–';
  return `${formatNumber(price, { maxDecimals: 2 }).replace('.', ',')} €/kg`;
}

export default function PriceProposalCard({ ingredient }: PriceProposalCardProps) {
  const [replaceExisting, setReplaceExisting] = useState(false);

  const createProposal = useCreatePriceProposal(ingredient.slug);
  const acceptProposal = useAcceptPriceProposal(ingredient.slug);
  const rejectProposal = useRejectPriceProposal(ingredient.slug);
  const updateIngredient = useUpdateIngredient(ingredient.slug);
  const [editing, setEditing] = useState(false);
  const [priceInput, setPriceInput] = useState('');

  const pending = ingredient.pending_price_proposal;
  const hasPositivePrice = ingredient.price_per_kg != null && ingredient.price_per_kg > 0;
  const canManage = ingredient.can_edit;

  const handleCreate = () => {
    createProposal.mutate(undefined, {
      onSuccess: (proposal: IngredientPriceProposal) => {
        toast.success('Preisvorschlag erstellt', {
          description: `${formatPrice(proposal.proposed_price_per_kg)} vorgeschlagen – bitte prüfen.`,
        });
      },
      onError: (err) => toast.error('Vorschlag fehlgeschlagen', { description: err.message }),
    });
  };

  const handleAccept = () => {
    if (!pending) return;
    acceptProposal.mutate(
      { proposalId: pending.id, replace: replaceExisting },
      {
        onSuccess: () => {
          setReplaceExisting(false);
          toast.success('Preis übernommen');
        },
        onError: (err) => toast.error('Bestätigung fehlgeschlagen', { description: err.message }),
      },
    );
  };

  const startEditing = () => {
    setPriceInput(ingredient.price_per_kg != null ? String(ingredient.price_per_kg).replace('.', ',') : '');
    setEditing(true);
  };

  const handleSavePrice = () => {
    const normalized = priceInput.trim().replace(',', '.');
    const value = normalized === '' ? null : Number(normalized);
    if (value !== null && (!Number.isFinite(value) || value < 0)) {
      toast.error('Ungültiger Preis', { description: 'Bitte eine Zahl ab 0 eingeben.' });
      return;
    }
    updateIngredient.mutate(
      { price_per_kg: value },
      {
        onSuccess: () => {
          setEditing(false);
          toast.success('Preis gespeichert');
        },
        onError: (err) => toast.error('Speichern fehlgeschlagen', { description: err.message }),
      },
    );
  };

  const handleReject = () => {
    if (!pending) return;
    rejectProposal.mutate(pending.id, {
      onSuccess: () => {
        setReplaceExisting(false);
        toast.success('Vorschlag abgelehnt');
      },
      onError: (err) => toast.error('Ablehnung fehlgeschlagen', { description: err.message }),
    });
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-body font-semibold text-foreground">Preis</h3>
        <span
          className={`text-caption px-2 py-0.5 rounded-full font-medium border ${
            ingredient.price_source === 'ai_accepted'
              ? 'bg-primary/10 border-primary/20 text-primary'
              : ingredient.price_source === 'missing'
                ? 'bg-muted border-border text-muted-foreground'
                : 'bg-muted/50 border-border text-foreground'
          }`}
        >
          {SOURCE_LABELS[ingredient.price_source ?? 'missing'] ?? 'Kein Preis'}
        </span>
      </div>

      <p className="text-emphasis font-medium text-foreground">
        {ingredient.price_source === 'missing' || !hasPositivePrice
          ? 'Kein Preis hinterlegt'
          : formatPrice(ingredient.price_per_kg)}
      </p>

      {canManage && !editing && (
        <Button size="sm" variant="outline" onClick={startEditing}>
          <Pencil className="h-4 w-4 mr-1.5" />
          Preis eingeben
        </Button>
      )}

      {canManage && editing && (
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            handleSavePrice();
          }}
        >
          <Label htmlFor="manual-price" className="sr-only">Preis pro kg in Euro</Label>
          <input
            id="manual-price"
            type="text"
            inputMode="decimal"
            autoFocus
            value={priceInput}
            onChange={(e) => setPriceInput(e.target.value)}
            placeholder="z. B. 2,49"
            className="w-28 rounded-lg border border-input bg-background px-3 py-1.5 text-body focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <span className="text-body text-muted-foreground">€/kg</span>
          <Button size="sm" type="submit" disabled={updateIngredient.isPending}>
            {updateIngredient.isPending ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <Check className="h-4 w-4 mr-1.5" />}
            Speichern
          </Button>
          <Button size="sm" type="button" variant="outline" onClick={() => setEditing(false)} disabled={updateIngredient.isPending}>
            Abbrechen
          </Button>
        </form>
      )}

      {pending && (
        <div className="rounded-lg border border-dashed border-primary/40 bg-primary/5 p-3 space-y-2">
          <div className="flex items-center gap-1.5 text-caption font-medium text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            Vorschlag ausstehend
          </div>
          <p className="text-body font-semibold text-foreground">
            {formatPrice(pending.proposed_price_per_kg)}
            <span className="ml-2 text-caption font-normal text-muted-foreground">
              Konfidenz {Math.round(pending.confidence * 100)} %
            </span>
          </p>
          {pending.rationale && (
            <p className="text-caption text-muted-foreground leading-relaxed">{pending.rationale}</p>
          )}

          {canManage && (
            <div className="space-y-2 pt-1">
              {hasPositivePrice && (
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="replace-existing-price"
                    checked={replaceExisting}
                    onCheckedChange={(checked) => setReplaceExisting(checked === true)}
                  />
                  <Label htmlFor="replace-existing-price" className="text-caption text-muted-foreground">
                    Bestehenden Preis ersetzen
                  </Label>
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  onClick={handleAccept}
                  disabled={acceptProposal.isPending}
                >
                  {acceptProposal.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4 mr-1.5" />
                  )}
                  Bestätigen
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleReject}
                  disabled={rejectProposal.isPending}
                >
                  {rejectProposal.isPending ? (
                    <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
                  ) : (
                    <X className="h-4 w-4 mr-1.5" />
                  )}
                  Ablehnen
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {!pending && !hasPositivePrice && canManage && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleCreate}
          disabled={createProposal.isPending}
          className="text-primary border-primary/40 hover:bg-primary/10"
        >
          {createProposal.isPending ? (
            <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4 mr-1.5" />
          )}
          Preis mit KI vorschlagen
        </Button>
      )}

      {!pending && !hasPositivePrice && !canManage && (
        <p className="text-caption text-muted-foreground">Kein Preis vorhanden.</p>
      )}
    </div>
  );
}
