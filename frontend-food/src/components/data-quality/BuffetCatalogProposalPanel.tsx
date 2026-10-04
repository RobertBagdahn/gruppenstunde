import { useState } from 'react';
import { Download, Loader2, Pencil, Search, Sparkles, TestTube2, X } from 'lucide-react';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import {
  useBuffetCandidates,
  useBuffetDataQualityReport,
  useBuffetDataProposals,
  useCreateBuffetProposal,
  useExportBuffetProposals,
  usePreviewBuffetProposal,
  useReviewBuffetProposal,
  useSuggestBuffetItem,
  useUpdateBuffetProposal,
} from '@/api/dataQuality';
import type {
  BuffetCandidate,
  BuffetProposal,
  BuffetProposalCreateRequest,
  BuffetProposalPreview,
} from '@/schemas/dataQuality';
import { DataQualityBuffetStateSchema } from '@/schemas/listState';
import { usePersistedListState } from '@/hooks/usePersistedListState';
import { BUFFET_ROLE_ORDER, buffetRoleName } from '@/lib/buffetRoles';
import { RECIPE_TYPE_OPTIONS } from '@/schemas/recipe';
import { getApiErrorMessage } from '@/lib/api';

const PAGE_SIZE = 20;
const ROLE_DEFAULTS: Record<'ingredient' | 'recipe', string[]> = {
  ingredient: ['buffet-drink'],
  recipe: ['buffet-dish'],
};

type ItemKind = 'ingredient' | 'recipe';
type ProposalAction = BuffetProposalCreateRequest['action'];
type JsonObject = Record<string, unknown>;

function asObject(value: unknown): JsonObject {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) return value as JsonObject;
  return {};
}

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function actionLabel(action: string): string {
  const labels: Record<string, string> = {
    add: 'Rolle hinzufügen',
    untag: 'Rolle entfernen',
    merge_into: 'Zusammenführen',
    create: 'Neu anlegen',
  };
  return labels[action] ?? action;
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = { pending: 'Ausstehend', approved: 'Freigegeben', rejected: 'Abgelehnt' };
  return labels[status] ?? status;
}

function ingredientPortions(data: JsonObject): JsonObject[] {
  const raw = data.portions;
  if (Array.isArray(raw)) return raw.map(asObject);
  const groups = asObject(raw);
  const recipePortions = asArray(groups.rezeptportionen).map(asObject);
  const toppings = asArray(groups.belag).map(asObject);
  const baking = asArray(groups.backmengen).map(asObject);
  return [...recipePortions, ...toppings, ...baking];
}

function recipeItemsText(data: JsonObject): string {
  return asArray(data.items)
    .map(asObject)
    .map((item) => `${asString(item.ingredient_name)} | ${String(item.quantity ?? '')} | ${asString(item.unit)}`)
    .join('\n');
}

function recipeStepsText(data: JsonObject): string {
  return asArray(data.steps)
    .map((step) => (typeof step === 'string' ? step : asString(asObject(step).instruction)))
    .filter(Boolean)
    .join('\n');
}

function parseRecipeItems(value: string): JsonObject[] {
  return value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [ingredient_name = '', quantityText = '', unit = ''] = line.split('|').map((part) => part.trim());
      const quantity = Number(quantityText.replace(',', '.'));
      return { ingredient_name, quantity: Number.isFinite(quantity) ? quantity : 0, unit };
    });
}

function PageControls({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  return (
    <div className="flex items-center justify-between gap-3 border-t border-border pt-3 text-caption">
      <span className="text-muted-foreground">Seite {page} von {totalPages}</span>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
          Zurück
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
          Weiter
        </Button>
      </div>
    </div>
  );
}

export default function BuffetCatalogProposalPanel() {
  const { state, patch } = usePersistedListState({
    key: 'data-quality-buffet-catalog',
    schema: DataQualityBuffetStateSchema,
    defaults: {
      q: '', action: 'all', kind: 'all', role_slug: '', status: 'pending',
      candidate_page: 1, proposal_page: 1, report_page: 1,
    },
    persistExclude: ['candidate_page', 'proposal_page', 'report_page'],
    countExclude: ['candidate_page', 'proposal_page', 'report_page', 'status'],
  });
  const candidatesQuery = useBuffetCandidates({
    q: state.q,
    action: state.action,
    kind: state.kind,
    role_slug: state.role_slug,
    page: state.candidate_page,
    page_size: PAGE_SIZE,
  });
  const proposalsQuery = useBuffetDataProposals({ status: state.status, page: state.proposal_page, page_size: PAGE_SIZE });
  const createProposal = useCreateBuffetProposal();
  const updateProposal = useUpdateBuffetProposal();
  const suggestItem = useSuggestBuffetItem();
  const previewProposal = usePreviewBuffetProposal();
  const reviewProposal = useReviewBuffetProposal();
  const exportProposals = useExportBuffetProposals();

  const [formOpen, setFormOpen] = useState(false);
  const [editingProposal, setEditingProposal] = useState<BuffetProposal | null>(null);
  const [action, setAction] = useState<ProposalAction>('create');
  const [itemKind, setItemKind] = useState<ItemKind>('ingredient');
  const [sourceId, setSourceId] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [targetId, setTargetId] = useState('');
  const [targetName, setTargetName] = useState('');
  const [itemName, setItemName] = useState('');
  const [roleSlugs, setRoleSlugs] = useState<string[]>(ROLE_DEFAULTS.ingredient);
  const [draftData, setDraftData] = useState<JsonObject>({});
  const [aiUsed, setAiUsed] = useState(false);
  const [energyKcal, setEnergyKcal] = useState('');
  const [pricePerKg, setPricePerKg] = useState('');
  const [retailSection, setRetailSection] = useState('');
  const [isStandalone, setIsStandalone] = useState(false);
  const [portionName, setPortionName] = useState('Portion');
  const [portionUnit, setPortionUnit] = useState('Gramm');
  const [portionWeight, setPortionWeight] = useState('');
  const [recipeType, setRecipeType] = useState('snack');
  const [recipeServings, setRecipeServings] = useState('4');
  const [recipeDescription, setRecipeDescription] = useState('');
  const [recipeIngredients, setRecipeIngredients] = useState('');
  const [recipeSteps, setRecipeSteps] = useState('');
  const [selectedProposalId, setSelectedProposalId] = useState<number | null>(null);
  const reportQuery = useBuffetDataQualityReport({ page: state.report_page, page_size: PAGE_SIZE });
  const [previewResult, setPreviewResult] = useState<BuffetProposalPreview | null>(null);

  const resetForm = () => {
    setFormOpen(false);
    setEditingProposal(null);
    setAction('create');
    setItemKind('ingredient');
    setSourceId('');
    setSourceName('');
    setTargetId('');
    setTargetName('');
    setItemName('');
    setRoleSlugs(ROLE_DEFAULTS.ingredient);
    setDraftData({});
    setAiUsed(false);
    setEnergyKcal('');
    setPricePerKg('');
    setRetailSection('');
    setIsStandalone(false);
    setPortionName('Portion');
    setPortionUnit('Gramm');
    setPortionWeight('');
    setRecipeType('snack');
    setRecipeServings('4');
    setRecipeDescription('');
    setRecipeIngredients('');
    setRecipeSteps('');
  };

  const initializeCreateForm = (kind: ItemKind, name = '', roles = ROLE_DEFAULTS[kind], data: JsonObject = {}) => {
    setEditingProposal(null);
    setFormOpen(true);
    setAction('create');
    setItemKind(kind);
    setSourceId('');
    setSourceName('');
    setTargetId('');
    setTargetName('');
    setRoleSlugs(roles);
    setDraftData(data);
    setItemName(name || asString(data.name) || asString(data.title));
    setAiUsed(false);
    if (kind === 'ingredient') {
      setEnergyKcal(data.energy_kcal == null ? '' : String(data.energy_kcal));
      setPricePerKg(data.price_per_kg == null ? '' : String(data.price_per_kg));
      setRetailSection(asString(data.retail_section));
      setIsStandalone(data.is_standalone_food === true);
      const firstPortion = ingredientPortions(data)[0];
      setPortionName(asString(firstPortion?.name, 'Portion'));
      setPortionUnit(asString(firstPortion?.measuring_unit_name, 'Gramm'));
      setPortionWeight(firstPortion?.weight_g == null ? '' : String(firstPortion.weight_g));
    } else {
      setRecipeType(asString(data.recipe_type, 'snack'));
      setRecipeServings(data.portions == null ? '4' : String(data.portions));
      setRecipeDescription(asString(data.description));
      setRecipeIngredients(recipeItemsText(data));
      setRecipeSteps(recipeStepsText(data));
    }
  };

  const initializeEditForm = (proposal: BuffetProposal) => {
    setEditingProposal(proposal);
    setFormOpen(true);
    setAction(proposal.action);
    setItemKind(proposal.item_kind);
    setSourceId(proposal.source_id == null ? '' : String(proposal.source_id));
    setSourceName(proposal.source_expected_name);
    setTargetId(proposal.target_id == null ? '' : String(proposal.target_id));
    setTargetName(proposal.target_expected_name);
    setRoleSlugs(proposal.role_slugs);
    const data = asObject(proposal.proposed_data);
    setDraftData(data);
    setItemName(asString(data.name) || asString(data.title) || proposal.source_expected_name);
    setAiUsed(proposal.origin !== 'manual');
    if (proposal.item_kind === 'ingredient') {
      setEnergyKcal(data.energy_kcal == null ? '' : String(data.energy_kcal));
      setPricePerKg(data.price_per_kg == null ? '' : String(data.price_per_kg));
      setRetailSection(asString(data.retail_section));
      setIsStandalone(data.is_standalone_food === true);
      const firstPortion = ingredientPortions(data)[0];
      setPortionName(asString(firstPortion?.name, 'Portion'));
      setPortionUnit(asString(firstPortion?.measuring_unit_name, 'Gramm'));
      setPortionWeight(firstPortion?.weight_g == null ? '' : String(firstPortion.weight_g));
    } else {
      setRecipeType(asString(data.recipe_type, 'snack'));
      setRecipeServings(data.portions == null ? '4' : String(data.portions));
      setRecipeDescription(asString(data.description));
      setRecipeIngredients(recipeItemsText(data));
      setRecipeSteps(recipeStepsText(data));
    }
  };

  const handleCandidate = async (candidate: BuffetCandidate) => {
    if (candidate.action === 'create') {
      initializeCreateForm(candidate.item_kind, candidate.source_name, candidate.role_slugs, {
        name: candidate.item_kind === 'ingredient' ? candidate.source_name : undefined,
        title: candidate.item_kind === 'recipe' ? candidate.source_name : undefined,
        recipe_type: candidate.recipe_type ?? undefined,
      });
      return;
    }

    try {
      const proposal = await createProposal.mutateAsync({
        action: candidate.action,
        item_kind: candidate.item_kind,
        source_id: candidate.source_id,
        source_expected_name: candidate.source_name,
        target_id: candidate.target_id ?? null,
        target_expected_name: candidate.target_name ?? '',
        role_slugs: candidate.role_slugs,
        proposed_data: {},
        origin: 'manual',
        rationale: candidate.rationale,
      });
      setSelectedProposalId(proposal.id);
      notify.success('Vorschlag angelegt', { description: 'Das Katalog-Item wurde nicht verändert.' });
    } catch (error) {
      notify.error('Vorschlag konnte nicht angelegt werden', {
        description: getApiErrorMessage(error, 'Bitte erneut versuchen.'),
      });
    }
  };

  const handleAiSuggestion = async () => {
    if (itemName.trim().length < 2) return;
    try {
      const suggestion = await suggestItem.mutateAsync({
        item_kind: itemKind,
        name: itemName.trim(),
        recipe_type: itemKind === 'recipe' ? recipeType : undefined,
        role_slugs: roleSlugs,
      });
      const data: JsonObject = { ...suggestion.proposed_data, ai_interaction_id: suggestion.ai_interaction_id };
      setDraftData(data);
      setItemName(suggestion.name);
      setAiUsed(true);
      if (itemKind === 'ingredient') {
        setEnergyKcal(data.energy_kcal == null ? '' : String(data.energy_kcal));
        setPricePerKg(data.price_per_kg == null ? '' : String(data.price_per_kg));
        setRetailSection(asString(data.retail_section));
        setIsStandalone(data.is_standalone_food === true);
        const firstPortion = ingredientPortions(data)[0];
        setPortionName(asString(firstPortion?.name, 'Portion'));
        setPortionUnit(asString(firstPortion?.measuring_unit_name, 'Gramm'));
        setPortionWeight(firstPortion?.weight_g == null ? '' : String(firstPortion.weight_g));
      } else {
        setRecipeType(asString(data.recipe_type, recipeType));
        setRecipeServings(data.portions == null ? '4' : String(data.portions));
        setRecipeDescription(asString(data.description));
        setRecipeIngredients(recipeItemsText(data));
        setRecipeSteps(recipeStepsText(data));
      }
      notify.success('KI-Vorschlag erstellt', { description: 'Bitte prüfen und manuell ergänzen.' });
    } catch (error) {
      notify.error('KI-Vorschlag fehlgeschlagen', {
        description: getApiErrorMessage(error, 'Bitte erneut versuchen.'),
      });
    }
  };

  const buildProposedData = (): JsonObject => {
    if (action !== 'create') return draftData;
    if (itemKind === 'ingredient') {
      const previousPortions = asObject(draftData.portions);
      const weight = Number(portionWeight.replace(',', '.'));
      const portion = {
        name: portionName.trim(),
        measuring_unit_name: portionUnit.trim(),
        quantity: 1,
        weight_g: Number.isFinite(weight) && weight > 0 ? weight : null,
        rank: 1,
        portion_type: 'rezeptportion',
      };
      const energy = Number(energyKcal.replace(',', '.'));
      const price = Number(pricePerKg.replace(',', '.'));
      return {
        ...draftData,
        name: itemName.trim(),
        energy_kcal: energyKcal.trim() && Number.isFinite(energy) ? energy : null,
        price_per_kg: pricePerKg.trim() && Number.isFinite(price) ? price : null,
        retail_section: retailSection.trim(),
        is_standalone_food: isStandalone,
        portions: {
          ...previousPortions,
          rezeptportionen: [portion],
        },
      };
    }

    const servings = Number(recipeServings);
    const steps = recipeSteps.split('\n').map((step) => step.trim()).filter(Boolean);
    return {
      ...draftData,
      title: itemName.trim(),
      recipe_type: recipeType,
      portions: Number.isFinite(servings) && servings > 0 ? servings : 0,
      description: recipeDescription.trim(),
      items: parseRecipeItems(recipeIngredients),
      steps,
    };
  };

  const handleSaveProposal = async () => {
    const sourceIdValue = sourceId.trim() ? Number(sourceId) : null;
    const targetIdValue = targetId.trim() ? Number(targetId) : null;
    const proposedData = buildProposedData();
    const request = {
      action,
      item_kind: itemKind,
      source_id: sourceIdValue,
      source_expected_name: sourceName.trim(),
      target_id: targetIdValue,
      target_expected_name: targetName.trim(),
      role_slugs: roleSlugs,
      proposed_data: proposedData,
      origin: aiUsed ? 'mixed' : 'manual',
      ai_confidence: null,
      rationale: aiUsed ? 'KI-vorbefüllt und durch Staff bearbeitet.' : 'Manuell durch Staff erfasst.',
    } satisfies BuffetProposalCreateRequest;

    try {
      if (editingProposal) {
        const updated = await updateProposal.mutateAsync({
          id: editingProposal.id,
          update: {
            source_id: sourceIdValue,
            source_expected_name: sourceName.trim(),
            target_id: targetIdValue,
            target_expected_name: targetName.trim(),
            role_slugs: roleSlugs,
            proposed_data: proposedData,
            rationale: request.rationale,
          },
        });
        setSelectedProposalId(updated.id);
        notify.success('Vorschlag aktualisiert', { description: 'Der Mapping-Test muss erneut ausgeführt werden.' });
      } else {
        const created = await createProposal.mutateAsync(request);
        setSelectedProposalId(created.id);
        notify.success('Vorschlag gespeichert', { description: 'Es wurden noch keine Katalogdaten geändert.' });
      }
      setPreviewResult(null);
      resetForm();
    } catch (error) {
      notify.error('Vorschlag konnte nicht gespeichert werden', {
        description: getApiErrorMessage(error, 'Bitte Eingaben prüfen und erneut versuchen.'),
      });
    }
  };

  const handlePreview = async (proposalId: number) => {
    try {
      const result = await previewProposal.mutateAsync(proposalId);
      setSelectedProposalId(proposalId);
      setPreviewResult(result);
      if (result.can_approve) notify.success('Mapping-Test erfolgreich', { description: 'Es wurden keine Katalogdaten geändert.' });
    } catch (error) {
      notify.error('Mapping-Test fehlgeschlagen', {
        description: getApiErrorMessage(error, 'Bitte erneut versuchen.'),
      });
    }
  };

  const handleReview = async (proposal: BuffetProposal, decision: 'approve' | 'reject') => {
    try {
      await reviewProposal.mutateAsync({ id: proposal.id, review: { decision, note: '' } });
      setPreviewResult(null);
      notify.success(decision === 'approve' ? 'Mapping freigegeben' : 'Vorschlag abgelehnt', {
        description: decision === 'approve' ? 'Die Freigabe ändert noch keine Katalogdaten.' : undefined,
      });
    } catch (error) {
      notify.error('Entscheidung konnte nicht gespeichert werden', {
        description: getApiErrorMessage(error, 'Bitte erneut versuchen.'),
      });
    }
  };

  const handleExport = async () => {
    try {
      const data = await exportProposals.mutateAsync();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'buffet-approved-mapping.json';
      link.click();
      URL.revokeObjectURL(url);
      notify.success('Freigegebenes Mapping exportiert');
    } catch (error) {
      notify.error('Mapping-Export fehlgeschlagen', {
        description: getApiErrorMessage(error, 'Bitte erneut versuchen.'),
      });
    }
  };

  const candidates = candidatesQuery.data;
  const proposals = proposalsQuery.data;
  const previewForSelected = previewResult?.proposal_id === selectedProposalId ? previewResult : null;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-info-border bg-info-soft p-4 text-body text-info">
        KI- und manuelle Einträge bleiben Vorschläge. „Mapping testen“ schreibt nichts; eine Freigabe ändert keine Zutaten,
        Rezepte oder Tags und ersetzt nicht den freizugebenden Prod-Dry-Run.
      </div>

      <section className="space-y-3 rounded-xl bg-card p-4 shadow-card" aria-labelledby="buffet-quality-report-heading">
        <div>
          <h3 id="buffet-quality-report-heading" className="text-emphasis font-semibold text-foreground">Vollständigkeits- und Alt-Tag-Bericht</h3>
          <p className="text-caption text-muted-foreground">Prüft Buffet-Zutaten auf kcal, Verifizierung und Retail-Section sowie alte Frühstücks-Tags.</p>
        </div>
        {reportQuery.isLoading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Bericht wird geladen …</div>
        ) : reportQuery.error ? (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-2 text-danger">
            <span>Bericht konnte nicht geladen werden.</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void reportQuery.refetch()}>Erneut versuchen</Button>
          </div>
        ) : reportQuery.data ? (
          <>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                ['Fehlende kcal', reportQuery.data.summary.missing_energy ?? 0],
                ['Nicht verifiziert', reportQuery.data.summary.unverified ?? 0],
                ['Retail-Section fehlt', reportQuery.data.summary.missing_retail_section ?? 0],
                ['Alte Frühstücks-Tags', reportQuery.data.summary.legacy_tag_carriers ?? 0],
              ].map(([label, count]) => (
                <div key={label} className="rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-caption text-muted-foreground">{label}</p>
                  <p className="text-heading font-semibold text-foreground">{count}</p>
                </div>
              ))}
            </div>
            {reportQuery.data.items.length === 0 ? (
              <p className="text-body text-muted-foreground">Keine offenen Vollständigkeits- oder Alt-Tag-Hinweise.</p>
            ) : (
              <ul className="divide-y divide-border rounded-lg border border-border">
                {reportQuery.data.items.map((item) => (
                  <li key={`${item.item_kind}-${item.id}`} className="space-y-1 p-3">
                    <p className="text-body font-medium text-foreground">
                      {item.name} <span className="text-caption text-muted-foreground">({item.item_kind === 'ingredient' ? 'Zutat' : 'Rezept'} · {item.status})</span>
                    </p>
                    <p className="text-caption text-muted-foreground">
                      {item.missing_fields.map((field) => ({
                        missing_energy: 'Nährwerte fehlen',
                        unverified: 'nicht verifiziert',
                        missing_retail_section: 'Retail-Section fehlt',
                        old_breakfast_tags: `alte Tags: ${item.legacy_breakfast_tag_slugs.join(', ')}`,
                      }[field] ?? field)).join(' · ')}
                      {item.retail_section ? ` · ${item.retail_section}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {reportQuery.data.total_pages > 1 && (
              <PageControls
                page={state.report_page}
                totalPages={reportQuery.data.total_pages}
                onChange={(report_page) => patch({ report_page })}
              />
            )}
          </>
        ) : null}
      </section>

      <section className="space-y-3 rounded-xl bg-card p-4 shadow-card">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h3 className="text-emphasis font-semibold text-foreground">Kandidaten prüfen</h3>
            <p className="text-caption text-muted-foreground">Ungetaggte Katalog-Items, Dubletten und noch fehlende Produkte.</p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => initializeCreateForm('ingredient')}>
            Neuen Vorschlag erfassen
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={state.q}
              onChange={(event) => patch({ q: event.target.value, candidate_page: 1 }, { replace: true })}
              placeholder="Kandidaten suchen…"
              className="pl-8"
              aria-label="Buffet-Kandidaten suchen"
            />
          </div>
          <Select value={state.action} onValueChange={(value) => patch({ action: value as typeof state.action, candidate_page: 1 })}>
            <SelectTrigger aria-label="Aktion filtern"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Aktionen</SelectItem>
              <SelectItem value="add">Rolle hinzufügen</SelectItem>
              <SelectItem value="untag">Rolle entfernen</SelectItem>
              <SelectItem value="merge_into">Dubletten prüfen</SelectItem>
              <SelectItem value="create">Neu vorschlagen</SelectItem>
            </SelectContent>
          </Select>
          <Select value={state.kind} onValueChange={(value) => patch({ kind: value as typeof state.kind, candidate_page: 1 })}>
            <SelectTrigger aria-label="Inhaltstyp filtern"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Zutaten und Rezepte</SelectItem>
              <SelectItem value="ingredient">Zutaten</SelectItem>
              <SelectItem value="recipe">Rezepte</SelectItem>
            </SelectContent>
          </Select>
          <Select value={state.role_slug || 'all'} onValueChange={(value) => patch({ role_slug: value === 'all' ? '' : value, candidate_page: 1 })}>
            <SelectTrigger aria-label="Buffet-Rolle filtern"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Alle Rollen</SelectItem>
              {BUFFET_ROLE_ORDER.map((slug) => <SelectItem key={slug} value={slug}>{buffetRoleName(slug)}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {candidatesQuery.isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : candidatesQuery.error ? (
          <div className="rounded-lg border border-danger-border bg-danger-soft p-3 text-body text-danger" role="alert">
            <p>Die Buffet-Kandidaten konnten nicht geladen werden: {candidatesQuery.error.message}</p>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void candidatesQuery.refetch()}>Erneut versuchen</Button>
          </div>
        ) : !candidates?.items.length ? (
          <p className="py-6 text-center text-body text-muted-foreground">Keine passenden Kandidaten gefunden.</p>
        ) : (
          <div className="space-y-2">
            {candidates.items.map((candidate) => (
              <CandidateRow key={candidate.candidate_key} candidate={candidate} onCreate={handleCandidate} pending={createProposal.isPending} />
            ))}
            <PageControls
              page={candidates.page}
              totalPages={candidates.total_pages}
              onChange={(candidate_page) => patch({ candidate_page })}
            />
          </div>
        )}
      </section>

      {formOpen && (
        <section className="space-y-4 rounded-xl bg-card p-4 shadow-card" aria-label="Buffet-Vorschlag bearbeiten">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-emphasis font-semibold text-foreground">{editingProposal ? 'Vorschlag bearbeiten' : 'Neuen Vorschlag erfassen'}</h3>
              <p className="text-caption text-muted-foreground">KI-Werte sind Entwürfe. Prüfe und ergänze sie vor dem Mapping-Test.</p>
            </div>
            <Button type="button" variant="ghost" size="icon" aria-label="Formular schließen" onClick={resetForm}><X className="h-4 w-4" /></Button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Vorschlagsart</Label>
              <Select value={action} onValueChange={(value) => setAction(value as ProposalAction)} disabled={Boolean(editingProposal)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="create">Neues Item anlegen</SelectItem>
                  <SelectItem value="add">Rolle hinzufügen</SelectItem>
                  <SelectItem value="untag">Rolle entfernen</SelectItem>
                  <SelectItem value="merge_into">Zusammenführen</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Inhaltstyp</Label>
              <Select value={itemKind} onValueChange={(value) => setItemKind(value as ItemKind)} disabled={Boolean(editingProposal)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="ingredient">Zutat</SelectItem><SelectItem value="recipe">Rezept</SelectItem></SelectContent>
              </Select>
            </div>
          </div>

          {action !== 'create' && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5"><Label htmlFor="buffet-source-id">Quell-ID</Label><Input id="buffet-source-id" inputMode="numeric" value={sourceId} onChange={(event) => setSourceId(event.target.value)} /></div>
              <div className="space-y-1.5"><Label htmlFor="buffet-source-name">Erwarteter Quellname</Label><Input id="buffet-source-name" value={sourceName} onChange={(event) => setSourceName(event.target.value)} /></div>
              {action === 'merge_into' && (
                <>
                  <div className="space-y-1.5"><Label htmlFor="buffet-target-id">Ziel-ID</Label><Input id="buffet-target-id" inputMode="numeric" value={targetId} onChange={(event) => setTargetId(event.target.value)} /></div>
                  <div className="space-y-1.5"><Label htmlFor="buffet-target-name">Erwarteter Zielname</Label><Input id="buffet-target-name" value={targetName} onChange={(event) => setTargetName(event.target.value)} /></div>
                </>
              )}
            </div>
          )}

          {action === 'create' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="buffet-new-name">{itemKind === 'ingredient' ? 'Zutatenname' : 'Rezepttitel'}</Label>
                <Input id="buffet-new-name" value={itemName} onChange={(event) => setItemName(event.target.value)} />
              </div>
              <Button type="button" variant="outline" size="sm" onClick={() => void handleAiSuggestion()} disabled={suggestItem.isPending || itemName.trim().length < 2}>
                {suggestItem.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                KI-Vorschlag erzeugen
              </Button>
              {itemKind === 'ingredient' ? (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5"><Label htmlFor="buffet-energy">Energie (kcal/100 g)</Label><Input id="buffet-energy" type="number" min="0" value={energyKcal} onChange={(event) => setEnergyKcal(event.target.value)} /></div>
                  <div className="space-y-1.5"><Label htmlFor="buffet-price">Preis (€/kg)</Label><Input id="buffet-price" type="number" min="0" step="0.01" value={pricePerKg} onChange={(event) => setPricePerKg(event.target.value)} /></div>
                  <div className="space-y-1.5"><Label htmlFor="buffet-section">Retail-Section</Label><Input id="buffet-section" value={retailSection} onChange={(event) => setRetailSection(event.target.value)} placeholder="z. B. Knabberartikel" /></div>
                  <div className="space-y-1.5"><Label htmlFor="buffet-portion-name">Portionsname</Label><Input id="buffet-portion-name" value={portionName} onChange={(event) => setPortionName(event.target.value)} /></div>
                  <div className="space-y-1.5"><Label htmlFor="buffet-portion-unit">Maßeinheit</Label><Input id="buffet-portion-unit" value={portionUnit} onChange={(event) => setPortionUnit(event.target.value)} /></div>
                  <div className="space-y-1.5"><Label htmlFor="buffet-portion-weight">Portionsgewicht (g)</Label><Input id="buffet-portion-weight" type="number" min="0.01" value={portionWeight} onChange={(event) => setPortionWeight(event.target.value)} /></div>
                  <label className="flex items-center gap-2 text-body sm:col-span-2">
                    <Checkbox checked={isStandalone} onCheckedChange={(checked) => setIsStandalone(checked === true)} />
                    Direkt essbar (ohne Zubereitung)
                  </label>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label>Rezepttyp</Label>
                    <Select value={recipeType} onValueChange={setRecipeType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>{RECIPE_TYPE_OPTIONS.filter((option) => option.value !== 'ingredient').map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5"><Label htmlFor="buffet-servings">Portionen</Label><Input id="buffet-servings" type="number" min="1" value={recipeServings} onChange={(event) => setRecipeServings(event.target.value)} /></div>
                  <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="buffet-description">Beschreibung</Label><Textarea id="buffet-description" value={recipeDescription} onChange={(event) => setRecipeDescription(event.target.value)} rows={3} /></div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="buffet-recipe-items">Zutaten (eine Zeile: Name | Menge | Einheit)</Label>
                    <Textarea id="buffet-recipe-items" value={recipeIngredients} onChange={(event) => setRecipeIngredients(event.target.value)} rows={5} placeholder={'Nudeln | 500 | g\nTomatensoße | 1 | Glas'} />
                  </div>
                  <div className="space-y-1.5 sm:col-span-2"><Label htmlFor="buffet-steps">Zubereitungsschritte (eine Zeile je Schritt)</Label><Textarea id="buffet-steps" value={recipeSteps} onChange={(event) => setRecipeSteps(event.target.value)} rows={4} /></div>
                </div>
              )}
            </>
          )}

          <fieldset className="space-y-2">
            <legend className="text-body font-semibold text-foreground">Buffet-Rollen</legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {BUFFET_ROLE_ORDER.map((slug) => (
                <label key={slug} className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-caption">
                  <Checkbox
                    checked={roleSlugs.includes(slug)}
                    onCheckedChange={(checked) => setRoleSlugs((current) => checked === true
                      ? [...new Set([...current, slug])]
                      : current.filter((roleSlug) => roleSlug !== slug))}
                  />
                  {buffetRoleName(slug)}
                </label>
              ))}
            </div>
          </fieldset>

          <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-3">
            <Button type="button" variant="outline" onClick={resetForm}>Abbrechen</Button>
            <Button type="button" onClick={() => void handleSaveProposal()} disabled={createProposal.isPending || updateProposal.isPending}>
              {(createProposal.isPending || updateProposal.isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingProposal ? 'Änderungen speichern' : 'Als Vorschlag speichern'}
            </Button>
          </div>
        </section>
      )}

      <section className="space-y-3 rounded-xl bg-card p-4 shadow-card">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-emphasis font-semibold text-foreground">Gespeicherte Vorschläge</h3>
            <p className="text-caption text-muted-foreground">Freigabe exportiert nur ein Mapping; es wird nichts angewendet.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={state.status} onValueChange={(value) => patch({ status: value as typeof state.status, proposal_page: 1 })}>
              <SelectTrigger className="w-full sm:w-44" aria-label="Vorschlagsstatus filtern"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Ausstehend</SelectItem>
                <SelectItem value="approved">Freigegeben</SelectItem>
                <SelectItem value="rejected">Abgelehnt</SelectItem>
                <SelectItem value="all">Alle Status</SelectItem>
              </SelectContent>
            </Select>
            <Button type="button" variant="outline" size="sm" onClick={() => void handleExport()} disabled={exportProposals.isPending}>
              {exportProposals.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              Mapping exportieren
            </Button>
          </div>
        </div>

        {proposalsQuery.isLoading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-muted-foreground" /></div>
        ) : proposalsQuery.error ? (
          <div className="rounded-lg border border-danger-border bg-danger-soft p-3 text-body text-danger" role="alert">
            <p>Vorschläge konnten nicht geladen werden: {proposalsQuery.error.message}</p>
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => void proposalsQuery.refetch()}>Erneut versuchen</Button>
          </div>
        ) : !proposals?.items.length ? (
          <p className="py-6 text-center text-body text-muted-foreground">Keine Vorschläge für diesen Status.</p>
        ) : (
          <div className="space-y-2">
            {proposals.items.map((proposal) => (
              <ProposalRow
                key={proposal.id}
                proposal={proposal}
                selected={selectedProposalId === proposal.id}
                onEdit={() => initializeEditForm(proposal)}
                onPreview={() => void handlePreview(proposal.id)}
                onApprove={() => void handleReview(proposal, 'approve')}
                onReject={() => void handleReview(proposal, 'reject')}
                pending={previewProposal.isPending || reviewProposal.isPending}
              />
            ))}
            <PageControls
              page={proposals.page}
              totalPages={proposals.total_pages}
              onChange={(proposal_page) => patch({ proposal_page })}
            />
          </div>
        )}

        {previewForSelected && (
          <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3" role="status">
            <h4 className="text-body font-semibold text-foreground">Mapping-Test</h4>
            {previewForSelected.can_approve ? (
              <p className="text-caption text-success">Der Test ist erfolgreich und hat keine Katalogdaten geändert.</p>
            ) : (
              <div className="space-y-1 text-caption text-danger">
                {previewForSelected.blockers.map((blocker, index) => <p key={`blocker-${index}`}>{blocker}</p>)}
              </div>
            )}
            {previewForSelected.warnings.map((warning, index) => <p key={`warning-${index}`} className="text-caption text-warning">{warning}</p>)}
            {Object.entries(previewForSelected.affected_references).map(([key, count]) => (
              <p key={key} className="text-caption text-muted-foreground">{key}: {count}</p>
            ))}
            {previewForSelected.plan.map((entry, index) => (
              <pre key={index} className="overflow-x-auto rounded-lg border border-border bg-background p-2 text-caption">{JSON.stringify(entry, null, 2)}</pre>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function CandidateRow({ candidate, onCreate, pending }: { candidate: BuffetCandidate; onCreate: (candidate: BuffetCandidate) => void; pending: boolean }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-background p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0 space-y-1">
        <p className="break-words text-body font-semibold text-foreground">
          {candidate.source_name}{candidate.target_name ? ` → ${candidate.target_name}` : ''}
        </p>
        <p className="text-caption text-muted-foreground">
          {actionLabel(candidate.action)} · {candidate.item_kind === 'ingredient' ? 'Zutat' : 'Rezept'}
          {candidate.source_id != null && ` · ID ${candidate.source_id}`}
          {candidate.retail_section ? ` · ${candidate.retail_section}` : ''}
          {candidate.recipe_type ? ` · ${candidate.recipe_type}` : ''}
        </p>
        {candidate.rationale && <p className="text-caption text-muted-foreground">{candidate.rationale}</p>}
        {candidate.role_slugs.length > 0 && <p className="text-caption text-info">{candidate.role_slugs.map(buffetRoleName).join(' · ')}</p>}
        {candidate.candidate_status !== 'available' && (
          <p className="text-caption font-semibold text-warning">{candidate.candidate_status === 'stale' ? 'Daten müssen erneut geprüft werden' : 'Passendes Item vorhanden'}</p>
        )}
      </div>
      <Button type="button" variant="outline" size="sm" className="shrink-0" onClick={() => onCreate(candidate)} disabled={pending}>
        Vorschlag anlegen
      </Button>
    </div>
  );
}

function ProposalRow({
  proposal,
  selected,
  onEdit,
  onPreview,
  onApprove,
  onReject,
  pending,
}: {
  proposal: BuffetProposal;
  selected: boolean;
  onEdit: () => void;
  onPreview: () => void;
  onApprove: () => void;
  onReject: () => void;
  pending: boolean;
}) {
  const proposedData = asObject(proposal.proposed_data);
  const title = asString(proposedData.name) || asString(proposedData.title) || proposal.source_expected_name || `Vorschlag ${proposal.id}`;
  return (
    <div className={`space-y-3 rounded-xl border p-3 ${selected ? 'border-primary bg-primary/5' : 'border-border bg-background'}`}>
      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-body font-semibold text-foreground">{title}</p>
          <p className="text-caption text-muted-foreground">
            {actionLabel(proposal.action)} · {proposal.item_kind === 'ingredient' ? 'Zutat' : 'Rezept'} · {statusLabel(proposal.status)}
          </p>
          {proposal.role_slugs.length > 0 && <p className="mt-1 text-caption text-info">{proposal.role_slugs.map(buffetRoleName).join(' · ')}</p>}
        </div>
        <span className="text-caption text-muted-foreground">Vorschlag #{proposal.id} · {proposal.origin === 'ai' ? 'KI' : proposal.origin === 'mixed' ? 'KI + manuell' : 'manuell'}</span>
      </div>
      {proposal.status === 'pending' && (
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" size="sm" onClick={onEdit}><Pencil className="mr-1.5 h-3.5 w-3.5" />Bearbeiten</Button>
          <Button type="button" variant="outline" size="sm" onClick={onPreview} disabled={pending}><TestTube2 className="mr-1.5 h-3.5 w-3.5" />Mapping testen</Button>
          <Button type="button" size="sm" onClick={onApprove} disabled={pending || !proposal.preview_current}>Freigeben</Button>
          <Button type="button" variant="ghost" size="sm" onClick={onReject} disabled={pending}>Ablehnen</Button>
          {!proposal.preview_current && <span className="self-center text-caption text-warning">Vor Freigabe erst erneut testen</span>}
        </div>
      )}
    </div>
  );
}
