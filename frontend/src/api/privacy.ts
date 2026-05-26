/**
 * TanStack Query hooks for Privacy API (GDPR).
 * Data overview, export, and account deletion.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchWithCsrf } from '@/lib/api';
import { DataOverviewSchema, type DataOverview, type DeleteAccountRequest } from '@/schemas/privacy';

const API_BASE = '/api/auth/privacy';

// --- Data Overview ---

export function useDataOverview() {
  return useQuery<DataOverview>({
    queryKey: ['privacy', 'data-overview'],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/data-overview/`, { credentials: 'include' });
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      return DataOverviewSchema.parse(data);
    },
    staleTime: 5 * 60 * 1000,
  });
}

// --- Data Export ---

export function useDataExport() {
  return useMutation<void, Error>({
    mutationFn: async () => {
      const res = await fetchWithCsrf(`${API_BASE}/data-export/`, {
        method: 'POST',
      });
      if (!res.ok) throw new Error('Export fehlgeschlagen');

      // Trigger file download
      const blob = await res.blob();
      const disposition = res.headers.get('Content-Disposition') || '';
      const filenameMatch = disposition.match(/filename="?([^"]+)"?/);
      const filename = filenameMatch ? filenameMatch[1] : 'inspi-datenexport.json';

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    },
  });
}

// --- Account Deletion ---

export function useDeleteAccount() {
  const queryClient = useQueryClient();
  return useMutation<void, Error, DeleteAccountRequest>({
    mutationFn: async (payload) => {
      const res = await fetchWithCsrf(`${API_BASE}/delete-account/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.detail || 'Kontolöschung fehlgeschlagen');
      }
    },
    onSuccess: () => {
      queryClient.setQueryData(['auth', 'me'], null);
      queryClient.invalidateQueries();
    },
  });
}
