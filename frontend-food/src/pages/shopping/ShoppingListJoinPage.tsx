/**
 * ShoppingListJoinPage — landing page of an invitation link. Visitors without an account enter a
 * name (shown next to their entries and checkmarks); logged-in users join as editors right away.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ShoppingCart, UserRound } from 'lucide-react';
import { useCurrentUser } from '@/api/auth';
import { useJoinSharedList, useSharedListPreview } from '@/api/shoppingLists';
import ErrorDisplay from '@/components/ErrorDisplay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SkeletonForm } from '@/components/ui/skeleton';
import { ApiError, getApiErrorMessage } from '@/lib/api';
import { clearGuestCredentials, getGuestCredentials, saveGuestCredentials } from '@/lib/shoppingGuest';

const MAX_NAME_LENGTH = 40;

export default function ShoppingListJoinPage() {
  const { token = '' } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const preview = useSharedListPreview(token);
  const join = useJoinSharedList(token);
  const [name, setName] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const autoJoined = useRef(false);

  const list = preview.data;

  const enter = (listId: number) => navigate(`/shopping-lists/${listId}`, { replace: true });

  // Accounts and returning devices skip the name form.
  useEffect(() => {
    if (!list || userLoading || autoJoined.current) return;
    const stored = getGuestCredentials(list.list_id);
    const returning = !user && stored && stored.shareToken === token ? stored : null;
    if (!user && !returning) return;
    autoJoined.current = true;
    join.mutate(
      { name: returning?.name ?? '', listId: list.list_id },
      {
        onSuccess: (joined) => enter(joined.list_id),
        onError: () => {
          // The old guest secret is no longer valid (link renewed or guest removed): ask for a name again.
          if (returning) clearGuestCredentials(list.list_id);
          autoJoined.current = false;
          setFormError(null);
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- runs once per loaded list
  }, [list, user, userLoading]);

  if (preview.isLoading || userLoading) {
    return (
      <div className="flex items-center justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-card sm:p-8">
          <SkeletonForm fields={1} label="Einladung wird geladen" />
        </div>
      </div>
    );
  }

  if (preview.error || !list) {
    const expired = preview.error instanceof ApiError && preview.error.status === 404;
    return (
      <div className="flex items-center justify-center px-4 py-12 sm:py-16">
        <div className="w-full max-w-md rounded-xl bg-card p-6 shadow-card sm:p-8" data-testid="shopping-join-error">
          <ErrorDisplay
            error={preview.error}
            title={expired ? 'Dieser Einladungslink ist nicht mehr gültig' : undefined}
          />
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {!expired && (
              <Button className="w-full sm:w-auto" onClick={() => preview.refetch()}>
                Erneut versuchen
              </Button>
            )}
            <Button variant="secondary" className="w-full sm:w-auto" onClick={() => navigate('/shopping-lists')}>
              Zu meinen Einkaufslisten
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setFormError('Bitte gib deinen Namen ein, damit die anderen sehen, wer was abhakt.');
      return;
    }
    setFormError(null);
    join.mutate(
      { name: trimmed, listId: list.list_id },
      {
        onSuccess: (joined) => {
          if (joined.guest_token) {
            saveGuestCredentials(joined.list_id, {
              guestToken: joined.guest_token,
              name: joined.display_name,
              shareToken: token,
            });
          }
          enter(joined.list_id);
        },
        onError: (err) => setFormError(getApiErrorMessage(err)),
      },
    );
  };

  return (
    <div className="flex items-center justify-center px-4 py-12 sm:py-16">
      <form onSubmit={submit} className="w-full max-w-md rounded-xl bg-card p-6 sm:p-8 shadow-card" data-testid="shopping-join-form">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary-soft text-primary">
          <ShoppingCart className="h-6 w-6" />
        </div>
        <p className="text-center text-body text-muted-foreground">{list.owner_display_name} lädt dich ein zu</p>
        <h1 className="mt-1 text-center font-display text-title font-extrabold text-foreground [overflow-wrap:anywhere]">
          {list.name}
        </h1>
        <p className="mt-2 text-center text-body text-muted-foreground">
          {list.checked_count} von {list.items_count} Einträgen abgehakt. Du kannst ohne Anmeldung mithelfen.
        </p>

        <label htmlFor="join-name" className="mt-6 mb-1.5 flex items-center gap-1.5 text-body font-semibold text-foreground">
          <UserRound className="h-4 w-4 text-primary" />
          Wie heißt du?
        </label>
        <Input
          id="join-name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={MAX_NAME_LENGTH}
          placeholder="z. B. Anna"
          autoComplete="given-name"
          autoFocus
          aria-invalid={formError ? true : undefined}
          aria-describedby="join-name-hint"
        />
        <p id="join-name-hint" className={`mt-1.5 text-caption ${formError ? 'text-danger' : 'text-muted-foreground'}`} role={formError ? 'alert' : undefined}>
          {formError ?? 'Dein Name erscheint bei Einträgen und beim Abhaken, damit alle sehen, wer was wann gemacht hat.'}
        </p>

        <Button type="submit" className="mt-6 w-full" disabled={join.isPending}>
          Einkaufsliste öffnen
        </Button>
        {!user && (
          <p className="mt-4 text-center text-caption text-muted-foreground">
            Mit einem Konto taucht die Liste dauerhaft in deinen Einkaufslisten auf.
          </p>
        )}
      </form>
    </div>
  );
}
