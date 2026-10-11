import { Suspense, useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import UserMenu from '@/components/auth/UserMenu';
import { cn } from '@/lib/utils';
import Footer from './Footer';
import BrandMark from './BrandMark';
import {
  TOOL_RECIPES,
  TOOL_INGREDIENTS,
  TOOL_MEAL_PLAN,
  TOOL_SHOPPING_LISTS,
} from '@/lib/toolColors';
import { Icon } from '@/components/ui/icon';
import { PageSkeleton } from '@/components/ui/skeleton';
import { RouteBoundary } from '@/components/shared/SectionBoundary';
import type { PageArea } from '@/components/shared/PageHeader';

/** Start loading a section's page code on hover/focus, so the click feels instant. */
const PREFETCH: Record<string, () => Promise<unknown>> = {
  '/': () => import('@/pages/HomePage'),
  '/recipes': () => import('@/pages/recipes/RecipeListPage'),
  '/ingredients': () => import('@/pages/ingredients/IngredientListPage'),
  '/meal-plans/app': () => import('@/pages/planning/MealEventListPage'),
  '/shopping-lists': () => import('@/pages/shopping/ShoppingListPage'),
};

function prefetch(path: string) {
  void PREFETCH[path]?.().catch(() => undefined);
}

/** Area dot next to each nav label: the only place the area colour shows in the band. */
const AREA_DOT: Record<PageArea, string> = {
  recipes: 'bg-area-recipes',
  ingredients: 'bg-area-ingredients',
  planner: 'bg-area-planner',
  shopping: 'bg-area-shopping',
  neutral: 'bg-primary',
};

/** Active bottom-nav item: area tint + area-coloured icon. */
const AREA_ACTIVE: Record<PageArea, { item: string; icon: string }> = {
  recipes: { item: 'bg-area-recipes-soft', icon: 'text-area-recipes' },
  ingredients: { item: 'bg-area-ingredients-soft', icon: 'text-area-ingredients' },
  planner: { item: 'bg-area-planner-soft', icon: 'text-area-planner' },
  shopping: { item: 'bg-area-shopping-soft', icon: 'text-area-shopping' },
  neutral: { item: 'bg-primary-soft', icon: 'text-primary' },
};

const navItems: { to: string; icon: string; label: string; area: PageArea }[] = [
  { to: TOOL_RECIPES.basePath, icon: TOOL_RECIPES.icon, label: TOOL_RECIPES.label, area: 'recipes' },
  { to: TOOL_INGREDIENTS.basePath, icon: TOOL_INGREDIENTS.icon, label: TOOL_INGREDIENTS.label, area: 'ingredients' },
  { to: '/meal-plans/app', icon: TOOL_MEAL_PLAN.icon, label: TOOL_MEAL_PLAN.label, area: 'planner' },
  { to: TOOL_SHOPPING_LISTS.basePath, icon: TOOL_SHOPPING_LISTS.icon, label: TOOL_SHOPPING_LISTS.label, area: 'shopping' },
];

const bottomNavItems: { to: string; icon: string; label: string; area: PageArea }[] = [
  { to: '/', icon: 'home', label: 'Start', area: 'neutral' },
  { to: '/recipes', icon: 'menu_book', label: 'Rezepte', area: 'recipes' },
  { to: '/meal-plans/app', icon: 'restaurant_menu', label: 'Essensplan', area: 'planner' },
  { to: '/shopping-lists', icon: 'shopping_cart', label: 'Einkaufen', area: 'shopping' },
];

/**
 * One key per page (section + entity), so a route change replays the page-in
 * animation while query-string changes (filters, tabs) keep the page mounted.
 */
function pageKey(pathname: string): string {
  return pathname.split('/').slice(0, 3).join('/');
}

export default function FoodLayout() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const currentPage = pageKey(location.pathname);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // A new page starts at the top; filter or tab changes keep the position.
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPage]);

  const isActive = (path: string, exact = false) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Navigation: the top of the pine hero band */}
      <header
        className={cn(
          'sticky top-0 z-50 w-full bg-hero text-hero-foreground transition-shadow duration-300',
          scrolled ? 'shadow-raised' : 'shadow-none',
        )}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link
            to="/"
            className="group flex items-center rounded-lg text-hero-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <BrandMark />
          </Link>

          {/* Desktop Navigation */}
          <nav aria-label="Hauptnavigation" className="hidden md:flex items-center gap-1">
            {navItems.map((item) => {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onMouseEnter={() => prefetch(item.to)}
                  onFocus={() => prefetch(item.to)}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'press flex h-10 items-center gap-2 rounded-full px-4 text-body font-semibold transition-colors duration-200',
                    active
                      ? 'bg-hero-foreground text-foreground'
                      : 'text-hero-muted hover:bg-hero-soft hover:text-hero-foreground',
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn('h-2 w-2 rounded-full transition-transform', AREA_DOT[item.area], active && 'scale-125')}
                  />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <UserMenu />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-safe-bottom md:pb-0">
        <RouteBoundary>
          <Suspense fallback={<PageSkeleton />}>
            <div key={currentPage} className="animate-page-in">
              <Outlet />
            </div>
          </Suspense>
        </RouteBoundary>
      </main>

      {/* Footer (hidden on mobile — bottom nav takes that space) */}
      <div className="hidden md:block">
        <Footer />
      </div>

      {/* Mobile Bottom Nav */}
      <nav
        aria-label="Hauptnavigation mobil"
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-xl shadow-raised pb-[env(safe-area-inset-bottom)]"
      >
        <div className="flex items-stretch h-16 px-2">
          {bottomNavItems.map((item) => {
            const active = isActive(item.to, item.to === '/');
            return (
              <Link
                key={item.to}
                to={item.to}
                onTouchStart={() => prefetch(item.to)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'press flex flex-col items-center justify-center gap-1 pt-1.5 pb-1 min-w-0 flex-1 rounded-xl transition-colors',
                  active ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <span
                  className={cn(
                    'flex h-7 items-center justify-center rounded-full transition-all duration-300 ease-out',
                    active ? cn('w-14', AREA_ACTIVE[item.area].item) : 'w-10',
                  )}
                >
                  <Icon name={item.icon} size={20} className={active ? AREA_ACTIVE[item.area].icon : undefined} />
                </span>
                <span className={cn('text-caption leading-none', active ? 'font-bold' : 'font-medium')}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
