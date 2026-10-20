import { useState } from 'react';
import { Link } from 'react-router-dom';

import { useResetSetting, useSaveSetting, useSettings } from '@/api/queries';
import type { ApiError } from '@/api/client';
import { Page } from '@/components/layout/Page';
import { QueryState } from '@/components/shared/QueryState';
import { formatInt } from '@/lib/format';

type Parameter = {
  key: string;
  label: string;
  help: string;
  unit: string;
  value: number;
  default: number;
  minimum: number;
  maximum: number;
  status: string;
  question_id: string | null;
  changed_by: string | null;
  changed_at: string | null;
};

/** Business parameters: each row shows its status (confirmed or open question) and saves into the journal (app-settings). */
export function SettingsPage() {
  const query = useSettings();
  return (
    <Page area="Hilfe" page="Einstellungen">
      <div className="flex max-w-3xl flex-col gap-5 p-6">
        <p className="m-0 text-dense text-foreground-2">
          Jede Änderung wird als Eintrag im Entscheidungs-Journal gespeichert. Offene Werte sind mit ihrer Frage verknüpft.
        </p>
        <QueryState error={query.error} isLoading={query.isLoading}>
          {query.data && (
            <div className="flex flex-col divide-y divide-border-row rounded-lg border border-border bg-panel">
              {query.data.map((p) => (
                <SettingRow key={p.key} parameter={p} />
              ))}
            </div>
          )}
        </QueryState>
      </div>
    </Page>
  );
}

function SettingRow({ parameter }: { parameter: Parameter }) {
  const [draft, setDraft] = useState<string>(String(parameter.value));
  const save = useSaveSetting(parameter.key);
  const reset = useResetSetting(parameter.key);
  const fieldError = (save.error as ApiError | null)?.fields.find((f) => f.field === 'value')?.message;
  const message = fieldError ?? (save.error ? save.error.message : reset.error ? reset.error.message : null);
  const changed = parameter.value !== parameter.default;

  return (
    <form
      noValidate
      className="grid gap-3 px-4 py-4 min-[760px]:grid-cols-[minmax(0,1fr)_200px_auto] min-[760px]:items-start"
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate({ value: Number(draft) });
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor={`setting-${parameter.key}`} className="text-emphasis font-medium text-foreground-strong">
          {parameter.label}
        </label>
        <span className="text-caption text-muted-foreground">{parameter.help}</span>
        <span className="flex flex-wrap items-center gap-2 text-caption">
          {parameter.question_id ? (
            <Link to={`/wiki?frage=${parameter.question_id}`} className="text-link">
              {parameter.status}
            </Link>
          ) : (
            <span className="text-foreground-2">{parameter.status}</span>
          )}
          <span className="font-mono text-muted-foreground">
            Vorgabe {formatInt(parameter.default)} {parameter.unit}
          </span>
          {parameter.changed_by && <span className="text-muted-foreground">geändert von {parameter.changed_by}</span>}
        </span>
      </div>
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <input
            id={`setting-${parameter.key}`}
            type="number"
            inputMode="numeric"
            min={parameter.minimum}
            max={parameter.maximum}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            aria-invalid={fieldError ? true : undefined}
            aria-describedby={message ? `setting-${parameter.key}-error` : undefined}
            className="h-9 w-28 rounded-md border border-border-strong bg-background px-2 font-mono text-dense text-foreground"
          />
          <span className="text-caption text-muted-foreground">{parameter.unit}</span>
        </div>
        {message && (
          <span id={`setting-${parameter.key}-error`} role="alert" className="text-caption text-warning-text">
            {message}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={save.isPending} className="h-9 rounded-md bg-accent px-3 text-dense font-semibold text-accent-foreground disabled:opacity-40">
          Speichern
        </button>
        {changed && (
          <button type="button" onClick={() => reset.mutate(undefined, { onSuccess: (p) => setDraft(String(p.value)) })} className="h-9 rounded-md border border-border-strong px-3 text-dense">
            Zurücksetzen
          </button>
        )}
      </div>
    </form>
  );
}
