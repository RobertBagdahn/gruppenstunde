import { useState } from 'react';
import { useRules, useCreateRule, useUpdateRule, useDeleteRule, useToggleRuleActive } from '@/api/suggestions';
import type { Rule, RuleIn } from '@/schemas/suggestions';
import { Button } from '@/components/ui/button';
import AmpelRangePreview from '@/components/admin/AmpelRangePreview';
import RuleEditDialog from '@/components/admin/RuleEditDialog';
import { Pencil, Trash2, Plus, AlertCircle, Sparkles } from 'lucide-react';
import { notify } from '@/lib/notify';
import ConfirmDialog from '@/components/ConfirmDialog';
import { SkeletonTableRows } from '@/components/ui/skeleton';

const SCOPE_LABELS: Record<string, string> = {
  meal_event: 'Essensplan',
  day: 'Tag',
  meal: 'Mahlzeit',
  recipe: 'Rezept',
};

/** Scope pills stay neutral: only recipe types carry a category tint (food-category-colour-usage). */
const SCOPE_BADGE_CLASS = 'inline-flex items-center rounded-full bg-primary-soft px-2.5 py-0.5 text-caption font-semibold text-primary-dark';

export default function RuleTab() {
  const { data: rules, isLoading, error } = useRules();
  const createMutation = useCreateRule();
  const updateMutation = useUpdateRule();
  const deleteMutation = useDeleteRule();
  const toggleMutation = useToggleRuleActive();

  const [editRule, setEditRule] = useState<Rule | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Rule | null>(null);

  function handleSave(data: RuleIn) {
    if (editRule) {
      updateMutation.mutate(
        { id: editRule.id, data },
        {
          onSuccess: () => { setShowDialog(false); notify.success('Regel aktualisiert'); },
          onError: () => notify.error('Regel konnte nicht gespeichert werden'),
        },
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => { setShowDialog(false); notify.success('Regel erstellt'); },
        onError: () => notify.error('Regel konnte nicht angelegt werden'),
      });
    }
  }

  function handleToggle(rule: Rule) {
    toggleMutation.mutate(
      { id: rule.id, is_active: !rule.is_active },
      { onError: (error) => notify.failed('Regel', 'umgeschaltet', error) },
    );
  }

  function handleDelete(rule: Rule) {
    setDeleteTarget(rule);
  }

  function confirmDelete() {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        setDeleteTarget(null);
        notify.deleted('Regel');
      },
      onError: (error) => notify.failed('Regel', 'gelöscht', error),
    });
  }

  if (isLoading) {
    return (
      <SkeletonTableRows rows={6} columns={3} label="Regeln werden geladen" />
    );
  }

  if (error) {
    return (
      <div className="rounded-xl bg-danger-soft p-4 text-body text-danger-foreground flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        Fehler beim Laden der Regeln.
      </div>
    );
  }

  if (!rules || rules.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-section font-semibold font-display">Regeln</h2>
          <Button size="sm" onClick={() => { setEditRule(null); setShowDialog(true); }} className="h-11 gap-1.5 px-4 md:h-9">
            <Plus className="h-4 w-4" />
            Neue Regel
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl bg-card shadow-card text-center text-muted-foreground">
          <Sparkles className="h-8 w-8 mb-2 text-primary" />
          <p className="text-body font-medium">Keine Regeln vorhanden</p>
          <p className="text-caption text-muted-foreground mt-1">Erstelle deine erste Regel, um Ernährungswerte im Planer zu prüfen.</p>
        </div>
        <RuleEditDialog
          open={showDialog}
          onOpenChange={setShowDialog}
          rule={editRule}
          onSave={handleSave}
          isPending={createMutation.isPending || updateMutation.isPending}
        />
      </div>
    );
  }

  // Group by scope
  const grouped = rules.reduce<Record<string, Rule[]>>((acc, rule) => {
    if (!acc[rule.scope]) acc[rule.scope] = [];
    acc[rule.scope].push(rule);
    return acc;
  }, {});

  const scopes = ['day', 'meal_event', 'meal', 'recipe'].filter((s) => grouped[s]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-section font-semibold font-display">Regeln</h2>
          <span className="inline-flex items-center rounded-full bg-primary-soft px-3 py-1 text-body font-bold text-primary-dark tabular-nums">
            {rules.length} {rules.length === 1 ? 'Regel' : 'Regeln'}
          </span>
        </div>
        <Button size="sm" onClick={() => { setEditRule(null); setShowDialog(true); }} className="h-11 gap-1.5 px-4 md:h-9">
          <Plus className="h-4 w-4" />
          Neue Regel
        </Button>
      </div>

      <div className="grid gap-6">
        {scopes.map((scope) => (
          <div key={scope} className="bg-card rounded-xl overflow-hidden shadow-card">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 bg-muted border-b border-border">
              <span className={SCOPE_BADGE_CLASS}>
                {SCOPE_LABELS[scope] || scope}
              </span>
              <span className="text-caption font-semibold uppercase tracking-wide text-muted-foreground tabular-nums">
                {grouped[scope].length} {grouped[scope].length === 1 ? 'Regel' : 'Regeln'}
              </span>
            </div>

            {/* List */}
            <div className="divide-y divide-border">
              {grouped[scope].map((rule) => (
                <div key={rule.id} className="p-4 space-y-3 hover:bg-muted/10 transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {/* Toggle Switch */}
                      <button
                        type="button"
                        role="switch"
                        aria-checked={rule.is_active}
                        aria-label={`Regel ${rule.name} aktiv`}
                        onClick={() => handleToggle(rule)}
                        className="press flex h-11 w-11 shrink-0 items-center justify-center rounded-full md:h-9 md:w-9"
                        title={rule.is_active ? 'Aktiv (klicken zum Deaktivieren)' : 'Inaktiv (klicken zum Aktivieren)'}
                      >
                        <span
                          className={`relative flex h-5 w-9 items-center rounded-full p-0.5 transition-colors ${
                            rule.is_active ? 'bg-primary' : 'bg-muted-foreground/30'
                          }`}
                        >
                          <span className={`h-4 w-4 rounded-full bg-background shadow-soft transition-transform ${
                            rule.is_active ? 'translate-x-4' : 'translate-x-0'
                          }`} />
                        </span>
                      </button>
                      <span className="text-body font-semibold text-foreground leading-none">{rule.name}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => { setEditRule(rule); setShowDialog(true); }}
                        className="h-11 w-11 md:h-8 md:w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(rule)}
                        className="h-11 w-11 md:h-8 md:w-8 text-muted-foreground hover:text-danger-foreground hover:bg-danger-soft"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>

                  <div className="pl-11">
                    <AmpelRangePreview
                      minYellow={rule.min_yellow}
                      minGreen={rule.min_green}
                      maxGreen={rule.max_green}
                      maxYellow={rule.max_yellow}
                      unit={rule.unit}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <RuleEditDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        rule={editRule}
        onSave={handleSave}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
        title="Regel löschen?"
        description={deleteTarget ? `Die Regel „${deleteTarget.name}“ wird endgültig gelöscht.` : undefined}
        confirmLabel="Löschen"
        loading={deleteMutation.isPending}
      />
    </div>
  );
}
