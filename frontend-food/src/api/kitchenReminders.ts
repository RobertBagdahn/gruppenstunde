/**
 * TanStack Query hooks for the Kitchen Reminder API.
 * MUST stay in sync with backend/shopping/api.py
 */
import { API_BASE_URL } from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  KitchenReminderCategorySchema,
  type KitchenReminderCategory,
  type KitchenReminderSuggestInput,
} from '@/schemas/kitchenReminder';

const API_BASE = `${API_BASE_URL}/api/kitchen-reminders`;

function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

// --- Queries ---

export function useKitchenReminders() {
  return useQuery<KitchenReminderCategory[]>({
    queryKey: ['kitchen-reminders'],
    queryFn: async () => {
      const res = await fetch(API_BASE + '/', { credentials: 'include' });
      if (!res.ok) throw new Error('Fehler beim Laden der Küchenbedarf-Erinnerungen');
      const data = await res.json();
      return z.array(KitchenReminderCategorySchema).parse(data);
    },
  });
}

// --- Mutations ---

export function useSuggestKitchenReminder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: KitchenReminderSuggestInput) => {
      const res = await fetch(API_BASE + '/suggest/', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCsrfToken(),
        },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error('Fehler beim Einreichen des Vorschlags');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kitchen-reminders'] });
    },
  });
}
