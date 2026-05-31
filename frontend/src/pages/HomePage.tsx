import { Link } from 'react-router-dom';
import { useUnifiedSearch } from '@/api/search';
import { useSearchStore } from '@/store/useSearchStore';
import SearchBar from '@/components/SearchBar';
import ErrorDisplay from '@/components/ErrorDisplay';
import {
  RESULT_TYPE_CONFIG,
  type UnifiedSearchResult,
} from '@/schemas/search';
import {
  TOOL_EVENTS,
  TOOL_SESSION_PLANNER,
  TOOL_PACKING_LISTS,
  TOOL_SESSIONS,
  TOOL_BLOG,
  TOOL_GAMES,
} from '@/lib/toolColors';

const CATEGORIES = [
  { icon: 'sports_soccer', label: 'Sport & Spiel', color: 'from-sky-500 to-cyan-600', img: '/images/inspi_baby_scout.png', tagSlug: 'sport-spiel' },
  { icon: 'music_note', label: 'Musik & Kreativ', color: 'from-slate-500 to-sky-600', img: '/images/inspi_baby_music.png', tagSlug: 'musik-kreativ' },
  { icon: 'local_fire_department', label: 'Lagerfeuer', color: 'from-amber-400 to-yellow-500', img: '/images/inspi_cook.png', tagSlug: 'lagerfeuer' },
  { icon: 'nature', label: 'Natur & Outdoor', color: 'from-cyan-500 to-sky-500', img: '/images/inspi_garden.png', tagSlug: 'natur-outdoor' },
  { icon: 'menu_book', label: 'Geschichten', color: 'from-yellow-400 to-amber-500', img: '/images/inspi_baby_book.png', tagSlug: 'geschichten' },
  { icon: 'palette', label: 'Basteln', color: 'from-stone-400 to-slate-500', img: '/images/inspi_baby_painting.png', tagSlug: 'basteln' },
  { icon: 'rocket_launch', label: 'Abenteuer', color: 'from-sky-600 to-blue-700', img: '/images/inspi_baby_space.png', tagSlug: 'abenteuer' },
  { icon: 'cookie', label: 'Kochen & Backen', color: 'from-yellow-500 to-amber-600', img: '/images/inspi_baby_cookie.png', tagSlug: 'kochen-backen' },
];

const PLATFORM_MODULES = [
  {
    title: TOOL_SESSIONS.label,
    desc: 'Fertige Ideen mit Material-Listen, Zeitangaben und Anleitungen.',
    img: '/images/inspi_scout.webp',
    gradient: TOOL_SESSIONS.gradient,
    icon: TOOL_SESSIONS.icon,
    link: TOOL_SESSIONS.basePath,
    features: ['Material-Listen', 'Altersgruppen', 'Schwierigkeitsgrade'],
  },
  {
    title: TOOL_BLOG.label,
    desc: 'Wissensbeiträge, Methodik und Erfahrungsberichte.',
    img: '/images/inspi_reading.png',
    gradient: TOOL_BLOG.gradient,
    icon: TOOL_BLOG.icon,
    link: TOOL_BLOG.basePath,
    features: ['Fachartikel', 'Methodik', 'Best Practices'],
  },
  {
    title: TOOL_GAMES.label,
    desc: 'Gelände-, Gruppen- und Kooperationsspiele.',
    img: '/images/inspi_baby_scout.png',
    gradient: TOOL_GAMES.gradient,
    icon: TOOL_GAMES.icon,
    link: TOOL_GAMES.basePath,
    features: ['Gruppenspiele', 'Geländespiele', 'Kennenlernspiele'],
  },
];

const PLANNING_TOOLS = [
  {
    title: TOOL_EVENTS.label,
    desc: 'Lager, Elternabende und Aktionen planen und verwalten.',
    icon: TOOL_EVENTS.icon,
    gradient: TOOL_EVENTS.gradient,
    link: TOOL_EVENTS.basePath,
  },
  {
    title: TOOL_SESSION_PLANNER.label,
    desc: 'Wochentliche Gruppenstunden planen und organisieren.',
    icon: TOOL_SESSION_PLANNER.icon,
    gradient: TOOL_SESSION_PLANNER.gradient,
    link: TOOL_SESSION_PLANNER.basePath,
  },
  {
    title: TOOL_PACKING_LISTS.label,
    desc: 'Packlisten für Hajk, Lager und Wochenendaktionen.',
    icon: TOOL_PACKING_LISTS.icon,
    gradient: TOOL_PACKING_LISTS.gradient,
    link: TOOL_PACKING_LISTS.basePath,
  },
];

const QUICK_CREATE = [
  { icon: TOOL_SESSIONS.icon, label: 'Gruppenstunde', link: '/create/session', gradient: TOOL_SESSIONS.gradient },
  { icon: TOOL_GAMES.icon, label: 'Spiel', link: '/create/game', gradient: TOOL_GAMES.gradient },
  { icon: TOOL_BLOG.icon, label: 'Blog-Beitrag', link: '/create/blog', gradient: TOOL_BLOG.gradient },
  { icon: TOOL_EVENTS.icon, label: 'Aktion', link: '/events/app/new', gradient: TOOL_EVENTS.gradient },
  { icon: TOOL_PACKING_LISTS.icon, label: 'Packliste', link: '/packing-lists/new', gradient: TOOL_PACKING_LISTS.gradient },
];

export default function HomePage() {
  const { filters } = useSearchStore();
  const { data, isLoading, error, refetch } = useUnifiedSearch({ ...filters, page_size: 12, sort: 'newest' });

  return (
    <div>
      {/* Hero Section */}
      <section className="relative gradient-hero text-white py-12 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-dots-pattern opacity-[0.04] pointer-events-none" />
        <div className="container relative text-center">
          <img
            src="/images/inspi_baby_suche.png"
            alt="Inspi Maskottchen"
            className="mx-auto w-36 md:w-56 mb-4 drop-shadow-2xl float-bounce"
          />
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-extrabold tracking-tight">
            Die Toolbox für{' '}
            <span className="text-accent drop-shadow-sm">Pfadfinder</span>
          </h1>
          <p className="mt-3 text-base md:text-lg text-white/90 max-w-2xl mx-auto font-medium">
            Ideen, Rezepte, Essenspläne, Aktionen, Packlisten & mehr — alles an einem Ort.
          </p>
          <div className="mt-6 max-w-2xl mx-auto">
            <SearchBar variant="hero" />
          </div>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/create"
              className="flex items-center gap-2 px-5 py-2.5 bg-white/12 backdrop-blur-sm border border-white/20 text-white rounded-full text-sm font-bold hover:bg-white/18 hover:scale-105 transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Erstellen
            </Link>
            <Link
              to="/search"
              className="flex items-center gap-2 px-5 py-2.5 bg-accent text-accent-foreground rounded-full text-sm font-bold hover:bg-[hsl(46,86%,61%)] hover:scale-105 transition-all shadow-warm-glow"
            >
              <span className="material-symbols-outlined text-[18px]">explore</span>
              Entdecken
            </Link>
          </div>
        </div>
      </section>

      {/* Module Overview */}
      <section className="container py-10 md:py-14">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-extrabold flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>apps</span>
            Inhalte
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Gruppenstunden, Spiele, Blog und Rezepte entdecken.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
          {PLATFORM_MODULES.map((mod) => (
            <Link
              key={mod.title}
              to={mod.link}
              className="group relative flex items-center gap-4 p-5 md:p-6 rounded-2xl border border-border/60 shadow-soft hover:shadow-colorful hover:-translate-y-1 transition-all duration-200 overflow-hidden bg-card"
            >
              <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br ${mod.gradient} opacity-10 blur-2xl group-hover:opacity-25 transition-opacity`} />
              <img
                src={mod.img}
                alt={mod.title}
                className="relative w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-md group-hover:scale-105 transition-transform shrink-0"
                loading="lazy"
              />
              <div className="relative min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <div className={`flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br ${mod.gradient} text-white`}>
                    <span className="material-symbols-outlined text-[16px]" style={{ fontVariationSettings: "'FILL' 1" }}>{mod.icon}</span>
                  </div>
                  <h3 className="text-lg font-extrabold">{mod.title}</h3>
                </div>
                <p className="text-muted-foreground text-sm line-clamp-2">{mod.desc}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {mod.features.map((f) => (
                    <span key={f} className="px-2 py-0.5 rounded-full bg-muted text-[11px] font-semibold text-muted-foreground">{f}</span>
                  ))}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Planning Tools Section */}
      <section className="panel-muted py-10 md:py-14">
        <div className="container">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-extrabold flex items-center justify-center gap-2">
              <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>build</span>
              Planungs-Tools
            </h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Aktionen, Gruppenstundenplan, Essensplan und Packlisten.
            </p>
          </div>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {PLANNING_TOOLS.map((tool) => (
              <Link
                key={tool.title}
                to={tool.link}
                className="group relative flex flex-col items-center text-center p-5 rounded-2xl border border-border/60 shadow-soft hover:shadow-colorful hover:-translate-y-1 transition-all duration-200 overflow-hidden bg-card"
              >
                <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full bg-gradient-to-br ${tool.gradient} opacity-10 blur-2xl group-hover:opacity-25 transition-opacity`} />
                <div className={`relative flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${tool.gradient} text-white shadow-md mb-3`}>
                  <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>{tool.icon}</span>
                </div>
                <h3 className="relative font-bold text-sm mb-1">{tool.title}</h3>
                <p className="relative text-muted-foreground text-xs line-clamp-2">{tool.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Categories Section */}
      <section className="container py-10 md:py-14">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-extrabold flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-secondary text-[28px]">category</span>
            Kategorien
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">Klick auf eine Kategorie und los geht's!</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 md:gap-4">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.label}
              to={cat.tagSlug ? `/search?tags=${cat.tagSlug}` : `/search?q=${encodeURIComponent(cat.label)}`}
              className="group relative flex flex-col items-center gap-2 p-4 md:p-5 rounded-2xl bg-card border border-border/50 shadow-soft hover:shadow-colorful hover:-translate-y-1 transition-all duration-200 overflow-hidden"
            >
              <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full bg-gradient-to-br ${cat.color} opacity-15 blur-xl group-hover:opacity-30 transition-opacity`} />
              <img
                src={cat.img}
                alt={cat.label}
                className="w-20 h-20 md:w-24 md:h-24 object-contain drop-shadow-md group-hover:scale-105 transition-transform duration-200"
                loading="lazy"
              />
              <span className="font-bold text-xs text-center">{cat.label}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Newest Content */}
      <section className="panel-muted py-10 md:py-14">
        <div className="container">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/15">
                <span className="material-symbols-outlined text-primary text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>auto_awesome</span>
              </div>
              <h2 className="text-xl md:text-2xl font-extrabold">Neueste Inhalte</h2>
            </div>
            <Link
              to="/search"
              className="flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-bold text-primary bg-primary/10 hover:bg-primary/20 transition-all"
            >
              Alle
              <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
            </Link>
          </div>

          {isLoading && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border bg-muted/50 animate-pulse h-64" />
              ))}
            </div>
          )}
          {error && (
            <ErrorDisplay error={error} onRetry={() => refetch()} />
          )}
          {data && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.items.map((item: UnifiedSearchResult) => {
                const config = RESULT_TYPE_CONFIG[item.result_type] ?? RESULT_TYPE_CONFIG.session;
                return (
                  <Link
                    key={`${item.result_type}-${item.id}`}
                    to={item.url}
                    className="group relative rounded-2xl border border-border/60 bg-card shadow-soft hover:shadow-colorful hover:-translate-y-1 transition-all duration-200 overflow-hidden"
                  >
                    {item.image_url ? (
                      <div className="relative aspect-square overflow-hidden">
                        <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      </div>
                    ) : (
                      <div className="aspect-square bg-muted/30 flex items-center justify-center">
                        <span className={`material-symbols-outlined text-[48px] ${config.color} opacity-30`}>{config.icon}</span>
                      </div>
                    )}
                    <div className="p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`material-symbols-outlined text-[14px] ${config.color}`}>{config.icon}</span>
                        <span className={`text-xs font-semibold ${config.color}`}>{config.label}</span>
                      </div>
                      <h3 className="font-bold text-foreground line-clamp-2 group-hover:text-primary transition-colors">{item.title}</h3>
                      {item.summary && (
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{item.summary}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Quick Create */}
      <section className="container py-10 md:py-14">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-extrabold flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-primary text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>add_circle</span>
            Schnell loslegen
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">Erstelle neue Inhalte mit wenigen Klicks.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
          {QUICK_CREATE.map((item) => (
            <Link
              key={item.label}
              to={item.link}
              className="group flex flex-col items-center gap-2 p-4 rounded-2xl bg-card border border-border/60 shadow-soft hover:shadow-colorful hover:-translate-y-1 transition-all duration-200"
            >
              <div className={`flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br ${item.gradient} text-white shadow-md group-hover:scale-105 transition-transform`}>
                <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
              </div>
              <span className="font-bold text-xs text-center">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* Compact links row */}
        <div className="flex flex-wrap items-center justify-center gap-4 mt-6 text-sm">
          <Link to="/profile/groups" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors font-medium">
            <span className="material-symbols-outlined text-[16px]">groups</span>
            Gruppen
          </Link>
          <Link to="/profile/persons" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors font-medium">
            <span className="material-symbols-outlined text-[16px]">family_restroom</span>
            Personen
          </Link>
          <Link to="/my-dashboard" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors font-medium">
            <span className="material-symbols-outlined text-[16px]">dashboard</span>
            Mein Dashboard
          </Link>
        </div>
      </section>
    </div>
  );
}
