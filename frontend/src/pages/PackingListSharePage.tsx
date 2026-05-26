import { useParams } from 'react-router-dom';
import {
  useSharedPackingList,
  useUpdateShareCheck,
} from '@/api/packingLists';
import type { SharedPackingCategory, SharedPackingItem } from '@/schemas/packingList';

// ---------------------------------------------------------------------------
// Progress bar (simplified version for share view)
// ---------------------------------------------------------------------------
function ProgressBar({ checked, total }: { checked: number; total: number }) {
  const pct = total > 0 ? Math.round((checked / total) * 100) : 0;

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            pct === 100 ? 'bg-green-500' : 'bg-teal-500'
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">
        {checked}/{total}
        {pct === 100 && (
          <span className="ml-1 text-green-600">
            <span className="material-symbols-outlined text-xs align-middle">check_circle</span>
          </span>
        )}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Item row for share view (checkable, except DNB items)
// ---------------------------------------------------------------------------
function ShareItemRow({
  item,
  token,
}: {
  item: SharedPackingItem;
  token: string;
}) {
  const updateCheck = useUpdateShareCheck(token);
  const isDnb = item.is_do_not_bring;

  return (
    <div className="flex items-center gap-2 py-1">
      {/* Checkbox or prohibition icon */}
      {isDnb ? (
        <span
          className="shrink-0 w-5 h-5 flex items-center justify-center text-red-500"
          title="Nicht mitbringen"
        >
          <span className="material-symbols-outlined text-lg">block</span>
        </span>
      ) : (
        <button
          type="button"
          onClick={() =>
            updateCheck.mutate({ item_id: item.id, is_checked: !item.is_checked })
          }
          disabled={updateCheck.isPending}
          className={`shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition ${
            item.is_checked
              ? 'bg-teal-500 border-teal-500 text-white'
              : 'border-muted-foreground/30 hover:border-teal-500'
          }`}
          title={item.is_checked ? 'Als nicht gepackt markieren' : 'Als gepackt markieren'}
        >
          {item.is_checked && (
            <span className="material-symbols-outlined text-xs">check</span>
          )}
        </button>
      )}

      {/* Item name */}
      <span
        className={`flex-1 text-sm ${
          isDnb
            ? 'line-through text-red-500/70'
            : item.is_checked
              ? 'line-through text-muted-foreground'
              : ''
        }`}
      >
        {item.name}
      </span>

      {/* DNB badge */}
      {isDnb && (
        <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600 font-medium shrink-0 hidden sm:inline">
          Nicht mitbringen
        </span>
      )}

      {/* Quantity */}
      {!isDnb && item.quantity && (
        <span className="text-xs text-muted-foreground shrink-0">
          {item.quantity}
        </span>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Category section for share view
// ---------------------------------------------------------------------------
function ShareCategorySection({
  category,
  token,
}: {
  category: SharedPackingCategory;
  token: string;
}) {
  const packableItems = category.items.filter((i) => !i.is_do_not_bring);
  const checkedCount = packableItems.filter((i) => i.is_checked).length;
  const totalCount = packableItems.length;

  return (
    <div className="border rounded-lg bg-card overflow-hidden">
      {/* Category header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-muted/30 border-b">
        <span className="material-symbols-outlined text-teal-600 text-lg shrink-0">folder</span>
        <span className="flex-1 font-semibold text-sm">{category.name}</span>

        {totalCount > 0 && (
          <div className="w-24 shrink-0">
            <ProgressBar checked={checkedCount} total={totalCount} />
          </div>
        )}

        <span className="text-xs text-muted-foreground shrink-0">
          {totalCount} {totalCount === 1 ? 'Gegenstand' : 'Gegenstände'}
        </span>
      </div>

      {/* Items */}
      <div className="px-4 py-2">
        {category.items.length === 0 && (
          <p className="text-sm text-muted-foreground italic py-2">Keine Gegenstände</p>
        )}

        {category.items.map((item) => (
          <ShareItemRow key={item.id} item={item} token={token} />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main share page
// ---------------------------------------------------------------------------
export default function PackingListSharePage() {
  const { token } = useParams<{ token: string }>();

  const { data: sharedList, isLoading, error } = useSharedPackingList(token ?? '');

  // --- Loading ---
  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6 space-y-4">
        <div className="animate-pulse h-8 w-48 bg-muted rounded" />
        <div className="animate-pulse h-4 w-72 bg-muted rounded" />
        <div className="animate-pulse h-32 bg-muted rounded-lg" />
        <div className="animate-pulse h-32 bg-muted rounded-lg" />
      </div>
    );
  }

  // --- Error / inactive token ---
  if (error || !sharedList) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-6">
        <div className="text-center py-12">
          <span className="material-symbols-outlined text-5xl text-muted-foreground mb-4 block">
            link_off
          </span>
          <h1 className="text-xl font-bold mb-2">Dieser Link ist nicht mehr gültig</h1>
          <p className="text-muted-foreground text-sm mb-4">
            Der Share-Link wurde deaktiviert oder die Packliste existiert nicht mehr.
          </p>
          <a
            href="/packing-lists"
            className="inline-block px-4 py-2 bg-gradient-to-r from-teal-500 to-cyan-600 text-white rounded-md text-sm hover:opacity-90 transition"
          >
            Zu den Packlisten
          </a>
        </div>
      </div>
    );
  }

  // Compute overall progress (excluding DNB items)
  const totalItems = sharedList.categories.reduce(
    (sum, cat) => sum + cat.items.filter((i) => !i.is_do_not_bring).length,
    0,
  );
  const checkedItems = sharedList.categories.reduce(
    (sum, cat) => sum + cat.items.filter((i) => !i.is_do_not_bring && i.is_checked).length,
    0,
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-2">
        <h1 className="text-xl sm:text-2xl font-bold">{sharedList.title}</h1>
      </div>

      {/* Description */}
      {sharedList.description && (
        <p className="text-sm text-muted-foreground mb-4">{sharedList.description}</p>
      )}

      {/* Share label */}
      {sharedList.share_label && (
        <div className="flex items-center gap-2 mb-3 px-3 py-2 bg-teal-50 border border-teal-200 rounded-lg text-sm text-teal-700">
          <span className="material-symbols-outlined text-lg">person</span>
          <span>{sharedList.share_label}</span>
        </div>
      )}

      {/* Overall progress */}
      {totalItems > 0 && (
        <div className="mb-4 p-3 bg-muted/30 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">
              Fortschritt: {checkedItems} von {totalItems} gepackt
            </span>
          </div>
          <ProgressBar checked={checkedItems} total={totalItems} />
        </div>
      )}

      {/* Meta info */}
      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground mb-6">
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">person</span>
          {sharedList.owner_name}
        </span>
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">category</span>
          {sharedList.categories.length} Kategorien
        </span>
        <span className="flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">checklist</span>
          {totalItems} Gegenstände
        </span>
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {sharedList.categories.length === 0 && (
          <div className="text-center py-8">
            <span className="material-symbols-outlined text-4xl text-muted-foreground mb-2 block">
              inventory_2
            </span>
            <p className="text-muted-foreground text-sm">Diese Packliste ist noch leer.</p>
          </div>
        )}

        {sharedList.categories.map((category) => (
          <ShareCategorySection
            key={category.id}
            category={category}
            token={token ?? ''}
          />
        ))}
      </div>

      {/* Footer note */}
      <div className="mt-8 text-center text-xs text-muted-foreground">
        <p>
          Deine Häkchen werden gespeichert und sind nur über diesen Link sichtbar.
        </p>
      </div>
    </div>
  );
}
