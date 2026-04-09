import { useState } from 'react';
import { Link } from 'react-router-dom';
import ToolLandingPage from '@/components/ToolLandingPage';
import { TOOL_MEAL_PLAN } from '@/lib/toolColors';

/* ------------------------------------------------------------------ */
/*  Sandbox: Interactive Meal Plan Demo                                */
/* ------------------------------------------------------------------ */

interface DemoMeal {
  type: 'breakfast' | 'lunch' | 'dinner';
  label: string;
  icon: string;
  recipe: string;
}

interface DemoDay {
  day: string;
  meals: DemoMeal[];
}

const MEAL_LABELS = {
  breakfast: { label: 'Fruehstueck', icon: 'bakery_dining' },
  lunch: { label: 'Mittagessen', icon: 'lunch_dining' },
  dinner: { label: 'Abendessen', icon: 'dinner_dining' },
};

const RECIPE_SUGGESTIONS = [
  'Spaghetti Bolognese', 'Pfannkuchen', 'Kartoffelsuppe', 'Nudelsalat',
  'Stockbrot', 'Wuerstchen mit Brot', 'Muesli mit Obst', 'Eintopf',
  'Reis mit Gemuese', 'Pizza vom Blech', 'Porridge', 'Bratkartoffeln',
  'Brotzeit', 'Chili con Carne', 'Kaiserschmarrn',
];

const INITIAL_DAYS: DemoDay[] = [
  {
    day: 'Montag',
    meals: [
      { type: 'breakfast', label: 'Fruehstueck', icon: 'bakery_dining', recipe: 'Muesli mit Obst' },
      { type: 'lunch', label: 'Mittagessen', icon: 'lunch_dining', recipe: 'Spaghetti Bolognese' },
      { type: 'dinner', label: 'Abendessen', icon: 'dinner_dining', recipe: 'Stockbrot' },
    ],
  },
  {
    day: 'Dienstag',
    meals: [
      { type: 'breakfast', label: 'Fruehstueck', icon: 'bakery_dining', recipe: 'Porridge' },
      { type: 'lunch', label: 'Mittagessen', icon: 'lunch_dining', recipe: 'Kartoffelsuppe' },
      { type: 'dinner', label: 'Abendessen', icon: 'dinner_dining', recipe: '' },
    ],
  },
  {
    day: 'Mittwoch',
    meals: [
      { type: 'breakfast', label: 'Fruehstueck', icon: 'bakery_dining', recipe: '' },
      { type: 'lunch', label: 'Mittagessen', icon: 'lunch_dining', recipe: '' },
      { type: 'dinner', label: 'Abendessen', icon: 'dinner_dining', recipe: '' },
    ],
  },
];

function MealPlanSandbox() {
  const [days, setDays] = useState<DemoDay[]>(INITIAL_DAYS);
  const [editingCell, setEditingCell] = useState<{ dayIdx: number; mealIdx: number } | null>(null);
  const [editValue, setEditValue] = useState('');

  function handleSetRecipe(dayIdx: number, mealIdx: number, recipe: string) {
    const newDays = [...days];
    newDays[dayIdx] = {
      ...newDays[dayIdx],
      meals: newDays[dayIdx].meals.map((m, i) =>
        i === mealIdx ? { ...m, recipe } : m
      ),
    };
    setDays(newDays);
    setEditingCell(null);
    setEditValue('');
  }

  function addDay() {
    const dayNames = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
    const nextDay = dayNames[days.length % 7];
    setDays([...days, {
      day: nextDay,
      meals: [
        { type: 'breakfast', label: 'Fruehstueck', icon: 'bakery_dining', recipe: '' },
        { type: 'lunch', label: 'Mittagessen', icon: 'lunch_dining', recipe: '' },
        { type: 'dinner', label: 'Abendessen', icon: 'dinner_dining', recipe: '' },
      ],
    }]);
  }

  const filledMeals = days.reduce((acc, d) => acc + d.meals.filter((m) => m.recipe).length, 0);
  const totalMeals = days.reduce((acc, d) => acc + d.meals.length, 0);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <span className="material-symbols-outlined text-amber-500 text-[20px] mt-0.5">info</span>
        <p className="text-sm text-amber-700">
          <strong>Sandbox-Modus:</strong> Klicke auf ein Mahlzeiten-Feld, um ein Rezept zuzuweisen.
          Fuege Tage hinzu und plane dein Lager-Menu – alles ohne Anmeldung!
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-3 mb-6 p-4 bg-card rounded-xl border border-border/60">
        <span className="material-symbols-outlined text-amber-500 text-[20px]" style={{ fontVariationSettings: "'FILL' 1" }}>restaurant_menu</span>
        <div className="flex-1">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="font-medium">{filledMeals} von {totalMeals} Mahlzeiten geplant</span>
            <span className="text-muted-foreground">{Math.round((filledMeals / totalMeals) * 100)}%</span>
          </div>
          <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-orange-600 rounded-full transition-all"
              style={{ width: `${(filledMeals / totalMeals) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Meal Plan Grid */}
      <div className="space-y-3">
        {days.map((day, dayIdx) => (
          <div key={dayIdx} className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-soft">
            <div className="bg-gradient-to-r from-amber-500 to-orange-600 px-4 py-2.5 text-white font-bold text-sm flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">calendar_today</span>
              {day.day}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-border/40">
              {day.meals.map((meal, mealIdx) => {
                const isEditing = editingCell?.dayIdx === dayIdx && editingCell?.mealIdx === mealIdx;
                return (
                  <div key={mealIdx} className="p-3">
                    <div className="flex items-center gap-1.5 mb-2">
                      <span className="material-symbols-outlined text-amber-500 text-[16px]">{meal.icon}</span>
                      <span className="text-xs font-semibold text-muted-foreground">{MEAL_LABELS[meal.type].label}</span>
                    </div>
                    {isEditing ? (
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSetRecipe(dayIdx, mealIdx, editValue);
                            if (e.key === 'Escape') setEditingCell(null);
                          }}
                          placeholder="Rezept eingeben..."
                          className="w-full px-2 py-1 rounded border text-sm focus:ring-2 focus:ring-amber-400 focus:outline-none"
                          autoFocus
                        />
                        <div className="flex flex-wrap gap-1">
                          {RECIPE_SUGGESTIONS.slice(0, 4).map((r) => (
                            <button
                              key={r}
                              onClick={() => handleSetRecipe(dayIdx, mealIdx, r)}
                              className="text-xs px-2 py-0.5 bg-amber-50 text-amber-700 rounded-full hover:bg-amber-100 transition"
                            >
                              {r}
                            </button>
                          ))}
                        </div>
                      </div>
                    ) : meal.recipe ? (
                      <button
                        onClick={() => { setEditingCell({ dayIdx, mealIdx }); setEditValue(meal.recipe); }}
                        className="text-sm font-medium text-foreground hover:text-amber-600 transition text-left"
                      >
                        {meal.recipe}
                      </button>
                    ) : (
                      <button
                        onClick={() => { setEditingCell({ dayIdx, mealIdx }); setEditValue(''); }}
                        className="text-sm text-muted-foreground/50 hover:text-amber-500 italic transition"
                      >
                        + Rezept zuweisen
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={addDay}
        className="mt-4 w-full py-2.5 text-sm font-medium text-amber-600 hover:text-amber-700 border border-dashed border-amber-300 rounded-xl hover:bg-amber-50 transition flex items-center justify-center gap-1.5"
      >
        <span className="material-symbols-outlined text-[18px]">add</span>
        Tag hinzufuegen
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function MealEventLandingPage() {
  return (
    <ToolLandingPage
      tool={TOOL_MEAL_PLAN}
      subtitle="Plane Mahlzeiten fuer Lager, Fahrt und Wochenende – mit automatischer Einkaufsliste, Naehrwert-Analyse und Portionsberechnung."
      longDescription="Der Essensplan ist dein Kuechen-Manager fuer jede Pfadfinder-Aktion. Erstelle Tagesplaene mit Fruehstueck, Mittag- und Abendessen, weise Rezepte zu und lass dir automatisch die Einkaufsliste generieren. Der Clou: Die Portionsberechnung passt sich an die Gruppengroesse, das Alter der Teilnehmer und den Aktivitaetsfaktor an – basierend auf der Mifflin-St Jeor Gleichung."
      features={[
        { icon: 'calendar_view_week', title: 'Tageweise Planung', description: 'Plane Tag fuer Tag mit Fruehstueck, Mittagessen und Abendessen. Fuege beliebig viele Tage hinzu.' },
        { icon: 'menu_book', title: 'Rezepte zuweisen', description: 'Waehle Rezepte aus der Datenbank und weise sie den Mahlzeiten zu. Portionen werden automatisch angepasst.' },
        { icon: 'shopping_cart', title: 'Automatische Einkaufsliste', description: 'Alle Zutaten aller Mahlzeiten werden automatisch zusammengefasst und nach Supermarkt-Abteilung sortiert.' },
        { icon: 'monitoring', title: 'Naehrwert-Analyse', description: 'Sieh die Naehrwerte pro Mahlzeit, pro Tag und fuer den gesamten Plan – inkl. Nutri-Score.' },
        { icon: 'calculate', title: 'Portionsberechnung', description: 'Automatische Skalierung basierend auf Gruppengroesse, Alter und Aktivitaet (Mifflin-St Jeor Gleichung).' },
        { icon: 'savings', title: 'Preiskalkulation', description: 'Von der einzelnen Zutat bis zum Gesamtpreis des Essensplans – alles wird automatisch durchgerechnet.' },
      ]}
      examples={[
        { icon: 'camping', title: 'Sommerlager-Menue', description: 'Plane 10 Tage mit drei Mahlzeiten fuer 30 Personen und generiere eine komplette Einkaufsliste mit Preisen.' },
        { icon: 'hiking', title: 'Hajk-Verpflegung', description: 'Plane leichte, nahrhafte Mahlzeiten fuer die Wanderung – mit Kalorienberechnung und minimalem Packgewicht.' },
        { icon: 'groups', title: 'Gruppenstunden-Kochen', description: 'Plane eine Koch-Gruppenstunde mit Rezept, Zutatenliste und Portionen fuer deine Altersstufe.' },
      ]}
      faq={[
        { question: 'Woher kommen die Naehrwerte?', answer: 'Die Naehrwerte stammen aus unserer Zutatendatenbank, die ueber 500 Zutaten mit exakten Naehrwertangaben pro 100g enthaelt. Fehlende Daten koennen per KI ergaenzt werden.' },
        { question: 'Wie funktioniert die Portionsberechnung?', answer: 'Du gibst Anzahl, Alter und Aktivitaetslevel der Teilnehmer an. Die Portionen werden dann automatisch nach der Mifflin-St Jeor Gleichung (Grundumsatz + Aktivitaetsfaktor) berechnet.' },
        { question: 'Kann ich die Einkaufsliste exportieren?', answer: 'Ja, die Einkaufsliste kann als Text exportiert oder direkt in der App abgehakt werden. Sie ist nach Supermarkt-Abteilungen sortiert.' },
        { question: 'Kann ich eigene Rezepte verwenden?', answer: 'Ja, du kannst eigene Rezepte erstellen und sie direkt im Essensplan verwenden. Die Naehrwerte werden automatisch berechnet.' },
      ]}
      ctaLabel="Essensplan erstellen"
      ctaRoute="/meal-events/app"
      sandbox={<MealPlanSandbox />}
    >
      {/* Related Tool: Normportion-Simulator */}
      <section className="container py-12 md:py-16">
        <div className="max-w-3xl mx-auto">
          <div className="rounded-2xl border border-border/60 bg-card p-6 md:p-8 flex flex-col sm:flex-row items-start sm:items-center gap-4 shadow-soft">
            <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-violet-100 dark:bg-violet-900/30 shrink-0">
              <span className="material-symbols-outlined text-violet-600 dark:text-violet-400 text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                calculate
              </span>
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold mb-1">Normportion-Simulator</h3>
              <p className="text-sm text-muted-foreground">
                Berechne Energiebedarf und Normfaktoren nach Alter und Geschlecht – die Grundlage fuer die automatische Portionsberechnung im Essensplan.
              </p>
            </div>
            <Link
              to="/tools/norm-portion-simulator"
              className="shrink-0 flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-full text-sm font-bold hover:scale-105 transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">open_in_new</span>
              Zum Simulator
            </Link>
          </div>
        </div>
      </section>
    </ToolLandingPage>
  );
}
