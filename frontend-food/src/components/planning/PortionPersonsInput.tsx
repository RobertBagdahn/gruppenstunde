import { useEffect, useState, useRef } from 'react';
import { Users } from 'lucide-react';

interface PortionPersonsInputProps {
  factor: number;
  basePortions?: number | null;
  onChangeFactor: (nextFactor: number) => void;
  disabled?: boolean;
}

export function PortionPersonsInput({
  factor,
  basePortions = 4,
  onChangeFactor,
  disabled = false,
}: PortionPersonsInputProps) {
  const base = basePortions && basePortions > 0 ? basePortions : 4;
  const currentServings = Math.round(factor * base * 10) / 10;
  const [localVal, setLocalVal] = useState<string>(String(currentServings));
  const lastSaved = useRef(factor);

  useEffect(() => {
    if (factor !== lastSaved.current) {
      setLocalVal(String(Math.round(factor * base * 10) / 10));
      lastSaved.current = factor;
    }
  }, [factor, base]);

  const commit = () => {
    const parsed = parseFloat(localVal.replace(',', '.'));
    if (!isNaN(parsed) && parsed > 0) {
      const nextFactor = Math.round((parsed / base) * 100) / 100;
      if (nextFactor !== lastSaved.current) {
        lastSaved.current = nextFactor;
        onChangeFactor(nextFactor);
      }
    } else {
      setLocalVal(String(Math.round(lastSaved.current * base * 10) / 10));
    }
  };

  return (
    <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg border border-border bg-card text-xs">
      <Users className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
      <span className="text-muted-foreground whitespace-nowrap">Portionen für</span>
      <input
        type="text"
        inputMode="decimal"
        value={localVal}
        disabled={disabled}
        onChange={(e) => setLocalVal(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.currentTarget.blur();
          }
        }}
        className="w-12 px-1 py-0.5 text-center font-bold text-foreground bg-muted/40 border border-border rounded focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
      />
      <span className="text-muted-foreground">Personen</span>
    </div>
  );
}
