import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCurrentUser, useLogout } from '@/api/auth';
import { cn } from '@/lib/utils';
import {
  TOOL_EVENTS,
  TOOL_MEAL_PLAN,
  TOOL_SESSION_PLANNER,
  TOOL_PACKING_LISTS,
} from '@/lib/toolColors';

interface LayoutProps {
  children: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Bottom Nav Item (Mobile)                                          */
/* ------------------------------------------------------------------ */
interface BottomNavItemProps {
  to: string;
  icon: string;
  filledIcon?: string;
  label: string;
  active: boolean;
}

function BottomNavItem({ to, icon, filledIcon, label, active }: BottomNavItemProps) {
  return (
    <Link
      to={to}
      className={cn(
        'flex flex-col items-center justify-center gap-0.5 pt-1.5 pb-1 min-w-0 flex-1 rounded-xl transition-all',
        active
          ? 'text-primary'
          : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <span
        className={cn('material-symbols-outlined text-[24px] transition-all', active && 'wiggle-hover')}
        style={active && filledIcon ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}
      >
        {active && filledIcon ? filledIcon : icon}
      </span>
      <span className={cn('text-[10px] font-medium leading-none', active && 'font-bold')}>
        {label}
      </span>
      {active && (
        <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />
      )}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Desktop Nav Link                                                   */
/* ------------------------------------------------------------------ */
interface NavLinkProps {
  to: string;
  icon: string;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

function NavLink({ to, icon, label, active, onClick }: NavLinkProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all',
        active
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:text-foreground hover:bg-muted'
      )}
    >
      <span
        className="material-symbols-outlined text-[20px] wiggle-hover"
        style={active ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}
      >
        {icon}
      </span>
      {label}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Profile Menu Item                                                  */
/* ------------------------------------------------------------------ */
interface ProfileMenuItemProps {
  to: string;
  icon: string;
  label: string;
  active: boolean;
  onClick: () => void;
}

function ProfileMenuItem({ to, icon, label, active, onClick }: ProfileMenuItemProps) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors rounded-lg mx-1',
        active
          ? 'text-primary bg-primary/8 font-semibold'
          : 'text-foreground hover:bg-muted'
      )}
    >
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
      {label}
    </Link>
  );
}

/* ------------------------------------------------------------------ */
/*  Layout                                                             */
/* ------------------------------------------------------------------ */
export default function Layout({ children }: LayoutProps) {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);

  const isActive = (path: string, exact = false) =>
    exact ? location.pathname === path : location.pathname.startsWith(path);

  /* -- Navigation items -------------------------------------------- */
  const navItems = [
    { to: '/search', icon: 'search', label: 'Suchen' },
  ];

  const toolsMenuItems = [
    { to: TOOL_EVENTS.basePath, icon: TOOL_EVENTS.icon, label: TOOL_EVENTS.label },
    { to: TOOL_SESSION_PLANNER.basePath, icon: TOOL_SESSION_PLANNER.icon, label: TOOL_SESSION_PLANNER.label },
    { to: TOOL_MEAL_PLAN.basePath, icon: TOOL_MEAL_PLAN.icon, label: TOOL_MEAL_PLAN.label },
    { to: TOOL_PACKING_LISTS.basePath, icon: TOOL_PACKING_LISTS.icon, label: TOOL_PACKING_LISTS.label },
  ];

  const profileMenuItems = [
    { to: '/my-dashboard', icon: 'space_dashboard', label: 'Mein Bereich' },
    { to: '/profile/name', icon: 'badge', label: 'Name' },
    { to: '/profile/groups', icon: 'groups', label: 'Gruppen' },
    { to: '/profile/persons', icon: 'family_restroom', label: 'Personen' },
    { to: '/profile/settings', icon: 'settings', label: 'Einstellungen' },
    { to: '/profile', icon: 'tune', label: 'Einstellungen' },
  ];

  /* -- Bottom nav items (mobile) ----------------------------------- */
  const bottomNavItems = [
    { to: '/', icon: 'home', filledIcon: 'home', label: 'Start' },
    { to: '/search', icon: 'search', filledIcon: 'search', label: 'Suchen' },
    { to: '/create', icon: 'add_circle', filledIcon: 'add_circle', label: 'Erstellen' },
    { to: '/events', icon: 'celebration', filledIcon: 'celebration', label: 'Tools' },
    ...(user
      ? [{ to: '/my-dashboard', icon: 'person', filledIcon: 'person', label: 'Profil' }]
      : [{ to: '/login', icon: 'login', filledIcon: 'login', label: 'Anmelden' }]),
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">

      {/* ============================================================ */}
      {/*  HEADER                                                      */}
      {/* ============================================================ */}
      <header className="sticky top-0 z-50 w-full bg-white/80 backdrop-blur-xl border-b border-border/60 shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]">
        <div className="container flex h-14 md:h-16 items-center justify-between">

          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/images/inspi_thinking.webp"
              alt="Inspi"
              className="h-9 w-auto transition-transform group-hover:scale-110 group-hover:rotate-3"
            />
            <span className="text-xl font-extrabold tracking-tight text-foreground">
              Inspi
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                {...item}
                active={isActive(item.to, true)}
              />
            ))}

            {/* Tools Dropdown — visible to everyone */}
            <div className="relative">
              <button
                onClick={() => setToolsMenuOpen(!toolsMenuOpen)}
                  className={cn(
                    'flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all',
                    toolsMenuItems.some((item) => isActive(item.to))
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  <span
                    className="material-symbols-outlined text-[20px] wiggle-hover"
                    style={toolsMenuItems.some((item) => isActive(item.to)) ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" } : undefined}
                  >
                    construction
                  </span>
                  Tools
                  <span className="material-symbols-outlined text-[16px] text-muted-foreground">
                    {toolsMenuOpen ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {toolsMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setToolsMenuOpen(false)}
                    />
                    <div className="absolute left-0 top-full mt-2 w-52 bg-white border border-border/60 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      {toolsMenuItems.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setToolsMenuOpen(false)}
                          className={cn(
                            'flex items-center gap-3 px-4 py-2.5 text-sm transition-colors rounded-lg mx-1',
                            isActive(item.to)
                              ? 'text-primary bg-primary/8 font-semibold'
                              : 'text-foreground hover:bg-muted'
                          )}
                        >
                          <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>

            {user?.is_staff && (
              <NavLink
                to="/admin/dashboard"
                icon="admin_panel_settings"
                label="Admin"
                active={isActive('/admin')}
              />
            )}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-2">
            {/* Create Button */}
            <Link
              to="/create"
              className={cn(
                'flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-bold transition-all',
                'bg-primary text-primary-foreground hover:bg-primary/90',
                'shadow-[0_2px_8px_-2px_hsl(198_78%_42%_/_0.4)]',
                'hover:shadow-[0_4px_16px_-2px_hsl(198_78%_42%_/_0.5)]'
              )}
            >
              <span className="material-symbols-outlined text-[20px]">add</span>
              Erstellen
            </Link>

            {/* Profile / Auth */}
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-2 rounded-xl transition-all',
                    'text-foreground hover:bg-muted',
                    profileMenuOpen && 'bg-muted'
                  )}
                >
                  <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary">
                    <span className="material-symbols-outlined text-[20px]">person</span>
                  </span>
                  <span className="text-sm font-medium hidden lg:inline max-w-24 truncate">
                    {user.first_name || 'Profil'}
                  </span>
                  <span className="material-symbols-outlined text-[16px] text-muted-foreground">
                    {profileMenuOpen ? 'expand_less' : 'expand_more'}
                  </span>
                </button>

                {/* Profile Dropdown */}
                {profileMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setProfileMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-border/60 rounded-2xl shadow-xl z-50 py-2 animate-in fade-in slide-in-from-top-2 duration-200">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-border/60 mb-1">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
                            <span className="material-symbols-outlined text-[22px]">account_circle</span>
                          </span>
                          <div className="min-w-0">
                            <p className="text-sm font-bold truncate">{user.first_name} {user.last_name}</p>
                            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                          </div>
                        </div>
                      </div>

                      {/* Menu Items */}
                      {profileMenuItems.map((item) => (
                        <ProfileMenuItem
                          key={item.to}
                          {...item}
                          active={isActive(item.to, true)}
                          onClick={() => setProfileMenuOpen(false)}
                        />
                      ))}

                      {/* Logout */}
                      <div className="border-t border-border/60 mt-1 pt-1 mx-1">
                        <button
                          onClick={() => { logout.mutate(); setProfileMenuOpen(false); }}
                          className="flex items-center gap-3 w-full px-4 py-2.5 text-sm text-destructive hover:bg-destructive/8 rounded-lg transition-colors"
                        >
                          <span className="material-symbols-outlined text-[20px]">logout</span>
                          Abmelden
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-foreground hover:bg-muted transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">login</span>
                Anmelden
              </Link>
            )}
          </div>

          {/* Mobile: only show hamburger for extra menu */}
          <div className="md:hidden flex items-center gap-1">
            {user?.is_staff && (
              <Link
                to="/admin/dashboard"
                className="p-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <span className="material-symbols-outlined text-[22px]">admin_panel_settings</span>
              </Link>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-foreground hover:bg-muted transition-colors"
            >
              <span className="material-symbols-outlined text-[24px]">
                {mobileMenuOpen ? 'close' : 'more_vert'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile More Menu (Overlay) */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-border/60 bg-white animate-in slide-in-from-top-2 duration-200">
            <nav className="container py-3 space-y-0.5">
              {user && (
                <>
                  <div className="flex items-center gap-3 px-3 py-3 mb-2 bg-muted/50 rounded-xl">
                    <span className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary">
                      <span className="material-symbols-outlined text-[22px]">account_circle</span>
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-bold truncate">{user.first_name} {user.last_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    </div>
                  </div>

                  <p className="px-3 pt-2 pb-1 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                    Profil
                  </p>
                  {profileMenuItems.map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={cn(
                        'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors',
                        isActive(item.to, true)
                          ? 'text-primary bg-primary/8 font-semibold'
                          : 'text-foreground hover:bg-muted'
                      )}
                    >
                      <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                      {item.label}
                    </Link>
                  ))}

                  <div className="border-t border-border/60 my-2" />
                </>
              )}

              {/* Tools section — visible to everyone */}
              <p className="px-3 pt-2 pb-1 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                Tools
              </p>
              {toolsMenuItems.map((item) => (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors',
                    isActive(item.to)
                      ? 'text-primary bg-primary/8 font-semibold'
                      : 'text-foreground hover:bg-muted'
                  )}
                >
                  <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                  {item.label}
                </Link>
              ))}

              <div className="border-t border-border/60 my-2" />

              {/* Quick Links */}
              <p className="px-3 pt-2 pb-1 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
                Mehr
              </p>
              <Link
                to="/about"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-muted transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">info</span>
                Ueber das Projekt
              </Link>
              <Link
                to="/imprint"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-muted transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">gavel</span>
                Impressum
              </Link>
              <Link
                to="/privacy"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm text-foreground hover:bg-muted transition-colors"
              >
                <span className="material-symbols-outlined text-[20px]">shield</span>
                Datenschutz
              </Link>

              {/* Auth Actions */}
              <div className="border-t border-border/60 my-2" />
              {user ? (
                <button
                  onClick={() => { logout.mutate(); setMobileMenuOpen(false); }}
                  className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm text-destructive hover:bg-destructive/8 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">logout</span>
                  Abmelden
                </button>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-primary hover:bg-primary/8 transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px]">login</span>
                  Anmelden
                </Link>
              )}
            </nav>
          </div>
        )}
      </header>

      {/* ============================================================ */}
      {/*  MAIN CONTENT                                                */}
      {/* ============================================================ */}
      <main className="flex-1 pb-safe-bottom md:pb-0">
        {children}
      </main>

      {/* ============================================================ */}
      {/*  FOOTER (Desktop only – mobile uses bottom nav)              */}
      {/* ============================================================ */}
      <footer className="hidden md:block border-t border-border/60 bg-white">
        <div className="container py-10">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            {/* Brand */}
            <div className="flex items-center gap-4">
              <img
                src="/images/inspi_front_normal.webp"
                alt="Inspi"
                className="h-14 w-14 drop-shadow-sm"
              />
              <div>
                <p className="font-extrabold text-lg text-foreground">Inspi</p>
                <p className="text-sm text-muted-foreground">Der Ideen-Inspirator fuer Pfadfinder</p>
              </div>
            </div>

            {/* Links */}
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-5 gap-y-2 text-sm">
              <Link to="/search" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors font-medium">
                <span className="material-symbols-outlined text-[18px]">explore</span>
                Ideen entdecken
              </Link>
              <Link to="/create" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors font-medium">
                <span className="material-symbols-outlined text-[18px]">add_circle</span>
                Idee erstellen
              </Link>
              <Link to="/about" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors font-medium">
                <span className="material-symbols-outlined text-[18px]">info</span>
                Ueber das Projekt
              </Link>
              <Link to="/imprint" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors font-medium">
                <span className="material-symbols-outlined text-[18px]">gavel</span>
                Impressum
              </Link>
              <Link to="/privacy" className="flex items-center gap-1.5 text-muted-foreground hover:text-primary transition-colors font-medium">
                <span className="material-symbols-outlined text-[18px]">shield</span>
                Datenschutz
              </Link>
            </div>
          </div>

          {/* Bottom line */}
          <div className="mt-8 pt-4 border-t border-border/40 flex items-center justify-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-muted-foreground/50">favorite</span>
            <p className="text-xs text-muted-foreground/60">
              Made with love for Pfadfinder
            </p>
          </div>
        </div>
      </footer>

      {/* ============================================================ */}
      {/*  BOTTOM NAVIGATION (Mobile only)                             */}
      {/* ============================================================ */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-border/60 shadow-[0_-2px_10px_0_rgba(0,0,0,0.04)]"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-stretch justify-around px-2 h-16">
          {bottomNavItems.map((item) => {
            const active = item.to === '/'
              ? location.pathname === '/'
              : location.pathname.startsWith(item.to);

            return (
              <BottomNavItem
                key={item.to}
                to={item.to}
                icon={item.icon}
                filledIcon={item.filledIcon}
                label={item.label}
                active={active}
              />
            );
          })}
        </div>
      </nav>
    </div>
  );
}
