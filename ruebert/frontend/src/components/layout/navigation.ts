import {
  BarChart3,
  Boxes,
  CalendarDays,
  CircleCheckBig,
  Database,
  Inbox,
  List,
  type LucideIcon,
  PackageX,
  Settings,
  ShoppingCart,
  Truck,
  BookOpen,
} from 'lucide-react';

export type NavItem = {
  id: string;
  label: string;
  to: string;
  icon: LucideIcon;
  /** Key of the badge count delivered by the status endpoint; `warn` renders it yellow. */
  badge?: { key: string; tone: 'default' | 'warn' };
};

export type NavGroup = { label: string; items: NavItem[] };

// Fixed navigation of layout D. Pages never change it; they only contribute filters and settings.
export const NAVIGATION: NavGroup[] = [
  {
    label: 'Arbeiten',
    items: [
      { id: 'start', label: 'Entscheidungen', to: '/', icon: CircleCheckBig, badge: { key: 'openDecisions', tone: 'warn' } },
      { id: 'products', label: 'Artikel', to: '/products', icon: List, badge: { key: 'activeProducts', tone: 'default' } },
      { id: 'order-plans', label: 'Bestellplaner', to: '/order-plans', icon: ShoppingCart },
      { id: 'supplier-orders', label: 'Fremdmarke', to: '/supplier-orders', icon: Truck, badge: { key: 'openSupplierProposals', tone: 'default' } },
    ],
  },
  {
    label: 'Analyse',
    items: [
      { id: 'forecast-quality', label: 'Prognosegüte', to: '/forecast-quality', icon: BarChart3 },
      { id: 'sets', label: 'Sets & Bundles', to: '/sets', icon: Boxes },
    ],
  },
  {
    label: 'Daten',
    items: [
      { id: 'cases', label: 'Fall-Inbox', to: '/data/cases', icon: Inbox, badge: { key: 'openCases', tone: 'default' } },
      { id: 'stockouts', label: 'OOS-Monitor', to: '/data/stockouts', icon: PackageX, badge: { key: 'openStockouts', tone: 'default' } },
      { id: 'quality', label: 'Daten & Läufe', to: '/data/quality', icon: Database },
      { id: 'events', label: 'Ereignisse', to: '/data/events', icon: CalendarDays },
    ],
  },
  {
    label: 'Hilfe',
    items: [
      { id: 'wiki', label: 'Wissen', to: '/wiki', icon: BookOpen },
      { id: 'settings', label: 'Einstellungen', to: '/settings', icon: Settings },
    ],
  },
];
