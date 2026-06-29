import { useParams, useNavigate, Navigate } from 'react-router-dom';
import type { FC } from 'react';

// Leaderboard tabs
import SugarExtremesTab from './tabs/SugarExtremesTab';
import ProteinChampionsTab from './tabs/ProteinChampionsTab';
import EnergyDensityTab from './tabs/EnergyDensityTab';
import ProteinPerEuroTab from './tabs/ProteinPerEuroTab';
import NutrientHallOfFame from './tabs/NutrientHallOfFame';

// Distribution tabs
import SugarDistributionTab from './tabs/SugarDistributionTab';
import ProteinLandscapeTab from './tabs/ProteinLandscapeTab';
import FatCompositionTab from './tabs/FatCompositionTab';
import PriceBySectionTab from './tabs/PriceBySectionTab';
import FibreDesertTab from './tabs/FibreDesertTab';

// Correlation tabs
import SugarVsFatTab from './tabs/SugarVsFatTab';
import EnvironmentVsPriceTab from './tabs/EnvironmentVsPriceTab';
import ProteinVsEnergyTab from './tabs/ProteinVsEnergyTab';
import ChildVsNutriTab from './tabs/ChildVsNutriTab';

// Tag list tabs
import GlutenRadarTab from './tabs/GlutenRadarTab';
import VeganProteinTab from './tabs/VeganProteinTab';
import LactoseOverviewTab from './tabs/LactoseOverviewTab';

// Score tabs
import NutriLandscapeTab from './tabs/NutriLandscapeTab';
import NovaProcessingTab from './tabs/NovaProcessingTab';

// Outlier tab
import OutlierDetectorTab from './tabs/OutlierDetectorTab';

// Comparison tab
import ComparisonTab from './tabs/ComparisonTab';

type TabConfig = {
  id: string;
  label: string;
  category: string;
  Component: FC;
};

const TABS: TabConfig[] = [
  // Leaderboards
  { id: 'sugar-extremes', label: 'Zucker-Extreme', category: 'leaderboard', Component: SugarExtremesTab },
  { id: 'protein-champions', label: 'Protein-Champions', category: 'leaderboard', Component: ProteinChampionsTab },
  { id: 'energy-density', label: 'Kalorien-Dichte', category: 'leaderboard', Component: EnergyDensityTab },
  { id: 'protein-per-euro', label: 'Preis-pro-Protein', category: 'leaderboard', Component: ProteinPerEuroTab },
  { id: 'nutrient-hall-of-fame', label: 'Nährwert-Rekorde', category: 'leaderboard', Component: NutrientHallOfFame },
  // Distributions
  { id: 'sugar-distribution', label: 'Zucker-Verteilung', category: 'distribution', Component: SugarDistributionTab },
  { id: 'protein-landscape', label: 'Protein-Landschaft', category: 'distribution', Component: ProteinLandscapeTab },
  { id: 'fat-composition', label: 'Fett-Komposition', category: 'distribution', Component: FatCompositionTab },
  { id: 'price-by-section', label: 'Preis pro Abteilung', category: 'distribution', Component: PriceBySectionTab },
  { id: 'fibre-desert', label: 'Ballaststoff-Oase?', category: 'distribution', Component: FibreDesertTab },
  // Correlations
  { id: 'sugar-vs-fat', label: 'Zucker vs. Fett', category: 'correlation', Component: SugarVsFatTab },
  { id: 'environment-vs-price', label: 'Umwelt vs. Preis', category: 'correlation', Component: EnvironmentVsPriceTab },
  { id: 'protein-vs-energy', label: 'Protein vs. Energie', category: 'correlation', Component: ProteinVsEnergyTab },
  { id: 'child-vs-nutri', label: 'Kind vs. Nutri', category: 'correlation', Component: ChildVsNutriTab },
  // Tag lists
  { id: 'gluten-radar', label: 'Gluten-Radar', category: 'tag-list', Component: GlutenRadarTab },
  { id: 'vegan-protein', label: 'Veganer Protein-Finder', category: 'tag-list', Component: VeganProteinTab },
  { id: 'lactose-overview', label: 'Laktose-Übersicht', category: 'tag-list', Component: LactoseOverviewTab },
  // Scores
  { id: 'nutri-landscape', label: 'Nutri-Landschaft', category: 'score', Component: NutriLandscapeTab },
  { id: 'nova-processing', label: 'NOVA-Grad', category: 'score', Component: NovaProcessingTab },
  // Outliers
  { id: 'outlier-detector', label: 'Ausreißer-Detektor', category: 'outlier', Component: OutlierDetectorTab },

  // Comparison
  { id: 'comparison', label: 'Vergleich', category: 'comparison', Component: ComparisonTab },
];

const DEFAULT_TAB = 'sugar-extremes';

export default function IngredientStatisticsPage() {
  const { tab } = useParams<{ tab?: string }>();
  const navigate = useNavigate();

  const activeTabId = tab || DEFAULT_TAB;
  const activeTab = TABS.find((t) => t.id === activeTabId);

  if (!activeTab) {
    return <Navigate to={`/ingredients/statistics/${DEFAULT_TAB}`} replace />;
  }

  const ActiveComponent = activeTab.Component;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8">
      <h1 className="font-display font-bold text-2xl md:text-3xl text-foreground mb-2">
        Zutaten-Statistiken
      </h1>
      <p className="text-muted-foreground text-sm mb-4">
        Entdecke Verteilungen, Extreme und Zusammenhänge in der Zutatendatenbank
      </p>

      {/* Tab bar */}
      <div className="relative mb-6">
        <div className="overflow-x-auto -mx-4 px-4 scrollbar-hide">
          <div className="flex gap-1 min-w-max pb-2">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => navigate(`/ingredients/statistics/${t.id}`)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  t.id === activeTabId
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
        {/* Fade indicator for mobile */}
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-background to-transparent sm:hidden" />
      </div>

      {/* Category badge */}
      <div className="flex items-center gap-2 mb-4">
        <span className="px-2 py-0.5 rounded-md bg-muted text-xs text-muted-foreground">
          {activeTab.category === 'leaderboard' && 'Bestenliste'}
          {activeTab.category === 'distribution' && 'Verteilung'}
          {activeTab.category === 'correlation' && 'Korrelation'}
          {activeTab.category === 'tag-list' && 'Tag-Liste'}
          {activeTab.category === 'score' && 'Score-Analyse'}
          {activeTab.category === 'outlier' && 'Ausreißer'}
          {activeTab.category === 'comparison' && 'Vergleich'}
        </span>
      </div>

      {/* Active tab content */}
      <div className="rounded-2xl border border-border bg-card p-4 md:p-6 shadow-sm">
        <ActiveComponent />
      </div>
    </div>
  );
}
