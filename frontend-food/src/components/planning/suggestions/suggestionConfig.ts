import type {
  AgeGroup,
  CookingSource,
  PlanCooling,
  PlanSeasonHint,
  PlanSetting,
  SuggestionFilters,
} from '@/schemas/mealPlan';

export type ContextKey = 'age_groups' | 'cooking_sources' | 'cooling' | 'setting' | 'season_hint';

export interface ContextPatch {
  age_groups?: AgeGroup[];
  cooking_sources?: CookingSource[];
  cooling?: PlanCooling;
  setting?: PlanSetting;
  season_hint?: PlanSeasonHint;
}

export const EMPTY_FILTERS: SuggestionFilters = {
  taste: null,
  prep: null,
  kids: null,
  budget: null,
  diet: null,
  with_dessert: false,
};

export const RELAXED_FILTER_LABELS: Record<string, string> = {
  budget: 'Günstig',
  prep: 'Vorbereitung',
  kids: 'Kinderfreundlich',
  taste: 'Süß/Herzhaft',
};

export interface FilterChipDef {
  id: string;
  label: string;
  mealTypes?: string[];
  isActive: (filters: SuggestionFilters) => boolean;
  toggle: (filters: SuggestionFilters) => SuggestionFilters;
}

const MAIN_TYPES = ['lunch', 'dinner'];

export const FILTER_CHIPS: FilterChipDef[] = [
  {
    id: 'sweet',
    label: 'Süß',
    mealTypes: ['breakfast', 'snack', 'drinks'],
    isActive: (f) => f.taste === 'sweet',
    toggle: (f) => ({ ...f, taste: f.taste === 'sweet' ? null : 'sweet' }),
  },
  {
    id: 'savory',
    label: 'Herzhaft',
    mealTypes: ['breakfast', 'snack', 'drinks'],
    isActive: (f) => f.taste === 'savory',
    toggle: (f) => ({ ...f, taste: f.taste === 'savory' ? null : 'savory' }),
  },
  {
    id: 'prep-none',
    label: 'Ohne Vorbereitung',
    isActive: (f) => f.prep === 'none',
    toggle: (f) => ({ ...f, prep: f.prep === 'none' ? null : 'none' }),
  },
  {
    id: 'prep-some',
    label: 'Mit Vorbereitung',
    isActive: (f) => f.prep === 'some',
    toggle: (f) => ({ ...f, prep: f.prep === 'some' ? null : 'some' }),
  },
  {
    id: 'kids',
    label: 'Kinderfreundlich',
    isActive: (f) => f.kids === true,
    toggle: (f) => ({ ...f, kids: f.kids ? null : true }),
  },
  {
    id: 'cheap',
    label: 'Günstig',
    isActive: (f) => f.budget === 'cheap',
    toggle: (f) => ({ ...f, budget: f.budget === 'cheap' ? null : 'cheap' }),
  },
  {
    id: 'vegetarian',
    label: 'Vegetarisch',
    isActive: (f) => f.diet === 'vegetarian',
    toggle: (f) => ({ ...f, diet: f.diet === 'vegetarian' ? null : 'vegetarian' }),
  },
  {
    id: 'dessert',
    label: 'Mit Nachtisch',
    mealTypes: MAIN_TYPES,
    isActive: (f) => f.with_dessert,
    toggle: (f) => ({ ...f, with_dessert: !f.with_dessert }),
  },
];

export function chipsForMealType(mealType: string): FilterChipDef[] {
  return FILTER_CHIPS.filter((chip) => !chip.mealTypes || chip.mealTypes.includes(mealType));
}

// ---------------------------------------------------------------------------
// Assistant questions
// ---------------------------------------------------------------------------

export interface QuestionOption {
  label: string;
  filters?: Partial<SuggestionFilters>;
  context?: ContextPatch;
}

export interface AssistantQuestion {
  id: string;
  kind: 'filter' | 'context';
  title: string;
  options: QuestionOption[];
}

const FILTER_QUESTIONS: Record<string, AssistantQuestion> = {
  taste: {
    id: 'taste',
    kind: 'filter',
    title: 'Süß oder herzhaft?',
    options: [
      { label: 'Süß', filters: { taste: 'sweet' } },
      { label: 'Herzhaft', filters: { taste: 'savory' } },
    ],
  },
  prep: {
    id: 'prep',
    kind: 'filter',
    title: 'Wie viel Vorbereitung darf es sein?',
    options: [
      { label: 'Ohne Vorbereitung', filters: { prep: 'none' } },
      { label: 'Mit Vorbereitung', filters: { prep: 'some' } },
    ],
  },
  kids: {
    id: 'kids',
    kind: 'filter',
    title: 'Soll es kinderfreundlich sein?',
    options: [{ label: 'Ja, kinderfreundlich', filters: { kids: true } }],
  },
  budget: {
    id: 'budget',
    kind: 'filter',
    title: 'Was darf es kosten?',
    options: [{ label: 'Eher günstig', filters: { budget: 'cheap' } }],
  },
  diet: {
    id: 'diet',
    kind: 'filter',
    title: 'Mit oder ohne Fleisch?',
    options: [{ label: 'Vegetarisch', filters: { diet: 'vegetarian' } }],
  },
  dessert: {
    id: 'dessert',
    kind: 'filter',
    title: 'Soll es einen Nachtisch geben?',
    options: [{ label: 'Ja, mit Nachtisch', filters: { with_dessert: true } }],
  },
};

const CONTEXT_QUESTIONS: Record<ContextKey, AssistantQuestion> = {
  age_groups: {
    id: 'age_groups',
    kind: 'context',
    title: 'Für wen plant ihr?',
    options: [
      { label: 'Kinder (6–11)', context: { age_groups: ['children'] } },
      { label: 'Jugendliche (12–17)', context: { age_groups: ['teens'] } },
      { label: 'Erwachsene', context: { age_groups: ['adults'] } },
      { label: 'Gemischte Gruppe', context: { age_groups: ['children', 'teens', 'adults'] } },
    ],
  },
  cooking_sources: {
    id: 'cooking_sources',
    kind: 'context',
    title: 'Wie könnt ihr kochen?',
    options: [
      { label: 'Herd und Ofen', context: { cooking_sources: ['stove_oven'] } },
      { label: 'Gaskocher', context: { cooking_sources: ['gas_burner'] } },
      { label: 'Lagerfeuer', context: { cooking_sources: ['campfire'] } },
      { label: 'Gar nicht', context: { cooking_sources: ['none'] } },
    ],
  },
  cooling: {
    id: 'cooling',
    kind: 'context',
    title: 'Habt ihr eine Kühlmöglichkeit?',
    options: [
      { label: 'Kühlschrank', context: { cooling: 'fridge' } },
      { label: 'Kühlbox', context: { cooling: 'cooler_box' } },
      { label: 'Keine Kühlung', context: { cooling: 'none' } },
    ],
  },
  setting: {
    id: 'setting',
    kind: 'context',
    title: 'Was für eine Veranstaltung ist das?',
    options: [
      { label: 'Zeltlager', context: { setting: 'camp' } },
      { label: 'Hausfahrt', context: { setting: 'house_trip' } },
      { label: 'Tagesaktion', context: { setting: 'day_event' } },
      { label: 'Wanderung', context: { setting: 'hike' } },
    ],
  },
  season_hint: {
    id: 'season_hint',
    kind: 'context',
    title: 'Wie ist das Wetter?',
    options: [
      { label: 'Heiß', context: { season_hint: 'hot' } },
      { label: 'Mild', context: { season_hint: 'mild' } },
      { label: 'Kalt', context: { season_hint: 'cold' } },
    ],
  },
};

/** Ordered question pool per meal type: context questions first (only when missing), then filter questions. */
const QUESTION_POOLS: Record<string, { context: ContextKey[]; filters: string[] }> = {
  breakfast: { context: ['age_groups', 'cooking_sources'], filters: ['taste', 'prep', 'kids', 'budget'] },
  lunch: { context: ['cooking_sources', 'age_groups', 'cooling', 'setting'], filters: ['diet', 'budget', 'dessert', 'kids'] },
  dinner: { context: ['cooking_sources', 'age_groups', 'cooling', 'setting'], filters: ['diet', 'budget', 'dessert', 'kids'] },
  snack: { context: ['age_groups', 'cooling'], filters: ['taste', 'prep', 'kids', 'budget'] },
  drinks: { context: ['age_groups', 'season_hint'], filters: ['taste', 'kids', 'budget', 'diet'] },
};

export const ASSISTANT_QUESTION_COUNT = 4;

/**
 * Four choice questions (the fifth is always the free-text wish). Known context fields are skipped and
 * replaced by the next filter question, so the assistant always has five steps in total.
 */
export function buildAssistantQuestions(
  mealType: string,
  missingContext: string[],
  skippedContext: Set<string>,
): AssistantQuestion[] {
  const pool = QUESTION_POOLS[mealType] ?? QUESTION_POOLS.snack;
  const contextQuestions = pool.context
    .filter((key) => missingContext.includes(key) && !skippedContext.has(key))
    .map((key) => CONTEXT_QUESTIONS[key]);
  const filterQuestions = pool.filters.map((key) => FILTER_QUESTIONS[key]);
  return [...contextQuestions, ...filterQuestions].slice(0, ASSISTANT_QUESTION_COUNT);
}

export const CONTEXT_LABELS: Record<string, string> = {
  age_groups: 'Altersgruppe',
  cooking_sources: 'Kochmöglichkeit',
  cooling: 'Kühlmöglichkeit',
  setting: 'Veranstaltungsart',
  season_hint: 'Wetter',
};
