import { useState } from 'react';
import ToolLandingPage from '@/components/ToolLandingPage';
import { TOOL_PACKING_LISTS } from '@/lib/toolColors';

/* ------------------------------------------------------------------ */
/*  Sandbox: Interactive Packing List Demo                             */
/* ------------------------------------------------------------------ */

interface DemoItem {
  id: number;
  name: string;
  quantity: string;
  checked: boolean;
}

interface DemoCategory {
  id: number;
  name: string;
  icon: string;
  items: DemoItem[];
}

const INITIAL_CATEGORIES: DemoCategory[] = [
  {
    id: 1, name: 'Kleidung', icon: 'checkroom',
    items: [
      { id: 1, name: 'Wanderschuhe', quantity: '1 Paar', checked: false },
      { id: 2, name: 'Regenjacke', quantity: '1x', checked: true },
      { id: 3, name: 'Wechsel-T-Shirts', quantity: '3x', checked: false },
      { id: 4, name: 'Warmer Pullover', quantity: '1x', checked: false },
      { id: 5, name: 'Socken', quantity: '4 Paar', checked: true },
    ],
  },
  {
    id: 2, name: 'Schlafen', icon: 'bed',
    items: [
      { id: 6, name: 'Schlafsack', quantity: '1x', checked: false },
      { id: 7, name: 'Isomatte', quantity: '1x', checked: false },
      { id: 8, name: 'Kissen (optional)', quantity: '1x', checked: false },
    ],
  },
  {
    id: 3, name: 'Hygiene', icon: 'shower',
    items: [
      { id: 9, name: 'Zahnbuerste & Zahnpasta', quantity: '1x', checked: true },
      { id: 10, name: 'Sonnencreme', quantity: '1x', checked: false },
      { id: 11, name: 'Handtuch', quantity: '1x', checked: false },
    ],
  },
  {
    id: 4, name: 'Ausruestung', icon: 'backpack',
    items: [
      { id: 12, name: 'Taschenlampe / Stirnlampe', quantity: '1x', checked: false },
      { id: 13, name: 'Taschenmesser', quantity: '1x', checked: false },
      { id: 14, name: 'Trinkflasche', quantity: '1x', checked: true },
      { id: 15, name: 'Kompass', quantity: '1x', checked: false },
    ],
  },
];

function PackingListSandbox() {
  const [categories, setCategories] = useState<DemoCategory[]>(INITIAL_CATEGORIES);
  const [newItemCatId, setNewItemCatId] = useState<number | null>(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemQty, setNewItemQty] = useState('1x');
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  function toggleItem(catId: number, itemId: number) {
    setCategories(categories.map((cat) =>
      cat.id === catId
        ? { ...cat, items: cat.items.map((item) => item.id === itemId ? { ...item, checked: !item.checked } : item) }
        : cat
    ));
  }

  function addItem(catId: number) {
    if (!newItemName.trim()) return;
    setCategories(categories.map((cat) =>
      cat.id === catId
        ? { ...cat, items: [...cat.items, { id: Date.now(), name: newItemName.trim(), quantity: newItemQty || '1x', checked: false }] }
        : cat
    ));
    setNewItemName('');
    setNewItemQty('1x');
    setNewItemCatId(null);
  }

  function removeItem(catId: number, itemId: number) {
    setCategories(categories.map((cat) =>
      cat.id === catId
        ? { ...cat, items: cat.items.filter((item) => item.id !== itemId) }
        : cat
    ));
  }

  function addCategory() {
    if (!newCategoryName.trim()) return;
    setCategories([...categories, {
      id: Date.now(),
      name: newCategoryName.trim(),
      icon: 'inventory_2',
      items: [],
    }]);
    setNewCategoryName('');
    setShowAddCategory(false);
  }

  const totalItems = categories.reduce((acc, c) => acc + c.items.length, 0);
  const checkedItems = categories.reduce((acc, c) => acc + c.items.filter((i) => i.checked).length, 0);
  const pct = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 mb-6 flex items-start gap-3">
        <span className="material-symbols-outlined text-teal-500 text-[20px] mt-0.5">info</span>
        <p className="text-sm text-teal-700">
          <strong>Sandbox-Modus:</strong> Hake Gegenstaende ab, fuege neue hinzu oder erstelle Kategorien.
          Diese Demo-Packliste wird nicht gespeichert – probier einfach alles aus!
        </p>
      </div>

      {/* Progress Header */}
      <div className="flex items-center gap-4 mb-6 p-4 bg-card rounded-xl border border-border/60 shadow-soft">
        <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-teal-500 to-cyan-600 text-white shadow-md">
          <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>checklist</span>
        </div>
        <div className="flex-1">
          <h3 className="font-extrabold text-lg">Hajk-Packliste (Demo)</h3>
          <div className="flex items-center gap-2 mt-1">
            <div className="flex-1 h-2.5 bg-teal-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-teal-500 to-cyan-600 rounded-full transition-all duration-300"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-sm font-bold text-teal-600">{checkedItems}/{totalItems}</span>
          </div>
        </div>
        {pct === 100 && (
          <span className="text-2xl">✅</span>
        )}
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {categories.map((cat) => (
          <div key={cat.id} className="rounded-2xl border border-border/60 bg-card overflow-hidden shadow-soft">
            <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-teal-500 to-cyan-600 text-white font-bold text-sm">
              <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
              {cat.name}
              <span className="ml-auto text-xs font-normal text-white/70">
                {cat.items.filter((i) => i.checked).length}/{cat.items.length}
              </span>
            </div>
            <div className="divide-y divide-border/40">
              {cat.items.map((item) => (
                <div
                  key={item.id}
                  className={`flex items-center gap-3 px-4 py-2.5 transition-colors ${
                    item.checked ? 'bg-teal-50/50' : 'hover:bg-muted/30'
                  }`}
                >
                  <button
                    onClick={() => toggleItem(cat.id, item.id)}
                    className={`flex items-center justify-center w-6 h-6 rounded-md border-2 transition-all ${
                      item.checked
                        ? 'bg-teal-500 border-teal-500 text-white'
                        : 'border-border hover:border-teal-400'
                    }`}
                  >
                    {item.checked && <span className="material-symbols-outlined text-[16px]">check</span>}
                  </button>
                  <span className={`flex-1 text-sm ${item.checked ? 'line-through text-muted-foreground' : 'font-medium'}`}>
                    {item.name}
                  </span>
                  <span className="text-xs text-muted-foreground">{item.quantity}</span>
                  <button
                    onClick={() => removeItem(cat.id, item.id)}
                    className="text-muted-foreground/30 hover:text-destructive transition p-0.5"
                    title="Entfernen"
                  >
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              ))}

              {/* Add item */}
              {newItemCatId === cat.id ? (
                <div className="flex items-center gap-2 px-4 py-2.5">
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') addItem(cat.id); if (e.key === 'Escape') setNewItemCatId(null); }}
                    placeholder="Gegenstand..."
                    className="flex-1 px-2 py-1 rounded border text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none"
                    autoFocus
                  />
                  <input
                    type="text"
                    value={newItemQty}
                    onChange={(e) => setNewItemQty(e.target.value)}
                    className="w-16 px-2 py-1 rounded border text-sm text-center"
                    placeholder="1x"
                  />
                  <button onClick={() => addItem(cat.id)} className="px-3 py-1 bg-teal-500 text-white rounded text-sm font-medium">OK</button>
                  <button onClick={() => setNewItemCatId(null)} className="p-1 text-muted-foreground hover:text-foreground">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setNewItemCatId(cat.id)}
                  className="w-full text-left px-4 py-2.5 text-sm text-muted-foreground/50 hover:text-teal-500 hover:bg-teal-50/30 transition italic"
                >
                  + Gegenstand hinzufuegen
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Category */}
      {showAddCategory ? (
        <div className="mt-4 flex items-center gap-2">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') addCategory(); if (e.key === 'Escape') setShowAddCategory(false); }}
            placeholder="Kategorie-Name..."
            className="flex-1 px-3 py-2 rounded-lg border text-sm focus:ring-2 focus:ring-teal-400 focus:outline-none"
            autoFocus
          />
          <button onClick={addCategory} className="px-4 py-2 bg-teal-500 text-white rounded-lg text-sm font-medium">Erstellen</button>
          <button onClick={() => setShowAddCategory(false)} className="px-3 py-2 border rounded-lg text-sm hover:bg-muted">Abbrechen</button>
        </div>
      ) : (
        <button
          onClick={() => setShowAddCategory(true)}
          className="mt-4 w-full py-2.5 text-sm font-medium text-teal-600 hover:text-teal-700 border border-dashed border-teal-300 rounded-xl hover:bg-teal-50 transition flex items-center justify-center gap-1.5"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          Kategorie hinzufuegen
        </button>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function PackingListLandingPage() {
  return (
    <ToolLandingPage
      tool={TOOL_PACKING_LISTS}
      subtitle="Erstelle Packlisten fuer Hajk, Sommerlager oder Wochenendaktionen. Nutze Vorlagen, tracke den Fortschritt und teile Listen mit deiner Gruppe."
      longDescription="Der Packlisten-Manager hilft dir, nichts zu vergessen. Erstelle Packlisten mit Kategorien (Kleidung, Hygiene, Ausruestung, ...), hake Gegenstaende ab und behalte den Ueberblick ueber den Fortschritt. Nutze Vorlagen fuer verschiedene Anlaesse (Hajk, Sommerlager, Wochenende) und klone sie fuer schnellen Start. Listen koennen als Text exportiert oder gedruckt werden."
      features={[
        { icon: 'checklist', title: 'Abhak-Funktion', description: 'Hake Gegenstaende ab und behalte den Ueberblick mit Fortschrittsbalken pro Kategorie und insgesamt.' },
        { icon: 'category', title: 'Kategorien', description: 'Organisiere deine Packliste in uebersichtliche Kategorien (Kleidung, Schlafen, Hygiene, etc.).' },
        { icon: 'content_copy', title: 'Vorlagen klonen', description: 'Nutze Vorlagen fuer verschiedene Anlaesse und klone sie mit einem Klick.' },
        { icon: 'ios_share', title: 'Exportieren & Teilen', description: 'Exportiere deine Packliste als Text, drucke sie aus oder teile sie mit einem Link.' },
        { icon: 'sort', title: 'Sortierung', description: 'Sortiere Kategorien und Gegenstaende per Drag & Drop nach deinen Wuenschen.' },
        { icon: 'restart_alt', title: 'Zuruecksetzen', description: 'Setze alle Haekchen zurueck und verwende die gleiche Liste fuer die naechste Fahrt.' },
      ]}
      examples={[
        { icon: 'hiking', title: 'Hajk-Packliste', description: 'Alles fuer eine 2-Tages-Wanderung: Leichtes Gepaeck, wetterfeste Kleidung, Notfallausruestung.' },
        { icon: 'camping', title: 'Sommerlager-Packliste', description: 'Die grosse Liste fuer 10 Tage Lager: Von der Sonnencreme bis zum Fahrtenhemd.' },
        { icon: 'weekend', title: 'Wochenend-Aktion', description: 'Kurze Packliste fuer ein Wochenende in der Jugendherberge oder auf dem Zeltplatz.' },
      ]}
      faq={[
        { question: 'Kann ich Listen ohne Account erstellen?', answer: 'Du kannst den Sandbox-Modus oben nutzen, um eine Packliste auszuprobieren. Zum Speichern und Teilen brauchst du ein kostenloses Konto.' },
        { question: 'Kann ich meine Liste mit anderen teilen?', answer: 'Ja, jede Packliste hat einen oeffentlichen Link, den du mit deiner Gruppe teilen kannst. Nur du und Gruppen-Admins koennen die Liste bearbeiten.' },
        { question: 'Was sind Vorlagen?', answer: 'Vorlagen sind vordefinierte Packlisten (z.B. Hajk, Sommerlager), die du klonen und an deine Beduerfnisse anpassen kannst.' },
        { question: 'Kann ich die Haekchen zuruecksetzen?', answer: 'Ja, mit einem Klick kannst du alle Haekchen zuruecksetzen und die gleiche Liste fuer die naechste Fahrt verwenden.' },
      ]}
      ctaLabel="Packliste erstellen"
      ctaRoute="/packing-lists/app"
      sandbox={<PackingListSandbox />}
    />
  );
}
