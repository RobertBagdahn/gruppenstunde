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
import { toast } from 'sonner';
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

function MyProfileSkeleton() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 animate-pulse space-y-6">
      <div className="flex items-center gap-4">
        <div className="w-20 h-20 rounded-full bg-muted" />
        <div className="space-y-2 flex-1">
          <div className="h-6 w-40 bg-muted rounded" />
          <div className="h-4 w-24 bg-muted rounded" />
        </div>
      </div>
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border border-border bg-card p-5 space-y-3">
          <div className="h-5 w-32 bg-muted rounded" />
          <div className="h-10 w-full bg-muted rounded" />
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
      navigate('/login');
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
      toast.success('Profil gespeichert');
      setDialogOpen(false);
    } catch {
      toast.error('Fehler beim Speichern');
    }
  }

  async function handlePictureUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast.error('Nur JPEG, PNG oder WebP erlaubt');
      return;
    }
    if (file.size > 500_000) {
      toast.error('Maximal 500 KB');
      return;
    }

    try {
      await uploadPicture.mutateAsync(file);
      toast.success('Profilbild hochgeladen');
    } catch {
      toast.error('Fehler beim Hochladen');
    }

    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handlePictureDelete() {
    try {
      await deletePicture.mutateAsync();
      toast.success('Profilbild entfernt');
    } catch {
      toast.error('Fehler beim Entfernen');
    }
  }

  const isPending = updateProfile.isPending || uploadPicture.isPending || deletePicture.isPending;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      {/* Profile Picture & Name */}
      <section className="flex flex-col items-center gap-4">
        <div className="relative group">
          <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden">
            {profile.profile_picture_url ? (
              <img
                src={profile.profile_picture_url}
                alt="Profilbild"
                className="w-full h-full object-cover"
              />
            ) : (
              <User className="w-12 h-12 text-muted-foreground" />
            )}
          </div>
          <div className="absolute inset-0 rounded-full bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-white p-1 hover:bg-white/20 rounded-full transition-colors"
            >
              <Camera className="w-5 h-5" />
            </button>
            {profile.profile_picture_url && (
              <button
                type="button"
                onClick={handlePictureDelete}
                className="text-white p-1 hover:bg-white/20 rounded-full transition-colors"
              >
                <Trash2 className="w-5 h-5" />
              </button>
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
        <div className="text-center">
          <h1 className="font-display font-bold text-2xl text-foreground">
            {profile.scout_name || profile.first_name}
          </h1>
          <p className="text-sm text-muted-foreground">
            {user.email}
          </p>
        </div>
      </section>

      {/* View Mode: Personal Data */}
      <section className="rounded-xl border border-border bg-card p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-display font-bold text-lg text-foreground">Persönliche Daten</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm">
                <Pencil className="w-4 h-4 mr-2" />
                Bearbeiten
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Profil bearbeiten</DialogTitle>
              </DialogHeader>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 py-4">
                <div className="space-y-2">
                  <Label htmlFor="scout_name">Pfadfindername</Label>
                  <Input id="scout_name" {...form.register('scout_name')} />
                  {form.formState.errors.scout_name && (
                    <p className="text-xs text-destructive">{form.formState.errors.scout_name.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">Vorname</Label>
                    <Input id="first_name" {...form.register('first_name')} />
                    {form.formState.errors.first_name && (
                      <p className="text-xs text-destructive">{form.formState.errors.first_name.message}</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Nachname</Label>
                    <Input id="last_name" {...form.register('last_name')} />
                    {form.formState.errors.last_name && (
                      <p className="text-xs text-destructive">{form.formState.errors.last_name.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="gender">Geschlecht</Label>
                    <Select
                      value={form.watch('gender')}
                      onValueChange={(v) => form.setValue('gender', v)}
                    >
                      <SelectTrigger id="gender">
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
                  <div className="space-y-2">
                    <Label htmlFor="birthday">Geburtstag</Label>
                    <Input
                      id="birthday"
                      type="date"
                      value={form.watch('birthday') || ''}
                      onChange={(e) => form.setValue('birthday', e.target.value || null)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="about_me">Über mich</Label>
                  <Textarea
                    id="about_me"
                    rows={4}
                    {...form.register('about_me')}
                    placeholder="Erzähle etwas über dich..."
                  />
                  {form.formState.errors.about_me && (
                    <p className="text-xs text-destructive">{form.formState.errors.about_me.message}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="is_public" className="font-medium">Profil öffentlich</Label>
                    <p className="text-sm text-muted-foreground">
                      Für andere sichtbar machen
                    </p>
                  </div>
                  <Switch
                    id="is_public"
                    checked={form.watch('is_public')}
                    onCheckedChange={(v) => form.setValue('is_public', v)}
                  />
                </div>

                <DialogFooter>
                  <DialogClose asChild>
                    <Button type="button" variant="outline">Abbrechen</Button>
                  </DialogClose>
                  <Button type="submit" disabled={isPending}>
                    <Save className="w-4 h-4 mr-2" />
                    Speichern
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Pfadfindername</p>
            <p className="text-foreground font-medium">{profile.scout_name || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Vorname</p>
            <p className="text-foreground font-medium">{profile.first_name || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Nachname</p>
            <p className="text-foreground font-medium">{profile.last_name || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Geschlecht</p>
            <p className="text-foreground font-medium">{genderLabels[profile.gender] || profile.gender || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Geburtstag</p>
            <p className="text-foreground font-medium">{formatDate(profile.birthday)}</p>
          </div>
        </div>

        <div>
          <p className="text-sm text-muted-foreground">Über mich</p>
          <p className="text-foreground font-medium whitespace-pre-wrap">{profile.about_me || '—'}</p>
        </div>
      </section>

      {/* Visibility */}
      <section className="rounded-xl border border-border bg-card p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display font-bold text-lg text-foreground">Sichtbarkeit</h2>
            <p className="text-sm text-muted-foreground">
              Dein Profil mit Rezepten, Essensplänen und Einkaufslisten für andere sichtbar machen.
            </p>
          </div>
          <span className={`text-sm font-medium ${profile.is_public ? 'text-primary' : 'text-muted-foreground'}`}>
            {profile.is_public ? 'Öffentlich' : 'Privat'}
          </span>
        </div>
      </section>

      {/* Meine Daten */}
      <section className="space-y-4">
        <h2 className="font-display font-bold text-lg text-foreground flex items-center gap-2">
          Meine Daten
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Link
            to="/recipes?origin=mine"
            className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <BookOpen className="w-5 h-5 text-primary" />
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-2xl font-extrabold font-display text-foreground">
              {myRecipes?.total ?? '-'}
            </p>
            <p className="text-sm text-muted-foreground">Rezepte</p>
          </Link>

          <Link
            to="/meal-plans/app"
            className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <Utensils className="w-5 h-5 text-primary" />
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-2xl font-extrabold font-display text-foreground">
              {myMealPlans?.length ?? '-'}
            </p>
            <p className="text-sm text-muted-foreground">Essenspläne</p>
          </Link>

          <Link
            to="/shopping-lists"
            className="rounded-xl border border-border bg-card p-5 hover:border-primary/40 hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between mb-3">
              <ShoppingCart className="w-5 h-5 text-primary" />
              <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <p className="text-2xl font-extrabold font-display text-foreground">
              {myShoppingLists?.total ?? '-'}
            </p>
            <p className="text-sm text-muted-foreground">Einkaufslisten</p>
          </Link>
        </div>
      </section>
    </div>
  );
}
