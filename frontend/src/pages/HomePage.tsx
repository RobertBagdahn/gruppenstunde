import { Link } from 'react-router-dom';
import { useIdeas, useIdeaOfTheWeek } from '@/api/ideas';
import { useIdeaStore } from '@/store/useIdeaStore';
import IdeaCard from '@/components/IdeaCard';
import SearchBar from '@/components/SearchBar';
import ErrorDisplay from '@/components/ErrorDisplay';
import {
  TOOL_IDEA,
  TOOL_EVENTS,
  TOOL_MEAL_PLAN,
  TOOL_SESSION_PLANNER,
  TOOL_PACKING_LISTS,
  TOOL_RECIPES,
} from '@/lib/toolColors';

const CATEGORIES = [
  { icon: 'sports_soccer', label: 'Sport & Spiel', color: 'from-sky-500 to-cyan-600', img: '/images/inspi_baby_scout.png' },
  { icon: 'music_note', label: 'Musik & Kreativ', color: 'from-slate-500 to-sky-600', img: '/images/inspi_baby_music.png' },
  { icon: 'local_fire_department', label: 'Lagerfeuer', color: 'from-amber-400 to-yellow-500', img: '/images/inspi_cook.png' },
  { icon: 'nature', label: 'Natur & Outdoor', color: 'from-cyan-500 to-sky-500', img: '/images/inspi_garden.png' },
  { icon: 'menu_book', label: 'Geschichten', color: 'from-yellow-400 to-amber-500', img: '/images/inspi_baby_book.png' },
  { icon: 'palette', label: 'Basteln', color: 'from-stone-400 to-slate-500', img: '/images/inspi_baby_painting.png' },
  { icon: 'rocket_launch', label: 'Abenteuer', color: 'from-sky-600 to-blue-700', img: '/images/inspi_baby_space.png' },
  { icon: 'cookie', label: 'Kochen & Backen', color: 'from-yellow-500 to-amber-600', img: '/images/inspi_baby_cookie.png' },
];

const FUN_FACTS = [
  { icon: 'lightbulb', value: '500+', label: 'Ideen', color: 'text-yellow-500' },
  { icon: 'groups', value: '1.200+', label: 'Pfadfinder', color: 'text-primary' },
  { icon: 'favorite', value: '3.400+', label: 'Likes', color: 'text-rose-500' },
  { icon: 'star', value: '98%', label: 'Happy Scouts', color: 'text-amber-500' },
];

const PLATFORM_MODULES = [
  {
    title: 'Gruppenstunden-Ideen',
    desc: 'Fertige Ideen mit Material-Listen, Zeitangaben und Schritt-für-Schritt-Anleitungen für deine nächste Gruppenstunde.',
    img: '/images/inspi_scout.webp',
    gradient: TOOL_IDEA.gradient,
    icon: TOOL_IDEA.icon,
    link: '/search?type=idea',
    features: ['Material-Listen', 'Schwierigkeitsgrade', 'Altersgruppen'],
  },
  {
    title: 'Wissensbeiträge',
    desc: 'Ausführliche Artikel rund um Pfadfinder-Themen, Methodik, Pädagogik und Gruppenführung.',
    img: '/images/inspi_reading.png',
    gradient: 'from-slate-500 to-sky-600',
    icon: 'menu_book',
    link: '/search?type=knowledge',
    features: ['Fachartikel', 'Methodik', 'Best Practices'],
  },
  {
    title: TOOL_RECIPES.label,
    desc: 'Leckere Koch- und Back-Rezepte mit Nährwerten, Nutri-Score und automatischer Portionsberechnung.',
    img: TOOL_RECIPES.mascotImg ?? '/images/inspi_cook.png',
    gradient: TOOL_RECIPES.gradient,
    icon: TOOL_RECIPES.icon,
    link: TOOL_RECIPES.basePath,
    features: ['Nutri-Score', 'Portionsrechner', 'Allergene'],
  },
  {
    title: TOOL_EVENTS.label,
    desc: 'Lager, Elternabende und Aktionen planen – mit Teilnehmerverwaltung, Buchungsoptionen und Einladungen.',
    img: TOOL_EVENTS.mascotImg ?? '/images/inspi_baby_party.png',
    gradient: TOOL_EVENTS.gradient,
    icon: TOOL_EVENTS.icon,
    link: TOOL_EVENTS.basePath,
    features: ['Teilnehmerverwaltung', 'Buchungen', 'Einladungen'],
  },
];

const PLANNING_TOOLS = [
  {
    title: TOOL_SESSION_PLANNER.label,
    desc: 'Plane wöchentliche Gruppenstunden mit festem Wochentag und Uhrzeit. Weise jeder Sitzung eine Idee zu und arbeite mit deinem Team zusammen.',
    icon: TOOL_SESSION_PLANNER.icon,
    gradient: TOOL_SESSION_PLANNER.gradient,
    link: TOOL_SESSION_PLANNER.basePath,
    highlights: [
      { icon: 'schedule', text: 'Wöchentlicher Rhythmus mit fester Uhrzeit' },
      { icon: 'group_add', text: 'Kollaboratives Planen mit mehreren Leitern' },
      { icon: 'lightbulb', text: 'Ideen direkt aus der Datenbank zuweisen' },
      { icon: 'event_busy', text: 'Einzelne Termine als "ausfallend" markieren' },
    ],
  },
  {
    title: TOOL_MEAL_PLAN.label,
    desc: 'Plane Mahlzeiten für mehrere Tage – mit automatischer Einkaufsliste, Nährwert-Analyse und Portionsberechnung nach Alter und Aktivität.',
    icon: TOOL_MEAL_PLAN.icon,
    gradient: TOOL_MEAL_PLAN.gradient,
    link: TOOL_MEAL_PLAN.basePath,
    highlights: [
      { icon: 'shopping_cart', text: 'Automatische Einkaufsliste nach Supermarkt-Abteilung' },
      { icon: 'monitoring', text: 'Nährwert-Analyse & Nutri-Score für jede Mahlzeit' },
      { icon: 'calculate', text: 'Portionsberechnung nach Alter & Aktivitätsfaktor' },
      { icon: 'savings', text: 'Preiskalkulation vom Rezept bis zum Gesamtplan' },
    ],
  },
  {
    title: TOOL_PACKING_LISTS.label,
    desc: 'Erstelle Packlisten für Hajk, Sommerlager oder Wochenend-Aktionen. Nutze Vorlagen und tracke den Fortschritt mit Abhak-Funktion.',
    icon: TOOL_PACKING_LISTS.icon,
    gradient: TOOL_PACKING_LISTS.gradient,
    link: TOOL_PACKING_LISTS.basePath,
    highlights: [
      { icon: 'content_copy', text: 'Vorlagen klonen für schnellen Start' },
      { icon: 'check_circle', text: 'Items abhaken und Fortschritt tracken' },
      { icon: 'category', text: 'Kategorien für übersichtliche Organisation' },
      { icon: 'ios_share', text: 'Listen exportieren und teilen' },
    ],
  },
];

const AI_FEATURES = [
  {
    icon: 'auto_fix_high',
    title: 'Texte verbessern',
    desc: 'KI optimiert deine Beschreibungen, macht sie klarer und ansprechender.',
  },
  {
    icon: 'sell',
    title: 'Auto-Tagging',
    desc: 'Automatische Kategorie-Vorschläge basierend auf dem Inhalt deiner Idee.',
  },
  {
    icon: 'transform',
    title: 'Refurbish',
    desc: 'Verwandle einen Freitext in eine strukturierte Idee – die KI macht den Rest.',
  },
  {
    icon: 'search_insights',
    title: 'Ähnliche Ideen',
    desc: 'Finde verwandte Inhalte durch semantische Suche mit Embeddings.',
  },
  {
    icon: 'nutrition',
    title: 'Zutaten-Assistent',
    desc: 'KI-Vorschläge für Nährwerte, Allergene und physikalische Eigenschaften von Zutaten.',
  },
  {
    icon: 'quick_phrases',
    title: 'Hybrid-Suche',
    desc: 'Volltextsuche + Vektor-Ähnlichkeit + Filter ergeben immer die besten Ergebnisse.',
  },
];

export default function HomePage() {
  const { filters } = useIdeaStore();
  const { data, isLoading, error, refetch } = useIdeas({ ...filters, page_size: 12 });
  const { data: ideaOfTheWeek } = useIdeaOfTheWeek();

  return (
    <div>
      {/* Hero Section */}
      <section className="relative gradient-hero text-white py-16 md:py-24 overflow-hidden">
        <img
          src="/images/inspi_pirat.png"
          alt=""
          aria-hidden="true"
          className="hidden lg:block absolute -left-6 bottom-8 w-36 opacity-30 float-bounce-slow pointer-events-none select-none"
        />
        <img
          src="/images/inspi_rover.png"
          alt=""
          aria-hidden="true"
          className="hidden lg:block absolute -right-4 top-12 w-32 opacity-25 float-bounce-delay pointer-events-none select-none"
        />
        <div className="absolute inset-0 bg-dots-pattern opacity-[0.04] pointer-events-none" />

        <div className="container relative text-center">
          <img
            src="/images/inspi_baby_suche.png"
            alt="Inspi Baby Suche"
            className="mx-auto w-48 md:w-72 mb-6 drop-shadow-2xl float-bounce"
          />
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold tracking-tight">
            Die Plattform für{' '}
            <span className="text-accent drop-shadow-sm">Pfadfinder</span>
            <span className="inline-block ml-2 text-4xl md:text-5xl lg:text-7xl">🚀</span>
          </h1>
          <p className="mt-4 text-lg md:text-xl text-white/90 max-w-3xl mx-auto font-medium">
            Ideen, Rezepte, Essenspläne, Events, Packlisten & mehr –
            alles was du als Gruppenführer brauchst, an einem Ort. ✨
          </p>
          <div className="mt-8 max-w-2xl mx-auto">
            <SearchBar variant="hero" />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/create"
              className="flex items-center gap-2 px-6 py-3 bg-white/12 backdrop-blur-sm border border-white/20 text-white rounded-full text-sm font-bold hover:bg-white/18 hover:scale-105 transition-all pulse-glow"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              Inhalt erstellen
            </Link>
            <Link
              to="/search"
              className="flex items-center gap-2 px-6 py-3 bg-accent text-accent-foreground rounded-full text-sm font-bold hover:bg-[hsl(46,86%,61%)] hover:scale-105 transition-all shadow-warm-glow"
            >
              <span className="material-symbols-outlined text-[20px]">explore</span>
              Alle Ideen entdecken
            </Link>
            <Link
              to="/my-dashboard"
              className="flex items-center gap-2 px-6 py-3 bg-white/12 backdrop-blur-sm border border-white/20 text-white rounded-full text-sm font-bold hover:bg-white/18 hover:scale-105 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">dashboard</span>
              Mein Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Module Overview */}
      <section className="container py-12 md:py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-primary text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>apps</span>
            Entdecke unsere Module
            <span className="text-2xl">🌈</span>
          </h2>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
            Vier Content-Bereiche – eine Plattform. Ideen, Wissen, Rezepte und Events für deine Pfadfinder-Arbeit.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
          {PLATFORM_MODULES.map((mod) => (
            <Link
              key={mod.title}
              to={mod.link}
              className="group relative flex flex-col sm:flex-row items-center gap-5 p-6 md:p-8 rounded-2xl border border-border/60 shadow-soft hover:shadow-colorful hover:-translate-y-2 transition-all duration-300 overflow-hidden bg-card"
            >
              <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gradient-to-br ${mod.gradient} opacity-15 blur-3xl group-hover:opacity-30 transition-opacity duration-300`} />
              <div className={`absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-gradient-to-br ${mod.gradient} opacity-10 blur-2xl group-hover:opacity-20 transition-opacity duration-300`} />
              <img
                src={mod.img}
                alt={mod.title}
                className="relative w-28 h-28 md:w-36 md:h-36 object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-300 shrink-0"
              />
              <div className="relative text-center sm:text-left">
                <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
                  <div className={`flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br ${mod.gradient} text-white shadow-md`}>
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{mod.icon}</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-extrabold">{mod.title}</h3>
                </div>
                <p className="text-muted-foreground text-sm md:text-base">{mod.desc}</p>
                <div className="flex flex-wrap gap-1.5 mt-3 justify-center sm:justify-start">
                  {mod.features.map((f) => (
                    <span key={f} className="px-2.5 py-0.5 rounded-full bg-muted text-xs font-semibold text-muted-foreground">{f}</span>
                  ))}
                </div>
                <span className={`inline-flex items-center gap-1 mt-3 text-sm font-bold bg-gradient-to-r ${mod.gradient} bg-clip-text text-transparent group-hover:gap-2 transition-all`}>
                  Entdecken
                  <span className="material-symbols-outlined text-[18px] text-primary">arrow_forward</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Planning Tools Section */}
      <section className="panel-muted py-12 md:py-16">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-primary text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>build</span>
              Planungs-Tools
              <span className="text-2xl">🛠️</span>
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
              Drei mächtige Werkzeuge, die deinen Pfadfinder-Alltag einfacher machen – vom wöchentlichen Heimabend bis zur Einkaufsliste fürs Sommerlager.
            </p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {PLANNING_TOOLS.map((tool) => (
              <Link
                key={tool.title}
                to={tool.link}
                className="group relative flex flex-col p-6 md:p-8 rounded-2xl border border-border/60 shadow-soft hover:shadow-colorful hover:-translate-y-2 transition-all duration-300 overflow-hidden bg-card"
              >
                <div className={`absolute -top-10 -right-10 w-40 h-40 rounded-full bg-gradient-to-br ${tool.gradient} opacity-10 blur-3xl group-hover:opacity-25 transition-opacity duration-300`} />
                <div className="relative">
                  <div className="flex items-center gap-3 mb-4">
                    <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${tool.gradient} text-white shadow-lg`}>
                      <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>{tool.icon}</span>
                    </div>
                    <h3 className="text-xl font-extrabold">{tool.title}</h3>
                  </div>
                  <p className="text-muted-foreground text-sm mb-5">{tool.desc}</p>
                  <ul className="space-y-2.5">
                    {tool.highlights.map((h) => (
                      <li key={h.text} className="flex items-start gap-2.5 text-sm">
                        <span className="material-symbols-outlined text-[18px] text-primary mt-0.5 shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>{h.icon}</span>
                        <span>{h.text}</span>
                      </li>
                    ))}
                  </ul>
                  <span className={`inline-flex items-center gap-1 mt-5 text-sm font-bold bg-gradient-to-r ${tool.gradient} bg-clip-text text-transparent group-hover:gap-2 transition-all`}>
                    Jetzt ausprobieren
                    <span className="material-symbols-outlined text-[18px] text-primary">arrow_forward</span>
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="container py-12 md:py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[32px]">category</span>
            Was willst du heute machen?
            <span className="text-2xl">🎯</span>
          </h2>
          <p className="text-muted-foreground mt-2">Klick auf eine Kategorie und los geht's!</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.label}
              to={`/search?q=${encodeURIComponent(cat.label)}`}
              className="group relative flex flex-col items-center gap-3 p-5 md:p-6 rounded-2xl bg-card border border-border/50 shadow-soft hover:shadow-colorful hover:-translate-y-2 transition-all duration-300 overflow-hidden"
            >
              <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${cat.color} opacity-20 blur-2xl group-hover:opacity-40 transition-opacity`} />
              <img
                src={cat.img}
                alt={cat.label}
                className="w-24 h-24 md:w-32 md:h-32 object-contain drop-shadow-md group-hover:scale-110 transition-transform duration-300"
              />
              <span className="font-bold text-sm text-center">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Fun Facts */}
      <section className="gradient-sunset text-white py-8">
        <div className="container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {FUN_FACTS.map((fact) => (
              <div key={fact.label} className="flex flex-col items-center gap-1">
                <span
                  className="material-symbols-outlined text-[36px] md:text-[44px] drop-shadow-sm"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  {fact.icon}
                </span>
                <span className="text-2xl md:text-3xl font-extrabold">{fact.value}</span>
                <span className="text-sm font-medium text-white/80">{fact.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* AI Features Section */}
      <section className="container py-12 md:py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-primary text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>smart_toy</span>
            KI-gestützte Features
            <span className="text-2xl">🤖</span>
          </h2>
          <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
            Inspi nutzt Künstliche Intelligenz (Google Gemini), um dir bei der Erstellung und Suche von Inhalten zu helfen.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {AI_FEATURES.map((feat) => (
            <div
              key={feat.title}
              className="relative flex items-start gap-4 p-5 rounded-2xl bg-card border border-border/60 shadow-soft hover:shadow-fun hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white shadow-md shrink-0">
                <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: "'FILL' 1" }}>{feat.icon}</span>
              </div>
              <div>
                <h3 className="font-extrabold text-base mb-1">{feat.title}</h3>
                <p className="text-muted-foreground text-sm">{feat.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Community & Groups Section */}
      <section className="panel-muted py-12 md:py-16">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-primary text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>diversity_3</span>
              Community & Gruppen
              <span className="text-2xl">🤝</span>
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
              Vernetze dich mit anderen Pfadfindern, verwalte deine Gruppen und arbeite im Team.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Link
              to="/profile/groups"
              className="group flex flex-col items-center text-center p-6 rounded-2xl bg-card border border-border/60 shadow-soft hover:shadow-colorful hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-sky-500 to-cyan-600 text-white shadow-lg mb-4">
                <span className="material-symbols-outlined text-[30px]" style={{ fontVariationSettings: "'FILL' 1" }}>groups</span>
              </div>
              <h3 className="text-lg font-extrabold mb-2">Pfadfinder-Gruppen</h3>
              <p className="text-muted-foreground text-sm">Erstelle Gruppen, lade Mitglieder ein und verwalte hierarchische Strukturen (Stamm, Sippe, Meute).</p>
              <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
                <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-semibold text-muted-foreground">Hierarchien</span>
                <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-semibold text-muted-foreground">Join-Code</span>
                <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-semibold text-muted-foreground">Rollen</span>
              </div>
            </Link>
            <Link
              to="/profile/persons"
              className="group flex flex-col items-center text-center p-6 rounded-2xl bg-card border border-border/60 shadow-soft hover:shadow-colorful hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white shadow-lg mb-4">
                <span className="material-symbols-outlined text-[30px]" style={{ fontVariationSettings: "'FILL' 1" }}>person_book</span>
              </div>
              <h3 className="text-lg font-extrabold mb-2">Personen-Verwaltung</h3>
              <p className="text-muted-foreground text-sm">Verwalte Teilnehmer mit Kontaktdaten, Ernährungshinweisen und Allergien für Events und Lager.</p>
              <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
                <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-semibold text-muted-foreground">Kontaktdaten</span>
                <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-semibold text-muted-foreground">Allergien</span>
                <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-semibold text-muted-foreground">Pfadiname</span>
              </div>
            </Link>
            <Link
              to="/my-dashboard"
              className="group flex flex-col items-center text-center p-6 rounded-2xl bg-card border border-border/60 shadow-soft hover:shadow-colorful hover:-translate-y-1 transition-all duration-300"
            >
              <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-amber-600 text-white shadow-lg mb-4">
                <span className="material-symbols-outlined text-[30px]" style={{ fontVariationSettings: "'FILL' 1" }}>dashboard</span>
              </div>
              <h3 className="text-lg font-extrabold mb-2">Persönliches Dashboard</h3>
              <p className="text-muted-foreground text-sm">Deine Ideen, Events, Planer und Gruppen auf einen Blick. Behalte den Überblick über all deine Aktivitäten.</p>
              <div className="flex flex-wrap gap-1.5 mt-3 justify-center">
                <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-semibold text-muted-foreground">Meine Ideen</span>
                <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-semibold text-muted-foreground">Meine Events</span>
                <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-semibold text-muted-foreground">Übersicht</span>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Idea of the Week */}
      {ideaOfTheWeek && (
        <section className="container py-12 md:py-16">
          <div className="relative overflow-hidden rounded-2xl border border-amber-200 bg-gradient-to-r from-amber-50 via-yellow-50 to-orange-50 shadow-soft">
            <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-amber-200/30 blur-3xl" />
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full bg-yellow-200/30 blur-2xl" />
            <div className="relative flex flex-col md:flex-row items-center gap-6 p-6 md:p-10">
              {/* Image */}
              {ideaOfTheWeek.idea.image_url && (
                <Link to={`/idea/${ideaOfTheWeek.idea.slug}`} className="shrink-0">
                  <img
                    src={ideaOfTheWeek.idea.image_url}
                    alt={ideaOfTheWeek.idea.title}
                    className="w-40 h-40 md:w-48 md:h-48 rounded-2xl object-cover shadow-lg hover:scale-105 transition-transform"
                  />
                </Link>
              )}
              <div className="flex-1 text-center md:text-left">
                <div className="flex items-center gap-2 justify-center md:justify-start mb-3">
                  <span
                    className="material-symbols-outlined text-amber-500 text-[28px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    star
                  </span>
                  <h2 className="text-xl md:text-2xl font-extrabold text-amber-700">
                    Idee der Woche
                  </h2>
                </div>
                <Link
                  to={`/idea/${ideaOfTheWeek.idea.slug}`}
                  className="inline-block text-lg md:text-xl font-bold text-foreground hover:text-primary transition-colors"
                >
                  {ideaOfTheWeek.idea.title}
                </Link>
                <p className="text-muted-foreground text-sm md:text-base mt-2 line-clamp-3">
                  {ideaOfTheWeek.description || ideaOfTheWeek.idea.summary}
                </p>
                <Link
                  to={`/idea/${ideaOfTheWeek.idea.slug}`}
                  className="inline-flex items-center gap-1.5 mt-4 px-5 py-2.5 rounded-full bg-amber-500 text-white text-sm font-bold hover:bg-amber-600 hover:scale-105 transition-all shadow-md"
                >
                  <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
                  Jetzt ansehen
                </Link>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Newest Ideas */}
      <section className="container py-12 md:py-16">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/15">
              <span className="material-symbols-outlined text-primary text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold">Neueste Ideen 🌟</h2>
          </div>
          <Link
            to="/search"
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-all"
          >
            Alle anzeigen
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>

        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border bg-muted/50 animate-pulse h-72" />
            ))}
          </div>
        )}
        {error && (
          <ErrorDisplay error={error} onRetry={() => refetch()} />
        )}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.items.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} />
            ))}
          </div>
        )}
      </section>

      {/* Create CTA */}
      <section className="relative panel-muted py-14 md:py-20 overflow-hidden">
        <div className="absolute -left-8 bottom-0 hidden md:block">
          <img src="/images/inspi_creativ.png" alt="" aria-hidden="true" className="w-56 opacity-80 float-bounce-slow select-none" />
        </div>
        <div className="container relative">
          <div className="max-w-2xl mx-auto text-center md:ml-auto md:mr-0 md:text-left">
            <h2 className="text-2xl md:text-4xl font-extrabold">
              Du hast eine geniale Idee? 💡
            </h2>
            <p className="mt-3 text-muted-foreground text-lg">
              Teile deine besten Ideen, Rezepte und Wissensbeiträge mit der Pfadfinder-Community!
              Die KI hilft dir beim Schreiben.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 justify-center md:justify-start">
              <Link
                to="/create"
                className="flex items-center gap-2 px-6 py-3 gradient-primary text-white rounded-full font-bold hover:shadow-glow hover:scale-105 transition-all"
              >
                <span className="material-symbols-outlined text-[22px]">edit_note</span>
                Inhalt erstellen
              </Link>
              <Link
                to="/recipes/new"
                className="flex items-center gap-2 px-6 py-3 border-2 border-rose-500/30 text-rose-700 dark:text-rose-400 rounded-full font-bold hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
              >
                <span className="material-symbols-outlined text-[22px]">restaurant</span>
                Rezept erstellen
              </Link>
              <Link
                to="/about"
                className="flex items-center gap-2 px-6 py-3 border-2 border-primary/20 text-primary rounded-full font-bold hover:bg-primary/5 transition-all"
              >
                <span className="material-symbols-outlined text-[22px]">info</span>
                Mehr erfahren
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="container py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-10">
          So funktioniert's 🎪
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 md:gap-8">
          {[
            {
              step: '1',
              icon: 'search',
              title: 'Entdecken',
              desc: 'Durchsuche hunderte Ideen, Rezepte und Wissensbeiträge mit smarter Filterung und KI-Suche.',
              img: '/images/inspi_baby_suche.png',
              gradient: 'from-sky-500 to-cyan-500',
            },
            {
              step: '2',
              icon: 'event_note',
              title: 'Planen',
              desc: 'Nutze Heimabend-Planer, Essenspläne und Packlisten – alles vernetzt und automatisch berechnet.',
              img: '/images/inspi_laptop.png',
              gradient: 'from-yellow-400 to-amber-500',
            },
            {
              step: '3',
              icon: 'group_add',
              title: 'Zusammenarbeiten',
              desc: 'Lade dein Leiter-Team ein, teile Pläne und verwalte Teilnehmer für Events und Lager.',
              img: '/images/inspi_baby_party.png',
              gradient: 'from-emerald-500 to-teal-500',
            },
            {
              step: '4',
              icon: 'celebration',
              title: 'Durchführen',
              desc: 'Material-Listen, Einkaufslisten und Anleitungen – alles dabei, wenn du es brauchst!',
              img: '/images/inspi_scout.webp',
              gradient: 'from-slate-500 to-sky-700',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="relative flex flex-col items-center text-center p-6 rounded-2xl bg-card border border-border/60 shadow-soft hover:shadow-fun hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br ${item.gradient} text-white font-extrabold text-lg shadow-lg mb-4`}>
                {item.step}
              </div>
              <img
                src={item.img}
                alt={item.title}
                className="w-20 h-20 object-contain mb-4 drop-shadow-md"
              />
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                <h3 className="text-lg font-extrabold">{item.title}</h3>
              </div>
              <p className="text-muted-foreground text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Zutatendatenbank & Rezept-Features */}
      <section className="panel-muted py-12 md:py-16">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold flex items-center justify-center gap-2">
              <span className={`material-symbols-outlined ${TOOL_RECIPES.textColor} text-[32px]`} style={{ fontVariationSettings: "'FILL' 1" }}>restaurant</span>
              Rezepte & Zutatendatenbank
              <span className="text-2xl">🧑‍🍳</span>
            </h2>
            <p className="text-muted-foreground mt-2 max-w-2xl mx-auto">
              Professionelle Rezeptverwaltung mit Nährwert-Analyse, Nutri-Score und einer umfangreichen Zutatendatenbank.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col gap-4">
              {[
                { icon: 'nutrition', title: 'Nutri-Score A–E', desc: 'Jedes Rezept erhält automatisch einen Nutri-Score nach dem offiziellen französischen Algorithmus.' },
                { icon: 'monitor_weight', title: 'Nährwert-Analyse', desc: 'Kalorien, Makronährstoffe und Mikronährstoffe pro Portion – automatisch aus den Zutaten berechnet.' },
                { icon: 'tips_and_updates', title: 'Rezept-Checks & Hinweise', desc: 'Regelbasierte Verbesserungsvorschläge: zu viel Salz? Zu wenig Ballaststoffe? Inspi gibt Tipps.' },
                { icon: 'scale', title: 'Portionsberechnung', desc: 'Automatische Skalierung nach Gruppengröße, Altersstruktur und Aktivitätsfaktor (Mifflin-St Jeor).' },
                { icon: 'euro', title: 'Preiskalkulation', desc: 'Vom Preis pro Packung bis zum Gesamtpreis des Essensplans – alles wird automatisch durchgerechnet.' },
              ].map((item) => (
                <div key={item.title} className="flex items-start gap-4 p-4 rounded-xl bg-card border border-border/60">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br ${TOOL_RECIPES.gradient} text-white shrink-0`}>
                    <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">{item.title}</h4>
                    <p className="text-muted-foreground text-sm mt-0.5">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex flex-col gap-4">
              <Link
                to="/recipes"
                className="group flex items-center gap-4 p-5 rounded-2xl bg-card border border-border/60 shadow-soft hover:shadow-colorful hover:-translate-y-1 transition-all"
              >
                <div className={`flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${TOOL_RECIPES.gradient} text-white shadow-lg shrink-0`}>
                  <span className="material-symbols-outlined text-[30px]" style={{ fontVariationSettings: "'FILL' 1" }}>menu_book</span>
                </div>
                <div>
                  <h3 className="font-extrabold">Rezepte durchsuchen</h3>
                  <p className="text-muted-foreground text-sm">Filtere nach Rezepttyp, Schwierigkeit, Zubereitungszeit und mehr.</p>
                </div>
                <span className="material-symbols-outlined text-primary ml-auto">arrow_forward</span>
              </Link>
              <Link
                to="/ingredients"
                className="group flex items-center gap-4 p-5 rounded-2xl bg-card border border-border/60 shadow-soft hover:shadow-colorful hover:-translate-y-1 transition-all"
              >
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-lg shrink-0">
                  <span className="material-symbols-outlined text-[30px]" style={{ fontVariationSettings: "'FILL' 1" }}>egg</span>
                </div>
                <div>
                  <h3 className="font-extrabold">Zutatendatenbank</h3>
                  <p className="text-muted-foreground text-sm">Hunderte Zutaten mit Nährwerten, Portionen und Preisen – KI-unterstützt ergänzt.</p>
                </div>
                <span className="material-symbols-outlined text-primary ml-auto">arrow_forward</span>
              </Link>
              <Link
                to="/meal-plans"
                className="group flex items-center gap-4 p-5 rounded-2xl bg-card border border-border/60 shadow-soft hover:shadow-colorful hover:-translate-y-1 transition-all"
              >
                <div className={`flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${TOOL_MEAL_PLAN.gradient} text-white shadow-lg shrink-0`}>
                  <span className="material-symbols-outlined text-[30px]" style={{ fontVariationSettings: "'FILL' 1" }}>calendar_month</span>
                </div>
                <div>
                  <h3 className="font-extrabold">Essensplan erstellen</h3>
                  <p className="text-muted-foreground text-sm">Plane mehrere Tage mit Mahlzeiten und generiere automatisch die Einkaufsliste.</p>
                </div>
                <span className="material-symbols-outlined text-primary ml-auto">arrow_forward</span>
              </Link>
              <Link
                to="/recipes/new"
                className="group flex items-center gap-4 p-5 rounded-2xl bg-card border border-border/60 shadow-soft hover:shadow-colorful hover:-translate-y-1 transition-all"
              >
                <div className={`flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${TOOL_RECIPES.gradient} text-white shadow-lg shrink-0`}>
                  <span className="material-symbols-outlined text-[30px]" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
                </div>
                <div>
                  <h3 className="font-extrabold">Eigenes Rezept erstellen</h3>
                  <p className="text-muted-foreground text-sm">Teile deine Lieblingsrezepte mit der Community – mit Nährwert-Analyse und Nutri-Score.</p>
                </div>
                <span className="material-symbols-outlined text-primary ml-auto">arrow_forward</span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Links / Create Hub */}
      <section className="container py-12 md:py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-primary text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
            Schnell loslegen
            <span className="text-2xl">⚡</span>
          </h2>
          <p className="text-muted-foreground mt-2">Erstelle neue Inhalte mit wenigen Klicks.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          {[
            { icon: TOOL_IDEA.icon, label: 'Lern-Idee', link: '/create/idea', gradient: TOOL_IDEA.gradient },
            { icon: 'menu_book', label: 'Wissensartikel', link: '/create/knowledge', gradient: 'from-slate-500 to-sky-600' },
            { icon: TOOL_RECIPES.icon, label: 'Rezept', link: '/recipes/new', gradient: TOOL_RECIPES.gradient },
            { icon: TOOL_EVENTS.icon, label: 'Event', link: '/events/app/new', gradient: TOOL_EVENTS.gradient },
            { icon: TOOL_PACKING_LISTS.icon, label: 'Packliste', link: '/packing-lists', gradient: TOOL_PACKING_LISTS.gradient },
            { icon: TOOL_MEAL_PLAN.icon, label: 'Essensplan', link: '/meal-plans', gradient: TOOL_MEAL_PLAN.gradient },
          ].map((item) => (
            <Link
              key={item.label}
              to={item.link}
              className="group flex flex-col items-center gap-3 p-5 rounded-2xl bg-card border border-border/60 shadow-soft hover:shadow-colorful hover:-translate-y-2 transition-all duration-300"
            >
              <div className={`flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} text-white shadow-lg group-hover:scale-110 transition-transform`}>
                <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
              </div>
              <span className="font-bold text-sm text-center">{item.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
