export default function AboutPage() {
  const inspiImages = [
    { src: '/images/inspi_front_kopfhoerer.webp', alt: 'Inspi Kopfhörer' },
    { src: '/images/inspi_flying.png', alt: 'Inspi Flying' },
    { src: '/images/inspi_creativ.png', alt: 'Inspi Kreativ' },
    { src: '/images/inspi_scout.webp', alt: 'Inspi Scout' },
    { src: '/images/inspi_science.webp', alt: 'Inspi Science' },
    { src: '/images/inspi_backpack.webp', alt: 'Inspi Backpack' },
    { src: '/images/inspi_thinking.webp', alt: 'Inspi Thinking' },
    { src: '/images/inspi_laptop.png', alt: 'Inspi Laptop' },
    { src: '/images/inspi_front_normal.webp', alt: 'Inspi Normal' },
    { src: '/images/inspi_baby_suche.png', alt: 'Inspi Baby Suche' },
    { src: '/images/inspi_search.png', alt: 'Inspi Suche' },
    { src: '/images/inspi_question.png', alt: 'Inspi Frage' },
    { src: '/images/inspi_baby_book.png', alt: 'Inspi Baby Buch' },
    { src: '/images/inspi_baby_cookie.png', alt: 'Inspi Baby Keks' },
    { src: '/images/inspi_baby_flower.png', alt: 'Inspi Baby Blume' },
    { src: '/images/inspi_baby_music.png', alt: 'Inspi Baby Musik' },
    { src: '/images/inspi_baby_painting.png', alt: 'Inspi Baby Malen' },
    { src: '/images/inspi_baby_party.png', alt: 'Inspi Baby Party' },
    { src: '/images/inspi_baby_scout.png', alt: 'Inspi Baby Pfadfinder' },
    { src: '/images/inspi_baby_sleep.png', alt: 'Inspi Baby Schlaf' },
    { src: '/images/inspi_baby_space.png', alt: 'Inspi Baby Weltraum' },
    { src: '/images/inspi_baby_tea.png', alt: 'Inspi Baby Tee' },
    { src: '/images/inspi_cook.png', alt: 'Inspi Kochen' },
    { src: '/images/inspi_food.webp', alt: 'Inspi Essen' },
    { src: '/images/inspi_front_kopfhoerer.webp', alt: 'Inspi Kopfhörer' },
    { src: '/images/inspi_garden.png', alt: 'Inspi Garten' },
    { src: '/images/inspi_reading.png', alt: 'Inspi Lesen' },
    { src: '/images/inspi_sleeping_bag.png', alt: 'Inspi Schlafsack' },
    { src: '/images/inspi_teacher.webp', alt: 'Inspi Lehrer' },
    { src: '/images/inspi_wewantyou.webp', alt: 'Inspi We Want You' },
    { src: '/images/inspi_bass.png', alt: 'Inspi Bass' },
    { src: '/images/inspi_confused.png', alt: 'Inspi Verwirrt' },
    { src: '/images/inspi_danke.png', alt: 'Inspi Danke' },
    { src: '/images/inspi_gitarre.png', alt: 'Inspi Gitarre' },
    { src: '/images/inspi_hungry.png', alt: 'Inspi Hungrig' },
    { src: '/images/inspi_pirat.png', alt: 'Inspi Pirat' },
    { src: '/images/inspi_rover.png', alt: 'Inspi Rover' },
    { src: '/images/inspi_ziehharmonika.png', alt: 'Inspi Ziehharmonika' },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="gradient-hero text-white py-16 md:py-24">
        <div className="container text-center">
          <img
            src="/images/inspi_baby_space.png"
            alt="Inspi Baby Weltraum"
            className="mx-auto h-48 md:h-64 mb-8 drop-shadow-lg"
          />
          <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight">
            Über das Projekt
          </h1>
          <p className="mt-4 text-lg md:text-xl text-white/85 max-w-2xl mx-auto">
            Die Idee hinter Inspi – dem Ideen-Inspirator für Pfadfinder-Gruppenstunden
          </p>
        </div>
      </section>

      {/* Die Idee */}
      <section className="container py-12 md:py-16">
        <h2 className="text-3xl font-extrabold text-center mb-10">Die Idee</h2>

        <div className="max-w-3xl mx-auto space-y-6">
          <div className="rounded-xl border bg-card p-6 shadow-soft card-hover">
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-primary text-[32px] mt-1">
                volunteer_activism
              </span>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Kostenlos</h3>
                <p className="mt-2 text-muted-foreground leading-relaxed">
                  Wir haben diese Plattform geschaffen, um die kostbaren Erfahrungsschätze aus
                  unserem Bund miteinander zu teilen und gemeinsam davon zu profitieren – damit
                  die wenigen Alltags-Stunden jedes jungen Pfadfinders am Heim für die ganze
                  Gruppe zu einem noch größeren Abenteuer werden.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-soft card-hover">
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-primary text-[32px] mt-1">
                diversity_3
              </span>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Vielfältig</h3>
                <p className="mt-2 text-muted-foreground leading-relaxed">
                  Auf dieser Seite sammeln wir verschiedene kreative Heimabend-Programm-Ideen –
                  für alle Altersstufen, egal ob drinnen oder draußen, mit oder ohne Vorbereitung,
                  aufwändig oder ohne Kosten, Lückenfüller oder Großprojekt. Nutzt dafür gerne
                  eigene Ideen, aber auch analoge Quellen wie bspw. ein Ideenbuch aus eurer Gruppe
                  oder die Früchte der eigenen Erfahrung.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border bg-card p-6 shadow-soft card-hover">
            <div className="flex items-start gap-4">
              <span className="material-symbols-outlined text-primary text-[32px] mt-1">
                lightbulb
              </span>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Inspiration</h3>
                <p className="mt-2 text-muted-foreground leading-relaxed">
                  Es geht uns nicht darum, fertig geplante Heimabend-Konzepte und Protokolle
                  auszutauschen und in der Gruppe nachzumachen. Vielmehr soll euch die Seite als
                  Ideenquelle dienen, um Input für eure eigenen Heimabende zu haben, an euren
                  Gruppenstunden-Konzepten zu basteln, mit der Gruppe neue Erfahrungen zu machen
                  und euch selbst kreativ zu verwirklichen.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Inspi Gallery */}
      <section className="bg-muted/30 py-12 md:py-16">
        <div className="container">
          <div className="flex items-center gap-3 justify-center mb-10">
            <span className="material-symbols-outlined text-primary text-[28px]">collections</span>
            <h2 className="text-2xl font-bold">Unsere Inspis</h2>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {inspiImages.map((img) => (
              <div
                key={img.src}
                className="group rounded-xl border bg-card p-4 shadow-soft card-hover flex items-center justify-center aspect-square"
              >
                <img
                  src={img.src}
                  alt={img.alt}
                  className="max-h-full max-w-full object-contain transition-transform group-hover:scale-110"
                />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
