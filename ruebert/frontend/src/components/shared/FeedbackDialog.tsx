import { useEffect, useId, useRef, useState, type FormEvent } from 'react';

import { useSendFeedback } from '@/api/queries';
import { formatDayLine } from '@/lib/format';

export type FeedbackKind = 'frage' | 'bug' | 'feature';
export const KIND_TEXT: Record<FeedbackKind, string> = { frage: 'Frage', bug: 'Bug', feature: 'Feature-Wunsch' };
export type FeedbackStart = { kind: FeedbackKind; title?: string };
export type FeedbackPageInfo = { route: string; page: string; sku: string | null; referenceDate: string | null };

const VERSION = '0.1.0';

/** Title, description and author; the page context is attached automatically and shown before sending. */
export function FeedbackDialog({
  start,
  context,
  onClose,
}: {
  start: FeedbackStart | null;
  context: FeedbackPageInfo;
  onClose: () => void;
}) {
  const titleId = useId();
  const firstField = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<FeedbackKind>(start?.kind ?? 'frage');
  const [title, setTitle] = useState(start?.title ?? '');
  const [description, setDescription] = useState('');
  const [author, setAuthor] = useState('');
  const [titleError, setTitleError] = useState<string | null>(null);
  const send = useSendFeedback();

  useEffect(() => {
    firstField.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!title.trim()) {
      setTitleError('Bitte einen Titel angeben.');
      firstField.current?.focus();
      return;
    }
    setTitleError(null);
    send.mutate({
      kind,
      title,
      description,
      author,
      context: {
        route: context.route,
        page: context.page,
        sku: context.sku,
        case_id: null,
        reference_date: context.referenceDate ?? new Date().toISOString().slice(0, 10),
        app_version: VERSION,
      },
    });
  };

  const done = send.data;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/70 p-4 min-[640px]:items-center">
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        noValidate
        onSubmit={submit}
        className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-border-strong bg-panel p-5"
      >
        <h2 id={titleId} className="m-0 text-section font-semibold text-foreground-strong">
          Rückmeldung geben
        </h2>

        {done ? (
          <div className="flex flex-col gap-3 text-dense text-foreground-2">
            <p className="m-0">{done.message}</p>
            {done.issue_url && (
              <a href={done.issue_url} target="_blank" rel="noreferrer" className="text-link">
                Issue #{done.issue_number} öffnen
              </a>
            )}
            <button type="button" onClick={onClose} className="h-8 self-start rounded-md border border-border-strong px-3">
              Schließen
            </button>
          </div>
        ) : (
          <>
            <fieldset className="flex flex-wrap gap-2">
              <legend className="mb-1 text-caption text-muted-foreground">Art</legend>
              {(Object.keys(KIND_TEXT) as FeedbackKind[]).map((k) => (
                <label key={k} className="flex items-center gap-1.5 text-dense">
                  <input type="radio" name="kind" value={k} checked={kind === k} onChange={() => setKind(k)} />
                  {KIND_TEXT[k]}
                </label>
              ))}
            </fieldset>

            <label className="flex flex-col gap-1 text-caption text-muted-foreground">
              Titel
              <input
                ref={firstField}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                aria-invalid={titleError ? true : undefined}
                aria-describedby={titleError ? `${titleId}-err` : undefined}
                className="h-9 rounded-md border border-border-strong bg-background px-2 text-dense text-foreground"
              />
              {titleError && (
                <span id={`${titleId}-err`} role="alert" className="text-warning-text">
                  {titleError}
                </span>
              )}
            </label>

            <label className="flex flex-col gap-1 text-caption text-muted-foreground">
              Beschreibung
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={4}
                className="rounded-md border border-border-strong bg-background px-2 py-1.5 text-dense text-foreground"
              />
            </label>

            <label className="flex flex-col gap-1 text-caption text-muted-foreground">
              Name (optional)
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                className="h-9 rounded-md border border-border-strong bg-background px-2 text-dense text-foreground"
              />
            </label>

            <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-caption text-muted-foreground">
              <dt>Seite</dt>
              <dd className="m-0 text-foreground-2">{context.page}</dd>
              <dt>Route</dt>
              <dd className="m-0 font-mono text-foreground-2">{context.route}</dd>
              {context.sku && (
                <>
                  <dt>Artikel</dt>
                  <dd className="m-0 font-mono text-foreground-2">{context.sku}</dd>
                </>
              )}
              {context.referenceDate && (
                <>
                  <dt>Stichtag</dt>
                  <dd className="m-0 text-foreground-2">{formatDayLine(context.referenceDate)}</dd>
                </>
              )}
            </dl>

            {send.error && (
              <p role="alert" className="m-0 text-dense text-warning-text">
                {send.error.message}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="h-8 rounded-md border border-border-strong px-3 text-dense">
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={send.isPending}
                className="h-8 rounded-md bg-accent px-3 text-dense font-semibold text-accent-foreground disabled:opacity-40"
              >
                Senden
              </button>
            </div>
          </>
        )}
      </form>
    </div>
  );
}
