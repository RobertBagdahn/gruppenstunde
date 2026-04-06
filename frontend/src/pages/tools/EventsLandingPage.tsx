import { useState } from 'react';
import ToolLandingPage from '@/components/ToolLandingPage';
import { TOOL_EVENTS } from '@/lib/toolColors';

/* ------------------------------------------------------------------ */
/*  Sandbox: Interactive Event Demo                                    */
/* ------------------------------------------------------------------ */
interface DemoEvent {
  id: number;
  title: string;
  date: string;
  location: string;
  participants: number;
  maxParticipants: number;
  type: string;
}

const DEMO_EVENTS: DemoEvent[] = [
  { id: 1, title: 'Sommerlager 2026', date: '2026-07-15', location: 'Pfadfinderzentrum Waldheim', participants: 23, maxParticipants: 30, type: 'Sommerlager' },
  { id: 2, title: 'Elternabend Fruehling', date: '2026-04-20', location: 'Gemeindehaus', participants: 12, maxParticipants: 40, type: 'Elternabend' },
  { id: 3, title: 'Hajk-Wochenende', date: '2026-05-10', location: 'Schwarzwald', participants: 8, maxParticipants: 15, type: 'Wochenende' },
];

function EventSandbox() {
  const [events, setEvents] = useState<DemoEvent[]>(DEMO_EVENTS);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const selected = events.find((e) => e.id === selectedId);

  function handleCreate() {
    if (!newTitle.trim()) return;
    const newEvent: DemoEvent = {
      id: Date.now(),
      title: newTitle.trim(),
      date: newDate || '2026-06-01',
      location: newLocation || 'Noch offen',
      participants: 0,
      maxParticipants: 20,
      type: 'Veranstaltung',
    };
    setEvents([newEvent, ...events]);
    setNewTitle('');
    setNewDate('');
    setNewLocation('');
    setShowCreate(false);
    setSelectedId(newEvent.id);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <span className="material-symbols-outlined text-violet-500 text-[20px] mt-0.5">info</span>
        <p className="text-sm text-violet-700">
          <strong>Sandbox-Modus:</strong> Erstelle und verwalte Demo-Events direkt hier.
          Deine Aenderungen werden nicht gespeichert – probier einfach alles aus!
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        {/* Event List */}
        <div className="w-full md:w-72 shrink-0 space-y-3">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-sm font-bold hover:opacity-90 transition shadow-md"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Neues Event
          </button>

          {showCreate && (
            <div className="border border-violet-200 rounded-xl p-3 bg-card space-y-2">
              <input
                type="text"
                placeholder="Event-Titel..."
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm bg-background focus:ring-2 focus:ring-violet-400 focus:outline-none"
                autoFocus
              />
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm bg-background"
              />
              <input
                type="text"
                placeholder="Ort..."
                value={newLocation}
                onChange={(e) => setNewLocation(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm bg-background"
              />
              <div className="flex gap-2">
                <button onClick={handleCreate} className="flex-1 px-3 py-2 bg-violet-500 text-white rounded-lg text-sm font-medium">Erstellen</button>
                <button onClick={() => setShowCreate(false)} className="px-3 py-2 border rounded-lg text-sm hover:bg-muted">Abbrechen</button>
              </div>
            </div>
          )}

          {events.map((ev) => (
            <div
              key={ev.id}
              onClick={() => setSelectedId(ev.id)}
              className={`rounded-xl p-3 cursor-pointer transition-all border ${
                selectedId === ev.id
                  ? 'bg-violet-500 text-white border-violet-500 shadow-md'
                  : 'bg-card border-border/60 hover:shadow-md hover:border-violet-200'
              }`}
            >
              <div className="text-sm font-bold truncate">{ev.title}</div>
              <div className={`text-xs mt-1 ${selectedId === ev.id ? 'text-white/70' : 'text-muted-foreground'}`}>
                {new Date(ev.date).toLocaleDateString('de-DE')} · {ev.location}
              </div>
              <div className={`text-xs mt-1 ${selectedId === ev.id ? 'text-white/70' : 'text-muted-foreground'}`}>
                {ev.participants}/{ev.maxParticipants} Teilnehmer
              </div>
            </div>
          ))}
        </div>

        {/* Event Detail */}
        <div className="flex-1 min-w-0">
          {selected ? (
            <div className="rounded-2xl border border-border/60 bg-card p-6 shadow-soft">
              <div className="flex items-center gap-3 mb-4">
                <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md">
                  <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>celebration</span>
                </div>
                <div>
                  <h3 className="text-xl font-extrabold">{selected.title}</h3>
                  <span className="text-xs px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full font-semibold">{selected.type}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-[18px] text-muted-foreground">calendar_today</span>
                  {new Date(selected.date).toLocaleDateString('de-DE', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-[18px] text-muted-foreground">location_on</span>
                  {selected.location}
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-[18px] text-muted-foreground">group</span>
                  {selected.participants} / {selected.maxParticipants} Teilnehmer
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="material-symbols-outlined text-[18px] text-muted-foreground">event</span>
                  {selected.type}
                </div>
              </div>

              <div className="h-2 bg-violet-100 rounded-full overflow-hidden mb-2">
                <div
                  className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all"
                  style={{ width: `${(selected.participants / selected.maxParticipants) * 100}%` }}
                />
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                {selected.maxParticipants - selected.participants} Plaetze frei
              </p>

              <button
                onClick={() => {
                  setEvents(events.map((e) =>
                    e.id === selected.id
                      ? { ...e, participants: Math.min(e.participants + 1, e.maxParticipants) }
                      : e
                  ));
                }}
                disabled={selected.participants >= selected.maxParticipants}
                className="w-full px-4 py-2.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-sm font-bold hover:opacity-90 transition disabled:opacity-50 shadow-md"
              >
                <span className="material-symbols-outlined text-[18px] mr-1 align-middle">person_add</span>
                Anmelden (Demo)
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground rounded-2xl border border-dashed border-violet-200 bg-violet-50/30">
              <span className="material-symbols-outlined text-[48px] mb-3 text-violet-300">celebration</span>
              <p className="font-medium">Waehle ein Event aus der Liste</p>
              <p className="text-sm mt-1">oder erstelle ein neues Demo-Event</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function EventsLandingPage() {
  return (
    <ToolLandingPage
      tool={TOOL_EVENTS}
      subtitle="Plane Sommerlager, Elternabende, Hajk-Wochenenden und Aktionen – mit Teilnehmerverwaltung, Buchungsoptionen und Gruppeneinladungen."
      longDescription="Der Veranstaltungsmanager hilft dir, alle Arten von Pfadfinder-Events zu organisieren. Von der Einladung ueber die Buchung bis zur Teilnehmerliste: Alles an einem Ort. Lade ganze Gruppen ein, erstelle Buchungsoptionen mit unterschiedlichen Preisen, verwalte Teilnehmer mit Allergien und Kontaktdaten, und behalte jederzeit den Ueberblick."
      features={[
        { icon: 'event', title: 'Event erstellen', description: 'Erstelle Veranstaltungen mit Titel, Datum, Ort, Beschreibung und Buchungsoptionen in wenigen Minuten.' },
        { icon: 'group_add', title: 'Teilnehmerverwaltung', description: 'Verwalte Anmeldungen, tracke Bezahlstatus und exportiere Teilnehmerlisten fuer die Planung.' },
        { icon: 'payments', title: 'Buchungsoptionen', description: 'Biete verschiedene Buchungsoptionen an – z.B. Fruehbucher, Tagesgast oder Vollpension mit unterschiedlichen Preisen.' },
        { icon: 'mail', title: 'Gruppen einladen', description: 'Lade ganze Pfadfinder-Gruppen oder einzelne Benutzer per Einladung zu deinem Event ein.' },
        { icon: 'location_on', title: 'Standortverwaltung', description: 'Speichere und verwalte Veranstaltungsorte mit Adresse und Beschreibung fuer spaetere Wiederverwendung.' },
        { icon: 'family_restroom', title: 'Personen & Allergien', description: 'Verknuepfe Teilnehmer mit Personen-Profilen inkl. Ernaehrungshinweisen und Allergien.' },
      ]}
      examples={[
        { icon: 'camping', title: 'Sommerlager planen', description: 'Erstelle ein mehrtaegiges Lager mit Buchungsoptionen fuer verschiedene Altersgruppen und automatischer Teilnehmerliste.' },
        { icon: 'groups', title: 'Elternabend organisieren', description: 'Lade alle Eltern deiner Gruppe ein, tracke Zu- und Absagen und teile den Ablaufplan.' },
        { icon: 'hiking', title: 'Hajk-Wochenende', description: 'Plane ein Wander-Wochenende mit begrenzter Teilnehmerzahl und verschiedenen Routen-Optionen.' },
      ]}
      faq={[
        { question: 'Brauche ich einen Account, um Events zu sehen?', answer: 'Nein! Alle oeffentlichen Events koennen ohne Anmeldung angezeigt werden. Zum Erstellen und Verwalten von Events brauchst du ein kostenloses Konto.' },
        { question: 'Kann ich ein Event nur fuer meine Gruppe sichtbar machen?', answer: 'Ja, du kannst Events auf bestimmte Gruppen beschraenken und gezielt Einladungen versenden.' },
        { question: 'Wie funktionieren Buchungsoptionen?', answer: 'Du kannst verschiedene Buchungsoptionen mit unterschiedlichen Preisen und maximalen Teilnehmerzahlen erstellen. Teilnehmer waehlen bei der Anmeldung ihre gewuenschte Option.' },
        { question: 'Kann ich Teilnehmerlisten exportieren?', answer: 'Ja, du kannst Teilnehmerlisten als Text exportieren oder direkt in der App verwalten.' },
      ]}
      ctaLabel="Event erstellen"
      ctaRoute="/events/app/new"
      sandbox={<EventSandbox />}
    />
  );
}
