/**
 * ColorPicker — input[type=color] combined with a hex text input.
 * Validates hex format (#RRGGBB) and provides both interaction modes.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  disabled?: boolean;
  className?: string;
}

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

function ColorPicker({ value, onChange, id, disabled, className }: ColorPickerProps) {
  const [textValue, setTextValue] = React.useState(value);

  React.useEffect(() => {
    setTextValue(value);
  }, [value]);

  const handleColorInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setTextValue(v);
    onChange(v);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value;
    if (v && !v.startsWith('#')) {
      v = '#' + v;
    }
    setTextValue(v);
    if (HEX_REGEX.test(v)) {
      onChange(v);
    }
  };

  const handleTextBlur = () => {
    if (!HEX_REGEX.test(textValue)) {
      setTextValue(value);
    }
  };

  const isValid = HEX_REGEX.test(textValue);

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <input
        type="color"
        value={HEX_REGEX.test(value) ? value : '#000000'}
        onChange={handleColorInput}
        disabled={disabled}
        className="w-10 h-10 rounded-md border border-input cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 p-0.5"
        aria-label="Farbe wählen"
      />
      <Input
        id={id}
        type="text"
        value={textValue}
        onChange={handleTextChange}
        onBlur={handleTextBlur}
        disabled={disabled}
        placeholder="#4a3a6b"
        maxLength={7}
        className={cn(
          'w-28 font-mono text-sm',
          !isValid && textValue !== '' && 'border-red-400 focus-visible:ring-red-400',
        )}
      />
      <div
        className="w-6 h-6 rounded-full border border-input shrink-0"
        style={{ backgroundColor: HEX_REGEX.test(value) ? value : '#ccc' }}
      />
    </div>
  );
}

export { ColorPicker };
