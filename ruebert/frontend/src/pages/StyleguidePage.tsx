import { useEffect, useState, type ReactNode } from 'react';

import { Page } from '@/components/layout/Page';
import { BlockExamples } from '@/pages/BlockExamples';
import { SidebarSection } from '@/components/layout/Sidebar';
import {
  CheckList,
  KeyButtons,
  ListFilter,
  SegmentControl,
  SelectField,
  type TrafficColor,
} from '@/components/layout/SidebarControls';
import { DataPipeline, type PipelineStage } from '@/components/layout/Topbar';
import { formatInt } from '@/lib/format';

// Tailwind needs complete class names in the source, so every swatch names its class explicitly.
const COLOR_TOKENS: { group: string; tokens: { name: string; swatch: string }[] }[] = [
  {
    group: 'Flächen',
    tokens: [
      { name: 'background', swatch: 'bg-background' },
      { name: 'shell', swatch: 'bg-shell' },
      { name: 'panel', swatch: 'bg-panel' },
      { name: 'sunken', swatch: 'bg-sunken' },
      { name: 'row-hover', swatch: 'bg-row-hover' },
      { name: 'row-active', swatch: 'bg-row-active' },
    ],
  },
  {
    group: 'Linien und Text',
    tokens: [
      { name: 'border', swatch: 'bg-border' },
      { name: 'border-row', swatch: 'bg-border-row' },
      { name: 'border-strong', swatch: 'bg-border-strong' },
      { name: 'foreground', swatch: 'bg-foreground' },
      { name: 'foreground-strong', swatch: 'bg-foreground-strong' },
      { name: 'foreground-2', swatch: 'bg-foreground-2' },
      { name: 'muted-foreground', swatch: 'bg-muted-foreground' },
      { name: 'link', swatch: 'bg-link' },
    ],
  },
  {
    group: 'Akzent und Hinweise',
    tokens: [
      { name: 'accent', swatch: 'bg-accent' },
      { name: 'accent-soft', swatch: 'bg-accent-soft' },
      { name: 'accent-border', swatch: 'bg-accent-border' },
      { name: 'accent-text', swatch: 'bg-accent-text' },
      { name: 'warning-soft', swatch: 'bg-warning-soft' },
      { name: 'warning-border', swatch: 'bg-warning-border' },
      { name: 'warning-text', swatch: 'bg-warning-text' },
      { name: 'danger-text', swatch: 'bg-danger-text' },
    ],
  },
  {
    group: 'Ampel und Diagramme (nur Punkt, Badge, Diagramm)',
    tokens: [
      { name: 'traffic-red', swatch: 'bg-traffic-red' },
      { name: 'traffic-yellow', swatch: 'bg-traffic-yellow' },
      { name: 'traffic-green', swatch: 'bg-traffic-green' },
      { name: 'traffic-blue', swatch: 'bg-traffic-blue' },
      { name: 'chart-band', swatch: 'bg-chart-band' },
      { name: 'chart-oos', swatch: 'bg-chart-oos' },
      { name: 'chart-grid', swatch: 'bg-chart-grid' },
    ],
  },
];

const TYPE_SCALE = [
  { name: 'title', size: '24 px', className: 'text-title font-semibold text-foreground-strong' },
  { name: 'section', size: '20 px', className: 'text-section font-semibold text-foreground-strong' },
  { name: 'emphasis', size: '16 px', className: 'text-emphasis font-medium' },
  { name: 'body', size: '14 px', className: 'text-body' },
  { name: 'dense', size: '13 px', className: 'text-dense' },
  { name: 'caption', size: '12 px', className: 'text-caption text-muted-foreground' },
  { name: 'label', size: '11 px', className: 'text-label uppercase text-muted-foreground' },
];

const RADII = [
  { name: 'sm · 4 px · Tags', className: 'rounded-sm' },
  { name: 'md · 6 px · Bedienelemente', className: 'rounded-md' },
  { name: 'lg · 10 px · Panels', className: 'rounded-lg' },
  { name: 'full · Punkte, Chips', className: 'rounded-full' },
];

const PIPELINE_EXAMPLES: { title: string; stages: PipelineStage[] }[] = [
  {
    title: 'Alles in Ordnung',
    stages: [
      { label: 'Altdaten', time: '12:59', status: 'ok' },
      { label: 'Neuaufbau', time: '07:38', status: 'ok' },
      { label: 'Forecast #25', time: '07:41', status: 'ok' },
      { label: 'Ampel', time: '07:42', status: 'ok' },
    ],
  },
  {
    title: 'Import mit Hinweis',
    stages: [
      { label: 'Altdaten', time: '12:59', status: 'ok' },
      { label: 'Import · 1 Hinweis', time: '07:38', status: 'warn' },
      { label: 'Forecast #25', time: '07:41', status: 'ok' },
    ],
  },
  { title: 'Fehler', stages: [{ label: 'Status nicht erreichbar', time: '–', status: 'error' }] },
];

const TRAFFIC_EXAMPLES: { color: TrafficColor; label: string; dot: string }[] = [
  { color: 'red', label: 'Rot · dringend', dot: 'bg-traffic-red' },
  { color: 'yellow', label: 'Gelb · einplanen', dot: 'bg-traffic-yellow' },
  { color: 'green', label: 'Grün · in Ordnung', dot: 'bg-traffic-green' },
  { color: 'blue', label: 'Blau · Überbestand', dot: 'bg-traffic-blue' },
];

type Queue = 'all' | 'order' | 'approve' | 'case';
type Brand = 'own' | 'third';
type Category = 'all' | 'vegetables' | 'flowers' | 'herbs';
type Turnover = 'A' | 'B' | 'C';

/** Living reference for layout D: shell, sidebar building blocks, tokens, type, radii (Task 4.3). */
export function StyleguidePage() {
  const [queue, setQueue] = useState<Queue>('all');
  const [brand, setBrand] = useState<Brand>('own');
  const [colors, setColors] = useState<TrafficColor[]>(['red', 'yellow']);
  const [category, setCategory] = useState<Category>('all');
  const [turnover, setTurnover] = useState<Turnover[]>(['A']);
  const [dense, setDense] = useState<'normal' | 'dense'>('normal');

  const reset = () => {
    setQueue('all');
    setBrand('own');
    setColors(['red', 'yellow']);
    setCategory('all');
    setTurnover(['A']);
  };

  const filters = (
    <>
      <SidebarSection title="Liste · Queue-Typ">
        <ListFilter
          label="Queue-Typ"
          value={queue}
          onChange={setQueue}
          options={[
            { value: 'all', label: 'Alle offenen', count: 23 },
            { value: 'order', label: 'Bestellen', count: 14 },
            { value: 'approve', label: 'Freigeben', count: 2 },
            { value: 'case', label: 'Fälle', count: 7 },
          ]}
        />
      </SidebarSection>
      <SidebarSection title="Segment · Marke">
        <SegmentControl
          label="Marke"
          value={brand}
          onChange={setBrand}
          options={[
            { value: 'own', label: 'Eigenmarke' },
            { value: 'third', label: 'Fremdmarke' },
          ]}
        />
      </SidebarSection>
      <SidebarSection title="Checkliste · Ampel">
        <CheckList
          label="Ampel"
          selected={colors}
          onChange={setColors}
          dots={{ red: 'red', yellow: 'yellow', green: 'green', blue: 'blue' }}
          options={[
            { value: 'red', label: 'Rot', count: 9 },
            { value: 'yellow', label: 'Gelb', count: 14 },
            { value: 'green', label: 'Grün', count: 131 },
            { value: 'blue', label: 'Blau', count: 20 },
          ]}
        />
      </SidebarSection>
      <SidebarSection title="Auswahl · Kategorie">
        <SelectField
          label="Kategorie"
          value={category}
          onChange={setCategory}
          options={[
            { value: 'all', label: 'Alle Kategorien' },
            { value: 'vegetables', label: 'Gemüsesamen' },
            { value: 'flowers', label: 'Blumensamen' },
            { value: 'herbs', label: 'Kräutersamen' },
          ]}
        />
      </SidebarSection>
      <SidebarSection title="Tasten · Drehklasse">
        <KeyButtons
          label="Drehklasse"
          selected={turnover}
          onChange={setTurnover}
          options={[
            { value: 'A', label: 'A' },
            { value: 'B', label: 'B' },
            { value: 'C', label: 'C' },
          ]}
        />
      </SidebarSection>
    </>
  );

  const settings = (
    <SidebarSection title="Zeilenhöhe">
      <SegmentControl
        label="Zeilenhöhe"
        value={dense}
        onChange={setDense}
        options={[
          { value: 'normal', label: 'Normal' },
          { value: 'dense', label: 'Dicht' },
        ]}
      />
    </SidebarSection>
  );

  return (
    <Page area="Entwicklung" page="Styleguide" filters={filters} onResetFilters={reset} settings={settings}>
      <div className="flex flex-col gap-8 p-6">
        <header className="flex flex-col gap-1">
          <h1 className="m-0 text-title font-semibold text-foreground-strong">Styleguide Layout D</h1>
          <p className="m-0 max-w-2xl text-body text-foreground-2">
            Referenz für alle Bausteine von „Triage Nacht“. Die Sidebar links zeigt die Filterbausteine; Werte
            der Tokens werden live aus <span className="font-mono">tokens.css</span> gelesen.
          </p>
        </header>

        <Section title="Farb-Tokens">
          <div className="grid gap-6 [grid-template-columns:repeat(auto-fill,minmax(260px,1fr))]">
            {COLOR_TOKENS.map((group) => (
              <div key={group.group} className="flex flex-col gap-2">
                <span className="text-caption font-medium text-muted-foreground">{group.group}</span>
                {group.tokens.map((token) => (
                  <ColorSwatch key={token.name} name={token.name} swatch={token.swatch} />
                ))}
              </div>
            ))}
          </div>
        </Section>

        <Section title="Typografie">
          <div className="flex flex-col divide-y divide-border-row rounded-lg border border-border bg-panel">
            {TYPE_SCALE.map((item) => (
              <div key={item.name} className="flex flex-wrap items-baseline gap-x-6 gap-y-1 px-4 py-3">
                <span className="w-32 font-mono text-caption text-muted-foreground">
                  {item.name} · {item.size}
                </span>
                <span className={item.className}>Bis KW 24 bestellen · Basilikum Genoveser</span>
              </div>
            ))}
            <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 px-4 py-3">
              <span className="w-32 font-mono text-caption text-muted-foreground">Geist Mono</span>
              <span className="font-mono text-body text-foreground-strong">
                DGW004 · KW 21 · {formatInt(15000)} · {formatInt(120000)} · 07:41
              </span>
            </div>
          </div>
        </Section>

        <Section title="Radien">
          <div className="flex flex-wrap gap-4">
            {RADII.map((radius) => (
              <div key={radius.name} className="flex flex-col items-center gap-2">
                <div className={`size-16 border border-border-strong bg-panel ${radius.className}`} />
                <span className="text-caption text-muted-foreground">{radius.name}</span>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Datenfluss in der Kopfzeile">
          <div className="flex flex-col gap-3">
            {PIPELINE_EXAMPLES.map((example) => (
              <div key={example.title} className="flex flex-wrap items-center gap-4">
                <span className="w-40 text-caption text-muted-foreground">{example.title}</span>
                <DataPipeline stages={example.stages} />
              </div>
            ))}
          </div>
        </Section>

        <Section title="Ampelpunkte (immer mit Text)">
          <div className="flex flex-wrap gap-5">
            {TRAFFIC_EXAMPLES.map((item) => (
              <span key={item.color} className="flex items-center gap-2 text-dense">
                <span aria-hidden className={`block size-2 rounded-full ${item.dot}`} />
                {item.label}
              </span>
            ))}
          </div>
        </Section>

        <Section title="Aktionen">
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="h-8 rounded-md bg-accent px-3 text-dense font-semibold text-accent-foreground">
              Übernehmen <kbd className="ml-1 font-mono text-caption">↵</kbd>
            </button>
            <button type="button" className="h-8 rounded-md border border-border bg-panel px-3 text-dense text-foreground">
              Zurückstellen <kbd className="ml-1 font-mono text-caption text-muted-foreground">Z</kbd>
            </button>
            <a href="#farb-tokens" className="text-dense text-link">
              Link
            </a>
          </div>
          <div className="mt-4 flex max-w-xl flex-col gap-1 rounded-lg border border-accent-border bg-accent-soft p-4">
            <span className="text-label uppercase text-accent-text">Vorschlag von Rübert</span>
            <span className="text-emphasis font-semibold text-foreground-strong">Bis KW 24 bestellen · 15.000 Tüten</span>
            <span className="text-dense text-foreground-2">Bestand reicht bis KW 36, Wareneingang nach 12 Wochen.</span>
          </div>
          <div className="mt-3 max-w-xl rounded-lg border border-warning-border bg-warning-soft p-4 text-dense text-warning-text">
            Hinweis: Bestand beruht auf „Bestand danach“ der letzten Buchung (offen Q-101).
          </div>
        </Section>

        <Section title="Bausteine (Layout D)">
          <BlockExamples />
        </Section>
      </div>
    </Page>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  const id = title.toLowerCase().replace(/[^a-z0-9äöüß]+/g, '-');
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="m-0 text-label uppercase text-muted-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}

function ColorSwatch({ name, swatch }: { name: string; swatch: string }) {
  const [value, setValue] = useState('');

  useEffect(() => {
    setValue(getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim());
  }, [name]);

  return (
    <div className="flex items-center gap-3">
      <span className={`size-7 flex-none rounded-md border border-border-strong ${swatch}`} />
      <div className="flex min-w-0 flex-col">
        <span className="font-mono text-dense text-foreground">{name}</span>
        <span className="font-mono text-caption text-muted-foreground">{value ? `hsl(${value})` : '–'}</span>
      </div>
    </div>
  );
}
