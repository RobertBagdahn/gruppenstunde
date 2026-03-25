import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useCurrentUser, useLogout } from '@/api/auth';
import { cn } from '@/lib/utils';

interface LayoutProps {
  children: React.ReactNode;
}

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
        'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all',
        active
          ? 'text-primary bg-primary/10'
          : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
      )}
    >
      <span className="material-symbols-outlined text-[20px] wiggle-hover">{icon}</span>
      {label}
    </Link>
  );
}

export default function Layout({ children }: LayoutProps) {
  const { data: user } = useCurrentUser();
  const logout = useLogout();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { to: '/search', icon: 'search', label: 'Suchen' },
  ];

  const userNavItems = [
    { to: '/planning', icon: 'event_note', label: 'Planung' },
  ];

  const profileMenuItems = [
    { to: '/my-dashboard', icon: 'dashboard', label: 'Mein Bereich' },
    { to: '/profile/name', icon: 'badge', label: 'Name' },
    { to: '/profile/groups', icon: 'groups', label: 'Gruppen' },
    { to: '/profile/persons', icon: 'people', label: 'Personen' },
    { to: '/profile/settings', icon: 'settings', label: 'Einstellungen' },
    { to: '/profile', icon: 'tune', label: 'Bevorzugte Einstellungen' },
  ];

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen flex flex-col">
      {/* Rainbow accent line */}
      <div className="h-1.5 gradient-rainbow w-full" />

      {/* Header */}
      <header className="sticky top-0 z-50 w-full glass border-b shadow-soft">
        <div className="container flex h-16 items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 group">
            <img
              src="/images/inspi_thinking.webp"
              alt="Inspi"
              className="h-10 w-auto transition-transform group-hover:scale-110"
            />
            <span className="text-xl font-bold bg-gradient-to-r from-primary to-[hsl(174,60%,41%)] bg-clip-text text-transparent">
              Inspi
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                {...item}
                active={location.pathname === item.to}
              />
            ))}
            {user && userNavItems.map((item) => (
              <NavLink
                key={item.to}
                {...item}
                active={location.pathname.startsWith(item.to)}
              />
            ))}
            {user?.is_staff && (
              <NavLink
                to="/admin/dashboard"
                icon="admin_panel_settings"
                label="Admin"
                active={location.pathname.startsWith('/admin')}
              />
            )}
          </nav>

          {/* Auth & Profile Buttons */}
          <div className="hidden md:flex items-center gap-2">
            <Link
              to="/create"
              className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-primary to-[hsl(174,60%,41%)] text-white hover:shadow-glow transition-all"
              aria-label="Neue Idee"
            >
              <span className="material-symbols-outlined text-[22px] font-bold">add</span>
            </Link>
            {user && (
              <div className="relative">
                <button
                  onClick={() => setProfileMenuOpen(!profileMenuOpen)}
                  className="flex items-center justify-center w-9 h-9 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                  aria-label="Profil-Menü"
                >
                  <span className="material-symbols-outlined text-[22px]">person</span>
                </button>
                {profileMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setProfileMenuOpen(false)}
                    />
                    <div className="absolute right-0 top-full mt-2 w-56 bg-card border rounded-xl shadow-lg z-50 py-2 animate-in fade-in slide-in-from-top-2">
                      <div className="px-4 py-2 border-b mb-1">
                        <p className="text-sm font-medium truncate">{user.first_name} {user.last_name}</p>
                        <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                      </div>
                      {profileMenuItems.map((item) => (
                        <Link
                          key={item.to}
                          to={item.to}
                          onClick={() => setProfileMenuOpen(false)}
                          className={cn(
                            'flex items-center gap-2 px-4 py-2 text-sm transition-colors',
                            location.pathname === item.to
                              ? 'text-primary bg-primary/5'
                              : 'text-foreground hover:bg-muted'
                          )}
                        >
                          <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                          {item.label}
                        </Link>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
            {user ? (
              <button
                onClick={() => logout.mutate()}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-destructive hover:bg-destructive/5 transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">logout</span>
                Abmelden
              </button>
            ) : (
              <Link
                to="/login"
                className="flex items-center gap-1.5 px-5 py-2 gradient-primary text-white rounded-lg text-sm font-medium hover:shadow-glow transition-all"
              >
                <span className="material-symbols-outlined text-[20px]">login</span>
                Anmelden
              </Link>
            )}
          </div>

          {/* Mobile: Plus Icon + Menu Button */}
          <div className="md:hidden flex items-center gap-1">
            <Link
              to="/create"
              className="flex items-center justify-center w-9 h-9 rounded-full bg-gradient-to-br from-primary to-[hsl(174,60%,41%)] text-white hover:shadow-glow transition-all"
              aria-label="Neue Idee"
            >
              <span className="material-symbols-outlined text-[22px] font-bold">add</span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <span className="material-symbols-outlined text-[24px]">
                {mobileMenuOpen ? 'close' : 'menu'}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t bg-card/95 backdrop-blur-lg animate-in slide-in-from-top-2">
            <nav className="container py-4 space-y-1">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  {...item}
                  active={location.pathname === item.to}
                  onClick={() => setMobileMenuOpen(false)}
                />
              ))}
              {user && userNavItems.map((item) => (
                <NavLink
                  key={item.to}
                  {...item}
                  active={location.pathname.startsWith(item.to)}
                  onClick={() => setMobileMenuOpen(false)}
                />
              ))}
              {user?.is_staff && (
                <NavLink
                  to="/admin/dashboard"
                  icon="admin_panel_settings"
                  label="Admin"
                  active={location.pathname.startsWith('/admin')}
                  onClick={() => setMobileMenuOpen(false)}
                />
              )}
              {user && (
                <div className="border-t pt-3 mt-3">
                  <p className="px-3 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Profil</p>
                  {profileMenuItems.map((item) => (
                    <NavLink
                      key={item.to}
                      {...item}
                      active={location.pathname === item.to}
                      onClick={() => setMobileMenuOpen(false)}
                    />
                  ))}
                </div>
              )}
              <div className="border-t pt-3 mt-3">
                {user ? (
                  <button
                    onClick={() => { logout.mutate(); setMobileMenuOpen(false); }}
                    className="flex items-center gap-1.5 w-full px-3 py-2 rounded-lg text-sm font-medium text-destructive hover:bg-destructive/5 transition-all"
                  >
                    <span className="material-symbols-outlined text-[20px]">logout</span>
                    Abmelden
                  </button>
                ) : (
                  <Link
                    to="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center justify-center gap-1.5 w-full px-5 py-2.5 gradient-primary text-white rounded-lg text-sm font-medium"
                  >
                    <span className="material-symbols-outlined text-[20px]">login</span>
                    Anmelden
                  </Link>
                )}
              </div>
            </nav>
          </div>
        )}
      </header>

      {/* Main */}
      <main className="flex-1">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative border-t bg-card overflow-hidden">
        {/* Decorative gradient bar on top */}
        <div className="h-1 gradient-rainbow w-full" />
        <div className="container py-10 md:py-14">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <img src="/images/inspi_front_normal.webp" alt="Inspi" className="h-16 w-16 drop-shadow-md" />
              <div>
                <p className="font-extrabold text-lg bg-gradient-to-r from-primary to-[hsl(174,60%,41%)] bg-clip-text text-transparent">Inspi – Der Ideen-Inspirator</p>
                <p className="text-sm text-muted-foreground">Für Pfadfinder-Gruppenstunden 🏕️</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-center md:justify-end gap-x-6 gap-y-3 text-sm">
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
                Über das Projekt
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
          <p className="text-center text-xs text-muted-foreground/60 mt-8">Made with 💚 by Pfadfinder für Pfadfinder</p>
        </div>
      </footer>
    </div>
  );
}
