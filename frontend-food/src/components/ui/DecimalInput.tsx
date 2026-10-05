import { useEffect, useState } from 'react';
import { formatDecimalInput, parseDecimalInput } from '@/lib/decimalInput';

interface DecimalInputProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  className?: string;
  'aria-label'?: string;
  'data-testid'?: string;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function DecimalInput({
  value,
  onChange,
  min = Number.NEGATIVE_INFINITY,
  max = Number.POSITIVE_INFINITY,
  className,
  'aria-label': ariaLabel,
  'data-testid': testId,
}: DecimalInputProps) {
  const [inputValue, setInputValue] = useState(() => formatDecimalInput(value));
  const [isFocused, setIsFocused] = useState(false);
  const parsedValue = parseDecimalInput(inputValue);
  const isValid = parsedValue !== null && parsedValue >= min && parsedValue <= max;

  useEffect(() => {
    if (!isFocused) setInputValue(formatDecimalInput(value));
  }, [isFocused, value]);

  const handleBlur = () => {
    setIsFocused(false);
    const nextValue = isValid && parsedValue !== null
      ? clamp(parsedValue, min, max)
      : clamp(value, min, max);
    onChange(nextValue);
    setInputValue(formatDecimalInput(nextValue));
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={inputValue}
      onFocus={() => setIsFocused(true)}
      onChange={(event) => {
        const nextInput = event.target.value;
        setInputValue(nextInput);
        const nextValue = parseDecimalInput(nextInput);
        if (nextValue !== null && nextValue >= min && nextValue <= max) onChange(nextValue);
      }}
      onBlur={handleBlur}
      aria-label={ariaLabel}
      aria-invalid={!isValid}
      data-testid={testId}
      className={className}
    />
  );
}
