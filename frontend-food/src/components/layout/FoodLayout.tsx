import { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useCurrentUser, useLogout } from '@/api/auth';
import { cn } from '@/lib/utils';
import Footer from './Footer';
import {
  TOOL_RECIPES,
  TOOL_INGREDIENTS,
  TOOL_MEAL_PLAN,
  TOOL_SHOPPING_LISTS,
} from '@/lib/toolColors';

const navItems = [
  { to: TOOL_RECIPES.basePath, icon: TOOL_RECIPES.icon, label: TOOL_RECIPES.label },
  { to: TOOL_INGREDIENTS.basePath, icon: TOOL_INGREDIENTS.icon, label: TOOL_INGREDIENTS.label },
  { to: '/meal-plans/app', icon: TOOL_MEAL_PLAN.icon, label: TOOL_MEAL_PLAN.label },
  { to: TOOL_SHOPPING_LISTS.basePath, icon: TOOL_SHOPPING_LISTS.icon, label: TOOL_SHOPPING_LISTS.label },
];

const bottomNavItems = [
  { to: '/', icon: 'home', filledIcon: 'home', label: 'Start' },
  { to: '/recipes', icon: 'menu_book', filledIcon: 'menu_book', label: 'Rezepte' },
  { to: '/meal-plans/app', icon: 'restaurant_menu', filledIcon: 'restaurant_menu', label: 'Essensplan' },
  { to: '/shopping-lists', icon: 'shopping_cart', filledIcon: 'shopping_cart', label: 'Einkaufen' },
];

export default function FoodLayout() {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const location = useLocation();
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
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
            <span className="text-xl font-extrabold tracking-tight text-foreground">
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
                  'flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all',
                  isActive(item.to)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={isActive(item.to) ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}
                >
                  {item.icon}
                </span>
                {item.label}
              </Link>
            ))}
          </nav>

          {/* Profile */}
          <div className="relative">
            {user ? (
              <>
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-semibold text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                >
                  <span className="material-symbols-outlined text-[20px]">person</span>
                  <span className="hidden md:inline">{user.first_name || 'Profil'}</span>
                </button>
                {profileMenuOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setProfileMenuOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-border/60 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      <Link
                        to="/profile"
                        onClick={() => setProfileMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted rounded-lg mx-1 w-[calc(100%-8px)]"
                      >
                        <span className="material-symbols-outlined text-[20px]">person</span>
                        Profil
                      </Link>
                      {user.is_staff && (
                        <Link
                          to="/admin"
                          onClick={() => setProfileMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted rounded-lg mx-1 w-[calc(100%-8px)]"
                        >
                          <span className="material-symbols-outlined text-[20px]">settings</span>
                          Stammdaten
                        </Link>
                      )}
                      <button
                        onClick={() => { logout.mutate(); setProfileMenuOpen(false); }}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted rounded-lg mx-1 w-[calc(100%-8px)]"
                      >
                        <span className="material-symbols-outlined text-[20px]">logout</span>
                        Abmelden
                      </button>
                    </div>
                  </>
                )}
              </>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold text-primary hover:bg-primary/10 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">login</span>
                Anmelden
              </Link>
            )}
          </div>
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
              <span
                className="material-symbols-outlined text-[24px]"
                style={isActive(item.to, item.to === '/') ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}
              >
                {isActive(item.to, item.to === '/') && item.filledIcon ? item.filledIcon : item.icon}
              </span>
              <span className={cn('text-[10px] font-medium leading-none', isActive(item.to, item.to === '/') && 'font-bold')}>
                {item.label}
              </span>
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
