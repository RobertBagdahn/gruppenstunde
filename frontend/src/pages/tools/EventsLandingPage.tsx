import { useState } from 'react';
import ToolLandingPage from '@/components/ToolLandingPage';
import { TOOL_EVENTS } from '@/lib/toolColors';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Walkthrough Section                                                */
/* ------------------------------------------------------------------ */

const WALKTHROUGH_STEPS = [
  {
    number: 1,
    title: 'Event erstellen',
    description: 'Lege Name, Datum, Ort und Buchungsoptionen fest.',
    icon: 'add_circle',
  },
  {
    number: 2,
    title: 'Teilnehmer einladen',
    description: 'Lade Gruppen oder einzelne Personen zu deinem Event ein.',
    icon: 'group_add',
  },
  {
    number: 3,
    title: 'Anmeldungen verwalten',
    description: 'Behalte den Ueberblick ueber Teilnehmer, Labels und benutzerdefinierte Felder.',
    icon: 'how_to_reg',
  },
  {
    number: 4,
    title: 'Zahlungen tracken',
    description: 'Erfasse Zahlungen per Bar, PayPal oder Ueberweisung und behalte den Ueberblick.',
    icon: 'payments',
  },
  {
    number: 5,
    title: 'Kommunizieren',
    description: 'Sende Rundmails an alle oder ausgewaehlte Teilnehmer mit Platzhaltern.',
    icon: 'mail',
  },
  {
    number: 6,
    title: 'Auswerten',
    description: 'Nutze Statistiken, exportiere Daten als Excel/CSV/PDF und verfolge die Timeline.',
    icon: 'insights',
  },
] as const;

function WalkthroughSection() {
  return (
    <div className="py-12">
      <h2 className="text-2xl font-bold text-center mb-2">So funktioniert es</h2>
      <p className="text-muted-foreground text-center mb-8 max-w-xl mx-auto">
        Von der Erstellung bis zur Auswertung – in sechs einfachen Schritten.
      </p>

      {/* Mobile: vertical timeline */}
      <div className="max-w-2xl mx-auto space-y-4 sm:hidden">
        {WALKTHROUGH_STEPS.map((step) => (
          <div key={step.number} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center text-sm font-bold shrink-0">
                {step.number}
              </div>
              {step.number < WALKTHROUGH_STEPS.length && (
                <div className="w-0.5 flex-1 bg-violet-200 mt-1" />
              )}
            </div>
            <div className="pb-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="material-symbols-outlined text-[18px] text-violet-600">
                  {step.icon}
                </span>
                <h3 className="font-semibold text-sm">{step.title}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{step.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Desktop: horizontal grid */}
      <div className="hidden sm:grid sm:grid-cols-3 gap-6 max-w-4xl mx-auto">
        {WALKTHROUGH_STEPS.map((step) => (
          <div key={step.number} className="text-center">
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center text-lg font-bold mx-auto mb-3">
              {step.number}
            </div>
            <div className="flex items-center justify-center gap-1.5 mb-1">
              <span className="material-symbols-outlined text-[18px] text-violet-600">
                {step.icon}
              </span>
              <h3 className="font-semibold text-sm">{step.title}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{step.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sandbox: Interactive Event Demo                                    */
/* ------------------------------------------------------------------ */
interface DemoParticipant {
  id: number;
  name: string;
  email: string;
  isPaid: boolean;
  booking: string;
}

interface DemoEvent {
  id: number;
  title: string;
  date: string;
  location: string;
  participants: DemoParticipant[];
  maxParticipants: number;
  type: string;
}

const DEMO_PARTICIPANTS: DemoParticipant[] = [
  { id: 1, name: 'Max Mustermann', email: 'max@example.com', isPaid: true, booking: 'Ganzes Wochenende' },
  { id: 2, name: 'Lisa Schmidt', email: 'lisa@example.com', isPaid: true, booking: 'Ganzes Wochenende' },
  { id: 3, name: 'Tim Bauer', email: 'tim@example.com', isPaid: false, booking: 'Tagesgast' },
  { id: 4, name: 'Anna Fuchs', email: 'anna@example.com', isPaid: false, booking: 'Ganzes Wochenende' },
];

const DEMO_EVENTS: DemoEvent[] = [
  { id: 1, title: 'Sommerlager 2026', date: '2026-07-15', location: 'Pfadfinderzentrum Waldheim', participants: [...DEMO_PARTICIPANTS], maxParticipants: 30, type: 'Sommerlager' },
  { id: 2, title: 'Elternabend Fruehling', date: '2026-04-20', location: 'Gemeindehaus', participants: DEMO_PARTICIPANTS.slice(0, 2), maxParticipants: 40, type: 'Elternabend' },
  { id: 3, title: 'Hajk-Wochenende', date: '2026-05-10', location: 'Schwarzwald', participants: DEMO_PARTICIPANTS.slice(0, 3), maxParticipants: 15, type: 'Wochenende' },
];

type SandboxTab = 'overview' | 'participants' | 'stats';

function EventSandbox() {
  const [events, setEvents] = useState<DemoEvent[]>(DEMO_EVENTS);
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState('');
  const [newLocation, setNewLocation] = useState('');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<SandboxTab>('overview');

  const selected = events.find((e) => e.id === selectedId);

  function handleCreate() {
    if (!newTitle.trim()) return;
    const newEvent: DemoEvent = {
      id: Date.now(),
      title: newTitle.trim(),
      date: newDate || '2026-06-01',
      location: newLocation || 'Noch offen',
      participants: [],
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
          Erkunde Teilnehmer, Statistiken und mehr – ohne Anmeldung!
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
              onClick={() => { setSelectedId(ev.id); setActiveTab('overview'); }}
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
                {ev.participants.length}/{ev.maxParticipants} Teilnehmer
              </div>
            </div>
          ))}
        </div>

        {/* Event Detail */}
        <div className="flex-1 min-w-0">
          {selected ? (
            <div className="rounded-2xl border border-border/60 bg-card shadow-soft">
              {/* Header */}
              <div className="p-4 sm:p-6 border-b">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md shrink-0">
                    <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>celebration</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold">{selected.title}</h3>
                    <span className="text-xs px-2 py-0.5 bg-violet-100 text-violet-700 rounded-full font-semibold">{selected.type}</span>
                  </div>
                </div>

                {/* Tab navigation */}
                <div className="flex gap-0 border-b -mb-[1px]">
                  {([
                    { key: 'overview' as const, label: 'Uebersicht', icon: 'dashboard' },
                    { key: 'participants' as const, label: 'Teilnehmer', icon: 'group' },
                    { key: 'stats' as const, label: 'Statistiken', icon: 'insights' },
                  ]).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={cn(
                        'flex items-center gap-1 px-3 py-2 text-xs font-medium border-b-2 transition-colors',
                        activeTab === tab.key
                          ? 'border-violet-500 text-violet-700'
                          : 'border-transparent text-muted-foreground hover:text-foreground',
                      )}
                    >
                      <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              <div className="p-4 sm:p-6">
                {activeTab === 'overview' && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <span className="material-symbols-outlined text-[18px] text-muted-foreground">calendar_today</span>
                        {new Date(selected.date).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <span className="material-symbols-outlined text-[18px] text-muted-foreground">location_on</span>
                        {selected.location}
                      </div>
                    </div>

                    {/* KPI Cards */}
                    <div className="grid grid-cols-3 gap-3">
                      <div className="rounded-xl border p-3 text-center">
                        <p className="text-lg font-bold text-violet-700">{selected.participants.length}</p>
                        <p className="text-xs text-muted-foreground">Teilnehmer</p>
                      </div>
                      <div className="rounded-xl border p-3 text-center">
                        <p className="text-lg font-bold text-emerald-700">
                          {selected.participants.filter((p) => p.isPaid).length}
                        </p>
                        <p className="text-xs text-muted-foreground">Bezahlt</p>
                      </div>
                      <div className="rounded-xl border p-3 text-center">
                        <p className="text-lg font-bold text-amber-700">
                          {selected.maxParticipants - selected.participants.length}
                        </p>
                        <p className="text-xs text-muted-foreground">Frei</p>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div>
                      <div className="h-2 bg-violet-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-violet-500 to-purple-600 rounded-full transition-all"
                          style={{ width: `${(selected.participants.length / selected.maxParticipants) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {Math.round((selected.participants.length / selected.maxParticipants) * 100)}% belegt
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        if (selected.participants.length < selected.maxParticipants) {
                          const newP: DemoParticipant = {
                            id: Date.now(),
                            name: `Demo Teilnehmer ${selected.participants.length + 1}`,
                            email: `demo${selected.participants.length + 1}@example.com`,
                            isPaid: false,
                            booking: 'Ganzes Wochenende',
                          };
                          setEvents(events.map((e) =>
                            e.id === selected.id ? { ...e, participants: [...e.participants, newP] } : e,
                          ));
                        }
                      }}
                      disabled={selected.participants.length >= selected.maxParticipants}
                      className="w-full px-4 py-2 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl text-sm font-bold hover:opacity-90 transition disabled:opacity-50 shadow-md"
                    >
                      <span className="material-symbols-outlined text-[18px] mr-1 align-middle">person_add</span>
                      Anmelden (Demo)
                    </button>
                  </div>
                )}

                {activeTab === 'participants' && (
                  <div className="space-y-2">
                    {selected.participants.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">
                        Noch keine Teilnehmer angemeldet
                      </p>
                    ) : (
                      selected.participants.map((p) => (
                        <div key={p.id} className="flex items-center gap-3 p-2 rounded-lg border text-sm">
                          <div className="w-8 h-8 rounded-full bg-violet-100 text-violet-700 flex items-center justify-center text-xs font-semibold shrink-0">
                            {p.name.split(' ').map((n) => n[0]).join('')}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground">{p.booking}</p>
                          </div>
                          <span className={cn(
                            'text-xs px-2 py-0.5 rounded-full font-medium',
                            p.isPaid ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
                          )}>
                            {p.isPaid ? 'Bezahlt' : 'Offen'}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {activeTab === 'stats' && (
                  <div className="space-y-4">
                    {/* Payment Stats */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Zahlungsstatus</p>
                      <div className="flex h-4 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500"
                          style={{ width: `${selected.participants.length > 0 ? (selected.participants.filter((p) => p.isPaid).length / selected.participants.length) * 100 : 0}%` }}
                        />
                        <div
                          className="bg-amber-400"
                          style={{ width: `${selected.participants.length > 0 ? (selected.participants.filter((p) => !p.isPaid).length / selected.participants.length) * 100 : 0}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-muted-foreground mt-1">
                        <span>{selected.participants.filter((p) => p.isPaid).length} bezahlt</span>
                        <span>{selected.participants.filter((p) => !p.isPaid).length} offen</span>
                      </div>
                    </div>

                    {/* Booking distribution */}
                    <div>
                      <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Buchungsoptionen</p>
                      {Object.entries(
                        selected.participants.reduce<Record<string, number>>((acc, p) => {
                          acc[p.booking] = (acc[p.booking] || 0) + 1;
                          return acc;
                        }, {}),
                      ).map(([booking, count]) => (
                        <div key={booking} className="flex justify-between text-sm py-1">
                          <span>{booking}</span>
                          <span className="text-muted-foreground">{count} Teilnehmer</span>
                        </div>
                      ))}
                    </div>

                    {selected.participants.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Noch keine Daten vorhanden
                      </p>
                    )}
                  </div>
                )}
              </div>
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
      subtitle="Plane Sommerlager, Elternabende, Hajk-Wochenenden und Aktionen – mit Teilnehmerverwaltung, Zahlungstracking, Statistiken und Rundmails."
      longDescription="Der Veranstaltungsmanager hilft dir, alle Arten von Pfadfinder-Events zu organisieren. Von der Einladung ueber die Buchung bis zur Auswertung: Alles an einem Ort. Verwalte Teilnehmer mit Labels und benutzerdefinierten Feldern, tracke Zahlungen, sende Rundmails und exportiere deine Daten als Excel, CSV oder PDF."
      features={[
        { icon: 'event', title: 'Event erstellen', description: 'Erstelle Veranstaltungen mit Titel, Datum, Ort, Beschreibung und Buchungsoptionen in wenigen Minuten.' },
        { icon: 'group_add', title: 'Teilnehmerverwaltung', description: 'Verwalte Anmeldungen mit Labels, benutzerdefinierten Feldern, Filtern und Suchfunktion.' },
        { icon: 'payments', title: 'Zahlungstracking', description: 'Erfasse Zahlungen per Bar, PayPal oder Ueberweisung. Sieh auf einen Blick, wer schon bezahlt hat.' },
        { icon: 'mail', title: 'Rundmails', description: 'Sende E-Mails an alle, gefilterte oder ausgewaehlte Teilnehmer – mit automatischen Platzhaltern fuer persoenliche Ansprache.' },
        { icon: 'download', title: 'Export & Statistiken', description: 'Exportiere Teilnehmerlisten als Excel, CSV oder PDF. Nutze Statistiken zu Kapazitaet, Zahlungen und Demografie.' },
        { icon: 'timeline', title: 'Aktivitaets-Timeline', description: 'Verfolge alle Aenderungen an deinem Event in einer chronologischen Timeline – Anmeldungen, Zahlungen, E-Mails.' },
        { icon: 'label', title: 'Labels & Custom Fields', description: 'Ordne Teilnehmern Labels zu und erfasse beliebige Zusatzdaten mit benutzerdefinierten Feldern.' },
        { icon: 'group', title: 'Gruppen einladen', description: 'Lade ganze Pfadfinder-Gruppen oder einzelne Benutzer per Einladung zu deinem Event ein.' },
        { icon: 'location_on', title: 'Standortverwaltung', description: 'Speichere und verwalte Veranstaltungsorte mit Adresse und Beschreibung fuer spaetere Wiederverwendung.' },
      ]}
      examples={[
        { icon: 'camping', title: 'Sommerlager planen', description: 'Erstelle ein mehrtaegiges Lager mit Buchungsoptionen, tracke Zahlungen, sende Rundmails und exportiere die Teilnehmerliste.' },
        { icon: 'groups', title: 'Elternabend organisieren', description: 'Lade alle Eltern deiner Gruppe ein, tracke Zu- und Absagen, und sende automatische Erinnerungen.' },
        { icon: 'hiking', title: 'Hajk-Wochenende', description: 'Plane ein Wander-Wochenende mit begrenzter Teilnehmerzahl, benutzerdefinierten Feldern fuer Ausruestung und Ernaehrung.' },
      ]}
      faq={[
        { question: 'Brauche ich einen Account, um Events zu sehen?', answer: 'Nein! Alle oeffentlichen Events koennen ohne Anmeldung angezeigt werden. Zum Erstellen und Verwalten von Events brauchst du ein kostenloses Konto.' },
        { question: 'Kann ich ein Event nur fuer meine Gruppe sichtbar machen?', answer: 'Ja, du kannst Events auf bestimmte Gruppen beschraenken und gezielt Einladungen versenden.' },
        { question: 'Wie funktionieren Buchungsoptionen?', answer: 'Du kannst verschiedene Buchungsoptionen mit unterschiedlichen Preisen und maximalen Teilnehmerzahlen erstellen. Teilnehmer waehlen bei der Anmeldung ihre gewuenschte Option.' },
        { question: 'Kann ich Teilnehmerlisten exportieren?', answer: 'Ja! Du kannst Teilnehmerlisten als Excel, CSV oder PDF exportieren. Waehle dabei die gewuenschten Spalten und wende Filter an.' },
        { question: 'Kann ich Rundmails an Teilnehmer senden?', answer: 'Ja! Du kannst E-Mails an alle, gefilterte oder manuell ausgewaehlte Teilnehmer senden. Platzhalter wie {vorname} und {event_name} werden automatisch ersetzt.' },
        { question: 'Welche Statistiken gibt es?', answer: 'Du siehst Kapazitaets-Auslastung, Zahlungsstatus, Demografie (Geschlecht, Alter), Ernaehrungshinweise und den Anmeldeverlauf ueber die Zeit.' },
      ]}
      ctaLabel="Event erstellen"
      ctaRoute="/events/app/new"
      sandbox={<EventSandbox />}
    >
      <WalkthroughSection />
    </ToolLandingPage>
  );
}
