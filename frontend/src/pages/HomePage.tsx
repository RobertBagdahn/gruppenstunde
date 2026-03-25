import { Link } from 'react-router-dom';
import { useIdeas } from '@/api/ideas';
import { useIdeaStore } from '@/store/useIdeaStore';
import IdeaCard from '@/components/IdeaCard';
import SearchBar from '@/components/SearchBar';

const CATEGORIES = [
  { icon: 'sports_soccer', label: 'Sport & Spiel', color: 'from-green-400 to-emerald-500', img: '/images/inspi_baby_scout.png' },
  { icon: 'music_note', label: 'Musik & Kreativ', color: 'from-violet-400 to-purple-500', img: '/images/inspi_baby_music.png' },
  { icon: 'local_fire_department', label: 'Lagerfeuer', color: 'from-orange-400 to-red-500', img: '/images/inspi_cook.png' },
  { icon: 'nature', label: 'Natur & Outdoor', color: 'from-teal-400 to-cyan-500', img: '/images/inspi_garden.png' },
  { icon: 'menu_book', label: 'Geschichten', color: 'from-amber-400 to-yellow-500', img: '/images/inspi_baby_book.png' },
  { icon: 'palette', label: 'Basteln', color: 'from-pink-400 to-rose-500', img: '/images/inspi_baby_painting.png' },
  { icon: 'rocket_launch', label: 'Abenteuer', color: 'from-blue-400 to-indigo-500', img: '/images/inspi_baby_space.png' },
  { icon: 'cookie', label: 'Kochen & Backen', color: 'from-yellow-400 to-orange-500', img: '/images/inspi_baby_cookie.png' },
];

const FUN_FACTS = [
  { icon: 'lightbulb', value: '500+', label: 'Ideen', color: 'text-yellow-500' },
  { icon: 'groups', value: '1.200+', label: 'Pfadfinder', color: 'text-primary' },
  { icon: 'favorite', value: '3.400+', label: 'Likes', color: 'text-rose-500' },
  { icon: 'star', value: '98%', label: 'Happy Scouts', color: 'text-amber-500' },
];

export default function HomePage() {
  const { filters } = useIdeaStore();
  const { data, isLoading, error } = useIdeas({ ...filters, page_size: 12 });

  return (
    <div>
      {/* Hero Section – vibrant gradient with floating mascots */}
      <section className="relative gradient-hero text-white py-16 md:py-24 overflow-hidden">
        {/* Decorative floating mascots */}
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
        {/* Subtle dot pattern overlay */}
        <div className="absolute inset-0 bg-dots-pattern opacity-[0.04] pointer-events-none" />

        <div className="container relative text-center">
          <img
            src="/images/inspi_baby_suche.png"
            alt="Inspi Baby Suche"
            className="mx-auto w-48 md:w-72 mb-6 drop-shadow-2xl float-bounce"
          />
          <h1 className="text-4xl md:text-5xl lg:text-7xl font-extrabold tracking-tight">
            Finde deine nächste{' '}
            <span className="text-secondary drop-shadow-sm">Idee</span>
            <span className="inline-block ml-2 text-4xl md:text-5xl lg:text-7xl">🚀</span>
          </h1>
          <p className="mt-4 text-lg md:text-xl text-white/90 max-w-2xl mx-auto font-medium">
            Inspi hilft dir, großartige Ideen für deine Pfadfinder-Gruppe zu finden.
            Lass dich inspirieren! ✨
          </p>
          <div className="mt-8 max-w-2xl mx-auto">
            <SearchBar variant="hero" />
          </div>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              to="/create"
              className="flex items-center gap-2 px-6 py-3 bg-white/20 backdrop-blur-sm border border-white/30 text-white rounded-full text-sm font-bold hover:bg-white/30 hover:scale-105 transition-all pulse-glow"
            >
              <span className="material-symbols-outlined text-[20px]">add_circle</span>
              Neue Idee erstellen
            </Link>
            <Link
              to="/search"
              className="flex items-center gap-2 px-6 py-3 bg-secondary/90 text-secondary-foreground rounded-full text-sm font-bold hover:bg-secondary hover:scale-105 transition-all shadow-warm-glow"
            >
              <span className="material-symbols-outlined text-[20px]">explore</span>
              Alle Ideen entdecken
            </Link>
          </div>
        </div>
      </section>

      {/* Module Overview – four big colorful cards */}
      <section className="container py-12 md:py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-primary text-[32px]" style={{ fontVariationSettings: "'FILL' 1" }}>apps</span>
            Entdecke unsere Module
            <span className="text-2xl">🌈</span>
          </h2>
          <p className="text-muted-foreground mt-2">Vier Bereiche – eine Plattform. Finde genau das, was du brauchst!</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 md:gap-8">
          {[
            {
              title: 'Gruppenstunde',
              desc: 'Fertige Ideen mit Material-Listen und Anleitungen für deine nächste Gruppenstunde.',
              img: '/images/inspi_scout.webp',
              gradient: 'from-green-400 to-emerald-600',
              icon: 'groups',
              link: '/search?type=idea',
            },
            {
              title: 'Wissensbeiträge',
              desc: 'Ausführliche Artikel rund um Pfadfinder-Themen, Methodik und Pädagogik.',
              img: '/images/inspi_reading.png',
              gradient: 'from-violet-400 to-purple-600',
              icon: 'menu_book',
              link: '/search?type=knowledge',
            },
            {
              title: 'Rezepte',
              desc: 'Leckere Koch- und Back-Rezepte – perfekt fürs Lager, Fahrt oder Gruppenstunde.',
              img: '/images/inspi_cook.png',
              gradient: 'from-orange-400 to-amber-600',
              icon: 'restaurant',
              link: '/search?type=recipe',
            },
            {
              title: 'Events',
              desc: 'Veranstaltungen, Lager und Aktionen in deiner Nähe entdecken und planen.',
              img: '/images/inspi_baby_party.png',
              gradient: 'from-blue-400 to-indigo-600',
              icon: 'event',
              link: '/planning',
            },
          ].map((mod) => (
            <Link
              key={mod.title}
              to={mod.link}
              className="group relative flex flex-col sm:flex-row items-center gap-5 p-6 md:p-8 rounded-2xl border border-border/50 shadow-soft hover:shadow-colorful hover:-translate-y-2 transition-all duration-300 overflow-hidden bg-card"
            >
              {/* Colorful gradient background blob */}
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
                <span className={`inline-flex items-center gap-1 mt-3 text-sm font-bold bg-gradient-to-r ${mod.gradient} bg-clip-text text-transparent group-hover:gap-2 transition-all`}>
                  Entdecken
                  <span className="material-symbols-outlined text-[18px] text-primary">arrow_forward</span>
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Category Quick Links – colorful icon grid */}
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
              {/* Colorful gradient blob behind icon */}
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

      {/* Fun Facts / Stats Bar */}
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

      {/* Newest Ideas Grid */}
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
          <div className="flex flex-col items-center py-12">
            <img src="/images/inspi_confused.png" alt="Fehler" className="w-32 mb-4 opacity-80" />
            <p className="text-destructive font-bold text-lg">Hoppla! Fehler beim Laden der Ideen 😢</p>
            <p className="text-muted-foreground mt-1">Versuche es gleich nochmal.</p>
          </div>
        )}
        {data && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {data.items.map((idea) => (
              <IdeaCard key={idea.id} idea={idea} />
            ))}
          </div>
        )}
      </section>

      {/* Inspiration CTA – with mascot */}
      <section className="relative bg-gradient-to-r from-primary/5 via-secondary/5 to-accent/5 py-14 md:py-20 overflow-hidden">
        <div className="absolute -left-8 bottom-0 hidden md:block">
          <img src="/images/inspi_creativ.png" alt="" aria-hidden="true" className="w-56 opacity-80 float-bounce-slow select-none" />
        </div>
        <div className="container relative">
          <div className="max-w-2xl mx-auto text-center md:ml-auto md:mr-0 md:text-left">
            <h2 className="text-2xl md:text-4xl font-extrabold">
              Du hast eine geniale Idee? 💡
            </h2>
            <p className="mt-3 text-muted-foreground text-lg">
              Teile deine besten Gruppenstunden-Ideen mit anderen Pfadfindern!
              Erstelle eine neue Idee und hilf der Community.
            </p>
            <div className="mt-6 flex flex-wrap gap-3 justify-center md:justify-start">
              <Link
                to="/create"
                className="flex items-center gap-2 px-6 py-3 gradient-primary text-white rounded-full font-bold hover:shadow-glow hover:scale-105 transition-all"
              >
                <span className="material-symbols-outlined text-[22px]">edit_note</span>
                Idee erstellen
              </Link>
              <Link
                to="/about"
                className="flex items-center gap-2 px-6 py-3 border-2 border-primary/30 text-primary rounded-full font-bold hover:bg-primary/5 transition-all"
              >
                <span className="material-symbols-outlined text-[22px]">info</span>
                Mehr erfahren
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Quick-Start Cards for young scouts */}
      <section className="container py-12 md:py-16">
        <h2 className="text-2xl md:text-3xl font-extrabold text-center mb-10">
          So funktioniert's 🎪
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
          {[
            {
              step: '1',
              icon: 'search',
              title: 'Idee finden',
              desc: 'Such nach Themen, Schwierigkeit oder Altersgruppe – hunderte Ideen warten auf dich!',
              img: '/images/inspi_baby_suche.png',
              gradient: 'from-green-400 to-teal-400',
            },
            {
              step: '2',
              icon: 'event_note',
              title: 'Planen',
              desc: 'Pack deine Favoriten in den Quartalsplaner und organisiere deine Gruppenstunden.',
              img: '/images/inspi_laptop.png',
              gradient: 'from-amber-400 to-yellow-400',
            },
            {
              step: '3',
              icon: 'celebration',
              title: 'Durchführen',
              desc: 'Starte die Gruppenstunde! Material-Listen und Anleitung hast du immer dabei.',
              img: '/images/inspi_scout.webp',
              gradient: 'from-rose-400 to-orange-400',
            },
          ].map((item) => (
            <div
              key={item.step}
              className="relative flex flex-col items-center text-center p-8 rounded-2xl bg-card border border-border/50 shadow-soft hover:shadow-fun hover:-translate-y-1 transition-all duration-300"
            >
              <div className={`flex items-center justify-center w-12 h-12 rounded-full bg-gradient-to-br ${item.gradient} text-white font-extrabold text-lg shadow-lg mb-4`}>
                {item.step}
              </div>
              <img
                src={item.img}
                alt={item.title}
                className="w-24 h-24 object-contain mb-4 drop-shadow-md"
              />
              <div className="flex items-center gap-2 mb-2">
                <span className="material-symbols-outlined text-primary text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>{item.icon}</span>
                <h3 className="text-xl font-extrabold">{item.title}</h3>
              </div>
              <p className="text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
