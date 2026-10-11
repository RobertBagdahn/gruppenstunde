/**
 * Header account menu: "Anmelden" for visitors, avatar menu for logged-in users.
 */
import { BookOpen, KeyRound, LogIn, LogOut, Settings, User as UserIcon } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { notify } from '@/lib/notify';
import { useCurrentUser, useLogout } from '@/api/auth';
import AiQuotaBar from '@/components/auth/AiQuotaBar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLoginPrompt } from '@/store/loginPromptStore';

// Pages that only show personal data; after logout the visitor goes home instead.
const PRIVATE_PREFIXES = ['/profile', '/admin', '/recipes/my-recipes', '/recipes/folders', '/shopping-lists/'];

export default function UserMenu() {
  const { data: user, isLoading } = useCurrentUser();
  const logout = useLogout();
  const showLogin = useLoginPrompt((state) => state.show);
  const location = useLocation();
  const navigate = useNavigate();

  // Do not flash "Anmelden" for logged-in users while the session is still loading.
  if (isLoading) {
    return <div className="skeleton-shimmer skeleton-on-hero h-10 w-28 rounded-full" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <Button
        variant="ghost"
        className="press gap-2 rounded-full bg-hero-foreground font-semibold text-foreground hover:bg-hero-muted"
        onClick={() => showLogin({ reason: 'Melde dich an, um Rezepte und Essenspläne zu speichern.' })}
      >
        <LogIn className="h-4 w-4" />
        Anmelden
      </Button>
    );
  }

  function handleLogout() {
    logout.mutate(undefined, {
      onSuccess: () => {
        notify.success('Du bist abgemeldet');
        if (PRIVATE_PREFIXES.some((prefix) => location.pathname.startsWith(prefix))) navigate('/');
      },
    });
  }

  const initial = (user.display_name || user.email).charAt(0).toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="press flex h-11 items-center gap-2 rounded-full bg-hero-soft py-1 pl-1 pr-1 text-body font-semibold text-hero-foreground transition-colors hover:bg-hero-foreground hover:text-foreground md:pr-4"
          aria-label="Benutzermenü öffnen"
        >
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-spice-soft font-bold text-spice-foreground">
            {initial}
          </span>
          <span className="hidden max-w-[10rem] truncate md:inline">{user.display_name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-0.5">
          <div className="truncate text-body">{user.display_name}</div>
          <div className="truncate text-caption font-normal text-muted-foreground">{user.email}</div>
        </DropdownMenuLabel>
        <div className="px-2 pb-2">
          <AiQuotaBar showEuro={user.is_staff} />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/profile">
            <UserIcon className="mr-2 h-4 w-4" />
            Mein Profil
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/recipes/my-recipes">
            <BookOpen className="mr-2 h-4 w-4" />
            Meine Rezepte
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/profile/account">
            <KeyRound className="mr-2 h-4 w-4" />
            Konto &amp; Anmeldung
          </Link>
        </DropdownMenuItem>
        {user.is_staff && (
          <DropdownMenuItem asChild>
            <Link to="/admin">
              <Settings className="mr-2 h-4 w-4" />
              Stammdaten
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={handleLogout}>
          <LogOut className="mr-2 h-4 w-4" />
          Abmelden
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
