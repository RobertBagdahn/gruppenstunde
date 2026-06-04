import { useState } from 'react';
import { useRules, useCreateRule, useUpdateRule, useDeleteRule, useToggleRuleActive } from '@/api/suggestions';
import type { Rule, RuleIn } from '@/schemas/suggestions';
import { Button } from '@/components/ui/button';
import AmpelRangePreview from '@/components/admin/AmpelRangePreview';
import RuleEditDialog from '@/components/admin/RuleEditDialog';
import { Pencil, Trash2, Plus, AlertCircle, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

const SCOPE_LABELS: Record<string, string> = {
  meal_event: 'Essensplan',
  day: 'Tag',
  meal: 'Mahlzeit',
  recipe: 'Rezept',
};

const SCOPE_COLORS: Record<string, string> = {
  meal_event: 'bg-purple-50 text-purple-700 border-purple-200/60 dark:bg-purple-950/20 dark:text-purple-400 dark:border-purple-900/40',
  day: 'bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/20 dark:text-blue-400 dark:border-blue-900/40',
  meal: 'bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/40',
  recipe: 'bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/40',
};

export default function RuleTab() {
  const { data: rules, isLoading, error } = useRules();
  const createMutation = useCreateRule();
  const updateMutation = useUpdateRule();
  const deleteMutation = useDeleteRule();
  const toggleMutation = useToggleRuleActive();

  const [editRule, setEditRule] = useState<Rule | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  function handleSave(data: RuleIn) {
    if (editRule) {
      updateMutation.mutate(
        { id: editRule.id, data },
        {
          onSuccess: () => { setShowDialog(false); toast.success('Regel aktualisiert'); },
          onError: () => toast.error('Fehler beim Speichern'),
        },
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => { setShowDialog(false); toast.success('Regel erstellt'); },
        onError: () => toast.error('Fehler beim Erstellen'),
      });
    }
  }

  function handleToggle(rule: Rule) {
    toggleMutation.mutate({ id: rule.id, is_active: !rule.is_active });
  }

  function handleDelete(rule: Rule) {
    if (!confirm(`Regel "${rule.name}" löschen?`)) return;
    deleteMutation.mutate(rule.id, {
      onSuccess: () => toast.success('Regel gelöscht'),
      onError: () => toast.error('Fehler beim Löschen'),
    });
  }

  if (isLoading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">
        Lade Regeln...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm text-destructive flex items-center gap-2">
        <AlertCircle className="h-4 w-4" />
        Fehler beim Laden der Regeln.
      </div>
    );
  }

  if (!rules || rules.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold font-display">Regeln</h2>
          <Button size="sm" onClick={() => { setEditRule(null); setShowDialog(true); }} className="gap-1.5">
            <Plus className="h-4 w-4" />
            Neue Regel
          </Button>
        </div>
        <div className="flex flex-col items-center justify-center py-12 px-4 rounded-xl border border-dashed border-border bg-card text-center text-muted-foreground">
          <Sparkles className="h-8 w-8 mb-2 text-muted-foreground/60" />
          <p className="text-sm font-medium">Keine Regeln vorhanden</p>
          <p className="text-xs text-muted-foreground mt-1">Erstelle deine erste Regel, um Ernährungswerte im Planer zu prüfen.</p>
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
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold font-display">Regeln ({rules.length})</h2>
        <Button size="sm" onClick={() => { setEditRule(null); setShowDialog(true); }} className="gap-1.5">
          <Plus className="h-4 w-4" />
          Neue Regel
        </Button>
      </div>

      <div className="grid gap-6">
        {scopes.map((scope) => (
          <div key={scope} className="border border-border bg-card rounded-xl overflow-hidden shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between gap-2 px-4 py-3 bg-muted/30 border-b border-border">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${SCOPE_COLORS[scope] || ''}`}>
                {SCOPE_LABELS[scope] || scope}
              </span>
              <span className="text-xs text-muted-foreground font-medium">
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
                        onClick={() => handleToggle(rule)}
                        className={`w-8 h-5 rounded-full border border-transparent transition-colors relative flex items-center p-0.5 cursor-pointer ${
                          rule.is_active ? 'bg-primary' : 'bg-muted border-border'
                        }`}
                        title={rule.is_active ? 'Aktiv (klicken zum Deaktivieren)' : 'Inaktiv (klicken zum Aktivieren)'}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full bg-background shadow-sm transition-transform ${
                          rule.is_active ? 'translate-x-3.5' : 'translate-x-0'
                        }`} />
                      </button>
                      <span className="text-sm font-semibold text-foreground leading-none">{rule.name}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => { setEditRule(rule); setShowDialog(true); }}
                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDelete(rule)}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/5"
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
    </div>
  );
}
