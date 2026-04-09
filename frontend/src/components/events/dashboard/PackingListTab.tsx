/**
 * PackingListTab — Display the event's linked packing list.
 * Members see read-only view. Managers can navigate to edit.
 * If no packing list is linked, managers can create/link one.
 */
import type { EventDetail } from '@/schemas/event';

interface Props {
  event: EventDetail;
  isManager: boolean;
}

export default function PackingListTab({ event, isManager }: Props) {
  const hasPackingList = event.packing_list_id !== null && event.packing_list_id !== undefined;

  if (!hasPackingList) {
    return (
      <div className="rounded-xl border p-6 text-center">
        <span className="material-symbols-outlined text-[40px] text-muted-foreground mb-2">
          checklist
        </span>
        <p className="text-sm text-muted-foreground mb-3">
          {isManager
            ? 'Es wurde noch keine Packliste verknüpft.'
            : 'Es wurde noch keine Packliste hinterlegt.'}
        </p>
        {isManager && (
          <a
            href="/packing-lists/app"
            className="inline-flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:shadow-lg hover:shadow-violet-500/25 transition-all"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
            Packliste verwalten
          </a>
        )}
      </div>
    );
  }

  // Packing list exists — display a link/embed
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px]">checklist</span>
          Packliste
        </h3>
        {isManager && (
          <a
            href={`/packing-lists/app/${event.packing_list_id}`}
            className="px-3 py-1.5 text-sm font-medium border rounded-lg hover:bg-muted transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
            Bearbeiten
          </a>
        )}
      </div>

      <div className="rounded-xl border p-4">
        <p className="text-sm text-muted-foreground">
          Diese Veranstaltung hat eine verknüpfte Packliste.
        </p>
        <a
          href={`/packing-lists/app/${event.packing_list_id}`}
          className="inline-flex items-center gap-1.5 mt-3 text-sm text-violet-600 hover:text-violet-800 transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">open_in_new</span>
          Packliste ansehen
        </a>
      </div>
    </div>
  );
}
