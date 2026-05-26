/**
 * Step 8: Zusammenfassung — overview of all settings, create button.
 */
import { useEffect } from 'react';
import { useEventWizardStore } from '@/store/eventWizardStore';
import { useLocations } from '@/api/events';
import { usePackingLists } from '@/api/packingLists';
import { useMyGroups } from '@/api/profile';
import { getEventIcon } from './IconPicker';
import { getColorBgClass } from './ColorPicker';
import { cn } from '@/lib/utils';

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function StepSummary() {
  const { data, setStepValid } = useEventWizardStore();
  const { data: locations } = useLocations();
  const { data: packingLists } = usePackingLists();
  const { data: groups } = useMyGroups();

  // Always valid
  useEffect(() => {
    setStepValid(7, true);
  }, [setStepValid]);

  const selectedLocation = locations?.find((l) => l.id === data.event_location_id);
  const selectedPackingList = packingLists?.find((pl) => pl.id === data.packing_list_id);
  const EventIcon = getEventIcon(data.icon || 'tent');

  const selectedGroupNames = groups
    ?.filter((g) => data.invited_group_ids?.includes(g.id))
    .map((g) => g.name) || [];

  const sections = [
    {
      title: 'Grunddaten',
      icon: 'edit_note',
      items: [
        { label: 'Name', value: data.name },
        { label: 'Farbe', value: data.color || 'blue', isColor: true },
        { label: 'Icon', value: data.icon || 'tent', isIcon: true },
        ...(data.description ? [{ label: 'Beschreibung', value: 'Vorhanden' }] : []),
        ...(data.is_template ? [{ label: 'Vorlage', value: 'Ja' }] : []),
      ],
    },
    {
      title: 'Einladung',
      icon: 'group',
      items: [
        {
          label: 'Eingeladene Gruppen',
          value: selectedGroupNames.length
            ? selectedGroupNames.join(', ')
            : 'Keine',
        },
        {
          label: 'Eingeladene Personen',
          value: data.invited_user_ids?.length
            ? `${data.invited_user_ids.length} Personen`
            : 'Keine',
        },
      ],
    },
    {
      title: 'Datum & Ort',
      icon: 'location_on',
      items: [
        { label: 'Start', value: formatDate(data.start_date) },
        { label: 'Ende', value: formatDate(data.end_date) },
        {
          label: 'Ort',
          value: selectedLocation
            ? `${selectedLocation.name}, ${selectedLocation.city}`
            : data.location || '—',
        },
      ],
    },
    {
      title: 'Anmeldung',
      icon: 'how_to_reg',
      items: [
        { label: 'Anmeldung ab', value: formatDate(data.registration_start) },
        { label: 'Anmeldeschluss', value: formatDate(data.registration_deadline) },
        { label: 'Öffentlich', value: data.is_public ? 'Ja' : 'Nein' },
        { label: 'Gastanmeldung', value: data.guest_registration_enabled ? 'Ja' : 'Nein' },
      ],
    },
    {
      title: 'Buchungsoptionen',
      icon: 'payments',
      items: data.booking_options?.length
        ? data.booking_options.map((o) => ({
            label: o.name,
            value: `${o.price || '0.00'}\u20AC${o.max_participants ? ` (max. ${o.max_participants})` : ''}`,
          }))
        : [{ label: 'Optionen', value: 'Keine' }],
    },
    {
      title: 'Packliste',
      icon: 'checklist',
      items: [
        {
          label: 'Packliste',
          value: selectedPackingList?.title ?? 'Keine',
        },
      ],
    },
    {
      title: 'Einladungstext',
      icon: 'mail',
      items: [
        {
          label: 'Einladungstext',
          value: data.invitation_text ? 'Vorhanden' : 'Nicht erstellt',
        },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold mb-1">Zusammenfassung</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Prüfe die Einstellungen und erstelle dein Event.
        </p>
      </div>

      {/* Event header preview */}
      <div className="flex items-center gap-3 p-4 border rounded-lg bg-card">
        <div
          className={cn(
            'flex items-center justify-center w-12 h-12 rounded-full text-white',
            getColorBgClass(data.color || 'blue'),
          )}
        >
          <EventIcon className="w-6 h-6" />
        </div>
        <div>
          <h3 className="font-bold text-lg">{data.name || 'Unbenanntes Event'}</h3>
          {data.start_date && (
            <p className="text-sm text-muted-foreground">{formatDate(data.start_date)}</p>
          )}
        </div>
        {data.is_template && (
          <span className="ml-auto text-xs bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
            Vorlage
          </span>
        )}
      </div>

      {/* Settings grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sections.map((section) => (
          <div key={section.title} className="border rounded-lg p-3 bg-card">
            <h4 className="text-xs font-semibold text-muted-foreground flex items-center gap-1 mb-2">
              <span className="material-symbols-outlined text-[14px]">{section.icon}</span>
              {section.title}
            </h4>
            <div className="space-y-1">
              {section.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{item.label}</span>
                  {'isColor' in item && item.isColor ? (
                    <div
                      className={cn(
                        'w-5 h-5 rounded-full',
                        getColorBgClass(item.value),
                      )}
                    />
                  ) : 'isIcon' in item && item.isIcon ? (
                    (() => {
                      const I = getEventIcon(item.value);
                      return <I className="w-4 h-4 text-muted-foreground" />;
                    })()
                  ) : (
                    <span className="font-medium text-right truncate max-w-[60%]">
                      {item.value}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
