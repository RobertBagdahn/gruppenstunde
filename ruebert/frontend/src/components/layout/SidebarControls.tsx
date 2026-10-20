// Filter and view building blocks for the sidebar (Design.md, "Filter"): list, segment, checklist
// with traffic dot and count, select and key buttons. All are controlled; pages keep the state in the URL.

import { formatInt } from '@/lib/format';

export type Option<T extends string> = { value: T; label: string; count?: number };

export type TrafficColor = 'red' | 'yellow' | 'green' | 'blue';

const TRAFFIC_DOT: Record<TrafficColor, string> = {
  red: 'bg-traffic-red',
  yellow: 'bg-traffic-yellow',
  green: 'bg-traffic-green',
  blue: 'bg-traffic-blue',
};

/** Single choice among list entries, e.g. the queue type. */
export function ListFilter<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-col gap-px">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`flex h-8 items-center gap-2 rounded-md px-2.5 text-left text-dense ${
              selected ? 'bg-row-active text-foreground-strong' : 'text-foreground-2 hover:bg-panel'
            }`}
          >
            {option.label}
            {option.count !== undefined && (
              <span className="ml-auto font-mono text-caption text-muted-foreground">{formatInt(option.count)}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Two or three mutually exclusive options side by side, e.g. own brand / third-party brand. */
export function SegmentControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex rounded-md border border-border bg-panel p-0.5">
      {options.map((option) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(option.value)}
            className={`h-7 flex-1 rounded-sm px-2 text-dense font-medium ${
              selected ? 'bg-row-active text-foreground-strong' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** Multiple choice with optional traffic dot and count, e.g. the traffic-light filter. */
export function CheckList<T extends string>({
  label,
  options,
  selected,
  onChange,
  dots,
}: {
  label: string;
  options: Option<T>[];
  selected: readonly T[];
  onChange: (selected: T[]) => void;
  /** Traffic colour per option; the colour is always accompanied by the option label. */
  dots?: Partial<Record<T, TrafficColor>>;
}) {
  const toggle = (value: T) =>
    onChange(selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value]);

  return (
    <fieldset className="m-0 flex flex-col gap-1 border-0 p-0">
      <legend className="sr-only">{label}</legend>
      {options.map((option) => {
        const dot = dots?.[option.value];
        return (
          <label key={option.value} className="flex h-7 cursor-pointer items-center gap-2 text-dense text-foreground-2">
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={() => toggle(option.value)}
              className="size-3.5 accent-accent"
            />
            {dot && <span aria-hidden className={`block size-2 rounded-full ${TRAFFIC_DOT[dot]}`} />}
            {option.label}
            {option.count !== undefined && (
              <span className="ml-auto font-mono text-caption text-muted-foreground">{formatInt(option.count)}</span>
            )}
          </label>
        );
      })}
    </fieldset>
  );
}

/** Native select in the sidebar style, e.g. category or supplier. */
export function SelectField<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value as T)}
      className="h-8 rounded-md border border-border bg-panel px-2 text-dense text-foreground"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

/** Toggle keys in a row, e.g. turnover classes A/B/C. */
export function KeyButtons<T extends string>({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Option<T>[];
  selected: readonly T[];
  onChange: (selected: T[]) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex gap-1">
      {options.map((option) => {
        const pressed = selected.includes(option.value);
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={pressed}
            onClick={() =>
              onChange(pressed ? selected.filter((item) => item !== option.value) : [...selected, option.value])
            }
            className={`h-7 min-w-8 rounded-md border px-2 font-mono text-dense ${
              pressed
                ? 'border-accent-border bg-accent-soft text-accent-text'
                : 'border-border bg-panel text-muted-foreground hover:text-foreground'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
