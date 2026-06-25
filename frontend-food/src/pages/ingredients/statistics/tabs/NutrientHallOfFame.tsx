import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useIngredientRankings } from '@/api/supplies';
import LeaderboardTable from '../components/LeaderboardTable';
import TabFilters from '../components/TabFilters';

const FIELDS = [
  { field: 'fibre_g', label: 'Ballaststoffe', unit: 'g', description: 'Die ballaststoffreichsten Zutaten.' },
  { field: 'vitamin_c_mg', label: 'Vitamin C', unit: 'mg', description: 'Zutaten mit dem meisten Vitamin C.' },
  { field: 'protein_g', label: 'Protein', unit: 'g', description: 'Die proteinreichsten Zutaten.' },
  { field: 'energy_kcal', label: 'Energie', unit: 'kcal', description: 'Die kalorienreichsten Zutaten.' },
];

export default function NutrientHallOfFame() {
  const [searchParams] = useSearchParams();
  const retailSectionId = searchParams.get('retail_section') ? Number(searchParams.get('retail_section')) : null;
  const [selectedField, setSelectedField] = useState(FIELDS[0].field);
  const currentField = FIELDS.find((f) => f.field === selectedField) ?? FIELDS[0];
  const { data, isLoading } = useIngredientRankings(selectedField, { retailSectionId });

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Entdecke Spitzenreiter in verschiedenen Nährwertkategorien.
      </p>
      <TabFilters showRetailSection extraContent={
        <select
          value={selectedField}
          onChange={(e) => setSelectedField(e.target.value)}
          className="px-3 py-1.5 rounded-xl border border-border text-sm bg-card text-foreground focus:ring-2 focus:ring-primary/20 focus:border-primary focus:outline-none"
        >
          {FIELDS.map((f) => (
            <option key={f.field} value={f.field}>{f.label}</option>
          ))}
        </select>
      } />
      <p className="text-xs text-muted-foreground">{currentField.description}</p>
      {isLoading ? (
        <div className="h-80 bg-muted/40 animate-pulse rounded-xl" />
      ) : data ? (
        <LeaderboardTable top={data.top} bottom={data.bottom} count={data.count} unit={currentField.unit} />
      ) : null}
    </div>
  );
}
