/**
 * The single entry point for toasts (food-feedback-toasts spec).
 *
 * Wording rules:
 * - Success: "<Objekt> <Partizip>" – "Zutat gespeichert", "Rezept gelöscht".
 * - Error title: "<Objekt> konnte nicht <Verb> werden"; the cause goes into
 *   the description (German API `detail` texts via `getApiErrorMessage`).
 * - No emoji, no check marks, no trailing period in titles.
 *
 * Micro actions (ticking off, sorting, quantities) do not toast on success;
 * they update optimistically and only report failures.
 */
import { toast, type ExternalToast } from 'sonner';
import { getApiErrorMessage } from '@/lib/api';

export const UNDO_DURATION_MS = 6000;

type Options = Pick<ExternalToast, 'description' | 'id' | 'duration' | 'action' | 'cancel' | 'onDismiss' | 'onAutoClose'>;

interface ErrorOptions extends Omit<Options, 'description'> {
  /** The caught error; its German message becomes the description. */
  error?: unknown;
  /** Explicit description (wins over `error`). */
  description?: Options['description'];
}

/** Strips decoration the wording rules forbid (check marks, emoji, trailing period). */
export function normalizeTitle(title: string): string {
  return title
    .replace(/[✓✔✅]|\p{Extended_Pictographic}/gu, '')
    .replace(/\s{2,}/g, ' ')
    .trim()
    .replace(/(?<![.!])[.!]$/, '');
}

function errorDescription(options: ErrorOptions | undefined): Options['description'] {
  if (!options) return undefined;
  if (options.description !== undefined) return options.description;
  if (options.error !== undefined) return getApiErrorMessage(options.error);
  return undefined;
}

function success(title: string, options?: Options) {
  return toast.success(normalizeTitle(title), options);
}

function error(title: string, options?: ErrorOptions) {
  const { error: _error, description: _description, ...rest } = options ?? {};
  return toast.error(normalizeTitle(title), { ...rest, description: errorDescription(options) });
}

function info(title: string, options?: Options) {
  return toast.info(normalizeTitle(title), options);
}

function warning(title: string, options?: Options) {
  return toast.warning(normalizeTitle(title), options);
}

/** Neutral toast, e.g. a removal with an undo action. */
function message(title: string, options?: Options) {
  return toast(normalizeTitle(title), options);
}

function withUndo(title: string, undo: (() => void) | undefined, options?: Options) {
  if (!undo) return success(title, options);
  return toast.success(normalizeTitle(title), {
    ...options,
    duration: UNDO_DURATION_MS,
    action: { label: 'Rückgängig', onClick: undo },
  });
}

interface PromiseMessages<T> {
  /** E.g. "PDF wird erstellt …" */
  loading: string;
  /** E.g. "PDF erstellt", or a function of the result. */
  success: string | ((data: T) => string);
  /** E.g. "PDF konnte nicht erstellt werden"; the cause becomes the description. */
  error: string;
}

/** Long-running action: one toast that changes from loading to success or error. */
function promise<T>(work: Promise<T>, messages: PromiseMessages<T>): Promise<T> {
  const id = toast.loading(messages.loading);
  return work.then(
    (data) => {
      const text = typeof messages.success === 'function' ? messages.success(data) : messages.success;
      toast.success(normalizeTitle(text), { id });
      return data;
    },
    (cause: unknown) => {
      toast.error(normalizeTitle(messages.error), { id, description: getApiErrorMessage(cause) });
      throw cause;
    },
  );
}

export const notify = {
  success,
  error,
  info,
  warning,
  message,
  promise,
  dismiss: toast.dismiss,
  /** "<entity> gespeichert" */
  saved: (entity: string, options?: Options) => success(`${entity} gespeichert`, options),
  /** "<entity> angelegt" */
  created: (entity: string, options?: Options) => success(`${entity} angelegt`, options),
  /** "<entity> gelöscht", with "Rückgängig" when `undo` is given. */
  deleted: (entity: string, undo?: () => void, options?: Options) => withUndo(`${entity} gelöscht`, undo, options),
  /** "<entity> entfernt", with "Rückgängig" when `undo` is given. */
  removed: (entity: string, undo?: () => void, options?: Options) => withUndo(`${entity} entfernt`, undo, options),
  /** "<entity> konnte nicht <verb> werden" + cause. */
  failed: (entity: string, verb: string, cause?: unknown, options?: Omit<ErrorOptions, 'error'>) =>
    error(`${entity} konnte nicht ${verb} werden`, { ...options, error: cause }),
};
