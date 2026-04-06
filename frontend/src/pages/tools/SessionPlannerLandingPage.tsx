import { useState } from 'react';
import ToolLandingPage from '@/components/ToolLandingPage';
import { TOOL_SESSION_PLANNER } from '@/lib/toolColors';

/* ------------------------------------------------------------------ */
/*  Sandbox: Interactive Session Planner Demo                          */
/* ------------------------------------------------------------------ */

interface DemoSlot {
  date: string;
  dayLabel: string;
  idea: string | null;
  status: 'planned' | 'cancelled';
  notes: string;
}

const IDEA_SUGGESTIONS = [
  'Nachtwanderung', 'Knotenkunde', 'Lagerfeuer-Abend', 'Erste Hilfe',
  'Gelaendespiel', 'Kochen ueber Feuer', 'Sternenkunde', 'Kim-Spiel',
  'Pfadfinder-Quiz', 'Morsen lernen', 'Schnitzeljagd', 'Naturbeobachtung',
];

function generateDemoSlots(): DemoSlot[] {
  const slots: DemoSlot[] = [];
  const today = new Date();
  // Start 2 weeks ago, go 10 weeks forward
  const start = new Date(today);
  start.setDate(start.getDate() - 14);
  // Find next Friday
  const dayOfWeek = start.getDay();
  let diff = 5 - dayOfWeek;
  if (diff < 0) diff += 7;
  start.setDate(start.getDate() + diff);

  for (let i = 0; i < 12; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i * 7);
    const iso = d.toISOString().slice(0, 10);
    const dayLabel = d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' });

    let idea: string | null = null;
    let status: 'planned' | 'cancelled' = 'planned';
    const notes = '';

    // Pre-fill some
    if (i < 2) {
      idea = IDEA_SUGGESTIONS[i];
    } else if (i === 3) {
      status = 'cancelled';
      idea = 'Knotenkunde';
    }

    slots.push({ date: iso, dayLabel, idea, status, notes });
  }
  return slots;
}

function SessionPlannerSandbox() {
  const [slots, setSlots] = useState<DemoSlot[]>(() => generateDemoSlots());
  const [editingIdx, setEditingIdx] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');

  const today = new Date().toISOString().slice(0, 10);

  function setIdea(idx: number, idea: string) {
    const newSlots = [...slots];
    newSlots[idx] = { ...newSlots[idx], idea, status: 'planned' };
    setSlots(newSlots);
    setEditingIdx(null);
    setEditValue('');
  }

  function toggleCancel(idx: number) {
    const newSlots = [...slots];
    const current = newSlots[idx];
    newSlots[idx] = {
      ...current,
      status: current.status === 'cancelled' ? 'planned' : 'cancelled',
    };
    setSlots(newSlots);
  }

  function clearSlot(idx: number) {
    const newSlots = [...slots];
    newSlots[idx] = { ...newSlots[idx], idea: null, status: 'planned', notes: '' };
    setSlots(newSlots);
  }

  const filledCount = slots.filter((s) => s.idea).length;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <span className="material-symbols-outlined text-emerald-500 text-[20px] mt-0.5">info</span>
        <p className="text-sm text-emerald-700">
          <strong>Sandbox-Modus:</strong> Klicke auf einen freien Termin, um eine Idee zuzuweisen.
          Markiere Termine als ausfallend oder loesche Eintraege – alles ohne Anmeldung!
        </p>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4 p-4 bg-card rounded-xl border border-border/60">
        <div>
          <h3 className="font-extrabold text-lg">Demo-Planer: Freitagsgruppe</h3>
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px]">schedule</span>
            Freitags, 18:00 Uhr
            <span className="mx-1">·</span>
            <span className="material-symbols-outlined text-[16px]">group</span>
            Stamm Wildgaense
          </p>
        </div>
        <div className="text-right">
          <span className="text-2xl font-extrabold text-emerald-600">{filledCount}</span>
          <span className="text-sm text-muted-foreground">/{slots.length} geplant</span>
        </div>
      </div>

      {/* Calendar Slots */}
      <div className="space-y-2">
        {slots.map((slot, idx) => {
          const isPast = slot.date < today;
          const isToday = slot.date === today;
          const isEditing = editingIdx === idx;

          return (
            <div
              key={slot.date}
              className={`border rounded-xl p-3 transition-all ${
                isToday ? 'border-emerald-400 bg-emerald-50/50 shadow-sm' : ''
              } ${isPast ? 'opacity-50' : ''} ${
                slot.status === 'cancelled' ? 'bg-muted/40' : 'bg-card'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                {/* Date */}
                <div className="flex items-center gap-2 shrink-0 w-24">
                  <span className={`text-sm font-medium ${isToday ? 'text-emerald-600' : ''}`}>
                    {slot.dayLabel}
                  </span>
                  {isToday && (
                    <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500 text-white rounded-full font-medium">
                      Heute
                    </span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  {isEditing ? (
                    <div className="space-y-1.5">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && editValue) setIdea(idx, editValue);
                          if (e.key === 'Escape') setEditingIdx(null);
                        }}
                        placeholder="Idee eingeben oder auswaehlen..."
                        className="w-full px-2 py-1 rounded border text-sm focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                        autoFocus
                      />
                      <div className="flex flex-wrap gap-1">
                        {IDEA_SUGGESTIONS.slice(0, 6).map((idea) => (
                          <button
                            key={idea}
                            onClick={() => setIdea(idx, idea)}
                            className="text-xs px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-full hover:bg-emerald-100 transition"
                          >
                            {idea}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : slot.idea ? (
                    <span className={`text-sm font-medium ${slot.status === 'cancelled' ? 'line-through text-muted-foreground' : 'text-emerald-700'}`}>
                      {slot.idea}
                    </span>
                  ) : (
                    <button
                      onClick={() => { setEditingIdx(idx); setEditValue(''); }}
                      className="text-sm text-muted-foreground/50 hover:text-emerald-500 italic transition"
                    >
                      Termin belegen...
                    </button>
                  )}
                </div>

                {/* Actions */}
                {slot.idea && !isEditing && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleCancel(idx)}
                      className={`p-1 rounded transition ${
                        slot.status === 'cancelled'
                          ? 'text-emerald-500 hover:bg-emerald-100'
                          : 'text-muted-foreground/50 hover:text-amber-600'
                      }`}
                      title={slot.status === 'cancelled' ? 'Wieder aktivieren' : 'Faellt aus'}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {slot.status === 'cancelled' ? 'check_circle' : 'event_busy'}
                      </span>
                    </button>
                    <button
                      onClick={() => clearSlot(idx)}
                      className="p-1 rounded text-muted-foreground/50 hover:text-destructive transition"
                      title="Entfernen"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SessionPlannerLandingPage() {
  return (
    <ToolLandingPage
      tool={TOOL_SESSION_PLANNER}
      subtitle="Plane deine woechentlichen Gruppenstunden mit einem festen Wochentag und Uhrzeit. Weise jeder Sitzung eine Idee zu und arbeite mit deinem Team zusammen."
      longDescription="Der Gruppenstundenplan ist dein Quartalsplaner fuer woechentliche Heimabende. Lege einen festen Wochentag und eine Uhrzeit fest, und der Planer generiert automatisch die naechsten Termine. Weise jeder Sitzung eine Idee aus der Datenbank zu, schreibe Notizen, markiere Termine als ausfallend und lade weitere Leiter als Mitarbeiter ein."
      features={[
        { icon: 'calendar_month', title: 'Woechentlicher Rhythmus', description: 'Definiere Wochentag und Uhrzeit – der Planer generiert automatisch alle Termine im Quartal.' },
        { icon: 'lightbulb', title: 'Ideen zuweisen', description: 'Suche in der Ideendatenbank und weise jeder Sitzung eine passende Idee zu.' },
        { icon: 'group_add', title: 'Kollaboratives Planen', description: 'Lade andere Leiter als Mitarbeiter ein – mit Editor- oder Betrachter-Rolle.' },
        { icon: 'event_busy', title: 'Ausfaelle markieren', description: 'Markiere einzelne Termine als ausfallend (Ferien, Feiertage, etc.).' },
        { icon: 'groups', title: 'Gruppenbasiert', description: 'Verknuepfe den Planer mit einer Pfadfindergruppe – alle Mitglieder haben Zugriff.' },
        { icon: 'edit_note', title: 'Notizen & Details', description: 'Fuege zu jedem Termin Notizen hinzu – Material-Erinnerungen, Aufgabenverteilung, etc.' },
      ]}
      examples={[
        { icon: 'auto_awesome', title: 'Quartalsplanung', description: 'Plane 12 Wochen Heimabend im Voraus und verteile Themen gleichmaessig ueber das Quartal.' },
        { icon: 'diversity_3', title: 'Leiter-Team koordinieren', description: 'Lade dein Leiter-Team ein und verteilt die Verantwortung fuer einzelne Abende.' },
        { icon: 'event_note', title: 'Jahresprogramm', description: 'Erstelle mehrere Planer fuer verschiedene Stufen (Woelflinge, Jungpfadfinder, etc.).' },
      ]}
      faq={[
        { question: 'Kann ich mehrere Planer haben?', answer: 'Ja, du kannst beliebig viele Planer erstellen – z.B. einen pro Stufe oder einen fuer regulaere Gruppenstunden und einen fuer Specials.' },
        { question: 'Wer kann meinen Planer sehen?', answer: 'Nur du und eingeladene Mitarbeiter. Wenn der Planer an eine Gruppe gebunden ist, koennen alle Gruppen-Mitglieder ihn sehen.' },
        { question: 'Kann ich Termine verschieben?', answer: 'Termine haben einen festen woechentlichen Rhythmus. Du kannst aber einzelne Termine als ausfallend markieren und stattdessen eine Notiz mit dem Ersatztermin hinterlegen.' },
        { question: 'Muessen die Ideen aus der Datenbank kommen?', answer: 'Nein, du kannst auch einfach Freitext-Notizen eintragen, wenn du keine passende Idee in der Datenbank findest.' },
      ]}
      ctaLabel="Planer erstellen"
      ctaRoute="/session-planner/app"
      sandbox={<SessionPlannerSandbox />}
    />
  );
}
