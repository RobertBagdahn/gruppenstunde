import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import UserMenu from '@/components/auth/UserMenu';
import { cn } from '@/lib/utils';
import BrandMark from './BrandMark';
import { MAIN_NAV, isNavItemActive } from './nav-items';

/** Route prefetch on hover and focus, so the click feels instant. */
export const PREFETCH: Record<string, () => Promise<unknown>> = {
  '/recipes': () => import('@/pages/recipes/RecipeListPage'),
  '/ingredients': () => import('@/pages/ingredients/IngredientListPage'),
  '/meal-plans/app': () => import('@/pages/planning/MealEventListPage'),
  '/shopping-lists': () => import('@/pages/shopping/ShoppingListPage'),
};

export function prefetch(path: string) {
  void PREFETCH[path]?.().catch(() => undefined);
}

/** Top bar on every width: logo and profile menu; the four sections join from 768 px. White ground. */
export default function AppHeader() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      data-print-hide
      className={cn(
        'sticky top-0 z-50 w-full border-b border-line bg-background text-foreground transition-shadow duration-300',
        scrolled && 'shadow-soft',
      )}
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link
          to="/"
          aria-label="Inspi Food – zur Startseite"
          className="group flex min-h-11 items-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <BrandMark />
        </Link>

        <nav aria-label="Hauptnavigation" className="hidden items-center gap-1 md:flex">
          {MAIN_NAV.map((item) => {
            const active = isNavItemActive(item, location.pathname);
            return (
              <Link
                key={item.key}
                to={item.to}
                onMouseEnter={() => prefetch(item.to)}
                onFocus={() => prefetch(item.to)}
                aria-current={active ? 'page' : undefined}
                className={cn(
                  'press flex h-11 items-center rounded-full px-4 text-body font-semibold transition-colors duration-200',
                  active ? 'bg-primary-soft text-primary-dark' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <UserMenu />
      </div>
    </header>
  );
}
