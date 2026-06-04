import { Link } from 'react-router-dom';
import { BookOpen, Calculator, ExternalLink } from 'lucide-react';
import ToolLandingPage from '@/components/ToolLandingPage';
import { TOOL_MEAL_PLAN } from '@/lib/toolColors';

export default function MealPlanLandingPage() {
  return (
    <ToolLandingPage
      tool={TOOL_MEAL_PLAN}
      subtitle="Plane Mahlzeiten für Lager, Fahrt und Wochenende – mit automatischer Einkaufsliste, Nährwert-Analyse und Portionsberechnung."
      longDescription="Der Essensplan ist dein Küchen-Manager für jede Pfadfinder-Aktion. Erstelle Tagespläne mit Frühstück, Mittag- und Abendessen, weise Rezepte zu und lass dir automatisch die Einkaufsliste generieren. Die Portionsberechnung passt sich an Gruppengröße und einen frei wählbaren Reservefaktor an."
      features={[
        { icon: 'calendar_view_week', title: 'Tageweise Planung', description: 'Plane Tag für Tag mit Frühstück, Mittagessen und Abendessen.' },
        { icon: 'menu_book', title: 'Rezepte zuweisen', description: 'Wähle Rezepte aus der Datenbank – Portionen werden automatisch angepasst.' },
        { icon: 'shopping_cart', title: 'Automatische Einkaufsliste', description: 'Alle Zutaten zusammengefasst und nach Supermarkt-Abteilung sortiert.' },
        { icon: 'monitoring', title: 'Nährwert-Analyse', description: 'Nährwerte pro Mahlzeit, pro Tag und für den gesamten Plan – inkl. Nutri-Score.' },
        { icon: 'calculate', title: 'Portionsberechnung', description: 'Automatische Skalierung nach Gruppengröße, Alter und Aktivität.' },
        { icon: 'savings', title: 'Preiskalkulation', description: 'Von der Zutat bis zum Gesamtpreis – alles automatisch durchgerechnet.' },
      ]}
      examples={[
        { icon: 'camping', title: 'Sommerlager-Menü', description: 'Plane 10 Tage mit drei Mahlzeiten für 30 Personen und generiere die Einkaufsliste.' },
        { icon: 'hiking', title: 'Hajk-Verpflegung', description: 'Leichte, nahrhafte Mahlzeiten mit Kalorienberechnung und minimalem Packgewicht.' },
        { icon: 'groups', title: 'Koch-Gruppenstunde', description: 'Plane eine Koch-Gruppenstunde mit Rezept und Portionen für deine Altersstufe.' },
      ]}
      faq={[
        { question: 'Woher kommen die Nährwerte?', answer: 'Aus unserer Zutatendatenbank mit über 500 Zutaten und exakten Nährwertangaben pro 100g.' },
        { question: 'Wie funktioniert die Portionsberechnung?', answer: 'Du gibst Anzahl, Alter und Aktivitätslevel an. Portionen werden nach der Mifflin-St Jeor Gleichung berechnet.' },
        { question: 'Kann ich die Einkaufsliste exportieren?', answer: 'Ja, als Text oder direkt in der App abhaken. Sortiert nach Supermarkt-Abteilungen.' },
        { question: 'Kann ich eigene Rezepte verwenden?', answer: 'Ja, eigene Rezepte erstellen und direkt im Essensplan verwenden.' },
      ]}
      ctaLabel="Zu den Essensplänen"
      ctaRoute="/meal-plans/app"
    >
      {/* Related Tool: Rezepte */}
      <section className="container py-10 md:py-14">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="rounded-2xl border border-border bg-card p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-primary/10 shrink-0">
              <BookOpen className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold font-display mb-0.5">Rezepte</h3>
              <p className="text-sm text-muted-foreground">
                Durchsuche und erstelle Rezepte für deine Essenspläne.
              </p>
            </div>
            <Link
              to="/recipes"
              className="shrink-0 flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/95 text-primary-foreground rounded-full text-sm font-bold hover:scale-105 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              Zu den Rezepten
            </Link>
          </div>

          {/* Related Tool: Normportion-Simulator */}
          <div className="rounded-2xl border border-border bg-card p-5 md:p-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-sm">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-violet-100 shrink-0">
              <Calculator className="w-5 h-5 text-violet-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-base font-bold font-display mb-0.5">Normportion-Simulator</h3>
              <p className="text-sm text-muted-foreground">
                Berechne Energiebedarf und Normfaktoren nach Alter und Geschlecht.
              </p>
            </div>
            <Link
              to="/tools/norm-portion-simulator"
              className="shrink-0 flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-full text-sm font-bold hover:scale-105 transition-all"
            >
              <ExternalLink className="w-4 h-4" />
              Zum Simulator
            </Link>
          </div>
        </div>
      </section>
    </ToolLandingPage>
  );
}
