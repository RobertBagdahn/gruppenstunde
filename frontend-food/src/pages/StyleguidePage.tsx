import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CardTable, DataCardRow } from '@/components/shared/CardTable';
import EmptyState from '@/components/shared/EmptyState';
import { ChevronRight, Calendar, Clock, ShoppingBag, AlertTriangle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { contrastRatio, parseHsl, type Hsl } from '@/lib/contrast';
import { formatNumber } from '@/lib/format';
import { Icon } from '@/components/ui/icon';

interface SwatchProps {
  token: string;
  label: string;
  /** Token used as text colour on this swatch for the contrast check. */
  on: string;
  minimum: number;
  /** Badge label when the minimum is met (default: WCAG AA). */
  passLabel?: string;
}

const BASE_SWATCHES: SwatchProps[] = [
  { token: 'primary', label: 'Primär', on: 'primary-foreground', minimum: 4.5 },
  { token: 'background', label: 'Hintergrund', on: 'foreground', minimum: 4.5 },
  { token: 'card', label: 'Karte', on: 'card-foreground', minimum: 4.5 },
  { token: 'muted', label: 'Gedämpft', on: 'muted-foreground', minimum: 4.5 },
  { token: 'accent', label: 'Akzent', on: 'accent-foreground', minimum: 4.5 },
  { token: 'border', label: 'Rahmen / Linien (auf Hintergrund)', on: 'background', minimum: 1.3, passLabel: 'sichtbar' },
  { token: 'input', label: 'Rahmen Bedienelemente (auf Hintergrund)', on: 'background', minimum: 3 },
];

const STATUS_TOKENS = [
  { token: 'success', label: 'Erfolg', example: 'Plan vollständig' },
  { token: 'warning', label: 'Warnung', example: 'Budget knapp' },
  { token: 'danger', label: 'Fehler', example: 'Allergen im Rezept' },
  { token: 'info', label: 'Hinweis', example: 'Referenzmahlzeit' },
] as const;

const FONT_SCALE = [
  { token: 'text-caption', px: 12, usage: 'Klein: Chips, Badges, Metadaten', display: false },
  { token: 'text-body', px: 14, usage: 'Standard-Fließtext und Bedienelemente', display: false },
  { token: 'text-emphasis', px: 16, usage: 'Hervorgehobener Text', display: false },
  { token: 'text-section', px: 20, usage: 'Abschnitts- und Kartenüberschrift', display: true },
  { token: 'text-title', px: 28, usage: 'Seitentitel', display: true },
];

const ICON_SIZES = [
  { size: 16, usage: 'Fließtext, kleine Buttons, Chips' },
  { size: 20, usage: 'Buttons und Navigation' },
  { size: 24, usage: 'Kopfzeilen' },
  { size: 48, usage: 'Nur Leerzustände' },
] as const;

const ICON_EXAMPLES = ['search', 'add', 'delete', 'settings', 'shopping_cart', 'schedule'];

const RADII = [
  { token: 'rounded-lg', size: '8 px', usage: 'Bedienelemente: Buttons, Inputs, Selects, Chips' },
  { token: 'rounded-xl', size: '12 px', usage: 'Karten und Dialoge' },
  { token: 'rounded-full', size: 'rund', usage: 'Pills, Badges, Avatare, runde Icon-Buttons' },
];

/** Contrast of two tokens as rendered (reads the live CSS variables). */
function useTokenContrast(foreground: string, background: string): number | null {
  const [ratio, setRatio] = useState<number | null>(null);
  useEffect(() => {
    const style = getComputedStyle(document.documentElement);
    const resolve = (token: string): Hsl | null => parseHsl(style.getPropertyValue(`--${token}`));
    const fg = resolve(foreground);
    const bg = resolve(background);
    setRatio(fg && bg ? contrastRatio(fg, bg) : null);
  }, [foreground, background]);
  return ratio;
}

function ContrastBadge({
  ratio,
  minimum,
  passLabel = 'AA',
}: {
  ratio: number | null;
  minimum: number;
  passLabel?: string;
}) {
  if (ratio === null) return <span className="text-caption text-muted-foreground">–</span>;
  const ok = ratio >= minimum;
  return (
    <span
      className={`inline-flex rounded-full border px-2 py-0.5 text-caption font-semibold ${
        ok ? 'bg-success-soft text-success border-success-border' : 'bg-danger-soft text-danger border-danger-border'
      }`}
    >
      {formatNumber(ratio, { maxDecimals: 1 })}:1 {ok ? passLabel : `< ${formatNumber(minimum, { maxDecimals: 1 })}`}
    </span>
  );
}

function ColorSwatch({ token, label, on, minimum, passLabel }: SwatchProps) {
  const ratio = useTokenContrast(on, token);
  return (
    <div className="border border-border rounded-xl p-4 bg-card shadow-sm space-y-2">
      <div
        className="w-full h-12 rounded-lg border border-border flex items-center px-3 text-body font-semibold"
        style={{ background: `hsl(var(--${token}))`, color: `hsl(var(--${on}))` }}
      >
        Aa
      </div>
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-body font-semibold text-foreground">{label}</div>
          <code className="text-caption text-muted-foreground">--{token}</code>
        </div>
        <ContrastBadge ratio={ratio} minimum={minimum} passLabel={passLabel} />
      </div>
    </div>
  );
}

const STATUS_CLASSES: Record<(typeof STATUS_TOKENS)[number]['token'], { solid: string; soft: string }> = {
  success: { solid: 'bg-success text-success-foreground', soft: 'bg-success-soft text-success border-success-border' },
  warning: { solid: 'bg-warning text-warning-foreground', soft: 'bg-warning-soft text-warning border-warning-border' },
  danger: { solid: 'bg-danger text-danger-foreground', soft: 'bg-danger-soft text-danger border-danger-border' },
  info: { solid: 'bg-info text-info-foreground', soft: 'bg-info-soft text-info border-info-border' },
};

function StatusSwatch({ token, label, example }: (typeof STATUS_TOKENS)[number]) {
  const solidRatio = useTokenContrast(`${token}-foreground`, token);
  const softRatio = useTokenContrast(token, `${token}-soft`);
  const classes = STATUS_CLASSES[token];
  return (
    <div className="border border-border rounded-xl p-4 bg-card shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-emphasis font-semibold text-foreground">{label}</span>
        <code className="text-caption text-muted-foreground">
          {token} · -soft · -border · -foreground
        </code>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-lg px-3 py-1.5 text-body font-semibold ${classes.solid}`}>{example}</span>
        <ContrastBadge ratio={solidRatio} minimum={4.5} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <span className={`rounded-lg border px-3 py-1.5 text-body ${classes.soft}`}>{example}</span>
        <ContrastBadge ratio={softRatio} minimum={4.5} />
      </div>
    </div>
  );
}

export default function StyleguidePage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
      {/* Page Header */}
      <div className="border-b border-border pb-6">
        <h1 className="text-title font-extrabold tracking-tight text-foreground font-display">
          Inspi Food Design-System & Styleguide
        </h1>
        <p className="text-emphasis text-muted-foreground mt-2 font-sans">
          Lebendes Showcase und Referenz für das neue, modern-cleane grün-basierte Layout.
        </p>
      </div>

      {/* Farb-Token */}
      <section className="space-y-4">
        <h2 className="text-title font-bold font-display border-l-4 border-primary pl-3">
          1. Farb-Token & Kontrast
        </h2>
        <p className="text-body text-muted-foreground">
          Alle Farben kommen aus CSS-Variablen in <code>index.css</code>. Tailwind-Palettenfarben (z. B.{' '}
          <code>amber-50</code>) sind verboten; <code>chart-*</code> nur in Diagrammen. Die Kontrastwerte werden live
          berechnet (WCAG AA: Text ≥ 4,5:1, Bedienelemente ≥ 3:1).
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {BASE_SWATCHES.map((swatch) => (
            <ColorSwatch key={swatch.token} {...swatch} />
          ))}
        </div>
        <h3 className="text-section font-semibold font-display pt-2">Status-Token</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {STATUS_TOKENS.map((status) => (
            <StatusSwatch key={status.token} {...status} />
          ))}
        </div>
      </section>

      {/* Typografie */}
      <section className="space-y-4">
        <h2 className="text-title font-bold font-display border-l-4 border-primary pl-3">
          2. Schriftgrößen-Skala
        </h2>
        <p className="text-body text-muted-foreground">
          Genau fünf Größen. Überschriften in Plus Jakarta Sans (<code>font-display</code>), Fließtext in Inter. Kleiner
          als 12 px und freie Werte (<code>text-[…]</code>) gibt es nicht.
        </p>
        <div className="border border-border rounded-xl bg-card shadow-sm divide-y">
          {FONT_SCALE.map((size) => (
            <div key={size.token} className="flex flex-col gap-1 p-4 sm:flex-row sm:items-baseline sm:gap-6">
              <code className="text-caption text-muted-foreground w-40 shrink-0">
                {size.token} · {size.px} px
              </code>
              <span className={`${size.token} ${size.display ? 'font-display font-bold' : ''} text-foreground`}>
                {size.usage}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Radien */}
      <section className="space-y-4">
        <h2 className="text-title font-bold font-display border-l-4 border-primary pl-3">3. Eckenradien</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {RADII.map((radius) => (
            <div key={radius.token} className="border border-border rounded-xl p-4 bg-card shadow-sm space-y-3">
              <div className={`h-16 w-full max-w-[8rem] border-2 border-primary bg-primary/10 ${radius.token}`} />
              <div className="text-body font-semibold text-foreground">
                <code>{radius.token}</code> · {radius.size}
              </div>
              <p className="text-caption text-muted-foreground">{radius.usage}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Buttons */}
      <section className="space-y-4">
        <h2 className="text-title font-bold font-display border-l-4 border-primary pl-3">
          4. Buttons & Aktionen
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
        <h2 className="text-title font-bold font-display border-l-4 border-primary pl-3">
          5. Cards & Container
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Rezept-Card Beispiel</CardTitle>
              <CardDescription>Ein einfaches Rezept für Pfadfinderlager</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-4 text-caption text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> 45 Min
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" /> Mittagessen
                </span>
              </div>
              <p className="text-body">
                Klassische Spaghetti Bolognese, skaliert auf Großgruppen.
              </p>
            </CardContent>
            <CardFooter className="flex justify-between">
              <span className="text-caption font-bold text-primary font-sans">€ 1.20 / Portion</span>
              <Button size="sm" variant="ghost" className="h-8 gap-1 text-caption">
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
              <div className="p-4 bg-warning-soft border border-warning-border rounded-xl flex gap-3">
                <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-body font-bold text-warning font-display">Zutaten fehlen</h4>
                  <p className="text-caption text-warning leading-relaxed">
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
        <h2 className="text-title font-bold font-display border-l-4 border-primary pl-3">
          6. Card-Table & Zeilen (Responsive, ab 320px)
        </h2>
        <CardTable>
          <DataCardRow clickable>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-body font-bold text-foreground font-display">Einkaufsliste: Sommerlager 2026</h4>
                <p className="text-caption text-muted-foreground mt-0.5">Erstellt am 04.06.2026 • 42 Artikel</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2 md:mt-0 justify-between md:justify-end">
              <span className="text-caption bg-primary/10 text-primary px-2.5 py-1 rounded-full font-bold">Aktiv</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground hidden md:block" />
            </div>
          </DataCardRow>

          <DataCardRow clickable>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center text-accent shrink-0">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-body font-bold text-foreground font-display">Pfingstlager Speiseplan</h4>
                <p className="text-caption text-muted-foreground mt-0.5">3 Tage • 15 Personen</p>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-2 md:mt-0 justify-between md:justify-end">
              <span className="text-caption bg-secondary text-secondary-foreground px-2.5 py-1 rounded-full font-bold">Entwurf</span>
              <ChevronRight className="w-5 h-5 text-muted-foreground hidden md:block" />
            </div>
          </DataCardRow>
        </CardTable>
      </section>

      {/* Icon-Regel */}
      <section className="space-y-4">
        <h2 className="text-title font-bold font-display border-l-4 border-primary pl-3">
          7. Icons (Verbindliche Regel)
        </h2>
        <p className="text-body text-muted-foreground">
          Nur Lucide, Strichstärke 2, über <code>{'<Icon name="…" size={…} />'}</code> aus{' '}
          <code>@/components/ui/icon</code> oder direkt als Lucide-Komponente. Keine Material Symbols, keine
          Icon-Schrift.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {ICON_SIZES.map((entry) => (
            <div
              key={entry.size}
              className="border border-border rounded-xl p-4 bg-card shadow-sm flex flex-col items-center gap-3 text-center"
            >
              <div className="flex h-12 items-center justify-center text-primary">
                <Icon name="restaurant" size={entry.size} />
              </div>
              <div className="text-body font-semibold text-foreground">{entry.size} px</div>
              <p className="text-caption text-muted-foreground">{entry.usage}</p>
            </div>
          ))}
        </div>
        <div className="border border-border rounded-xl p-4 bg-card shadow-sm grid grid-cols-3 sm:grid-cols-6 gap-3">
          {ICON_EXAMPLES.map((name) => (
            <div key={name} className="flex flex-col items-center gap-1.5 rounded-lg bg-muted p-3">
              <Icon name={name} size={20} />
              <code className="text-caption text-muted-foreground">{name}</code>
            </div>
          ))}
        </div>
      </section>

      {/* States */}
      <section className="space-y-4">
        <h2 className="text-title font-bold font-display border-l-4 border-primary pl-3">
          8. Empty-States
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
