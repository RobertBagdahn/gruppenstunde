/**
 * Central color and metadata configuration for all platform modules (Tools + Idea).
 *
 * Every tool has a consistent color scheme used across:
 * - Navigation, hero banners, badges, cards, gradients, buttons
 * - HomePage, tool landing pages, search page
 *
 * These colors are Tailwind utility classes (not CSS variables) to keep things
 * simple and grep-able.
 */

export interface ToolConfig {
  /** Machine key */
  key: string;
  /** Display name (German) */
  label: string;
  /** Short tagline */
  tagline: string;
  /** Material Symbols icon name */
  icon: string;
  /** Tailwind gradient classes for hero / badges */
  gradient: string;
  /** Solid bg class for small indicators */
  bgSolid: string;
  /** Text color on white backgrounds */
  textColor: string;
  /** Light tinted background for cards / sections */
  bgTint: string;
  /** Border accent */
  borderColor: string;
  /** Ring/focus color */
  ringColor: string;
  /** Route prefix */
  basePath: string;
  /** Mascot image (optional) */
  mascotImg?: string;
}

/* ------------------------------------------------------------------ */
/*  Tool Definitions                                                   */
/* ------------------------------------------------------------------ */

export const TOOL_IDEA: ToolConfig = {
  key: 'content',
  label: 'Ideen & Wissen',
  tagline: 'Gruppenstunden-Ideen und Wissensartikel entdecken',
  icon: 'lightbulb',
  gradient: 'from-sky-500 to-cyan-600',
  bgSolid: 'bg-sky-500',
  textColor: 'text-sky-600',
  bgTint: 'bg-sky-50',
  borderColor: 'border-sky-300',
  ringColor: 'ring-sky-400',
  basePath: '/search',
  mascotImg: '/images/inspi_baby_suche.png',
};

export const TOOL_EVENTS: ToolConfig = {
  key: 'events',
  label: 'Veranstaltungen',
  tagline: 'Lager, Elternabende und Aktionen planen',
  icon: 'celebration',
  gradient: 'from-violet-500 to-purple-600',
  bgSolid: 'bg-violet-500',
  textColor: 'text-violet-600',
  bgTint: 'bg-violet-50',
  borderColor: 'border-violet-300',
  ringColor: 'ring-violet-400',
  basePath: '/events',
  mascotImg: '/images/inspi_baby_party.png',
};

export const TOOL_MEAL_PLAN: ToolConfig = {
  key: 'meal-plan',
  label: 'Essensplan',
  tagline: 'Mahlzeiten planen mit Einkaufsliste und Naehrwerten',
  icon: 'restaurant_menu',
  gradient: 'from-amber-500 to-orange-600',
  bgSolid: 'bg-amber-500',
  textColor: 'text-amber-600',
  bgTint: 'bg-amber-50',
  borderColor: 'border-amber-300',
  ringColor: 'ring-amber-400',
  basePath: '/meal-events',
  mascotImg: '/images/inspi_cook.png',
};

export const TOOL_SESSION_PLANNER: ToolConfig = {
  key: 'session-planner',
  label: 'Gruppenstundenplan',
  tagline: 'Woechentliche Gruppenstunden planen und organisieren',
  icon: 'calendar_month',
  gradient: 'from-emerald-500 to-green-600',
  bgSolid: 'bg-emerald-500',
  textColor: 'text-emerald-600',
  bgTint: 'bg-emerald-50',
  borderColor: 'border-emerald-300',
  ringColor: 'ring-emerald-400',
  basePath: '/session-planner',
  mascotImg: '/images/inspi_laptop.png',
};

export const TOOL_PACKING_LISTS: ToolConfig = {
  key: 'packing-lists',
  label: 'Packlisten',
  tagline: 'Packlisten fuer Hajk, Lager und Wochenendaktionen',
  icon: 'checklist',
  gradient: 'from-teal-500 to-cyan-600',
  bgSolid: 'bg-teal-500',
  textColor: 'text-teal-600',
  bgTint: 'bg-teal-50',
  borderColor: 'border-teal-300',
  ringColor: 'ring-teal-400',
  basePath: '/packing-lists',
  mascotImg: '/images/inspi_scout.webp',
};

export const TOOL_RECIPES: ToolConfig = {
  key: 'recipes',
  label: 'Rezepte',
  tagline: 'Koch- und Backrezepte mit Naehrwerten und Nutri-Score',
  icon: 'menu_book',
  gradient: 'from-rose-500 to-pink-600',
  bgSolid: 'bg-rose-500',
  textColor: 'text-rose-600',
  bgTint: 'bg-rose-50',
  borderColor: 'border-rose-300',
  ringColor: 'ring-rose-400',
  basePath: '/recipes',
  mascotImg: '/images/inspi_baby_cookie.png',
};

export const TOOL_SESSIONS: ToolConfig = {
  key: 'sessions',
  label: 'Gruppenstunden',
  tagline: 'Ideen und Anleitungen fuer die naechste Gruppenstunde',
  icon: 'groups',
  gradient: 'from-emerald-500 to-green-600',
  bgSolid: 'bg-emerald-500',
  textColor: 'text-emerald-600',
  bgTint: 'bg-emerald-50',
  borderColor: 'border-emerald-300',
  ringColor: 'ring-emerald-400',
  basePath: '/sessions',
};

export const TOOL_BLOG: ToolConfig = {
  key: 'blog',
  label: 'Blog',
  tagline: 'Wissensbeitraege, Tutorials und Erfahrungsberichte',
  icon: 'article',
  gradient: 'from-indigo-500 to-blue-600',
  bgSolid: 'bg-indigo-500',
  textColor: 'text-indigo-600',
  bgTint: 'bg-indigo-50',
  borderColor: 'border-indigo-300',
  ringColor: 'ring-indigo-400',
  basePath: '/blogs',
};

export const TOOL_GAMES: ToolConfig = {
  key: 'games',
  label: 'Spiele',
  tagline: 'Gelaendespiele, Kennenlernspiele und mehr',
  icon: 'sports_esports',
  gradient: 'from-orange-500 to-red-600',
  bgSolid: 'bg-orange-500',
  textColor: 'text-orange-600',
  bgTint: 'bg-orange-50',
  borderColor: 'border-orange-300',
  ringColor: 'ring-orange-400',
  basePath: '/games',
};

export const TOOL_NORM_PORTION: ToolConfig = {
  key: 'norm-portion',
  label: 'Normportion-Simulator',
  tagline: 'Energiebedarf und Normfaktoren nach Alter und Geschlecht',
  icon: 'calculate',
  gradient: 'from-amber-500 to-yellow-600',
  bgSolid: 'bg-amber-500',
  textColor: 'text-amber-600',
  bgTint: 'bg-amber-50',
  borderColor: 'border-amber-300',
  ringColor: 'ring-amber-400',
  basePath: '/tools/norm-portion-simulator',
};

/** All planning/productivity tools (shown in nav, homepage, etc.) */
export const ALL_TOOLS: ToolConfig[] = [
  TOOL_EVENTS,
  TOOL_MEAL_PLAN,
  TOOL_SESSION_PLANNER,
  TOOL_PACKING_LISTS,
  TOOL_NORM_PORTION,
];

/** All content modules (Ideas + Recipes + Sessions + Blog + Games) */
export const CONTENT_MODULES: ToolConfig[] = [
  TOOL_IDEA,
  TOOL_RECIPES,
  TOOL_SESSIONS,
  TOOL_BLOG,
  TOOL_GAMES,
];

/** Everything combined */
export const ALL_MODULES: ToolConfig[] = [
  TOOL_IDEA,
  TOOL_RECIPES,
  TOOL_SESSIONS,
  TOOL_BLOG,
  TOOL_GAMES,
  ...ALL_TOOLS,
];
