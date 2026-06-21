/**
 * RoleSelect — Dropdown for content collaborator roles.
 */
import { cn } from '@/lib/utils';

const ROLE_OPTIONS = [
  { value: 'viewer', label: 'Betrachter' },
  { value: 'editor', label: 'Bearbeiter' },
  { value: 'admin', label: 'Admin' },
] as const;

interface RoleSelectProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function RoleSelect({ value, onChange, disabled, className }: RoleSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        'rounded-lg border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40',
        className,
      )}
    >
      {ROLE_OPTIONS.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

export { ROLE_OPTIONS };
