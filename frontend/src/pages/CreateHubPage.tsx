import { Link } from 'react-router-dom';

const CONTENT_OPTIONS = [
  {
    to: '/create/session',
    icon: 'groups',
    label: 'Gruppenstunde',
    description:
      'Erstelle eine Aktivitaet, Andacht, Bastelarbeit oder Methode fuer die Gruppenstunde. Teile deine Idee mit anderen Leitern und lass dich inspirieren.',
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    border: 'hover:border-sky-300',
  },
  {
    to: '/create/game',
    icon: 'sports_esports',
    label: 'Spiel',
    description:
      'Gelaendespiel, Gruppenspiel, Kooperationsspiel oder Kennenlernspiel beschreiben. Mit Regeln, Spielerzahl, Dauer und benoetigtem Material.',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50',
    border: 'hover:border-emerald-300',
  },
  {
    to: '/create/blog',
    icon: 'article',
    label: 'Blog-Beitrag',
    description:
      'Wissen, Methoden, Erfahrungsberichte oder Tipps teilen. Perfekt fuer Leitungsrunden-Themen, paedagogische Impulse oder Lager-Berichte.',
    color: 'text-indigo-600',
    bg: 'bg-indigo-50',
    border: 'hover:border-indigo-300',
  },
] as const;

const TOOL_OPTIONS = [
  {
    to: '/events/app/new',
    icon: 'celebration',
    label: 'Aktion / Veranstaltung',
    description:
      'Lager, Hajk, Elternabend, Stammeslager oder andere Aktion planen. Mit Anmeldung, Teilnehmerverwaltung, Packliste und Kommunikation.',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'hover:border-violet-300',
  },
  {
    to: '/packing-lists/new',
    icon: 'checklist',
    label: 'Packliste',
    description:
      'Packliste fuer Lager, Hajk oder Wochenendaktion erstellen. Mit KI-Unterstuetzung, Kategorien und Teilen-Funktion.',
    color: 'text-amber-600',
    bg: 'bg-amber-50',
    border: 'hover:border-amber-300',
  },
  {
    to: '/session-planner/app',
    icon: 'calendar_month',
    label: 'Quartalsplan',
    description:
      'Gruppenstunden fuer ein ganzes Quartal planen. Themen, Verantwortliche und Termine im Ueberblick.',
    color: 'text-teal-600',
    bg: 'bg-teal-50',
    border: 'hover:border-teal-300',
  },
] as const;

function CreateCard({
  opt,
}: {
  opt: (typeof CONTENT_OPTIONS)[number] | (typeof TOOL_OPTIONS)[number];
}) {
  return (
    <Link
      to={opt.to}
      className={`flex items-start gap-4 p-5 rounded-xl border-2 border-border transition-all duration-200 hover:shadow-colorful hover:-translate-y-1 ${opt.border}`}
    >
      <div
        className={`flex items-center justify-center w-12 h-12 rounded-xl shrink-0 ${opt.bg}`}
      >
        <span className={`material-symbols-outlined text-[28px] ${opt.color}`}>
          {opt.icon}
        </span>
      </div>
      <div className="min-w-0">
        <span className="font-semibold text-sm">{opt.label}</span>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          {opt.description}
        </p>
      </div>
    </Link>
  );
}

export default function CreateHubPage() {
  return (
    <div className="container py-8 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl gradient-primary text-white">
          <span className="material-symbols-outlined text-[24px]">add_circle</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold">Erstellen</h1>
          <p className="text-sm text-muted-foreground">
            Was moechtest du erstellen? Waehle einen Inhaltstyp oder ein Planungstool.
          </p>
        </div>
      </div>

      {/* Content section */}
      <div className="mb-8">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">lightbulb</span>
          Inhalte
        </h2>
        <div className="grid grid-cols-1 gap-3">
          {CONTENT_OPTIONS.map((opt) => (
            <CreateCard key={opt.to} opt={opt} />
          ))}
        </div>
      </div>

      {/* Tools section */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px]">build</span>
          Planungstools
        </h2>
        <div className="grid grid-cols-1 gap-3">
          {TOOL_OPTIONS.map((opt) => (
            <CreateCard key={opt.to} opt={opt} />
          ))}
        </div>
      </div>
    </div>
  );
}
