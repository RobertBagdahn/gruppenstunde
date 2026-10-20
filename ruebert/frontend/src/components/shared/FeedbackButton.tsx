import { useState } from 'react';

import { useFeedback } from './FeedbackContext';
import { KIND_TEXT, type FeedbackKind } from './FeedbackDialog';

/** Beet icon: a round root with its leaves, drawn in currentColor so it follows the theme tokens. */
function BeetIcon() {
  return (
    <svg viewBox="0 0 24 24" width={20} height={20} aria-hidden fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 9c-3 0-5 2.5-5 6.5C7 19 9 21 12 21s5-2 5-5.5C17 11.5 15 9 12 9z" />
      <path d="M12 9c0-2 .5-4 2-6M12 9c-1-2-3-3.5-5-3.5M12 9c1.5-1 3.5-1 5 0" />
    </svg>
  );
}

/** Round button bottom right on every page; a small menu chooses the kind of feedback (feedback-issues spec). */
export function FeedbackButton() {
  const { open } = useFeedback();
  const [menu, setMenu] = useState(false);
  const choose = (kind: FeedbackKind) => {
    setMenu(false);
    open({ kind });
  };
  return (
    <div className="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2">
      {menu && (
        <div role="menu" aria-label="Art der Rückmeldung" className="flex flex-col overflow-hidden rounded-lg border border-border-strong bg-panel shadow-lg">
          {(Object.keys(KIND_TEXT) as FeedbackKind[]).map((kind) => (
            <button
              key={kind}
              type="button"
              role="menuitem"
              onClick={() => choose(kind)}
              className="px-4 py-2 text-left text-dense text-foreground-2 hover:bg-row-hover hover:text-foreground-strong"
            >
              {KIND_TEXT[kind]}
            </button>
          ))}
        </div>
      )}
      <button
        type="button"
        aria-label="Rückmeldung geben"
        aria-haspopup="menu"
        aria-expanded={menu}
        onClick={() => setMenu((value) => !value)}
        className="grid size-12 place-items-center rounded-full border border-accent-border bg-accent-soft text-accent-text shadow-lg hover:bg-row-active"
      >
        <BeetIcon />
      </button>
    </div>
  );
}
