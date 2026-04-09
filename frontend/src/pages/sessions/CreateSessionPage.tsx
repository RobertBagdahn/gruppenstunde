/**
 * CreateSessionPage — GroupSession creation using the shared ContentStepper.
 * Adds session-specific fields: session_type, location_type, participants, materials.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import ContentStepper, { type ContentFormData } from '@/components/content/ContentStepper';
import { useCreateSession } from '@/api/sessions';
import { SESSION_TYPE_OPTIONS, LOCATION_TYPE_OPTIONS } from '@/schemas/session';
import SupplySearch, { type SupplySearchResult } from '@/components/supply/SupplySearch';

interface MaterialEntry {
  id: number;
  name: string;
  quantity: string;
}

export default function CreateSessionPage() {
  const navigate = useNavigate();
  const createSession = useCreateSession();

  // Session-specific state
  const [sessionType, setSessionType] = useState('');
  const [locationType, setLocationType] = useState('');
  const [minParticipants, setMinParticipants] = useState('');
  const [maxParticipants, setMaxParticipants] = useState('');
  const [materials, setMaterials] = useState<MaterialEntry[]>([]);

  function handleAddMaterial(item: SupplySearchResult) {
    if (materials.some((m) => m.id === item.id)) {
      toast.info(`"${item.name}" ist bereits hinzugefuegt`);
      return;
    }
    setMaterials((prev) => [...prev, { id: item.id, name: item.name, quantity: '1' }]);
  }

  function handleRemoveMaterial(id: number) {
    setMaterials((prev) => prev.filter((m) => m.id !== id));
  }

  function handleUpdateQuantity(id: number, quantity: string) {
    setMaterials((prev) =>
      prev.map((m) => (m.id === id ? { ...m, quantity } : m)),
    );
  }

  async function handleSave(formData: ContentFormData) {
    try {
      const result = await createSession.mutateAsync({
        title: formData.title,
        summary: formData.summary,
        description: formData.description,
        difficulty: formData.difficulty || undefined,
        costs_rating: formData.costsRating || undefined,
        execution_time: formData.executionTime || undefined,
        preparation_time: formData.preparationTime || undefined,
        session_type: sessionType || undefined,
        location_type: locationType || undefined,
        min_participants: minParticipants ? parseInt(minParticipants, 10) : null,
        max_participants: maxParticipants ? parseInt(maxParticipants, 10) : null,
        tag_ids: formData.selectedTagIds,
        scout_level_ids: formData.selectedScoutIds,
      });
      toast.success('Gruppenstunde erstellt!');
      navigate(`/sessions/${result.slug}`);
    } catch (err) {
      toast.error('Fehler beim Erstellen', {
        description: err instanceof Error ? err.message : 'Unbekannter Fehler',
      });
    }
  }

  return (
    <ContentStepper
      typeLabel="Gruppenstunde"
      typeIcon="groups"
      typeGradient="from-sky-500 to-cyan-600"
      isSaving={createSession.isPending}
      onSave={handleSave}
      renderTypeFields={() => (
        <div className="space-y-6">
          {/* Session details */}
          <div className="bg-card rounded-xl border p-6 space-y-4">
            <h3 className="text-sm font-medium">Gruppenstunden-Details</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-muted-foreground mb-1">Art der Gruppenstunde</label>
                <select
                  value={sessionType}
                  onChange={(e) => setSessionType(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">— Wählen —</option>
                  {SESSION_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Ort</label>
                <select
                  value={locationType}
                  onChange={(e) => setLocationType(e.target.value)}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                >
                  <option value="">— Wählen —</option>
                  {LOCATION_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Min. Teilnehmer</label>
                <input
                  type="number"
                  min={1}
                  value={minParticipants}
                  onChange={(e) => setMinParticipants(e.target.value)}
                  placeholder="z.B. 5"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs text-muted-foreground mb-1">Max. Teilnehmer</label>
                <input
                  type="number"
                  min={1}
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value)}
                  placeholder="z.B. 30"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          {/* Material search */}
          <div className="bg-card rounded-xl border p-6 space-y-4">
            <h3 className="text-sm font-medium flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[16px] text-muted-foreground">build</span>
              Material (optional)
            </h3>
            <p className="text-xs text-muted-foreground">
              Materialien kannst du auch nach dem Erstellen hinzufuegen.
            </p>
            <SupplySearch
              onSelect={handleAddMaterial}
              placeholder="Material suchen oder erstellen..."
            />
            {materials.length > 0 && (
              <div className="space-y-2">
                {materials.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 px-3 py-2 bg-muted/50 rounded-lg"
                  >
                    <span className="material-symbols-outlined text-[16px] text-muted-foreground">
                      build
                    </span>
                    <span className="text-sm font-medium flex-1">{m.name}</span>
                    <input
                      type="text"
                      value={m.quantity}
                      onChange={(e) => handleUpdateQuantity(m.id, e.target.value)}
                      className="w-20 rounded border border-input bg-background px-2 py-1 text-xs text-center"
                      placeholder="Menge"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveMaterial(m.id)}
                      className="p-1 rounded hover:bg-destructive/10 text-destructive"
                      title="Entfernen"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      renderPreviewExtras={() => (
        <>
          {(sessionType || locationType || minParticipants || maxParticipants) && (
            <div className="flex flex-wrap gap-3 pt-2 border-t">
              {sessionType && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-medium">
                  <span className="material-symbols-outlined text-[14px]">category</span>
                  {SESSION_TYPE_OPTIONS.find((o) => o.value === sessionType)?.label ?? sessionType}
                </span>
              )}
              {locationType && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-medium">
                  <span className="material-symbols-outlined text-[14px]">location_on</span>
                  {LOCATION_TYPE_OPTIONS.find((o) => o.value === locationType)?.label ?? locationType}
                </span>
              )}
              {(minParticipants || maxParticipants) && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 text-xs font-medium">
                  <span className="material-symbols-outlined text-[14px]">people</span>
                  {minParticipants && maxParticipants
                    ? `${minParticipants}–${maxParticipants} Teilnehmer`
                    : minParticipants
                      ? `Ab ${minParticipants} Teilnehmer`
                      : `Bis ${maxParticipants} Teilnehmer`}
                </span>
              )}
            </div>
          )}
          {materials.length > 0 && (
            <div className="pt-2 border-t">
              <h4 className="text-sm font-medium mb-2">Material</h4>
              <div className="flex flex-wrap gap-2">
                {materials.map((m) => (
                  <span key={m.id} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-muted text-xs font-medium">
                    <span className="material-symbols-outlined text-[14px]">build</span>
                    {m.quantity}x {m.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    />
  );
}
