import { Link } from 'react-router-dom';
import type { ToolConfig } from '@/lib/toolColors';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ToolFeature {
  icon: string;
  title: string;
  description: string;
}

export interface ToolExample {
  title: string;
  description: string;
  icon: string;
}

export interface ToolFAQ {
  question: string;
  answer: string;
}

export interface ToolLandingProps {
  tool: ToolConfig;
  /** Subtitle under the main heading */
  subtitle: string;
  /** Longer description paragraph */
  longDescription: string;
  /** Key features list */
  features: ToolFeature[];
  /** Example use cases */
  examples: ToolExample[];
  /** FAQ items */
  faq: ToolFAQ[];
  /** CTA for logged-in users */
  ctaLabel: string;
  /** Route for the CTA */
  ctaRoute: string;
  /** The sandbox/playground component */
  sandbox: React.ReactNode;
  /** Optional extra sections */
  children?: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function ToolLandingPage({
  tool,
  subtitle,
  longDescription,
  features,
  examples,
  faq,
  ctaLabel,
  ctaRoute,
  sandbox,
  children,
}: ToolLandingProps) {
  return (
    <div>
      {/* ============================================================ */}
      {/*  HERO                                                        */}
      {/* ============================================================ */}
      <section className={cn('relative overflow-hidden text-white py-16 md:py-24 bg-gradient-to-br', tool.gradient)}>
        <div className="absolute inset-0 bg-dots-pattern opacity-[0.04] pointer-events-none" />
        <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-60 h-60 bg-white/10 rounded-full blur-2xl" />

        <div className="container relative text-center">
          {tool.mascotImg && (
            <img
              src={tool.mascotImg}
              alt={tool.label}
              className="mx-auto w-36 md:w-48 mb-6 drop-shadow-2xl float-bounce"
            />
          )}
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-sm">
              <span
                className="material-symbols-outlined text-[32px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                {tool.icon}
              </span>
            </div>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight">
              {tool.label}
            </h1>
          </div>
          <p className="text-lg md:text-xl text-white/90 max-w-2xl mx-auto font-medium">
            {subtitle}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              to={ctaRoute}
              className="flex items-center gap-2 px-6 py-3 bg-white text-foreground rounded-full text-sm font-bold hover:bg-white/90 hover:scale-105 transition-all shadow-lg"
            >
              <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
              {ctaLabel}
            </Link>
            <a
              href="#sandbox"
              className="flex items-center gap-2 px-6 py-3 bg-white/15 backdrop-blur-sm border border-white/25 text-white rounded-full text-sm font-bold hover:bg-white/25 hover:scale-105 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">play_circle</span>
              Ausprobieren
            </a>
            <a
              href="#features"
              className="flex items-center gap-2 px-6 py-3 bg-white/15 backdrop-blur-sm border border-white/25 text-white rounded-full text-sm font-bold hover:bg-white/25 hover:scale-105 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">info</span>
              Mehr erfahren
            </a>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  DESCRIPTION                                                 */}
      {/* ============================================================ */}
      <section className="container py-12 md:py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl md:text-3xl font-extrabold mb-4">
            Was ist der {tool.label}?
          </h2>
          <p className="text-muted-foreground text-base md:text-lg leading-relaxed">
            {longDescription}
          </p>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FEATURES                                                    */}
      {/* ============================================================ */}
      <section id="features" className="panel-muted py-12 md:py-16">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold flex items-center justify-center gap-2">
              <span
                className={cn('material-symbols-outlined text-[32px]', tool.textColor)}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                stars
              </span>
              Features & Funktionen
            </h2>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
              Alles was du brauchst, an einem Ort.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feat) => (
              <div
                key={feat.title}
                className="relative flex items-start gap-4 p-5 rounded-2xl bg-card border border-border/60 shadow-soft hover:shadow-fun hover:-translate-y-1 transition-all duration-300"
              >
                <div className={cn(
                  'flex items-center justify-center w-11 h-11 rounded-xl bg-gradient-to-br text-white shadow-md shrink-0',
                  tool.gradient,
                )}>
                  <span
                    className="material-symbols-outlined text-[22px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {feat.icon}
                  </span>
                </div>
                <div>
                  <h3 className="font-extrabold text-base mb-1">{feat.title}</h3>
                  <p className="text-muted-foreground text-sm">{feat.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  EXAMPLES                                                    */}
      {/* ============================================================ */}
      <section className="container py-12 md:py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold flex items-center justify-center gap-2">
            <span
              className={cn('material-symbols-outlined text-[32px]', tool.textColor)}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              apps
            </span>
            Anwendungsbeispiele
          </h2>
          <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
            So nutzen andere Pfadfinder dieses Tool.
          </p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {examples.map((ex) => (
            <div
              key={ex.title}
              className="group relative p-6 rounded-2xl bg-card border border-border/60 shadow-soft hover:shadow-colorful hover:-translate-y-1 transition-all duration-300 overflow-hidden"
            >
              <div className={cn(
                'absolute -top-8 -right-8 w-32 h-32 rounded-full bg-gradient-to-br opacity-10 blur-2xl group-hover:opacity-25 transition-opacity duration-300',
                tool.gradient,
              )} />
              <div className="relative">
                <div className={cn(
                  'flex items-center justify-center w-12 h-12 rounded-xl bg-gradient-to-br text-white shadow-lg mb-4',
                  tool.gradient,
                )}>
                  <span
                    className="material-symbols-outlined text-[24px]"
                    style={{ fontVariationSettings: "'FILL' 1" }}
                  >
                    {ex.icon}
                  </span>
                </div>
                <h3 className="text-lg font-extrabold mb-2">{ex.title}</h3>
                <p className="text-muted-foreground text-sm">{ex.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/*  SANDBOX / PLAYGROUND                                        */}
      {/* ============================================================ */}
      <section id="sandbox" className="panel-muted py-12 md:py-16">
        <div className="container">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-extrabold flex items-center justify-center gap-2">
              <span
                className={cn('material-symbols-outlined text-[32px]', tool.textColor)}
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                play_circle
              </span>
              Jetzt ausprobieren
            </h2>
            <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
              Teste die wichtigsten Funktionen direkt hier – ohne Anmeldung!
            </p>
          </div>
          {sandbox}
        </div>
      </section>

      {/* ============================================================ */}
      {/*  EXTRA SECTIONS                                              */}
      {/* ============================================================ */}
      {children}

      {/* ============================================================ */}
      {/*  FAQ                                                         */}
      {/* ============================================================ */}
      <section className="container py-12 md:py-16">
        <div className="text-center mb-10">
          <h2 className="text-2xl md:text-3xl font-extrabold flex items-center justify-center gap-2">
            <span
              className={cn('material-symbols-outlined text-[32px]', tool.textColor)}
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              help
            </span>
            Haeufig gestellte Fragen
          </h2>
        </div>
        <div className="max-w-3xl mx-auto space-y-4">
          {faq.map((item) => (
            <details
              key={item.question}
              className="group p-5 rounded-2xl bg-card border border-border/60 shadow-soft"
            >
              <summary className="flex items-center justify-between cursor-pointer font-bold text-base">
                {item.question}
                <span className="material-symbols-outlined text-[20px] text-muted-foreground group-open:rotate-180 transition-transform">
                  expand_more
                </span>
              </summary>
              <p className="mt-3 text-muted-foreground text-sm leading-relaxed">
                {item.answer}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FINAL CTA                                                   */}
      {/* ============================================================ */}
      <section className={cn('relative overflow-hidden text-white py-14 md:py-20 bg-gradient-to-br', tool.gradient)}>
        <div className="absolute inset-0 bg-dots-pattern opacity-[0.04] pointer-events-none" />
        <div className="container relative text-center">
          <h2 className="text-2xl md:text-4xl font-extrabold mb-4">
            Bereit loszulegen?
          </h2>
          <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
            Erstelle ein kostenloses Konto und nutze alle Funktionen des {tool.label}s.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Link
              to={ctaRoute}
              className="flex items-center gap-2 px-8 py-3 bg-white text-foreground rounded-full text-sm font-bold hover:bg-white/90 hover:scale-105 transition-all shadow-lg"
            >
              <span className="material-symbols-outlined text-[20px]">rocket_launch</span>
              {ctaLabel}
            </Link>
            <Link
              to="/register"
              className="flex items-center gap-2 px-8 py-3 bg-white/15 backdrop-blur-sm border border-white/25 text-white rounded-full text-sm font-bold hover:bg-white/25 hover:scale-105 transition-all"
            >
              <span className="material-symbols-outlined text-[20px]">person_add</span>
              Kostenlos registrieren
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
