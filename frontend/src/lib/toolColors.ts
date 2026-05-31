/**
 * Central color and metadata configuration for all platform modules (Tools + Content).
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

export const TOOL_CONTENT: ToolConfig = {
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
  label: 'Aktionen',
  tagline: 'Lager, Elternabende und Aktionen planen und verwalten',
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

export const TOOL_SESSION_PLANNER: ToolConfig = {
  key: 'session-planner',
  label: 'Gruppenstundenplan',
  tagline: 'Wöchentliche Gruppenstunden planen und organisieren',
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
  tagline: 'Packlisten für Hajk, Lager und Wochenendaktionen',
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

export const TOOL_SESSIONS: ToolConfig = {
  key: 'sessions',
  label: 'Gruppenstunden',
  tagline: 'Ideen und Anleitungen für die nächste Gruppenstunde',
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
  tagline: 'Wissensbeiträge, Tutorials und Erfahrungsberichte',
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
  tagline: 'Geländespiele, Kennenlernspiele und mehr',
  icon: 'sports_esports',
  gradient: 'from-orange-500 to-red-600',
  bgSolid: 'bg-orange-500',
  textColor: 'text-orange-600',
  bgTint: 'bg-orange-50',
  borderColor: 'border-orange-300',
  ringColor: 'ring-orange-400',
  basePath: '/games',
};


/** All planning/productivity tools (shown in nav, homepage, etc.) */
export const ALL_TOOLS: ToolConfig[] = [
  TOOL_EVENTS,
  TOOL_SESSION_PLANNER,
  TOOL_PACKING_LISTS,
];

/** All content modules (Sessions + Blog + Games) */
export const CONTENT_MODULES: ToolConfig[] = [
  TOOL_CONTENT,
  TOOL_SESSIONS,
  TOOL_BLOG,
  TOOL_GAMES,
];

/** Everything combined */
export const ALL_MODULES: ToolConfig[] = [
  TOOL_CONTENT,
  TOOL_SESSIONS,
  TOOL_BLOG,
  TOOL_GAMES,
  ...ALL_TOOLS,
];
