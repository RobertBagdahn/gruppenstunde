import { useRef, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { User, Camera, Trash2, Save, BookOpen, Utensils, ShoppingCart, ArrowRight, Pencil } from 'lucide-react';
import { useCurrentUser } from '@/api/auth';
import {
  useMyProfile,
  useUpdateMyProfile,
  useUploadProfilePicture,
  useDeleteProfilePicture,
} from '@/api/profile';
import { useMyRecipes } from '@/api/recipes';
import { useMealPlans } from '@/api/mealPlans';
import { useShoppingLists } from '@/api/shoppingLists';
import { notify } from '@/lib/notify';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import { applyApiFieldErrors } from '@/lib/formErrors';
import DetailHeader from '@/components/shared/DetailHeader';
import WizardSectionHeading from '@/pages/planning/wizard/WizardSectionHeading';
import {
  WIZARD_ERROR_CLASS,
  WIZARD_INPUT_CLASS,
  WIZARD_LABEL_CLASS,
} from '@/pages/planning/wizard/wizardStyles';

const genderOptions = [
  { value: 'male', label: 'Männlich' },
  { value: 'female', label: 'Weiblich' },
  { value: 'diverse', label: 'Divers' },
  { value: 'no_answer', label: 'Keine Angabe' },
];

const genderLabels: Record<string, string> = {
  male: 'Männlich',
  female: 'Weiblich',
  diverse: 'Divers',
  no_answer: 'Keine Angabe',
};

const ProfileFormSchema = z.object({
  scout_name: z.string().max(100, 'Maximal 100 Zeichen'),
  first_name: z.string().max(100, 'Maximal 100 Zeichen'),
  last_name: z.string().max(100, 'Maximal 100 Zeichen'),
  gender: z.string(),
  birthday: z.string().nullable(),
  about_me: z.string().max(500, 'Maximal 500 Zeichen'),
  is_public: z.boolean(),
});

type ProfileFormData = z.infer<typeof ProfileFormSchema>;

/** Secondary action (Petrol-Soft), 44 px tall. */
const SECONDARY_BUTTON_CLASS = 'h-11 gap-2 bg-primary-soft text-primary-dark hover:bg-primary-soft-border';

function MyProfileSkeleton() {
  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <div className="h-8 w-56 rounded-lg skeleton-shimmer" />
      {[1, 2, 3].map((i) => (
        <div key={i} className="space-y-3 rounded-xl bg-card p-5 shadow-card">
          <div className="h-10 w-48 rounded-lg skeleton-shimmer" />
          <div className="h-11 w-full rounded-lg skeleton-shimmer" />
        </div>
      ))}
    </div>
  );
}

function formatDate(dateString: string | null): string {
  if (!dateString) return '—';
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString('de-DE');
  } catch {
    return dateString;
  }
}

export default function MyProfilePage() {
  const navigate = useNavigate();
  const [dialogOpen, setDialogOpen] = useState(false);
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: profile, isLoading: profileLoading } = useMyProfile();
  const updateProfile = useUpdateMyProfile();
  const uploadPicture = useUploadProfilePicture();
  const deletePicture = useDeleteProfilePicture();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: myRecipes } = useMyRecipes({ page: 1, page_size: 1 });
  const { data: myMealPlans } = useMealPlans();
  const { data: myShoppingLists } = useShoppingLists(1, 1);

  const form = useForm<ProfileFormData>({
    resolver: zodResolver(ProfileFormSchema),
    defaultValues: {
      scout_name: '',
      first_name: '',
      last_name: '',
      gender: 'no_answer',
      birthday: null,
      about_me: '',
      is_public: false,
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        scout_name: profile.scout_name || '',
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        gender: profile.gender || 'no_answer',
        birthday: profile.birthday || null,
        about_me: profile.about_me || '',
        is_public: profile.is_public,
      });
    }
  }, [profile, form]);

  useEffect(() => {
    if (!userLoading && !user) {
      navigate('/login?next=%2Fprofile', { replace: true });
    }
  }, [user, userLoading, navigate]);

  if (userLoading || profileLoading) return <MyProfileSkeleton />;
  if (!user || !profile) return null;

  async function onSubmit(data: ProfileFormData) {
    try {
      await updateProfile.mutateAsync({
        ...data,
        birthday: data.birthday || null,
      });
      notify.success('Profil gespeichert');
      setDialogOpen(false);
    } catch (err) {
      applyApiFieldErrors(err, form.setError, Object.keys(form.getValues()));
      notify.error('Profil konnte nicht gespeichert werden', { error: err });
    }
  }

  async function handlePictureUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      notify.error('Nur JPEG, PNG oder WebP erlaubt');
      return;
    }
    if (file.size > 500_000) {
      notify.error('Maximal 500 KB');
      return;
    }

    try {
      await uploadPicture.mutateAsync(file);
      notify.success('Profilbild hochgeladen');
    } catch {
      notify.error('Bild konnte nicht hochgeladen werden');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handlePictureDelete() {
    try {
      await deletePicture.mutateAsync();
      notify.success('Profilbild entfernt');
    } catch {
      notify.error('Bild konnte nicht entfernt werden');
    }
  }

  const isPending = updateProfile.isPending || uploadPicture.isPending || deletePicture.isPending;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <DetailHeader
        title={profile.scout_name || profile.first_name}
        description={<span className="break-all">{user.email}</span>}
      />

      {/* Profile picture */}
      <section className="flex flex-col gap-5 rounded-xl bg-card p-5 shadow-card sm:flex-row sm:items-center">
        <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary-soft text-primary-dark">
          {profile.profile_picture_url ? (
            <img src={profile.profile_picture_url} alt="Profilbild" className="h-full w-full object-cover" />
          ) : (
            <User className="h-12 w-12" aria-hidden="true" />
          )}
        </div>
        <div className="flex flex-1 flex-col gap-3">
          <p className="text-body text-muted-foreground">
            {profile.profile_picture_url
              ? 'So sieht dein Profilbild aus. Du kannst es ersetzen oder entfernen.'
              : 'Lade ein Bild hoch (JPEG, PNG oder WebP, höchstens 500 KB).'}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              className={SECONDARY_BUTTON_CLASS}
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="h-4 w-4" aria-hidden="true" />
              {profile.profile_picture_url ? 'Foto ändern' : 'Foto hochladen'}
            </Button>
            {profile.profile_picture_url && (
              <Button type="button" variant="outline" className="h-11 gap-2" onClick={handlePictureDelete}>
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Entfernen
              </Button>
            )}
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handlePictureUpload}
        />
      </section>

      {/* Personal data (view mode, edit in dialog) */}
      <section className="rounded-xl bg-card p-5 shadow-card">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 [&>h3]:mb-0">
          <WizardSectionHeading icon={<User className="h-5 w-5" />}>Persönliche Daten</WizardSectionHeading>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button type="button" className={SECONDARY_BUTTON_CLASS}>
                <Pencil className="h-4 w-4" aria-hidden="true" />
                Bearbeiten
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="font-display text-section font-bold">Profil bearbeiten</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5 py-2">
                <div>
                  <Label htmlFor="scout_name" className={WIZARD_LABEL_CLASS}>
                    Pfadfindername
                  </Label>
                  <Input id="scout_name" className={WIZARD_INPUT_CLASS} {...form.register('scout_name')} />
                  {form.formState.errors.scout_name && (
                    <p className={WIZARD_ERROR_CLASS}>{form.formState.errors.scout_name.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="first_name" className={WIZARD_LABEL_CLASS}>
                      Vorname
                    </Label>
                    <Input id="first_name" className={WIZARD_INPUT_CLASS} {...form.register('first_name')} />
                    {form.formState.errors.first_name && (
                      <p className={WIZARD_ERROR_CLASS}>{form.formState.errors.first_name.message}</p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="last_name" className={WIZARD_LABEL_CLASS}>
                      Nachname
                    </Label>
                    <Input id="last_name" className={WIZARD_INPUT_CLASS} {...form.register('last_name')} />
                    {form.formState.errors.last_name && (
                      <p className={WIZARD_ERROR_CLASS}>{form.formState.errors.last_name.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="gender" className={WIZARD_LABEL_CLASS}>
                      Geschlecht
                    </Label>
                    <Select value={form.watch('gender')} onValueChange={(v) => form.setValue('gender', v)}>
                      <SelectTrigger id="gender" className={WIZARD_INPUT_CLASS}>
                        <SelectValue placeholder="Auswählen" />
                      </SelectTrigger>
                      <SelectContent>
                        {genderOptions.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="birthday" className={WIZARD_LABEL_CLASS}>
                      Geburtstag
                    </Label>
                    <Input
                      id="birthday"
                      type="date"
                      className={WIZARD_INPUT_CLASS}
                      value={form.watch('birthday') || ''}
                      onChange={(e) => form.setValue('birthday', e.target.value || null)}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="about_me" className={WIZARD_LABEL_CLASS}>
                    Über mich
                  </Label>
                  <Textarea
                    id="about_me"
                    rows={4}
                    className={WIZARD_INPUT_CLASS}
                    {...form.register('about_me')}
                    placeholder="Erzähle etwas über dich..."
                  />
                  {form.formState.errors.about_me && (
                    <p className={WIZARD_ERROR_CLASS}>{form.formState.errors.about_me.message}</p>
                  )}
                </div>

                <div className="flex min-h-11 items-center justify-between gap-4 rounded-lg border border-border p-3">
                  <div>
                    <Label htmlFor="is_public" className="font-medium">
                      Profil öffentlich
                    </Label>
                    <p className="text-body text-muted-foreground">Für andere sichtbar machen</p>
                  </div>
                  <Switch
                    id="is_public"
                    checked={form.watch('is_public')}
                    onCheckedChange={(v) => form.setValue('is_public', v)}
                  />
                </div>

                <DialogFooter className="gap-2 sm:gap-2">
                  <DialogClose asChild>
                    <Button type="button" className={SECONDARY_BUTTON_CLASS}>
                      Abbrechen
                    </Button>
                  </DialogClose>
                  <Button type="submit" className="h-11 gap-2" disabled={isPending}>
                    <Save className="h-4 w-4" aria-hidden="true" />
                    Speichern
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
          <div>
            <dt className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">
              Pfadfindername
            </dt>
            <dd className="font-medium text-foreground">{profile.scout_name || '—'}</dd>
          </div>
          <div>
            <dt className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Vorname</dt>
            <dd className="font-medium text-foreground">{profile.first_name || '—'}</dd>
          </div>
          <div>
            <dt className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Nachname</dt>
            <dd className="font-medium text-foreground">{profile.last_name || '—'}</dd>
          </div>
          <div>
            <dt className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Geschlecht</dt>
            <dd className="font-medium text-foreground">{genderLabels[profile.gender] || profile.gender || '—'}</dd>
          </div>
          <div>
            <dt className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Geburtstag</dt>
            <dd className="font-medium text-foreground">{formatDate(profile.birthday)}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Über mich</dt>
            <dd className="whitespace-pre-wrap font-medium text-foreground">{profile.about_me || '—'}</dd>
          </div>
        </dl>
      </section>

      {/* Visibility */}
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-card p-5 shadow-card">
        <div className="min-w-0">
          <WizardSectionHeading icon={<Utensils className="h-5 w-5" />}>Sichtbarkeit</WizardSectionHeading>
          <p className="text-body text-muted-foreground">
            Dein Profil mit Rezepten, Essensplänen und Einkaufslisten für andere sichtbar machen.
          </p>
        </div>
        <span
          className={
            profile.is_public
              ? 'inline-flex items-center rounded-full bg-primary-soft px-3 py-1 text-body font-bold text-primary-dark'
              : 'inline-flex items-center rounded-full bg-muted px-3 py-1 text-body font-bold text-muted-foreground'
          }
        >
          {profile.is_public ? 'Öffentlich' : 'Privat'}
        </span>
      </section>

      {/* Meine Daten */}
      <section>
        <h2 className="mb-4 font-display text-section font-bold text-foreground">Meine Daten</h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Link to="/recipes?origin=mine" className="card-hover press flex flex-col rounded-xl bg-card p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <BookOpen className="h-5 w-5" aria-hidden="true" />
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="font-display text-metric font-extrabold tabular-nums text-foreground">
              {myRecipes?.total ?? '-'}
            </p>
            <p className="text-body text-muted-foreground">Rezepte</p>
          </Link>

          <Link to="/meal-plans/app" className="card-hover press flex flex-col rounded-xl bg-card p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <Utensils className="h-5 w-5" aria-hidden="true" />
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="font-display text-metric font-extrabold tabular-nums text-foreground">
              {myMealPlans?.length ?? '-'}
            </p>
            <p className="text-body text-muted-foreground">Essenspläne</p>
          </Link>

          <Link to="/shopping-lists" className="card-hover press flex flex-col rounded-xl bg-card p-5 shadow-card">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary-soft text-primary">
                <ShoppingCart className="h-5 w-5" aria-hidden="true" />
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            </div>
            <p className="font-display text-metric font-extrabold tabular-nums text-foreground">
              {myShoppingLists?.total ?? '-'}
            </p>
            <p className="text-body text-muted-foreground">Einkaufslisten</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
