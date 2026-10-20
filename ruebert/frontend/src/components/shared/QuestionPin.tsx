import { useState } from 'react';

import { useQuestion } from '@/api/queries';
import { usePresentationMode } from '@/lib/presentation';
import { QUESTION_PINS, type PinKey } from '@/lib/questionPins';

import { useFeedback } from './FeedbackContext';

/** Pin for an open question at one screen element. Shown only in presentation mode (feedback spec). */
export function QuestionPin({ pin }: { pin: PinKey }) {
  const [presenting] = usePresentationMode();
  const [open, setOpen] = useState(false);
  const { open: openFeedback } = useFeedback();
  const questionId = QUESTION_PINS[pin];
  const question = useQuestion(open ? questionId : null);
  if (!presenting) return null;

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="rounded-full border border-warning-border bg-warning-soft px-2 font-mono text-caption text-warning-text"
      >
        {questionId}
      </button>
      {open && (
        <span role="dialog" aria-label={`Frage ${questionId}`} className="absolute left-0 top-7 z-30 flex w-72 flex-col gap-2 rounded-lg border border-border-strong bg-panel p-3 text-dense text-foreground-2 shadow-lg">
          {question.isLoading && <span>Lade …</span>}
          {question.error && <span className="text-warning-text">{question.error.message}</span>}
          {question.data && (
            <>
              <span className="font-medium text-foreground-strong">{question.data.title}</span>
              <span className="text-caption text-muted-foreground">{question.data.description}</span>
            </>
          )}
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              openFeedback({ kind: 'frage', title: `${questionId} ` });
            }}
            className="h-8 self-start rounded-md border border-border-strong px-3"
          >
            Antwort festhalten
          </button>
        </span>
      )}
    </span>
  );
}
