/**
 * UserSearchSelect — search users by name or exact e-mail and pick one for an invite.
 * Results only show public display names; the user list is never loaded without a query.
 */
import { useState } from 'react';
import { USER_SEARCH_MIN_QUERY_LENGTH, useUsers } from '@/api/users';
import { useDebouncedSearchInput } from '@/hooks/usePersistedListState';

interface UserSearchSelectProps {
  value: number | null;
  onChange: (userId: number | null) => void;
}

export default function UserSearchSelect({ value, onChange }: UserSearchSelectProps) {
  const [query, setQuery] = useState('');
  const { input, setInput } = useDebouncedSearchInput(query, setQuery);
  const { data, isFetching, isError } = useUsers(query);
  const users = data?.items ?? [];
  const queryTooShort = query.trim().length < USER_SEARCH_MIN_QUERY_LENGTH;

  return (
    <div className="space-y-1.5">
      <input
        type="search"
        value={input}
        onChange={(e) => {
          setInput(e.target.value);
          onChange(null);
        }}
        placeholder="Name oder vollständige E-Mail"
        aria-label="Nutzer suchen"
        className="w-full px-3 py-2 text-body border rounded-lg bg-background"
      />
      <select
        value={value === null ? '' : String(value)}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        disabled={queryTooShort || users.length === 0}
        aria-label="Nutzer wählen"
        className="w-full px-3 py-2 text-body border rounded-lg bg-background disabled:opacity-60"
      >
        <option value="">
          {queryTooShort
            ? `Mindestens ${USER_SEARCH_MIN_QUERY_LENGTH} Zeichen eingeben…`
            : isFetching
              ? 'Suche läuft…'
              : isError
                ? 'Suche fehlgeschlagen'
                : users.length === 0
                  ? 'Keine Treffer'
                  : 'Nutzer wählen…'}
        </option>
        {users.map((u) => (
          <option key={u.id} value={String(u.id)}>
            {u.display_name}
          </option>
        ))}
      </select>
    </div>
  );
}
