import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import UserMenu from '@/components/auth/UserMenu';
import { cn } from '@/lib/utils';
import Footer from './Footer';
import {
  TOOL_RECIPES,
  TOOL_INGREDIENTS,
  TOOL_MEAL_PLAN,
  TOOL_SHOPPING_LISTS,
} from '@/lib/toolColors';
import { Icon } from '@/components/ui/icon';

const navItems = [
  { to: TOOL_RECIPES.basePath, icon: TOOL_RECIPES.icon, label: TOOL_RECIPES.label },
  { to: TOOL_INGREDIENTS.basePath, icon: TOOL_INGREDIENTS.icon, label: TOOL_INGREDIENTS.label },
  { to: '/meal-plans/app', icon: TOOL_MEAL_PLAN.icon, label: TOOL_MEAL_PLAN.label },
  { to: TOOL_SHOPPING_LISTS.basePath, icon: TOOL_SHOPPING_LISTS.icon, label: TOOL_SHOPPING_LISTS.label },
];

const bottomNavItems = [
  { to: '/', icon: 'home', label: 'Start' },
  { to: '/recipes', icon: 'menu_book', label: 'Rezepte' },
  { to: '/meal-plans/app', icon: 'restaurant_menu', label: 'Essensplan' },
  { to: '/shopping-lists', icon: 'shopping_cart', label: 'Einkaufen' },
];

export default function FoodLayout() {
  const location = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const isActive = (path: string, exact = false) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className={cn(
        'sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-border/60 transition-shadow duration-200',
        scrolled ? 'shadow-sm' : 'shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]'
      )}>
        <div className="container flex h-14 md:h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/images/inspi_thinking.webp"
              alt="Inspi Food"
              className="h-9 w-auto transition-transform group-hover:scale-110 group-hover:rotate-3"
            />
            <span className="text-section font-extrabold tracking-tight text-foreground">
              Inspi <span className="text-primary">Food</span>
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-xl text-body font-semibold transition-all',
                  isActive(item.to)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon name={item.icon} size={20} />
                {item.label}
              </Link>
            ))}
          </nav>

          <UserMenu />
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-safe-bottom md:pb-0">
        <Outlet />
      </main>

      {/* Footer (hidden on mobile — bottom nav takes that space) */}
      <div className="hidden md:block">
        <Footer />
      </div>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-border/60">
        <div className="flex items-stretch h-16 px-2">
          {bottomNavItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                'flex flex-col items-center justify-center gap-0.5 pt-1.5 pb-1 min-w-0 flex-1 rounded-xl transition-all',
                isActive(item.to, item.to === '/')
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Icon name={item.icon} size={24} />
              <span className={cn('text-caption font-medium leading-none', isActive(item.to, item.to === '/') && 'font-bold')}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
