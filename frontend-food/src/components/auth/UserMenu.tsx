/**
 * Header account menu: "Anmelden" for visitors, avatar menu for logged-in users.
 */
import { BookOpen, KeyRound, LogIn, LogOut, Settings, User as UserIcon } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
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
    return <div className="h-9 w-28 animate-pulse rounded-lg bg-muted" aria-hidden="true" />;
  }

  if (!user) {
    return (
      <Button
        variant="ghost"
        className="gap-2 font-semibold text-primary hover:bg-primary/10"
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
        toast.success('Du bist abgemeldet.');
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
          className="flex items-center gap-2 rounded-xl px-2 py-1.5 text-sm font-semibold text-muted-foreground transition-all hover:bg-muted hover:text-foreground"
          aria-label="Benutzermenü öffnen"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
            {initial}
          </span>
          <span className="hidden max-w-[10rem] truncate md:inline">{user.display_name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="space-y-0.5">
          <div className="truncate text-sm">{user.display_name}</div>
          <div className="truncate text-xs font-normal text-muted-foreground">{user.email}</div>
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
