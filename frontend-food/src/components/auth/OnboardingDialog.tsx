/**
 * Welcome dialog after the first social login. Skippable; completion sets onboarded_at.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { notify } from '@/lib/notify';
import { useCompleteOnboarding, useCurrentUser } from '@/api/auth';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function OnboardingDialog() {
  const { data: user } = useCurrentUser();
  const complete = useCompleteOnboarding();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [scoutName, setScoutName] = useState('');

  useEffect(() => {
    if (user) {
      setFirstName(user.first_name);
      setLastName(user.last_name);
    }
  }, [user]);

  const open = !!user?.needs_onboarding;

  function submit(values: { first_name?: string; last_name?: string; scout_name?: string }) {
    complete.mutate(values, {
      onError: (error) => notify.error('Profil konnte nicht gespeichert werden', { error }),
    });
  }

  return (
    <Dialog open={open} onOpenChange={(value) => !value && submit({})}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Willkommen bei Inspi!</DialogTitle>
          <DialogDescription>
            Dein Konto ist angelegt. Du kannst jetzt speichern, mit deiner Gruppe teilen und den KI-Assistenten
            mit deinem eigenen Tageskontingent nutzen.
          </DialogDescription>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault();
            submit({ first_name: firstName, last_name: lastName, scout_name: scoutName });
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="onboarding-first-name">Vorname</Label>
              <Input id="onboarding-first-name" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="onboarding-last-name">Nachname</Label>
              <Input id="onboarding-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="onboarding-scout-name">Pfadfindername (optional)</Label>
            <Input id="onboarding-scout-name" value={scoutName} onChange={(e) => setScoutName(e.target.value)} />
          </div>
          <p className="text-caption text-muted-foreground">
            Einer Gruppe beitreten kannst du jederzeit in deinem{' '}
            <Link to="/profile" className="underline underline-offset-2" onClick={() => submit({})}>
              Profil
            </Link>
            .
          </p>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="ghost" onClick={() => submit({})} disabled={complete.isPending}>
              Später
            </Button>
            <Button type="submit" disabled={complete.isPending}>
              Speichern
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
