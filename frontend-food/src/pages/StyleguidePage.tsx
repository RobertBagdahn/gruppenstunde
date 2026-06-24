import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CardTable, DataCardRow } from '@/components/shared/CardTable';
import EmptyState from '@/components/shared/EmptyState';
import {
  Search,
  Check,
  Plus,
  Trash2,
  ChevronRight,
  Calendar,
  Clock,
  ShoppingBag,
  Settings,
  AlertTriangle
} from 'lucide-react';

export default function StyleguidePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Page Header */}
      <div className="border-b border-border pb-6">
        <h1 className="text-4xl font-extrabold tracking-tight text-foreground font-display">
          Inspi Food Design-System & Styleguide
        </h1>
        <p className="text-lg text-muted-foreground mt-2 font-sans">
          Lebendes Showcase und Referenz für das neue, modern-cleane grün-basierte Layout.
        </p>
      </div>

      {/* Farb-Token */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold font-display border-l-4 border-primary pl-3">
          1. Farb-Token & Theme
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
          <div className="border border-border rounded-xl p-4 bg-card shadow-sm space-y-2">
            <div className="w-full h-12 rounded-lg bg-primary" />
            <div className="text-xs font-semibold text-foreground font-sans">Primary (Grün)</div>
            <div className="text-[10px] text-muted-foreground">hsl(var(--primary))</div>
          </div>
          <div className="border border-border rounded-xl p-4 bg-card shadow-sm space-y-2">
            <div className="w-full h-12 rounded-lg bg-secondary" />
            <div className="text-xs font-semibold text-foreground font-sans">Secondary (Zinc)</div>
            <div className="text-[10px] text-muted-foreground">hsl(var(--secondary))</div>
          </div>
          <div className="border border-border rounded-xl p-4 bg-card shadow-sm space-y-2">
            <div className="w-full h-12 rounded-lg bg-accent" />
            <div className="text-xs font-semibold text-foreground font-sans">Accent (Amber)</div>
            <div className="text-[10px] text-muted-foreground">hsl(var(--accent))</div>
          </div>
          <div className="border border-border rounded-xl p-4 bg-card shadow-sm space-y-2">
            <div className="w-full h-12 rounded-lg bg-destructive" />
            <div className="text-xs font-semibold text-foreground font-sans">Destructive</div>
            <div className="text-[10px] text-muted-foreground">hsl(var(--destructive))</div>
          </div>
          <div className="border border-border rounded-xl p-4 bg-card shadow-sm space-y-2">
            <div className="w-full h-12 rounded-lg bg-muted" />
            <div className="text-xs font-semibold text-foreground font-sans">Muted</div>
            <div className="text-[10px] text-muted-foreground">hsl(var(--muted))</div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
          <div className="border border-border rounded-xl p-5 bg-background shadow-sm space-y-2">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Hintergrund-Kontrast</div>
            <div className="p-4 bg-card border border-border rounded-lg shadow-sm">
              <span className="text-sm font-semibold text-card-foreground">Das ist eine reinweiße Card (`bg-card`) auf grauem App-Hintergrund (`bg-background`).</span>
              <p className="text-xs text-muted-foreground mt-1">Hierdurch entsteht ein klarer visueller Kontrast ohne unruhige Grautöne.</p>
            </div>
          </div>
          <div className="border border-border rounded-xl p-5 bg-card shadow-sm space-y-2">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Borders & Linien</div>
            <div className="flex gap-4 items-center">
              <div className="h-0.5 flex-1 bg-border" />
              <span className="text-xs text-muted-foreground font-mono">border-border (scharf & sichtbar)</span>
              <div className="h-0.5 flex-1 bg-border" />
            </div>
          </div>
        </div>
      </section>

      {/* Typografie */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold font-display border-l-4 border-primary pl-3">
          2. Typografie
        </h2>
        <div className="border border-border rounded-xl p-6 bg-card shadow-sm space-y-6">
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-mono">h1.font-display (Plus Jakarta Sans)</div>
            <h1 className="text-3xl font-extrabold text-foreground">Das ist eine Überschrift H1</h1>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-mono">h2.font-display</div>
            <h2 className="text-2xl font-bold text-foreground">Das ist eine Überschrift H2</h2>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-mono">h3.font-display</div>
            <h3 className="text-xl font-semibold text-foreground">Das ist eine Überschrift H3</h3>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-mono">body.font-sans (Inter)</div>
            <p className="text-base text-foreground leading-relaxed">
              Das ist der normale Fließtext. Pfadfinder-Gruppenleiter nutzen Inspi Food, um Rezepte zu erstellen,
              Zutaten zu portionieren und Speisepläne für Zeltlager zu kalkulieren. Die Schrift ist hochgradig
              lesbar und modern.
            </p>
          </div>
          <div className="space-y-1">
            <div className="text-xs text-muted-foreground font-mono">text-muted-foreground</div>
            <p className="text-sm text-muted-foreground">
              Das ist ein sekundärer Hilfetext oder eine Beschreibung. Er hat genug Kontrast zum Hintergrund.
            </p>
          </div>
        </div>
      </section>

      {/* Buttons */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold font-display border-l-4 border-primary pl-3">
          3. Buttons & Aktionen
        </h2>
        <div className="border border-border rounded-xl p-6 bg-card shadow-sm flex flex-wrap gap-4 items-center">
          <Button variant="default">Primary Button</Button>
          <Button variant="secondary">Secondary Button</Button>
          <Button variant="outline">Outline Button</Button>
          <Button variant="destructive">Destructive Button</Button>
          <Button variant="ghost">Ghost Button</Button>
          <Button variant="link">Link Button</Button>
        </div>
      </section>

      {/* Cards */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold font-display border-l-4 border-primary pl-3">
          4. Cards & Container
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Rezept-Card Beispiel</CardTitle>
              <CardDescription>Ein einfaches Rezept für Pfadfinderlager</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> 45 Min
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Mittagessen
                </span>
              </div>
              <p className="text-sm">
                Klassische Spaghetti Bolognese, skaliert auf Großgruppen.
              </p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <span className="text-xs font-bold text-primary font-sans">€ 1.20 / Portion</span>
              <Button size="sm" variant="ghost" className="h-8 gap-1 text-xs">
                Details <ChevronRight className="w-3 h-3" />
              </Button>
            </CardFooter>
          </Card>

          <Card className="flex flex-col justify-between">
            <CardHeader>
              <CardTitle>Aktion erforderlich</CardTitle>
              <CardDescription>Essensplan unvollständig</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-amber-900 font-display">Zutaten fehlen</h4>
                  <p className="text-xs text-amber-800 leading-relaxed">
                    Für 2 Mahlzeiten im Pfadfinderlager sind noch keine Rezepte hinterlegt.
                  </p>
                </div>
              </div>
            </CardContent>
            <CardFooter className="justify-end gap-2">
              <Button size="sm" variant="outline">Ignorieren</Button>
              <Button size="sm">Zuweisen</Button>
            </CardFooter>
          </Card>
        </div>
      </section>

      {/* Card Table */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold font-display border-l-4 border-primary pl-3">
          5. Card-Table & Zeilen (Responsive, ab 320px)
        </h2>
        <CardTable>
          <DataCardRow clickable>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground font-display">Einkaufsliste: Sommerlager 2026</h4>
                <p className="text-xs text-muted-foreground mt-0.5">Erstellt am 04.06.2026 • 42 Artikel</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2 md:mt-0 justify-between md:justify-end">
              <span className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold">Aktiv</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground hidden md:block" />
            </div>
          </DataCardRow>

          <DataCardRow clickable>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-foreground font-display">Pfingstlager Speiseplan</h4>
                <p className="text-xs text-muted-foreground mt-0.5">3 Tage • 15 Personen</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2 md:mt-0 justify-between md:justify-end">
              <span className="text-xs bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full font-bold">Entwurf</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground hidden md:block" />
            </div>
          </DataCardRow>
        </CardTable>
      </section>

      {/* Icon-Regel */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold font-display border-l-4 border-primary pl-3">
          6. Icon-Bibliotheken (Verbindliche Regel)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Check className="w-5 h-5 text-primary" /> Lucide (Standard)
              </CardTitle>
              <CardDescription>
                Wird standardmäßig für alle interaktiven UI-Elemente, Schaltflächen, inline und standardisierte Aktionen genutzt.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-secondary rounded-xl flex flex-col items-center gap-2">
                <Search className="w-5 h-5" />
                <span className="text-[10px] font-mono">Search</span>
              </div>
              <div className="p-3 bg-secondary rounded-xl flex flex-col items-center gap-2">
                <Plus className="w-5 h-5" />
                <span className="text-[10px] font-mono">Plus</span>
              </div>
              <div className="p-3 bg-secondary rounded-xl flex flex-col items-center gap-2">
                <Trash2 className="w-5 h-5" />
                <span className="text-[10px] font-mono">Trash2</span>
              </div>
              <div className="p-3 bg-secondary rounded-xl flex flex-col items-center gap-2">
                <Settings className="w-5 h-5" />
                <span className="text-[10px] font-mono">Settings</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">award_star</span> Material Symbols
              </CardTitle>
              <CardDescription>
                Ausschließlich reserviert für große, illustrative Übersichten oder Sektionssymbole (z.B. im Hero-Bereich).
              </CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-secondary rounded-xl flex flex-col items-center gap-2">
                <span className="material-symbols-outlined">skillet</span>
                <span className="text-[10px] font-mono">skillet</span>
              </div>
              <div className="p-3 bg-secondary rounded-xl flex flex-col items-center gap-2">
                <span className="material-symbols-outlined">restaurant</span>
                <span className="text-[10px] font-mono">restaurant</span>
              </div>
              <div className="p-3 bg-secondary rounded-xl flex flex-col items-center gap-2">
                <span className="material-symbols-outlined">nutrition</span>
                <span className="text-[10px] font-mono">nutrition</span>
              </div>
              <div className="p-3 bg-secondary rounded-xl flex flex-col items-center gap-2">
                <span className="material-symbols-outlined">local_shipping</span>
                <span className="text-[10px] font-mono">shipping</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* States */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold font-display border-l-4 border-primary pl-3">
          7. Empty-States
        </h2>
        <div className="border border-border rounded-xl bg-card shadow-sm">
          <EmptyState
            title="Keine Rezepte gefunden"
            description="Füge dein erstes Gruppenstunden-Rezept hinzu, um mit der Zeltlagerplanung loszulegen."
            icon="restaurant"
            ctaLabel="Rezept hinzufügen"
            onCtaClick={() => alert('CTA geklickt')}
          />
        </div>
      </section>
    </div>
  );
}
