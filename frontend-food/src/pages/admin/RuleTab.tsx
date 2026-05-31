import { useState } from 'react';
import { useRules, useCreateRule, useUpdateRule, useDeleteRule, useToggleRuleActive } from '@/api/suggestions';
import type { Rule, RuleIn } from '@/schemas/suggestions';
import { Button } from '@/components/ui/button';
import AmpelRangePreview from '@/components/admin/AmpelRangePreview';
import RuleEditDialog from '@/components/admin/RuleEditDialog';
import { toast } from 'sonner';

const SCOPE_LABELS: Record<string, string> = {
  meal_event: 'Essensplan',
  day: 'Tag',
  meal: 'Mahlzeit',
  recipe: 'Rezept',
};

const SCOPE_COLORS: Record<string, string> = {
  meal_event: 'bg-purple-100 text-purple-800',
  day: 'bg-blue-100 text-blue-800',
  meal: 'bg-amber-100 text-amber-800',
  recipe: 'bg-green-100 text-green-800',
};

export default function RuleTab() {
  const { data: rules, isLoading, error } = useRules();
  const createMutation = useCreateRule();
  const updateMutation = useUpdateRule();
  const deleteMutation = useDeleteRule();
  const toggleMutation = useToggleRuleActive();

  const [editRule, setEditRule] = useState<Rule | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  if (isLoading) return <p className="text-muted-foreground p-4">Lade Regeln...</p>;
  if (error) return <p className="text-red-500 p-4">Fehler beim Laden</p>;
  if (!rules || rules.length === 0) return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Regeln</h2>
        <Button size="sm" onClick={() => { setEditRule(null); setShowDialog(true); }}>
          <span className="material-symbols-outlined text-sm mr-1">add</span>
          Neue Regel
        </Button>
      </div>
      <p className="text-muted-foreground">Keine Regeln vorhanden</p>
      <RuleEditDialog
        open={showDialog}
        onOpenChange={setShowDialog}
        rule={editRule}
        onSave={handleSave}
        isPending={createMutation.isPending || updateMutation.isPending}
      />
    </div>
  );

  // Group by scope
  const grouped = rules.reduce<Record<string, Rule[]>>((acc, rule) => {
    if (!acc[rule.scope]) acc[rule.scope] = [];
    acc[rule.scope].push(rule);
    return acc;
  }, {});

  const scopes = ['day', 'meal_event', 'meal', 'recipe'].filter((s) => grouped[s]);

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Regeln ({rules.length})</h2>
        <Button size="sm" onClick={() => { setEditRule(null); setShowDialog(true); }}>
          <span className="material-symbols-outlined text-sm mr-1">add</span>
          Neue Regel
        </Button>
      </div>

      {scopes.map((scope) => (
        <div key={scope} className="border rounded-lg overflow-hidden">
          <div className="flex items-center gap-2 p-3 bg-muted/50">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${SCOPE_COLORS[scope] || ''}`}>
              {SCOPE_LABELS[scope] || scope}
            </span>
            <span className="text-sm text-muted-foreground">
              {grouped[scope].length} Regeln
            </span>
          </div>

          <div className="divide-y">
            {grouped[scope].map((rule) => (
              <div key={rule.id} className="px-3 py-2 space-y-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleToggle(rule)}
                    className={`w-3 h-3 rounded-full border-2 transition-colors ${rule.is_active ? 'bg-green-500 border-green-500' : 'bg-gray-200 border-gray-300'}`}
                    title={rule.is_active ? 'Aktiv (klicken zum Deaktivieren)' : 'Inaktiv (klicken zum Aktivieren)'}
                  />
                  <span className="text-sm font-medium flex-1">{rule.name}</span>
                  <button
                    onClick={() => { setEditRule(rule); setShowDialog(true); }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <span className="material-symbols-outlined text-base">edit</span>
                  </button>
                  <button
                    onClick={() => handleDelete(rule)}
                    className="text-muted-foreground hover:text-red-600"
                  >
                    <span className="material-symbols-outlined text-base">delete</span>
                  </button>
                </div>
                <div className="pl-5">
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
