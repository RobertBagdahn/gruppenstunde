import { useEffect, useState, useRef } from 'react';

export function FactorInput({ value, onChange }: { value: number; onChange: (factor: number) => void }) {
  const formatFactor = (v: number) => v.toFixed(1).replace('.', ',');
  const [localValue, setLocalValue] = useState(formatFactor(value));
  const lastSaved = useRef(value);

  useEffect(() => {
    if (value !== lastSaved.current) {
      setLocalValue(formatFactor(value));
      lastSaved.current = value;
    }
  }, [value]);

  const commit = () => {
    const parsed = parseFloat(localValue.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0 && parsed !== lastSaved.current) {
      lastSaved.current = parsed;
      onChange(parsed);
    } else {
      setLocalValue(formatFactor(lastSaved.current));
    }
  };

  return (
    <span className="inline-flex items-center gap-0.5">
      <span className="text-muted-foreground">&times;</span>
      <input
        type="text"
        inputMode="decimal"
        value={localValue}
        onChange={(e) => setLocalValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.currentTarget.blur(); } }}
        className="w-14 px-1 py-0.5 text-sm border rounded bg-background text-center"
      />
    </span>
  );
}
