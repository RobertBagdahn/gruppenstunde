import { useState } from 'react';
import { useCurrentUser } from '@/api/auth';
import {
  usePersons,
  useCreatePerson,
  useUpdatePerson,
  useDeletePerson,
  useGenderChoices,
  useNutritionalTags,
} from '@/api/events';
import type { Person, Choice } from '@/schemas/event';
import type { NutritionalTag } from '@/schemas/idea';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { toast } from 'sonner';
import ConfirmDialog from '@/components/ConfirmDialog';

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '–';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}

function choiceLabel(choices: Choice[] | undefined, value: string): string {
  return choices?.find((c) => c.value === value)?.label ?? value;
}

// ---------------------------------------------------------------------------
// Person Form (Create / Edit)
// ---------------------------------------------------------------------------

function PersonForm({
  person,
  genderChoices,
  nutritionalTags,
  onCancel,
}: {
  person?: Person;
  genderChoices?: Choice[];
  nutritionalTags?: NutritionalTag[];
  onCancel: () => void;
}) {
  const createPerson = useCreatePerson();
  const updatePerson = useUpdatePerson(person?.id ?? 0);

  const [firstName, setFirstName] = useState(person?.first_name ?? '');
  const [lastName, setLastName] = useState(person?.last_name ?? '');
  const [scoutName, setScoutName] = useState(person?.scout_name ?? '');
  const [email, setEmail] = useState(person?.email ?? '');
  const [birthday, setBirthday] = useState(person?.birthday ?? '');
  const [gender, setGender] = useState(person?.gender ?? 'no_answer');
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>(
    person?.nutritional_tags?.map((t) => t.id) ?? []
  );
  const [address, setAddress] = useState(person?.address ?? '');
  const [zipCode, setZipCode] = useState(person?.zip_code ?? '');
  const [isOwner, setIsOwner] = useState(person?.is_owner ?? false);

  const isEdit = !!person;
  const isPending = createPerson.isPending || updatePerson.isPending;
  const error = createPerson.error || updatePerson.error;

  const handleSubmit = () => {
    const body = {
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      scout_name: scoutName.trim(),
      email: email.trim(),
      birthday: birthday || null,
      gender,
      nutritional_tag_ids: selectedTagIds,
      address: address.trim(),
      zip_code: zipCode.trim(),
      ...(isEdit ? {} : { is_owner: isOwner }),
    };

    if (!body.first_name || !body.last_name) return;

    if (isEdit) {
      updatePerson.mutate(body, { onSuccess: onCancel });
    } else {
      createPerson.mutate(body as Parameters<typeof createPerson.mutate>[0], { onSuccess: onCancel });
    }
  };

  return (
    <div className="border rounded-xl p-4 sm:p-6 bg-card space-y-4">
      <h3 className="text-base font-bold flex items-center gap-2">
        <span className="material-symbols-outlined text-primary text-[20px]">
          {isEdit ? 'edit' : 'person_add'}
        </span>
        {isEdit ? 'Person bearbeiten' : 'Neue Person anlegen'}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Vorname *</label>
          <input
            type="text"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full px-3 py-2 rounded-md border text-sm bg-background"
            placeholder="Vorname"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Nachname *</label>
          <input
            type="text"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full px-3 py-2 rounded-md border text-sm bg-background"
            placeholder="Nachname"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Pfadfindername</label>
          <input
            type="text"
            value={scoutName}
            onChange={(e) => setScoutName(e.target.value)}
            className="w-full px-3 py-2 rounded-md border text-sm bg-background"
            placeholder="Pfadfindername"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">E-Mail</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2 rounded-md border text-sm bg-background"
            placeholder="E-Mail"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Geburtstag</label>
          <input
            type="date"
            value={birthday ?? ''}
            onChange={(e) => setBirthday(e.target.value)}
            className="w-full px-3 py-2 rounded-md border text-sm bg-background"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Geschlecht</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full px-3 py-2 rounded-md border text-sm bg-background"
          >
            {genderChoices?.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            )) ?? (
              <>
                <option value="no_answer">Keine Angabe</option>
                <option value="male">Männlich</option>
                <option value="female">Weiblich</option>
                <option value="diverse">Divers</option>
              </>
            )}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Ernährung</label>
          <div className="space-y-1">
            {nutritionalTags?.map((tag) => (
              <label key={tag.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedTagIds.includes(tag.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedTagIds([...selectedTagIds, tag.id]);
                    } else {
                      setSelectedTagIds(selectedTagIds.filter((id) => id !== tag.id));
                    }
                  }}
                  className="rounded"
                />
                {tag.name}
                {tag.name_opposite && (
                  <span className="text-xs text-muted-foreground">({tag.name_opposite})</span>
                )}
              </label>
            ))}
            {!nutritionalTags?.length && (
              <p className="text-xs text-muted-foreground">Keine Ernährungstags verfügbar</p>
            )}
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Adresse</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full px-3 py-2 rounded-md border text-sm bg-background"
            placeholder="Straße und Hausnummer"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">PLZ</label>
          <input
            type="text"
            value={zipCode}
            onChange={(e) => setZipCode(e.target.value)}
            className="w-full px-3 py-2 rounded-md border text-sm bg-background"
            placeholder="PLZ"
          />
        </div>
      </div>

      {!isEdit && (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={isOwner}
            onChange={(e) => setIsOwner(e.target.checked)}
            className="rounded"
          />
          Das bin ich selbst
        </label>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={handleSubmit}
          disabled={!firstName.trim() || !lastName.trim() || isPending}
          className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm font-medium disabled:opacity-50"
        >
          {isPending ? 'Speichern...' : isEdit ? 'Speichern' : 'Person anlegen'}
        </button>
        <button
          onClick={onCancel}
          className="px-4 py-2 border rounded-md text-sm hover:bg-muted"
        >
          Abbrechen
        </button>
      </div>

      {error && (
        <p className="text-xs text-destructive">{error.message}</p>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Person Card
// ---------------------------------------------------------------------------

function PersonCard({
  person,
  genderChoices,
  nutritionalTags: _nutritionalTags,
  onEdit,
}: {
  person: Person;
  genderChoices?: Choice[];
  nutritionalTags?: NutritionalTag[];
  onEdit: () => void;
}) {
  const deletePerson = useDeletePerson();
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      <ConfirmDialog
        open={showDeleteConfirm}
        onConfirm={() => {
          deletePerson.mutate(person.id, {
            onSuccess: () => {
              toast.success('Person geloescht');
              setShowDeleteConfirm(false);
            },
            onError: (err) => {
              toast.error('Fehler beim Loeschen', { description: err.message });
              setShowDeleteConfirm(false);
            },
          });
        }}
        onCancel={() => setShowDeleteConfirm(false)}
        title={`„${person.first_name} ${person.last_name}" loeschen?`}
        description="Diese Aktion kann nicht rueckgaengig gemacht werden."
        confirmLabel="Loeschen"
        loading={deletePerson.isPending}
      />
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setShowDetails(!showDetails)}
      >
        <div className={cn(
          'flex items-center justify-center w-10 h-10 rounded-full text-white text-sm font-bold shrink-0',
          person.is_owner
            ? 'bg-gradient-to-br from-primary to-[hsl(174,60%,41%)]'
            : 'bg-muted-foreground/30 text-muted-foreground'
        )}>
          {(person.first_name[0] ?? '?').toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-medium text-sm">
              {person.first_name} {person.last_name}
            </p>
            {person.is_owner && (
              <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                Ich
              </span>
            )}
            {person.scout_name && (
              <span className="text-xs text-muted-foreground">
                „{person.scout_name}"
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5">
            {person.email && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">mail</span>
                {person.email}
              </span>
            )}
            {person.birthday && (
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">cake</span>
                {formatDate(person.birthday)}
              </span>
            )}
          </div>
        </div>
        <span className="material-symbols-outlined text-[20px] text-muted-foreground shrink-0 transition-transform" style={{ transform: showDetails ? 'rotate(180deg)' : undefined }}>
          expand_more
        </span>
      </div>

      {showDetails && (
        <div className="border-t px-4 py-3 space-y-3 bg-muted/10">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Geschlecht</p>
              <p>{choiceLabel(genderChoices, person.gender)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Ernährung</p>
              <p>{person.nutritional_tags.length > 0
                ? person.nutritional_tags.map((t) => t.name).join(', ')
                : '–'}</p>
            </div>
            {person.address && (
              <div>
                <p className="text-xs text-muted-foreground">Adresse</p>
                <p>{person.address}</p>
              </div>
            )}
            {person.zip_code && (
              <div>
                <p className="text-xs text-muted-foreground">PLZ</p>
                <p>{person.zip_code}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Erstellt am</p>
              <p>{formatDate(person.created_at)}</p>
            </div>
          </div>

          <div className="flex gap-2 pt-1">
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border rounded-md hover:bg-muted transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">edit</span>
              Bearbeiten
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowDeleteConfirm(true);
              }}
              disabled={deletePerson.isPending}
              className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-destructive/30 text-destructive rounded-md hover:bg-destructive/5 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[14px]">delete</span>
              Löschen
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export default function PersonsPage() {
  const { data: user, isLoading: userLoading } = useCurrentUser();
  const { data: persons, isLoading: personsLoading } = usePersons();
  const { data: genderChoices } = useGenderChoices();
  const { data: nutritionalTags } = useNutritionalTags();
  const navigate = useNavigate();

  const [showForm, setShowForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);

  useEffect(() => {
    if (!userLoading && !user) {
      navigate('/login');
    }
  }, [user, userLoading, navigate]);

  if (userLoading || !user) {
    return (
      <div className="container py-8 max-w-3xl">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="h-32 bg-muted rounded" />
        </div>
      </div>
    );
  }

  const ownerPerson = persons?.find((p) => p.is_owner);
  const otherPersons = persons?.filter((p) => !p.is_owner) ?? [];

  return (
    <div className="container py-6 sm:py-8 max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Meine Personen</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Verwalte deine Personen für Veranstaltungsanmeldungen
          </p>
        </div>
        <button
          onClick={() => { setShowForm(true); setEditingPerson(null); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-primary text-primary-foreground rounded-lg text-sm font-medium hover:shadow-md transition-all shrink-0"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          <span className="hidden sm:inline">Person hinzufügen</span>
          <span className="sm:hidden">Neu</span>
        </button>
      </div>

      {/* Info Box */}
      <div className="flex items-start gap-3 p-4 rounded-xl bg-primary/5 border border-primary/10">
        <span className="material-symbols-outlined text-primary text-[20px] mt-0.5">info</span>
        <p className="text-sm text-muted-foreground">
          Hier kannst du Personen anlegen, die du bei Veranstaltungen anmelden möchtest –
          z.B. dich selbst, Familienmitglieder oder Freunde. Die Daten werden bei der Anmeldung
          automatisch übernommen.
        </p>
      </div>

      {/* Create / Edit Form */}
      {(showForm || editingPerson) && (
        <PersonForm
          person={editingPerson ?? undefined}
          genderChoices={genderChoices}
          nutritionalTags={nutritionalTags}
          onCancel={() => { setShowForm(false); setEditingPerson(null); }}
        />
      )}

      {/* Owner Person */}
      {ownerPerson && (
        <section>
          <div className="flex items-center gap-2 mb-3">
            <span className="material-symbols-outlined text-primary text-[22px]">person</span>
            <h2 className="text-lg font-bold">Mein Profil</h2>
          </div>
          <PersonCard
            person={ownerPerson}
            genderChoices={genderChoices}
            nutritionalTags={nutritionalTags}
            onEdit={() => { setEditingPerson(ownerPerson); setShowForm(false); }}
          />
        </section>
      )}

      {/* Other Persons */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-primary text-[22px]">group</span>
          <h2 className="text-lg font-bold">Weitere Personen</h2>
          {otherPersons.length > 0 && (
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-primary/10 text-primary">
              {otherPersons.length}
            </span>
          )}
        </div>
        <div className="space-y-2">
          {personsLoading && (
            <>
              <div className="animate-pulse h-20 bg-muted rounded-xl" />
              <div className="animate-pulse h-20 bg-muted rounded-xl" />
            </>
          )}
          {!personsLoading && otherPersons.length === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground border rounded-xl border-dashed">
              <span className="material-symbols-outlined text-[36px] mb-2">group_add</span>
              <p className="text-sm">Noch keine weiteren Personen angelegt</p>
              <button
                onClick={() => { setShowForm(true); setEditingPerson(null); }}
                className="mt-3 text-sm text-primary hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                Person hinzufügen
              </button>
            </div>
          )}
          {otherPersons.map((person) => (
            <PersonCard
              key={person.id}
              person={person}
              genderChoices={genderChoices}
              nutritionalTags={nutritionalTags}
              onEdit={() => { setEditingPerson(person); setShowForm(false); }}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
