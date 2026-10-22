/**
 * Living styleguide of the food app (food-design-system: lebende Styleguide-Page).
 * Values come from the CSS tokens and the real components, not from copies.
 */
import { useEffect, useState, type ReactNode } from 'react';
import { contrastRatio, parseHsl, type Hsl } from '@/lib/contrast';
import { formatNumber } from '@/lib/format';
import type { IconSize } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import BrandMark from '@/components/layout/BrandMark';
import NutriScoreBadge from '@/components/shared/NutriScoreBadge';
import Sticker, { FlatTag } from '@/components/shared/Sticker';
import StatusNotice from '@/components/shared/StatusNotice';
import EmptyBlock from '@/components/shared/EmptyBlock';
import SectionError from '@/components/shared/SectionError';
import RecipeThumbnail from '@/components/recipe/RecipeThumbnail';
import RecipeTypeTag from '@/components/recipe/RecipeTypeTag';
import { ActiveChip } from '@/components/shared/FilterParts';
import { Input } from '@/components/ui/input';
import { SkeletonCard } from '@/components/ui/skeleton';
import { RECIPE_TINT_CLASSES } from '@/lib/recipeTypeStyle';
import { cn } from '@/lib/utils';

const BACKGROUND_TOKEN = 'background';

/** Reads a colour token from the document and checks it on the page ground. */
function useTokenColor(name: string): { hsl: Hsl | null; css: string } {
  const [state, setState] = useState<{ hsl: Hsl | null; css: string }>({ hsl: null, css: '' });
  useEffect(() => {
    const css = getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim();
    setState({ hsl: parseHsl(css), css });
  }, [name]);
  return state;
}

function ContrastBadge({ token, on = BACKGROUND_TOKEN }: { token: string; on?: string }) {
  const fg = useTokenColor(token);
  const bg = useTokenColor(on);
  if (!fg.hsl || !bg.hsl) return null;
  const ratio = contrastRatio(fg.hsl, bg.hsl);
  return (
    <span className={cn('text-caption font-semibold tabular-nums', ratio >= 4.5 ? 'text-success-foreground' : 'text-danger-foreground')}>
      {formatNumber(ratio, { maxDecimals: 1 })} : 1
    </span>
  );
}

function Section({ id, title, intro, children }: { id: string; title: string; intro?: string; children: ReactNode }) {
  return (
    <section aria-labelledby={id} className="space-y-4 border-t border-line pt-8">
      <h2 id={id} className="font-display text-heading font-bold text-foreground">
        {title}
      </h2>
      {intro && <p className="max-w-2xl text-body text-muted-foreground md:text-emphasis">{intro}</p>}
      {children}
    </section>
  );
}

function Swatch({ token, label, usage, on }: { token: string; label: string; usage: string; on?: string }) {
  const color = useTokenColor(token);
  return (
    <div className="flex items-center gap-3 rounded-xl bg-card p-3 shadow-card">
      <span className="h-11 w-11 shrink-0 rounded-lg border border-line" style={{ backgroundColor: color.css ? `hsl(${color.css})` : undefined }} aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <div className="text-body font-semibold text-foreground">{label}</div>
        <div className="text-caption text-muted-foreground [overflow-wrap:anywhere]">
          --{token} · {usage}
        </div>
      </div>
      <ContrastBadge token={token} on={on} />
    </div>
  );
}

export default function StyleguidePage() {
  return (
    <div className="mx-auto max-w-5xl space-y-10 px-4 py-6 sm:px-6 md:py-8 lg:px-8">
      <header className="space-y-3">
        <BrandMark />
        <h1 className="font-display text-title font-extrabold text-foreground">Styleguide · Sticker</h1>
        <p className="max-w-2xl text-emphasis text-muted-foreground">
          Gemeinsame Bausteine für alle Seiten: weißer Grund, eine Hauptfarbe, Tönungen nur für Rezepttypen, verspielt nur in kleinen Dosen.
          Diese Seite liest ihre Werte aus den Tokens und zeigt die echten Komponenten.
        </p>
      </header>

      <Section id="farben" title="Farben" intro="Kontrast gegen den weißen Grund. Text mindestens 4,5 : 1, Feldränder und Symbole mindestens 3 : 1.">
        <h3 className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Grundfarben und Marke</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <Swatch token="foreground" label="Tinte" usage="Text, aktive Chips" />
          <Swatch token="muted-foreground" label="Gedämpft" usage="Zweittext, Meta" />
          <Swatch token="input" label="Feldrand und Symbol" usage="Eingaben, Checkbox, Icons (nie Text)" />
          <Swatch token="line" label="Linie" usage="Trenner, Kartenränder (dekorativ)" />
          <Swatch token="muted" label="Fläche" usage="Segmente, neutrale Hinweise" />
          <Swatch token="primary" label="Petrol" usage="Hauptaktion, Fortschritt, erledigt" />
          <Swatch token="primary-dark" label="Petrol dunkel" usage="Petrolfarbener Text auf hellem Grund" />
          <Swatch token="primary-soft" label="Petrol hell" usage="Nebenaktion, aktive Navigation" />
          <Swatch token="spice" label="Tomate" usage="Schrittnummern, kleine Akzente" />
          <Swatch token="spice-foreground" label="Tomate Text" usage="Roter Text auf hellem Grund" />
          <Swatch token="sticker" label="Sticker" usage="Nur Sticker, höchstens einer pro Ansicht" on="foreground" />
        </div>

        <h3 className="pt-4 text-caption font-semibold uppercase tracking-wide text-muted-foreground">Kategorien (nur Tönung)</h3>
        <div className="flex flex-wrap gap-2">
          {(['breakfast', 'warm', 'cold', 'dessert', 'snack', 'recipe-part', 'drink'] as const).map((tint) => (
            <span key={tint} className={cn('rounded-full px-3 py-1 text-caption font-semibold', RECIPE_TINT_CLASSES[tint])}>
              {tint}
            </span>
          ))}
        </div>

        <h3 className="pt-4 text-caption font-semibold uppercase tracking-wide text-muted-foreground">Status (immer mit Rand und Icon)</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <StatusNotice variant="success">Erfolg: Liste gespeichert</StatusNotice>
          <StatusNotice variant="warning">Warnung: Mittagessen fehlt noch</StatusNotice>
          <StatusNotice variant="danger">Fehler: Speichern fehlgeschlagen</StatusNotice>
          <StatusNotice variant="info">Tipp: Am Vortag kochen</StatusNotice>
        </div>
      </Section>

      <Section id="schrift" title="Schrift" intro="Überschriften und Kennzahlen in Bricolage Grotesque, Fließtext in Figtree. Acht Stufen, keine freien Werte.">
        <div className="space-y-3 rounded-xl bg-card p-5 shadow-card">
          <p className="text-display font-extrabold text-foreground">Startseite</p>
          <p className="text-title font-extrabold text-foreground">Essenspläne</p>
          <p className="text-heading font-bold text-foreground">Abschnitt</p>
          <p className="text-section font-bold text-foreground">Karte und Gruppe</p>
          <p className="text-emphasis text-foreground">Fließtext: Würzig, sättigend und günstig.</p>
          <p className="text-body text-muted-foreground">Meta: 30–60 Min · 1,10 € pro Portion</p>
          <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Label: Für diesen Schritt</p>
          <p className="font-display text-metric font-extrabold tabular-nums text-foreground">620 kcal</p>
        </div>
      </Section>

      <Section id="radien" title="Radien, Abstände, Schatten" intro="Radien 8, 12, 20 und Pille. Abstände in der Skala 4, 8, 12, 16, 24, 32, 48.">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="space-y-2">
            <div className="h-16 rounded-sm bg-muted" />
            <p className="text-caption text-muted-foreground">klein · 8</p>
          </div>
          <div className="space-y-2">
            <div className="h-16 rounded-lg bg-muted" />
            <p className="text-caption text-muted-foreground">Bedienelemente · 12</p>
          </div>
          <div className="space-y-2">
            <div className="h-16 rounded-xl bg-muted" />
            <p className="text-caption text-muted-foreground">Karten · 20</p>
          </div>
          <div className="space-y-2">
            <div className="h-16 rounded-full bg-muted" />
            <p className="text-caption text-muted-foreground">Pille</p>
          </div>
        </div>
        <div className="grid gap-4 pt-2 md:grid-cols-3">
          <div className="h-16 rounded-xl bg-card shadow-card" />
          <div className="h-16 rounded-xl bg-card shadow-soft" />
          <div className="h-16 rounded-xl bg-card shadow-raised" />
        </div>
        <p className="text-caption text-muted-foreground">Schatten: Karte (Standard), weich (Segment), erhoben (Dialog und Menü). Keine Verläufe.</p>
      </Section>

      <Section id="komponenten" title="Komponenten">
        <div className="space-y-4 rounded-xl bg-card p-5 shadow-card">
          <h3 className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Buttons</h3>
          <div className="flex flex-wrap items-center gap-2">
            <Button>Primär</Button>
            <Button variant="secondary">Nebenaktion</Button>
            <Button variant="outline">Kontur</Button>
            <Button variant="ghost">Zurück</Button>
            <Button size="lg">Groß</Button>
            <Button disabled>Deaktiviert</Button>
          </div>
          <p className="text-caption text-muted-foreground">Höhe auf dem Handy mindestens 44 px. Pro Ansicht höchstens eine Primär-Aktion.</p>

          <h3 className="pt-2 text-caption font-semibold uppercase tracking-wide text-muted-foreground">Chips, Tags, Sticker</h3>
          <div className="flex flex-wrap items-center gap-2">
            <FlatTag>Alle</FlatTag>
            <RecipeTypeTag type="warm_meal" />
            <ActiveChip label="Vegetarisch" onRemove={() => undefined} />
            <Sticker>Beliebt</Sticker>
          </div>
          <p className="text-caption text-muted-foreground">Sticker höchstens einmal pro Ansicht; sonst eine flache Marke.</p>

          <h3 className="pt-2 text-caption font-semibold uppercase tracking-wide text-muted-foreground">Eingaben</h3>
          <div className="max-w-sm">
            <Input aria-label="Beispiel-Eingabe" placeholder="Rezept suchen …" />
          </div>
          <p className="text-caption text-muted-foreground">Schrift 16 px, Höhe 44 px, Rand in Feldfarbe.</p>

          <h3 className="pt-2 text-caption font-semibold uppercase tracking-wide text-muted-foreground">Nutri-Score (Originalfarben)</h3>
          <div className="flex flex-wrap items-center gap-3">
            <NutriScoreBadge value="A" size="sm" />
            <NutriScoreBadge value="B" size="sm" />
            <NutriScoreBadge value="C" size="md" />
            <NutriScoreBadge value="E" size="md" />
            <NutriScoreBadge value="scale" size="scale" />
          </div>
          <p className="text-caption text-muted-foreground">Klein 24 px auf Karten und in Listen, groß 32 px in Kennzahlen.</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-xl bg-card p-4 shadow-card">
            <h3 className="mb-3 text-caption font-semibold uppercase tracking-wide text-muted-foreground">Rezeptkarte</h3>
            <div className="max-w-xs overflow-hidden rounded-xl bg-card shadow-card">
              <div className="aspect-[4/3]">
                <RecipeThumbnail imageUrl={null} title="Chili sin Carne" recipeType="warm_meal" className="h-full" />
              </div>
              <div className="space-y-2 p-4">
                <div className="flex flex-wrap items-center gap-1.5">
                  <RecipeTypeTag type="warm_meal" />
                  <Sticker>Beliebt</Sticker>
                </div>
                <div className="font-display text-emphasis font-bold text-foreground">Chili sin Carne</div>
                <div className="text-body text-muted-foreground">30–60 Min · 1,10 € pro Portion</div>
              </div>
            </div>
          </div>
          <div className="rounded-xl bg-card p-4 shadow-card">
            <h3 className="mb-3 text-caption font-semibold uppercase tracking-wide text-muted-foreground">Listenzeile</h3>
            <div className="flex items-center gap-3 border-t border-line py-3">
              <RecipeThumbnail imageUrl={null} title="Overnight Oats" recipeType="breakfast" size="xs" />
              <div className="min-w-0 flex-1">
                <div className="text-body font-semibold text-foreground">Overnight Oats mit Beeren</div>
                <div className="text-caption text-muted-foreground">Frühstück · &lt; 30 Min</div>
              </div>
              <NutriScoreBadge value="A" size="sm" />
            </div>
          </div>
        </div>
      </Section>

      <Section id="zustaende" title="Zustände" intro="Laden, Leer und Fehler mit demselben Aufbau auf jeder Seite.">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Laden</p>
            <div className="grid grid-cols-2 gap-3">
              <SkeletonCard />
              <SkeletonCard />
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-caption font-semibold uppercase tracking-wide text-muted-foreground">Fehler im Abschnitt</p>
            <SectionError title="Zutaten konnten nicht geladen werden" onRetry={() => undefined} />
          </div>
        </div>
        <EmptyBlock
          title="Noch kein Essensplan"
          description="Tage, Mahlzeiten, Budget und Einkaufsliste an einem Ort."
          action={{ label: 'Ersten Essensplan erstellen', to: '/meal-plans/new' }}
          templates={[]}
        />
      </Section>

      <Section id="icons" title="Icon-Regel" intro="Nur Lucide-Icons über die Icon-Komponente. Größen 16, 20, 24 und 48 px, Strichstärke 2.">
        <div className="flex flex-wrap items-end gap-6 rounded-xl bg-card p-5 shadow-card">
          {([16, 20, 24, 48] as const satisfies readonly IconSize[]).map((size) => (
            <div key={size} className="flex flex-col items-center gap-2">
              <Icon name="restaurant_menu" size={size} />
              <span className="text-caption text-muted-foreground">{size} px</span>
            </div>
          ))}
        </div>
      </Section>

      <Section id="formate" title="Formate" intro="Preise, Zeiten und Mengen immer gleich geschrieben.">
        <ul className="grid gap-2 rounded-xl bg-card p-5 text-body shadow-card md:grid-cols-2">
          <li>Preis Karte: 1,10 € pro Portion</li>
          <li>Budget: 5,80 € pro Person/Tag</li>
          <li>Zeitraum: 26.–30. Okt.</li>
          <li>Dauer: &lt; 30 Min · 30–60 Min</li>
          <li>Mengen: 1,8 kg · 150 ml · 3 Zehen</li>
          <li>Anzahl: 248 Rezepte</li>
        </ul>
      </Section>

      <Section id="regeln" title="Regeln">
        <ul className="list-disc space-y-1 pl-5 text-body text-foreground">
          <li>Höchstens ein gelber Sticker pro Ansicht. Schräg sind nur Sticker und das Logo.</li>
          <li>Kategorietönungen nie für Status verwenden; Status hat immer Rand und Icon.</li>
          <li>Ein einziger Schatten für Karten, sonst Linien.</li>
          <li>Wiederholte Bewegung nur bei Ladeanzeigen.</li>
          <li>Tippflächen mobil mindestens 44 × 44 px; Eingaben 16 px.</li>
        </ul>
      </Section>

      <Section id="navigation" title="Navigation und Aufbau" intro="Zurück immer als Pille mit dem Namen des Ziels. Abläufe zum Abbrechen mit X.">
        <ul className="list-disc space-y-1 pl-5 text-body text-foreground">
          <li>Seiten mit Hauptaktion: Aktionsleiste unten statt der unteren Navigation.</li>
          <li>Seitenaktionen im Seitenkopf, nie in der globalen Navigation.</li>
          <li>Öffentliche Seiten mit Brotkrumen, einer H1 und nummerierten Seiten; private Seiten (Pläne, Listen) auf noindex.</li>
        </ul>
      </Section>
    </div>
  );
}
