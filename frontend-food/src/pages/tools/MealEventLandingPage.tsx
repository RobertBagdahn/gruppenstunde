import { Link } from 'react-router-dom';
import { BookOpen, Calculator, ExternalLink, LogIn } from 'lucide-react';
import { useCurrentUser } from '@/api/auth';
import PageHeader from '@/components/shared/PageHeader';
import WizardSectionHeading from '@/pages/planning/wizard/WizardSectionHeading';
import { Icon } from '@/components/ui/icon';
import { TOOL_MEAL_PLAN } from '@/lib/toolColors';

const SUBTITLE =
  'Plane Mahlzeiten für Lager, Fahrt und Wochenende – mit automatischer Einkaufsliste, Nährwert-Analyse und Portionsberechnung.';

const LONG_DESCRIPTION =
  'Der Essensplan ist dein Küchen-Manager für jede Pfadfinder-Aktion. Erstelle Tagespläne mit Frühstück, Mittag- und Abendessen, weise Rezepte zu und lass dir automatisch die Einkaufsliste generieren. Die Portionsberechnung passt sich an Gruppengröße und einen frei wählbaren Reservefaktor an.';

const FEATURES = [
  { icon: 'calendar_view_week', title: 'Tageweise Planung', description: 'Plane Tag für Tag mit Frühstück, Mittagessen und Abendessen.' },
  { icon: 'menu_book', title: 'Rezepte zuweisen', description: 'Wähle Rezepte aus der Datenbank – Portionen werden automatisch angepasst.' },
  { icon: 'shopping_cart', title: 'Automatische Einkaufsliste', description: 'Alle Zutaten zusammengefasst und nach Supermarkt-Abteilung sortiert.' },
  { icon: 'monitoring', title: 'Nährwert-Analyse', description: 'Nährwerte pro Mahlzeit, pro Tag und für den gesamten Plan – inkl. Nutri-Score.' },
  { icon: 'calculate', title: 'Portionsberechnung', description: 'Automatische Skalierung nach Gruppengröße, Alter und Aktivität.' },
  { icon: 'savings', title: 'Preiskalkulation', description: 'Von der Zutat bis zum Gesamtpreis – alles automatisch durchgerechnet.' },
];

const EXAMPLES = [
  { icon: 'camping', title: 'Sommerlager-Menü', description: 'Plane 10 Tage mit drei Mahlzeiten für 30 Personen und generiere die Einkaufsliste.' },
  { icon: 'hiking', title: 'Hajk-Verpflegung', description: 'Leichte, nahrhafte Mahlzeiten mit Kalorienberechnung und minimalem Packgewicht.' },
  { icon: 'groups', title: 'Koch-Gruppenstunde', description: 'Plane eine Koch-Gruppenstunde mit Rezept und Portionen für deine Altersstufe.' },
];

const FAQ = [
  { question: 'Woher kommen die Nährwerte?', answer: 'Aus unserer Zutatendatenbank mit über 500 Zutaten und exakten Nährwertangaben pro 100g.' },
  { question: 'Wie funktioniert die Portionsberechnung?', answer: 'Du gibst Anzahl, Alter und Aktivitätslevel an. Portionen werden nach der Mifflin-St Jeor Gleichung berechnet.' },
  { question: 'Kann ich die Einkaufsliste exportieren?', answer: 'Ja, als Text oder direkt in der App abhaken. Sortiert nach Supermarkt-Abteilungen.' },
  { question: 'Kann ich eigene Rezepte verwenden?', answer: 'Ja, eigene Rezepte erstellen und direkt im Essensplan verwenden.' },
];

const CTA_ROUTE = '/meal-plans/app';
const CTA_LABEL = 'Zu den Essensplänen';

const RELATED_TOOLS = [
  {
    key: 'recipes',
    icon: BookOpen,
    title: 'Rezepte',
    description: 'Durchsuche und erstelle Rezepte für deine Essenspläne.',
    to: '/recipes',
    linkLabel: 'Zu den Rezepten',
  },
  {
    key: 'norm-portion',
    icon: Calculator,
    title: 'Normportion-Simulator',
    description: 'Berechne Energiebedarf und Normfaktoren nach Alter und Geschlecht.',
    to: '/tools/norm-portion-simulator',
    linkLabel: 'Zum Simulator',
  },
];

/** Landing page of the meal plan tool (`/meal-plans`), on the canvas layout: header, neutral cards, petrol actions. */
export default function MealEventLandingPage() {
  const { data: user } = useCurrentUser();
  const isLoggedIn = !!user;

  return (
    <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 md:py-8 lg:px-8">
      <PageHeader
        title={TOOL_MEAL_PLAN.label}
        description={SUBTITLE}
        actions={
          <Link
            to={CTA_ROUTE}
            className="press inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-5 text-body font-bold text-primary-foreground transition-colors hover:bg-primary-dark"
          >
            <Icon name="rocket_launch" size={20} />
            {CTA_LABEL}
          </Link>
        }
      />

      <section aria-labelledby="meal-plan-about" className="mb-10 md:mb-14">
        <WizardSectionHeading icon={<Icon name="restaurant_menu" size={20} />}>
          <span id="meal-plan-about">Was ist der {TOOL_MEAL_PLAN.label}?</span>
        </WizardSectionHeading>
        <div className="max-w-3xl rounded-xl bg-card p-5 shadow-card md:p-6">
          <p className="text-emphasis leading-relaxed text-muted-foreground">{LONG_DESCRIPTION}</p>
        </div>
      </section>

      <section id="features" aria-labelledby="meal-plan-features" className="mb-10 md:mb-14">
        <WizardSectionHeading icon={<Icon name="calendar_view_week" size={20} />}>
          <span id="meal-plan-features">Funktionen</span>
        </WizardSectionHeading>
        <div className="stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="card-hover rounded-xl bg-card p-5 shadow-card">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Icon name={feature.icon} size={24} />
              </div>
              <h3 className="mb-1 font-display text-emphasis font-bold text-foreground">{feature.title}</h3>
              <p className="text-body text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="meal-plan-examples" className="mb-10 md:mb-14">
        <WizardSectionHeading icon={<Icon name="groups" size={20} />}>
          <span id="meal-plan-examples">Beispiele</span>
        </WizardSectionHeading>
        <div className="stagger grid grid-cols-1 gap-4 md:grid-cols-3">
          {EXAMPLES.map((example) => (
            <div key={example.title} className="card-hover rounded-xl bg-card p-5 shadow-card">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Icon name={example.icon} size={24} />
              </div>
              <h3 className="mb-1 font-display text-section font-extrabold text-foreground">{example.title}</h3>
              <p className="text-body text-muted-foreground">{example.description}</p>
            </div>
          ))}
        </div>
      </section>

      <section aria-labelledby="meal-plan-related" className="mb-10 md:mb-14">
        <WizardSectionHeading icon={<Icon name="link" size={20} />}>
          <span id="meal-plan-related">Verwandte Werkzeuge</span>
        </WizardSectionHeading>
        <div className="grid max-w-3xl gap-4">
          {RELATED_TOOLS.map((tool) => {
            const ToolIcon = tool.icon;
            return (
              <div
                key={tool.key}
                className="flex flex-col items-start gap-4 rounded-xl bg-card p-5 shadow-card sm:flex-row sm:items-center md:p-6"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <ToolIcon className="h-5 w-5" aria-hidden="true" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="mb-0.5 font-display text-emphasis font-bold text-foreground">{tool.title}</h3>
                  <p className="text-body text-muted-foreground">{tool.description}</p>
                </div>
                <Link
                  to={tool.to}
                  className="press inline-flex h-11 shrink-0 items-center gap-2 rounded-lg bg-primary-soft px-4 text-body font-semibold text-primary-dark transition-colors hover:bg-primary-soft-border/60"
                >
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  {tool.linkLabel}
                </Link>
              </div>
            );
          })}
        </div>
      </section>

      <section aria-labelledby="meal-plan-faq" className="mb-10 md:mb-14">
        <WizardSectionHeading icon={<Icon name="help" size={20} />}>
          <span id="meal-plan-faq">Häufig gestellte Fragen</span>
        </WizardSectionHeading>
        <div className="grid max-w-3xl gap-3">
          {FAQ.map((item) => (
            <details key={item.question} className="group rounded-xl bg-card p-5 shadow-card">
              <summary className="flex min-h-11 cursor-pointer items-center justify-between gap-3 font-display text-emphasis font-bold text-foreground">
                {item.question}
                <Icon name="expand_more" size={20} className="shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <p className="mt-3 text-body leading-relaxed text-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
      </section>

      <section aria-labelledby="meal-plan-cta" className="rounded-xl bg-card p-6 text-center shadow-raised md:p-10">
        <h2 id="meal-plan-cta" className="mb-3 font-display text-title font-extrabold text-foreground">
          Bereit loslegen?
        </h2>
        <p className="mx-auto mb-6 max-w-xl text-emphasis text-muted-foreground">
          {isLoggedIn
            ? `Leg direkt los und nutze alle Funktionen des ${TOOL_MEAL_PLAN.label}s.`
            : `Erstelle ein kostenloses Konto und nutze alle Funktionen des ${TOOL_MEAL_PLAN.label}s.`}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Link
            to={CTA_ROUTE}
            className="press inline-flex h-11 items-center gap-2 rounded-lg bg-primary px-6 text-body font-bold text-primary-foreground transition-colors hover:bg-primary-dark"
          >
            <Icon name="rocket_launch" size={20} />
            {CTA_LABEL}
          </Link>
          {!isLoggedIn && (
            <Link
              to="/login"
              className="press inline-flex h-11 items-center gap-2 rounded-lg bg-primary-soft px-6 text-body font-semibold text-primary-dark transition-colors hover:bg-primary-soft-border/60"
            >
              <LogIn className="h-5 w-5" aria-hidden="true" />
              Kostenlos anmelden
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
