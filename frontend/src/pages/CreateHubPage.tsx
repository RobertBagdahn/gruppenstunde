import { Link } from 'react-router-dom';

const CREATE_OPTIONS = [
  {
    to: '/create/idea',
    icon: 'lightbulb',
    label: 'Idee erstellen',
    description: 'Eine Aktivität oder Spielidee für die Gruppenstunde',
    color: 'text-sky-600',
    bg: 'bg-sky-50',
    border: 'hover:border-sky-300',
  },
  {
    to: '/recipes/new',
    icon: 'menu_book',
    label: 'Rezept erstellen',
    description: 'Koch- oder Backrezept für Lager und Gruppenstunde',
    color: 'text-rose-600',
    bg: 'bg-rose-50',
    border: 'hover:border-rose-300',
  },
  {
    to: '/create/knowledge',
    icon: 'menu_book',
    label: 'Wissensbeitrag erstellen',
    description: 'Wissen, Methoden oder Hintergrundinformationen teilen',
    color: 'text-blue-500',
    bg: 'bg-blue-50',
    border: 'hover:border-blue-300',
  },
  {
    to: '/events/app/new',
    icon: 'celebration',
    label: 'Event erstellen',
    description: 'Ein neues Event für deine Gruppe planen',
    color: 'text-violet-600',
    bg: 'bg-violet-50',
    border: 'hover:border-violet-300',
  },
] as const;

export default function CreateHubPage() {
  return (
    <div className="container py-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="flex items-center justify-center w-12 h-12 rounded-xl gradient-primary text-white">
          <span className="material-symbols-outlined text-[24px]">add_circle</span>
        </div>
        <div>
          <h1 className="text-2xl font-bold">Erstellen</h1>
          <p className="text-sm text-muted-foreground">Was möchtest du erstellen?</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {CREATE_OPTIONS.map((opt) => (
          <Link
            key={opt.to}
            to={opt.to}
            className={`flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border transition-all text-center hover:shadow-md ${opt.border}`}
          >
            <div className={`flex items-center justify-center w-16 h-16 rounded-2xl ${opt.bg}`}>
              <span className={`material-symbols-outlined text-[36px] ${opt.color}`}>
                {opt.icon}
              </span>
            </div>
            <span className="font-semibold">{opt.label}</span>
            <span className="text-xs text-muted-foreground">{opt.description}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
